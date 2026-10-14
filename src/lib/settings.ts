// src/lib/settings.ts
// อ่าน/แก้ไข feature toggle, hcode ตนเอง, และ admin whitelist

import { prisma } from "./db";

/** อ่านค่า Settings (สร้างแถว default ถ้ายังไม่มี) */
export async function getSettings() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, healthIdEnabled: false, providerIdEnabled: false },
  });
  return settings;
}

export async function setFeatureToggle(
  field: "healthIdEnabled" | "providerIdEnabled",
  value: boolean,
  updatedBy: string,
) {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: { [field]: value, updatedBy },
    create: {
      id: 1,
      healthIdEnabled: field === "healthIdEnabled" ? value : false,
      providerIdEnabled: field === "providerIdEnabled" ? value : false,
      updatedBy,
    },
  });
}

/** เช็คว่า hcode ที่ได้จาก profile ตรงกับ hcode ของหน่วยงานตนเองไหม */
export async function isOwnHcode(hcode?: string | null): Promise<boolean> {
  if (!hcode) return false;
  const found = await prisma.ownHcode.findUnique({ where: { hcode } });
  return !!found;
}

/** เช็คว่า provider_id นี้อยู่ใน admin whitelist ไหม */
export async function isAdminProviderId(providerId?: string | null): Promise<boolean> {
  if (!providerId) return false;
  const found = await prisma.adminWhitelist.findUnique({ where: { providerId } });
  return !!found;
}

export async function listOwnHcodes() {
  return prisma.ownHcode.findMany({ orderBy: { createdAt: "desc" } });
}

export async function listAdmins() {
  return prisma.adminWhitelist.findMany({ orderBy: { createdAt: "desc" } });
}
