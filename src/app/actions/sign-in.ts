"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSettings } from "@/lib/settings";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 10, // 10 นาที พอสำหรับ OAuth round-trip
};

/** whitelist ของ host ที่อนุญาตให้เป็นปลายทาง link-login-only ได้
 *  ตั้งค่าใน .env เป็น comma-separated เช่น "192.168.88.1,10.0.0.1"
 *  (ใส่ host ของ MikroTik hotspot จริงเท่านั้น — ห้ามเว้นว่างตอนใช้งานจริง) */
function isTrustedLoginOnlyUrl(url: string): boolean {
  const allowedHosts = (process.env.MIKROTIK_LOGIN_ONLY_HOSTS || "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  if (allowedHosts.length === 0) {
    // ยังไม่ได้ตั้งค่า whitelist เลย — บล็อกไว้ก่อนเพื่อความปลอดภัย
    // (ไม่ใช่ปล่อยผ่านแบบ fail-open)
    return false;
  }

  try {
    const parsed = new URL(url);
    return allowedHosts.includes(parsed.hostname);
  } catch {
    return false; // parse ไม่ผ่าน = ปฏิเสธ
  }
}

/** เก็บพารามิเตอร์ที่ MikroTik ใส่มาให้ตอน redirect เข้าหน้า login ภายนอก
 *  คืนค่า true ถ้าผ่าน whitelist, false ถ้าถูกปฏิเสธ (ต้องเรียกใน caller เพื่อ redirect ไปหน้า error) */
async function stashHotspotParams(formData: FormData): Promise<boolean> {
  const cookieStore = await cookies();
  const loginOnly = (formData.get("link-login-only") as string) || "";
  const dst = (formData.get("dst") as string) || "";

  if (!isTrustedLoginOnlyUrl(loginOnly)) {
    return false;
  }

  cookieStore.set("hotspot_login_only", loginOnly, COOKIE_OPTS);
  cookieStore.set("hotspot_dst", dst, COOKIE_OPTS);
  return true;
}

export const signInWithHealthId = async (formData: FormData) => {
  const settings = await getSettings();
  if (!settings.healthIdEnabled) {
    redirect("/login?error=health_id_disabled");
  }

  const ok = await stashHotspotParams(formData);
  if (!ok) {
    redirect("/login?error=untrusted_hotspot_url");
  }

  const clientId = process.env.HEALTH_CLIENT_ID;
  const redirectUri = process.env.HEALTH_REDIRECT_URI;
  const url = `https://moph.id.th/oauth/redirect?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
  redirect(url);
};

export const signInWithProviderId = async (formData: FormData) => {
  const settings = await getSettings();
  if (!settings.providerIdEnabled) {
    redirect("/login?error=provider_id_disabled");
  }

  const ok = await stashHotspotParams(formData);
  if (!ok) {
    redirect("/login?error=untrusted_hotspot_url");
  }

  // Provider ID ใช้ OAuth endpoint เดียวกันของ moph.id.th แต่แยก redirect_uri
  // เพื่อให้ callback route รู้ว่าต้อง exchange ผ่าน flow provider-id (มี hcode)
  const clientId = process.env.HEALTH_CLIENT_ID;
  const redirectUri = process.env.PROVIDER_REDIRECT_URI;
  const url = `https://moph.id.th/oauth/redirect?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
  redirect(url);
};