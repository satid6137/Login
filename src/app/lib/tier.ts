// src/lib/tier.ts
// Logic กำหนด tier ตามเงื่อนไขที่ตกลงกันไว้:
//
// Tier 1  Health ID (ประชาชนทั่วไป)                         1 เครื่อง  50M/50M   4 ชม.
// Tier 2  Provider ID, hcode ไม่ตรง (จนท. หน่วยงานอื่น)      1 เครื่อง  80M/80M   4 ชม.
// Tier 3  Provider ID, hcode ตรง (จนท. หน่วยงานตนเอง)        2 เครื่อง  100M/100M 8 ชม.
// Tier 4  Provider ID, hcode ตรง + อยู่ใน admin whitelist    2 เครื่อง  ไม่จำกัด  8 ชม.

export type LoginWay = "health-id" | "provider-id";

export interface TierProfile {
  tier: 1 | 2 | 3 | 4;
  label: string;
  simultaneousUse: number;
  /** รูปแบบ MikroTik: "rx-rate/tx-rate" เช่น "50M/50M" — null = ไม่จำกัด (ไม่ส่ง attribute) */
  mikrotikRateLimit: string | null;
  sessionTimeoutSeconds: number;
}

const HOUR = 60 * 60;

export function determineTier(params: {
  loginWay: LoginWay;
  hcodeMatchesOwn: boolean;
  isAdmin: boolean;
}): TierProfile {
  const { loginWay, hcodeMatchesOwn, isAdmin } = params;

  if (loginWay === "health-id") {
    return {
      tier: 1,
      label: "ประชาชนทั่วไป (Health ID)",
      simultaneousUse: 1,
      mikrotikRateLimit: "50M/50M",
      sessionTimeoutSeconds: 4 * HOUR,
    };
  }

  // loginWay === "provider-id" ต่อจากนี้
  if (isAdmin && hcodeMatchesOwn) {
    return {
      tier: 4,
      label: "ผู้ดูแลระบบ (Admin)",
      simultaneousUse: 2,
      mikrotikRateLimit: null, // ไม่จำกัดความเร็ว
      sessionTimeoutSeconds: 8 * HOUR,
    };
  }

  if (hcodeMatchesOwn) {
    return {
      tier: 3,
      label: "เจ้าหน้าที่หน่วยงานตนเอง",
      simultaneousUse: 2,
      mikrotikRateLimit: "100M/100M",
      sessionTimeoutSeconds: 8 * HOUR,
    };
  }

  return {
    tier: 2,
    label: "เจ้าหน้าที่หน่วยงานอื่น",
    simultaneousUse: 1,
    mikrotikRateLimit: "80M/80M",
    sessionTimeoutSeconds: 4 * HOUR,
  };
}
