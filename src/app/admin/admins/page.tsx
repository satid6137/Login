export const dynamic = "force-dynamic";

import Link from "next/link";
import { listAdmins } from "@/lib/settings";
import { addAdmin, removeAdmin } from "./actions";

export default async function AdminsPage() {
  const admins = await listAdmins();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:underline">
          ← กลับหน้าแรก
        </Link>
        <h1 className="text-2xl font-bold">รายชื่อ Admin</h1>
        <p className="text-sm text-gray-500">
          Provider ID ในรายการนี้ (ที่ hcode ตรงกับหน่วยงานตนเองด้วย) จะได้ tier 4:
          2 เครื่อง ไม่จำกัดความเร็ว 8 ชั่วโมง — และใช้ login เข้าหน้า admin panel นี้ได้ด้วย
        </p>

        <form action={addAdmin} className="bg-white rounded-xl shadow p-6 flex gap-3">
          <input
            name="providerId"
            placeholder="provider_id"
            required
            className="flex-1 border rounded-lg px-3 py-2 font-mono"
          />
          <input
            name="name"
            placeholder="ชื่อ-นามสกุล (ไม่บังคับ)"
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
            เพิ่ม
          </button>
        </form>

        <div className="bg-white rounded-xl shadow divide-y">
          {admins.map((a) => (
            <div key={a.id} className="p-4 flex items-center justify-between">
              <div>
                <span className="font-mono font-semibold">{a.providerId}</span>
                {a.name && <span className="text-gray-500 ml-3">{a.name}</span>}
              </div>
              <form action={removeAdmin}>
                <input type="hidden" name="id" value={a.id} />
                <button className="text-sm text-red-500 hover:underline cursor-pointer">ลบ</button>
              </form>
            </div>
          ))}
          {admins.length === 0 && (
            <p className="p-6 text-center text-gray-400 text-sm">
              ยังไม่มี admin ในระบบ (ตอนนี้ยังไม่มีใคร login เข้าหน้า admin panel ได้เลย
              — ต้องเพิ่มแถวแรกตรงในฐานข้อมูลก่อน)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
