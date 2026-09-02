# Hospital Hotspot Auth Broker + Admin Panel

Next.js app ที่ต่อยอดจาก MikroTik CCR2116-12G-4S+ Hotspot เดิม เพิ่มการ login ด้วย
**Health ID** และ **Provider ID** (moph.id.th) ควบคู่กับ RADIUS (daloRADIUS) โดยยังคง
username/password แบบเดิมไว้เป็น fallback

## Tier ที่ระบบกำหนดให้อัตโนมัติ

| Tier | เงื่อนไข | เครื่อง | ความเร็ว | Session |
|---|---|---|---|---|
| 1 | Health ID (ประชาชน) | 1 | 50M/50M | 4 ชม. |
| 2 | Provider ID, hcode ไม่ตรง | 1 | 80M/80M | 4 ชม. |
| 3 | Provider ID, hcode ตรง | 2 | 100M/100M | 8 ชม. |
| 4 | Provider ID, hcode ตรง + อยู่ใน admin whitelist | 2 | ไม่จำกัด | 8 ชม. |

ดู logic เต็มที่ `src/lib/tier.ts`

## สถาปัตยกรรม

```
Client เชื่อม Wi-Fi
   │  (ยังไม่ login)
   ▼
MikroTik Hotspot ── redirect ──▶ /login  (หน้านี้ ในแอป Next.js)
                                    │
                    ┌───────────────┼───────────────────┐
                    ▼               ▼                   ▼
              Health ID       Provider ID        username/password เดิม
                    │               │             (POST ตรงไป MikroTik)
                    ▼               ▼
         /api/auth/healthid   /api/auth/providerid
                    │               │
                    └──── upsertRadiusUser() ────┐
                                                  ▼
                                     daloRADIUS (radcheck/radreply)
                                                  │
                    auto-submit form กลับไปที่ link-login-only
                                                  │
                                                  ▼
                                     MikroTik ตรวจสอบผ่าน RADIUS ─▶ ผ่าน
```

## ติดตั้ง

```bash
npm install
cp .env.example .env.local   # แล้วกรอกค่าจริง
npx prisma migrate deploy    # สร้างตาราง Settings/OwnHcode/AdminWhitelist/LoginLog
npm run build && npm start
```

`RADIUS_DATABASE_URL` ต้องชี้ไปที่ฐานข้อมูล daloRADIUS ที่มีอยู่แล้ว (schema มาตรฐาน
FreeRADIUS: `radcheck`, `radreply`, `radusergroup`) — แอปนี้ไม่สร้างตารางพวกนี้เอง

## ตั้งค่าฝั่ง MikroTik (ที่ต้องทำเพิ่ม)

1. **Hotspot profile → login method:** เปลี่ยนจาก CHAP-only เป็น `http-pap` เพิ่มด้วย
   (จำเป็น เพราะ RADIUS user ที่สร้างจาก OAuth ใช้ plain password ที่สุ่มไว้ ไม่ผ่าน CHAP)
2. **Hotspot profile → use RADIUS:** yes, ชี้ไปที่ daloRADIUS server เดิม
3. **Walled garden:** เพิ่ม `moph.id.th`, `provider.id.th`, และ domain ของแอปนี้
   ให้เข้าได้ก่อน login (ไม่งั้น OAuth redirect จะโดนบล็อก)
4. **External login page:** ตั้งให้ MikroTik redirect ผู้ใช้ที่ยังไม่ login ไปที่
   `https://your-domain.example.com/login` แทนหน้า `login.html` เดิม (หรือคง
   `login.html` เดิมไว้ที่ path เดิม แล้วให้มันมีลิงก์มาที่หน้านี้แทนก็ได้ ถ้าอยากค่อย ๆ ย้าย)
   MikroTik จะแนบ `dst`, `link-login-only`, `mac` มาเป็น query string ให้อัตโนมัติ

## Bootstrap admin คนแรก

หน้า `/admin/admins` ต้อง login ก่อนถึงจะเข้าได้ แต่การจะ login ได้ต้องมีชื่ออยู่ใน
`AdminWhitelist` ก่อน — ไก่กับไข่ แก้โดยเพิ่มแถวแรกตรง ๆ ในฐานข้อมูล:

```sql
INSERT INTO AdminWhitelist (providerId, name, createdAt)
VALUES ('<provider_id ของคนแรก>', 'ผู้ดูแลระบบคนแรก', NOW());
```

จากนั้น login เข้า `/admin/login` ได้ตามปกติ แล้วเพิ่มคนอื่นผ่านหน้า UI ต่อได้เลย

## เปิด/ปิดฟีเจอร์ระหว่างพัฒนา

หน้า `/admin/settings` มี toggle แยก Health ID / Provider ID อิสระจากกัน
ปิดไว้ได้เรื่อย ๆ ระหว่างรอทดสอบ โดยไม่กระทบ login username/password เดิมที่หน้า
`/login` แสดง fallback ไว้ให้เสมอ

## ไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|---|---|
| `src/lib/tier.ts` | กติกาการตัดสิน tier ทั้ง 4 |
| `src/lib/radius.ts` | เขียน user ลง daloRADIUS (radcheck/radreply/radusergroup) |
| `src/lib/hotspot.ts` | สร้างหน้า auto-submit เพื่อ login กลับเข้า MikroTik |
| `src/app/api/auth/healthid/route.ts` | OAuth callback ฝั่ง Health ID |
| `src/app/api/auth/providerid/route.ts` | OAuth callback ฝั่ง Provider ID (เทียบ hcode) |
| `src/app/admin/*` | หน้า admin panel (toggle, hcode, admin whitelist) |
| `src/authConfig.ts` | Auth.js session เฉพาะหน้า admin panel |

## สิ่งที่ยังต้องปรับตามหน้างานจริง

- endpoint/field ของ `moph.id.th` และ `provider.id.th` (เช่น field ชื่อ cid/hcode
  ในตัวอย่างนี้อ้างอิงจาก skill เดิม — ควรตรวจกับเอกสาร API จริงอีกครั้ง)
- ชื่อ attribute rate-limit ถ้า MikroTik ใช้ vendor dictionary อื่น (ในตัวอย่างใช้
  `Mikrotik-Rate-Limit` มาตรฐาน)
- จะ deploy Next.js นี้ที่ไหน (ต้องเข้าถึงได้จาก client ที่เกาะ hotspot อยู่ ก่อน login)
