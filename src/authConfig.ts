// src/authConfig.ts
// Session สำหรับ "หน้า admin panel" เท่านั้น — คนละเรื่องกับการ login เข้า Wi-Fi
// (หน้า Wi-Fi login ใช้ RADIUS ตรง ๆ ผ่าน src/lib/radius.ts ไม่ผ่าน Auth.js)
//
// Admin ต้อง login ด้วย Provider ID เดียวกัน แต่ provider_id ต้องอยู่ใน
// AdminWhitelist ก่อน ถึงจะเข้าหน้า /admin ได้

import NextAuth, { type Session, type NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { isAdminProviderId } from "@/lib/settings";

const authOptions: NextAuthConfig = {
	trustHost: true, // จำเป็นเพราะรันหลัง nginx reverse proxy บน custom domain
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 ชั่วโมง เท่ากับ session hotspot ของ admin tier
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        if (credentials["cred-way"] !== "admin-provider-id") return null;

        const providerId = credentials.providerId as string;
        const ok = await isAdminProviderId(providerId);
        if (!ok) return null; // provider_id ไม่อยู่ใน whitelist -> ปฏิเสธ

        return {
          name: providerId,
          providerId,
          profile: credentials.profile as string,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.providerId = user.providerId;
        token.profile = user.profile;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        (session.user as any).providerId = (token as any).providerId;
        (session.user as any).profile = (token as any).profile;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
