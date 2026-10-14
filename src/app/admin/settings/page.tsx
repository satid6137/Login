export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { toggleHealthId, toggleProviderId } from "./actions";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:underline">
          ← กลับหน้าแรก
        </Link>
        <h1 className="text-2xl font-bold">เปิด/ปิดระบบ Login</h1>

        <div className="bg-white rounded-xl shadow divide-y">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Health ID (ประชาชนทั่วไป)</h3>
              <p className="text-sm text-gray-500">
                Tier 1 · 1 เครื่อง · 50M/50M · session 4 ชม.
              </p>
            </div>
            <form action={toggleHealthId}>
              <input type="hidden" name="enabled" value={(!settings.healthIdEnabled).toString()} />
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg font-medium cursor-pointer ${
                  settings.healthIdEnabled
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-green-50 text-green-600 hover:bg-green-100"
                }`}
              >
                {settings.healthIdEnabled ? "ปิดใช้งาน" : "เปิดใช้งาน"}
              </button>
            </form>
          </div>

          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Provider ID (เจ้าหน้าที่)</h3>
              <p className="text-sm text-gray-500">
                Tier 2/3/4 ตาม hcode และ admin whitelist
              </p>
            </div>
            <form action={toggleProviderId}>
              <input type="hidden" name="enabled" value={(!settings.providerIdEnabled).toString()} />
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg font-medium cursor-pointer ${
                  settings.providerIdEnabled
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-green-50 text-green-600 hover:bg-green-100"
                }`}
              >
                {settings.providerIdEnabled ? "ปิดใช้งาน" : "เปิดใช้งาน"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          เมื่อปิดใช้งาน ปุ่มที่เกี่ยวข้องจะหายไปจากหน้า login ทันที (ยังคง fallback
          เป็น username/password แบบเดิมไว้เสมอ) เหมาะสำหรับตอนที่ยังทดสอบระบบ
          Health ID / Provider ID ไม่เสร็จ
        </p>
      </div>
    </div>
  );
}
