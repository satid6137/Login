// src/lib/hotspot.ts
//
// หลังจากสร้าง RADIUS user เสร็จแล้ว ต้อง "ยิง" username/password นั้นเข้า
// MikroTik Hotspot login-only URL จริง ๆ เพื่อให้ MikroTik ไป authenticate กับ
// FreeRADIUS/daloRADIUS แล้วเปิดผ่าน (คนละ host กับแอป Next.js นี้ จึงทำเป็น
// หน้า auto-submit form แทนการ redirect ธรรมดา)
//
// ค่า loginOnlyUrl / dst ต้องมาจาก query string ที่ MikroTik ใส่มาให้ตอน redirect
// ผู้ใช้ที่ยังไม่ login มาที่หน้า external login (ตั้งค่าใน Hotspot profile ว่าใช้
// external login page + login-by = http-pap เพื่อให้ส่ง plain username/password ได้
// โดยไม่ต้องเจอ CHAP challenge)

export function renderHotspotAutoLogin(params: {
  loginOnlyUrl: string;
  username: string;
  password: string;
  dst: string;
}) {
  const { loginOnlyUrl, username, password, dst } = params;

  // escape ง่าย ๆ กัน HTML injection จากค่าที่มาจาก query string
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] as string));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>กำลังเข้าสู่ระบบ...</title>
</head>
<body>
  <p>กำลังเชื่อมต่อ กรุณารอสักครู่...</p>
  <form id="hotspotLogin" action="${esc(loginOnlyUrl)}" method="post">
    <input type="hidden" name="username" value="${esc(username)}" />
    <input type="hidden" name="password" value="${esc(password)}" />
    <input type="hidden" name="dst" value="${esc(dst)}" />
    <input type="hidden" name="popup" value="false" />
  </form>
  <script>document.getElementById('hotspotLogin').submit();</script>
</body>
</html>`;
}
