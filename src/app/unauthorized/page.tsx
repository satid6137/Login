export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-center px-4">
      <div>
        <h1 className="text-2xl font-bold text-red-600 mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-gray-500">
          Provider ID นี้ไม่ได้อยู่ในรายชื่อผู้ดูแลระบบ กรุณาติดต่อผู้ดูแลระบบหลักเพื่อเพิ่มสิทธิ์
        </p>
      </div>
    </div>
  );
}
