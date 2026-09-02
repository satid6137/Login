import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/authConfig";
import { isAdminProviderId } from "@/lib/settings";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Authorization code is missing" }, { status: 400 });
  }

  const tokenResponse = await fetch("https://moph.id.th/api/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.ADMIN_REDIRECT_URI,
      client_id: process.env.HEALTH_CLIENT_ID,
      client_secret: process.env.HEALTH_CLIENT_SECRET,
    }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    return NextResponse.json({ error: tokenData.error || "Token exchange failed" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Provider token exchange failed" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Profile fetch failed" }, { status: 400 });
  }

  const providerId: string = profileData.data.provider_id;

  const ok = await isAdminProviderId(providerId);
  if (!ok) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  const res = await signIn("credentials", {
    "cred-way": "admin-provider-id",
    providerId,
    profile: JSON.stringify(profileData.data),
    redirectTo: "/admin",
  });

  return res;
}
