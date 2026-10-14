// src/lib/radius.ts
//
// เขียน user ลงฐานข้อมูล daloRADIUS/FreeRADIUS (ตาราง radcheck, radreply, radusergroup)
// โดยตรงด้วย raw SQL — ไม่ใช้ Prisma เพราะ schema นี้เป็นของ daloRADIUS อยู่แล้ว
// (คนละฐานข้อมูลกับ APP_DATABASE_URL ที่ใช้เก็บ Settings/OwnHcode/AdminWhitelist)
//
// ต้องตั้งค่า RADIUS_DATABASE_URL แยกต่างหาก เช่น
// mysql://radius:password@127.0.0.1:3306/radius

import mysql from "mysql2/promise";
import type { TierProfile } from "./tier";
import crypto from "crypto";

let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(process.env.RADIUS_DATABASE_URL!);
  }
  return pool;
}

/** สุ่มรหัสผ่านชั่วคราวสำหรับ session นี้ (ผู้ใช้ไม่ต้องเห็น/พิมพ์เอง) */
export function generateSessionPassword(): string {
  return crypto.randomBytes(12).toString("hex");
}

/** สร้าง username คงที่จาก loginWay + provider_id/citizen_id เพื่อให้ log/ตรวจสอบย้อนหลังได้ */
export function buildRadiusUsername(loginWay: "health-id" | "provider-id", subjectId: string) {
  const prefix = loginWay === "health-id" ? "hid" : "pid";
  return `${prefix}-${subjectId}`;
}

/**
 * เขียน/อัปเดต RADIUS user ให้ตรงกับ tier ที่คำนวณได้
 * - radcheck: Cleartext-Password, Simultaneous-Use
 * - radreply: Session-Timeout, Mikrotik-Rate-Limit (ถ้ามี)
 */
export async function upsertRadiusUser(params: {
  username: string;
  password: string;
  profile: TierProfile;
}) {
  const { username, password, profile } = params;
  const db = getPool();
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // ล้างค่าเดิมของ user นี้ก่อน (กันข้อมูลตกค้างจาก tier ก่อนหน้า)
    await conn.execute("DELETE FROM radcheck WHERE username = ?", [username]);
    await conn.execute("DELETE FROM radreply WHERE username = ?", [username]);
    await conn.execute("DELETE FROM radusergroup WHERE username = ?", [username]);

    // radcheck: password + จำนวนเครื่องที่ login พร้อมกันได้
    await conn.execute(
      `INSERT INTO radcheck (username, attribute, op, value) VALUES (?, 'Cleartext-Password', ':=', ?)`,
      [username, password],
    );
    await conn.execute(
      `INSERT INTO radcheck (username, attribute, op, value) VALUES (?, 'Simultaneous-Use', ':=', ?)`,
      [username, String(profile.simultaneousUse)],
    );

    // radreply: session timeout เสมอ
    await conn.execute(
      `INSERT INTO radreply (username, attribute, op, value) VALUES (?, 'Session-Timeout', ':=', ?)`,
      [username, String(profile.sessionTimeoutSeconds)],
    );

    // radreply: rate limit เฉพาะกรณีที่จำกัดความเร็ว (tier 4 = null = ไม่จำกัด ไม่ต้องส่ง attribute นี้)
    if (profile.mikrotikRateLimit) {
      await conn.execute(
        `INSERT INTO radreply (username, attribute, op, value) VALUES (?, 'Mikrotik-Rate-Limit', ':=', ?)`,
        [username, profile.mikrotikRateLimit],
      );
    }

    // ใส่กลุ่มไว้เผื่ออยากดูรายงานแยกตาม tier ใน daloRADIUS UI
    await conn.execute(
      `INSERT INTO radusergroup (username, groupname, priority) VALUES (?, ?, 1)`,
      [username, `tier-${profile.tier}`],
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
