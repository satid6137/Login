import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { determineTier } from "@/lib/tier";
import { buildRadiusUsername, generateSessionPassword, upsertRadiusUser } from "@/lib/radius";
import { renderHotspotAutoLogin } from "@/lib/hotspot";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  const cookieStore = await cookies();
  const loginOnlyUrl = cookieStore.get("hotspot_login_only")?.value;
  const dst = cookieStore.get("hotspot_dst")?.value || "";

  if (!code) {
    return NextResponse.json({ error: "Authorization code is missing" }, { status: 400 });
  }
  if (!loginOnlyUrl) {
    return NextResponse.json(
      { error: "Missing hotspot session (link-login-only). กรุณาเริ่ม login ใหม่จากหน้า captive portal" },
      { status: 400 },
    );
  }

  const settings = await getSettings();
  if (!settings.healthIdEnabled) {
    return NextResponse.json({ error: "Health ID login ถูกปิดใช้งานอยู่ในขณะนี้" }, { status: 403 });
  }

  // ── แลก code เป็น Health ID access_token ──
  const tokenResponse = await fetch("https://moph.id.th/api/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.HEALTH_REDIRECT_URI,
      client_id: process.env.HEALTH_CLIENT_ID,
      client_secret: process.env.HEALTH_CLIENT_SECRET,
    }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    return NextResponse.json(
      { error: tokenData.error || "Failed to fetch Health ID token" },
      { status: tokenResponse.status },
    );
  }

  // ── ดึง profile ประชาชนจาก Health ID (ไม่ต้องผ่าน provider.id.th) ──
  const profileResponse = await fetch("https://moph.id.th/api/v1/profile", {
    headers: { Authorization: `Bearer ${tokenData.data.access_token}` },
  });
  const profileData = await profileResponse.json();
  if (!profileResponse.ok) {
    return NextResponse.json(
      { error: profileData.error || "Failed to fetch Health ID profile" },
      { status: profileResponse.status },
    );
  }

  const cid: string = profileData.data.cid || profileData.data.citizen_id || "unknown";

  // ── ตัดสิน tier (Health ID = tier 1 เสมอ) ──
  const profile = determineTier({ loginWay: "health-id", hcodeMatchesOwn: false, isAdmin: false });

  const username = buildRadiusUsername("health-id", cid);
  const password = generateSessionPassword();

  await upsertRadiusUser({ username, password, profile });

  await prisma.loginLog.create({
    data: {
      loginWay: "health-id",
      providerId: null,
      hcode: null,
      tier: profile.tier,
      username,
      ip: request.headers.get("x-forwarded-for") || undefined,
    },
  });

  cookieStore.delete("hotspot_login_only");
  cookieStore.delete("hotspot_dst");

  const html = renderHotspotAutoLogin({ loginOnlyUrl, username, password, dst });
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
