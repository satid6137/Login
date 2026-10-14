export const dynamic = "force-dynamic";

import Link from "next/link";
import { listOwnHcodes } from "@/lib/settings";
import { addHcode, removeHcode } from "./actions";

export default async function HcodePage() {
  const hcodes = await listOwnHcodes();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:underline">
          ← กลับหน้าแรก
        </Link>
        <h1 className="text-2xl font-bold">hcode หน่วยงานตนเอง</h1>
        <p className="text-sm text-gray-500">
          Provider ID ที่ hcode ตรงกับรายการนี้ = เจ้าหน้าที่หน่วยงานตนเอง (tier 3/4)
          ถ้าไม่ตรง = เจ้าหน้าที่หน่วยงานอื่น (tier 2)
        </p>

        <form action={addHcode} className="bg-white rounded-xl shadow p-6 flex gap-3">
          <input
            name="hcode"
            placeholder="hcode เช่น 10670"
            required
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <input
            name="name"
            placeholder="ชื่อหน่วยงาน (ไม่บังคับ)"
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
            เพิ่ม
          </button>
        </form>

        <div className="bg-white rounded-xl shadow divide-y">
          {hcodes.map((h) => (
            <div key={h.id} className="p-4 flex items-center justify-between">
              <div>
                <span className="font-mono font-semibold">{h.hcode}</span>
                {h.name && <span className="text-gray-500 ml-3">{h.name}</span>}
              </div>
              <form action={removeHcode}>
                <input type="hidden" name="id" value={h.id} />
                <button className="text-sm text-red-500 hover:underline cursor-pointer">ลบ</button>
              </form>
            </div>
          ))}
          {hcodes.length === 0 && (
            <p className="p-6 text-center text-gray-400 text-sm">ยังไม่มี hcode ในระบบ</p>
          )}
        </div>
      </div>
    </div>
  );
}
