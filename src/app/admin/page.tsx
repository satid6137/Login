export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { signOut } from "@/authConfig";

export default async function AdminDashboard() {
  const settings = await getSettings();
  const recentLogs = await prisma.loginLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const tierLabel: Record<number, string> = {
    1: "1 · Health ID",
    2: "2 · Provider ID (หน่วยงานอื่น)",
    3: "3 · Provider ID (หน่วยงานตนเอง)",
    4: "4 · Admin",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Hotspot Admin Panel</h1>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button className="text-sm text-gray-500 hover:text-gray-800 cursor-pointer">
              ออกจากระบบ
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/admin/settings"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold mb-1">เปิด/ปิดระบบ Login</h3>
            <p className="text-sm text-gray-500">
              Health ID: <b className={settings.healthIdEnabled ? "text-green-600" : "text-red-500"}>
                {settings.healthIdEnabled ? "เปิด" : "ปิด"}
              </b>
              {" · "}
              Provider ID: <b className={settings.providerIdEnabled ? "text-green-600" : "text-red-500"}>
                {settings.providerIdEnabled ? "เปิด" : "ปิด"}
              </b>
            </p>
          </Link>

          <Link
            href="/admin/hcode"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold mb-1">hcode หน่วยงานตนเอง</h3>
            <p className="text-sm text-gray-500">กำหนดว่า hcode ไหนถือเป็น &quot;หน่วยงานตนเอง&quot;</p>
          </Link>

          <Link
            href="/admin/admins"
            className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold mb-1">รายชื่อ Admin</h3>
            <p className="text-sm text-gray-500">Provider ID ที่ได้สิทธิ์ tier 4 (ไม่จำกัดความเร็ว)</p>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow">
          <div className="px-6 py-4 border-b font-semibold">Login ล่าสุด</div>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-400">
              <tr>
                <th className="px-6 py-2">เวลา</th>
                <th className="px-6 py-2">วิธี</th>
                <th className="px-6 py-2">Tier</th>
                <th className="px-6 py-2">Username</th>
                <th className="px-6 py-2">hcode</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-6 py-2">{log.createdAt.toLocaleString("th-TH")}</td>
                  <td className="px-6 py-2">{log.loginWay}</td>
                  <td className="px-6 py-2">{tierLabel[log.tier]}</td>
                  <td className="px-6 py-2 font-mono">{log.username}</td>
                  <td className="px-6 py-2">{log.hcode || "-"}</td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-gray-400">
                    ยังไม่มี log
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
