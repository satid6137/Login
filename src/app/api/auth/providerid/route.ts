import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { determineTier } from "@/lib/tier";
import { buildRadiusUsername, generateSessionPassword, upsertRadiusUser } from "@/lib/radius";
import { renderHotspotAutoLogin } from "@/lib/hotspot";
import { prisma } from "@/lib/db";
import { getSettings, isOwnHcode, isAdminProviderId } from "@/lib/settings";

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
  if (!settings.providerIdEnabled) {
    return NextResponse.json({ error: "Provider ID login ถูกปิดใช้งานอยู่ในขณะนี้" }, { status: 403 });
  }

  // ── ขั้น 1: แลก code เป็น Health ID access_token (moph.id.th ใช้ endpoint เดียวกัน) ──
  const tokenResponse = await fetch("https://moph.id.th/api/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.PROVIDER_REDIRECT_URI,
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

  // ── ขั้น 2: ใช้ Health ID token ขอ Provider ID access_token ──
  const providerTokenResponse = await fetch("https://provider.id.th/api/v1/services/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PROVIDER_CLIENT_ID,
      secret_key: process.env.PROVIDER_CLIENT_SECRET,
      token_by: "Health ID",
      token: tokenData.data.access_token,
    }),
  });
  const providerTokenData = await providerTokenResponse.json();
  if (!providerTokenResponse.ok) {
    return NextResponse.json(
      { error: providerTokenData.error || "Failed to fetch provider token" },
      { status: providerTokenResponse.status },
    );
  }

  // ── ขั้น 3: ดึง profile เจ้าหน้าที่ (มี provider_id + hcode) ──
  const profileResponse = await fetch(
    "https://provider.id.th/api/v1/services/profile?position_type=1",
    {
      headers: {
        "client-id": process.env.PROVIDER_CLIENT_ID!,
        "secret-key": process.env.PROVIDER_CLIENT_SECRET!,
        Authorization: `Bearer ${providerTokenData.data.access_token}`,
      },
    },
  );
  const profileData = await profileResponse.json();
  if (!profileResponse.ok) {
    return NextResponse.json(
      { error: profileData.error || "Failed to fetch profile data" },
      { status: profileResponse.status },
    );
  }
  
const providerId: string = profileData.data.provider_id;
const hcode: string | undefined = profileData.data.organization?.[0]?.hcode;

  // ── ตัดสิน tier 2/3/4 ตาม hcode + admin whitelist ──
  const hcodeMatchesOwn = await isOwnHcode(hcode);
  const isAdmin = await isAdminProviderId(providerId);
  const profile = determineTier({ loginWay: "provider-id", hcodeMatchesOwn, isAdmin });

  const username = buildRadiusUsername("provider-id", providerId);
  const password = generateSessionPassword();

  await upsertRadiusUser({ username, password, profile });

  await prisma.loginLog.create({
    data: {
      loginWay: "provider-id",
      providerId,
      hcode: hcode || null,
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
