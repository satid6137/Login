export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/settings";
import { signInWithHealthId, signInWithProviderId } from "../actions/sign-in";

// หน้านี้คือหน้า "external login page" ที่ MikroTik Hotspot profile ตั้งให้ redirect
// ผู้ใช้ที่ยังไม่ login มาที่นี่ พร้อมแนบพารามิเตอร์มาให้ทาง query string:
//   dst               = URL ปลายทางเดิมที่ผู้ใช้ต้องการไป
//   link-login-only   = URL สำหรับ POST username/password กลับไปให้ MikroTik ตรวจสอบ
//   mac               = MAC address ของอุปกรณ์
//
// ทั้งสามค่านี้ต้องแนบไปกับทุกฟอร์มในหน้านี้ (ทั้ง Health ID, Provider ID,
// และฟอร์ม username/password แบบเดิม) ไม่งั้น MikroTik จะไม่รู้ว่าจะ login ให้ใคร/ไปไหน
//
// ใช้ <form action={serverAction}> แทน <a href> ธรรมดา เพราะต้องให้ server action
// เช็ค whitelist ของ link-login-only ก่อน (กัน credential leak ไปปลายทางปลอม)
// ไม่ใช่แค่ลิงก์ธรรมดาที่ใครก็ปลอมพารามิเตอร์แนบมาแล้วเชื่อได้ทันที

const ERROR_MESSAGES: Record<string, string> = {
  health_id_disabled: "ขณะนี้ปิดใช้งานการเข้าสู่ระบบด้วย Health ID ชั่วคราว",
  provider_id_disabled: "ขณะนี้ปิดใช้งานการเข้าสู่ระบบด้วย Provider ID ชั่วคราว",
  untrusted_hotspot_url: "ลิงก์นี้ไม่ได้มาจากระบบ Wi-Fi ของโรงพยาบาลโดยตรง กรุณาเชื่อมต่อ Wi-Fi แล้วลองใหม่อีกครั้ง",
};

const PAGE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .hs-body {
    font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #f0f4f2;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .hs-card {
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    width: 100%;
    max-width: 860px;
    display: flex;
    box-shadow: 0 2px 16px rgba(0,0,0,0.08);
  }
  .hs-panel-left {
    background: #0f6e56;
    width: 42%;
    padding: 2.5rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .hs-logo-circle {
    width: 100px; height: 100px; border-radius: 50%;
    background: #fff; padding: 8px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1.25rem;
  }
  .hs-logo-circle img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }
  .hs-hospital-name { font-size: 18px; font-weight: 600; color: #e1f5ee; text-align: center; margin-bottom: 4px; }
  .hs-hospital-en { font-size: 12px; color: #9fe1cb; text-align: center; margin-bottom: 1.5rem; }
  .hs-left-desc { font-size: 12px; color: #9fe1cb; text-align: center; line-height: 1.7; margin-bottom: 1.5rem; }
  .hs-steps { width: 100%; }
  .hs-step-item { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 0.75rem; }
  .hs-step-num {
    width: 22px; height: 22px; border-radius: 50%; background: #1d9e75;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600; color: #e1f5ee; flex-shrink: 0; margin-top: 1px;
  }
  .hs-step-text { font-size: 12px; color: #9fe1cb; line-height: 1.6; }
  .hs-panel-right { flex: 1; padding: 2.5rem 2rem; display: flex; flex-direction: column; justify-content: center; }
  .hs-right-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
  .hs-right-sub { font-size: 13px; color: #6b7280; margin-bottom: 1.5rem; }
  .hs-speed-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 1.5rem; }
  .hs-speed-card { background: #f8faf9; border: 0.5px solid #d1e8df; border-radius: 10px; padding: 10px 12px; }
  .hs-speed-type { font-size: 11px; color: #6b7280; margin-bottom: 3px; }
  .hs-speed-val { font-size: 12px; font-weight: 600; color: #0f6e56; }
  .hs-divider { height: 0.5px; background: #e5e7eb; margin-bottom: 1.25rem; }
  .hs-error { background: #fef2f2; color: #b91c1c; font-size: 13px; border-radius: 10px; padding: 10px 14px; margin-bottom: 1.25rem; }
  .hs-btn {
    display: flex; align-items: center; width: 100%; padding: 14px 16px;
    border-radius: 10px; border: none; cursor: pointer; font-size: 14px; font-weight: 600;
    margin-bottom: 12px; gap: 12px; font-family: inherit; text-align: left;
  }
  .hs-btn:active { transform: scale(0.98); }
  .hs-btn-health { background: #0f6e56; color: #e1f5ee; }
  .hs-btn-health:hover { background: #0a5c47; }
  .hs-btn-provider { background: #fff; color: #0f6e56; border: 1.5px solid #0f6e56 !important; }
  .hs-btn-provider:hover { background: #f0faf6; }
  .hs-btn-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .hs-btn-icon-h { background: rgba(255,255,255,0.2); }
  .hs-btn-icon-p { background: #e1f5ee; }
  .hs-btn-texts { flex: 1; text-align: left; }
  .hs-btn-label { display: block; font-size: 14px; font-weight: 600; line-height: 1.3; }
  .hs-btn-desc { display: block; font-size: 11px; font-weight: 400; opacity: 0.75; margin-top: 2px; }
  .hs-badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; flex-shrink: 0; }
  .hs-badge-light { background: rgba(255,255,255,0.2); color: #e1f5ee; }
  .hs-badge-green { background: #e1f5ee; color: #0f6e56; }
  .hs-fallback-title { font-size: 12px; color: #9ca3af; text-align: center; margin: 0.5rem 0 1rem; }
  .hs-input {
    width: 100%; border: 1px solid #d1d5db; border-radius: 10px; padding: 12px 14px;
    font-size: 14px; margin-bottom: 10px; font-family: inherit;
  }
  .hs-input:focus { outline: none; border-color: #0f6e56; }
  .hs-btn-fallback { background: #374151; color: #fff; justify-content: center; }
  .hs-btn-fallback:hover { background: #1f2937; }
  .hs-footer-note { font-size: 11px; color: #9ca3af; text-align: center; line-height: 1.7; margin-top: 1.25rem; }
  .hs-loading-overlay {
    display: none; position: fixed; inset: 0; background: rgba(15,110,86,0.92); z-index: 999;
    flex-direction: column; align-items: center; justify-content: center; color: #e1f5ee;
  }
  .hs-loading-overlay.show { display: flex; }
  .hs-spinner {
    width: 44px; height: 44px; border: 3px solid rgba(255,255,255,0.3);
    border-top-color: #fff; border-radius: 50%; animation: hs-spin 0.8s linear infinite; margin-bottom: 1rem;
  }
  @keyframes hs-spin { to { transform: rotate(360deg); } }
  .hs-loading-text { font-size: 15px; font-weight: 500; }
  .hs-loading-sub { font-size: 12px; color: #9fe1cb; margin-top: 6px; }
  @media (max-width: 600px) {
    .hs-body { padding: 0; align-items: stretch; background: #0f6e56; }
    .hs-card { flex-direction: column; border-radius: 0; min-height: 100vh; box-shadow: none; }
    .hs-panel-left { width: 100%; padding: 2rem 1.5rem 1.5rem; flex-direction: row; align-items: center; gap: 1rem; justify-content: flex-start; }
    .hs-logo-circle { width: 60px; height: 60px; flex-shrink: 0; margin-bottom: 0; }
    .hs-hospital-name { font-size: 16px; text-align: left; }
    .hs-hospital-en { text-align: left; margin-bottom: 0; }
    .hs-left-desc, .hs-steps { display: none; }
    .hs-hospital-info { display: flex; flex-direction: column; }
    .hs-panel-right { flex: 1; padding: 1.75rem 1.25rem; background: #fff; border-radius: 20px 20px 0 0; margin-top: -12px; position: relative; z-index: 1; }
    .hs-btn { padding: 15px 14px; }
    .hs-btn-label { font-size: 15px; }
  }
`;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const dst = params["dst"] || "";
  const linkLoginOnly = params["link-login-only"] || "";
  const mac = params["mac"] || "";
  const error = params["error"];

  const settings = await getSettings();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <div id="hsLoadingOverlay" className="hs-loading-overlay">
        <div className="hs-spinner"></div>
        <p className="hs-loading-text">กำลังเชื่อมต่อ...</p>
        <p className="hs-loading-sub">กรุณารอสักครู่</p>
      </div>

      <div className="hs-body">
        <div className="hs-card">
          {/* LEFT */}
          <div className="hs-panel-left">
            <div className="hs-logo-circle">
              <img
  src="/logo.png"
  alt="โรงพยาบาลห้างฉัตร"
/>
            </div>
            <div className="hs-hospital-info">
              <p className="hs-hospital-name">โรงพยาบาลห้างฉัตร</p>
              <p className="hs-hospital-en">Hangchat Hospital — Wi-Fi</p>
            </div>
            <p className="hs-left-desc">
              ระบบยืนยันตัวตนเพื่อเข้าใช้งาน
              <br />
              อินเทอร์เน็ตภายในโรงพยาบาล
            </p>
            <div className="hs-steps">
              <div className="hs-step-item">
                <div className="hs-step-num">1</div>
                <div className="hs-step-text">เลือกประเภทบัญชีที่ต้องการเข้าสู่ระบบ</div>
              </div>
              <div className="hs-step-item">
                <div className="hs-step-num">2</div>
                <div className="hs-step-text">ยืนยันตัวตนผ่าน Health ID / Provider ID</div>
              </div>
              <div className="hs-step-item">
                <div className="hs-step-num">3</div>
                <div className="hs-step-text">รับสิทธิ์การใช้งานตามประเภทบัญชี</div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="hs-panel-right">
            <p className="hs-right-title">เข้าสู่ระบบ Wi-Fi</p>
            <p className="hs-right-sub">เลือกวิธียืนยันตัวตนเพื่อเชื่อมต่ออินเทอร์เน็ต</p>

            {error && <div className="hs-error">{ERROR_MESSAGES[error] || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"}</div>}

            <div className="hs-speed-grid">
              <div className="hs-speed-card">
                <p className="hs-speed-type">Health ID</p>
                <p className="hs-speed-val">50/50 Mbps · 4 ชม.</p>
              </div>
              <div className="hs-speed-card">
                <p className="hs-speed-type">Provider ID</p>
                <p className="hs-speed-val">80~100 Mbps · 4-8 ชม.</p>
              </div>
            </div>

            <div className="hs-divider"></div>

            {settings.healthIdEnabled && (
              <form action={signInWithHealthId}>
                <input type="hidden" name="dst" value={dst} />
                <input type="hidden" name="link-login-only" value={linkLoginOnly} />
                <input type="hidden" name="mac" value={mac} />
                <button type="submit" className="hs-btn hs-btn-health">
                  <div className="hs-btn-icon hs-btn-icon-h">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="8" stroke="#E1F5EE" strokeWidth="1.8" />
                      <path d="M7 10h6M10 7v6" stroke="#E1F5EE" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="hs-btn-texts">
                    <span className="hs-btn-label">เข้าสู่ระบบด้วย Health ID</span>
                    <span className="hs-btn-desc">สำหรับบุคคลทั่วไปและผู้รับบริการ</span>
                  </div>
                  <span className="hs-badge hs-badge-light">4 ชม.</span>
                </button>
              </form>
            )}

            {settings.providerIdEnabled && (
              <form action={signInWithProviderId}>
                <input type="hidden" name="dst" value={dst} />
                <input type="hidden" name="link-login-only" value={linkLoginOnly} />
                <input type="hidden" name="mac" value={mac} />
                <button type="submit" className="hs-btn hs-btn-provider">
                  <div className="hs-btn-icon hs-btn-icon-p">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="3" y="3" width="14" height="14" rx="3.5" stroke="#0F6E56" strokeWidth="1.8" />
                      <path d="M7 10h6M10 7v6" stroke="#0F6E56" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="hs-btn-texts">
                    <span className="hs-btn-label">เข้าสู่ระบบด้วย Provider ID</span>
                    <span className="hs-btn-desc">สำหรับบุคลากรทางการแพทย์</span>
                  </div>
                  <span className="hs-badge hs-badge-green">4-8 ชม.</span>
                </button>
              </form>
            )}

            {!settings.healthIdEnabled && !settings.providerIdEnabled && (
              <p className="hs-fallback-title">(ยังไม่เปิดใช้งานการ login ผ่าน Health ID / Provider ID)</p>
            )}

            <p className="hs-fallback-title">หรือ login แบบเดิม</p>

            {/* ฟอร์ม username/password แบบเดิม — POST ตรงไปที่ MikroTik link-login-only
                (ต้องตั้ง Hotspot profile เป็น login-by = http-pap เพื่อให้ส่ง plain password ได้) */}
            <form action={linkLoginOnly} method="post">
              <input type="hidden" name="dst" value={dst} />
              <input className="hs-input" type="text" name="username" placeholder="Username" required />
              <input className="hs-input" type="password" name="password" placeholder="Password" required />
              <button type="submit" className="hs-btn hs-btn-fallback">
                Log In
              </button>
            </form>

            <p className="hs-footer-note">
              ระบบเชื่อมต่อกับ Health ID / Provider ID (moph.id.th)
              <br />
              ข้อมูลได้รับการคุ้มครองตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
            </p>
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.querySelectorAll('form').forEach(function (f) {
              f.addEventListener('submit', function () {
                var el = document.getElementById('hsLoadingOverlay');
                if (el) el.classList.add('show');
              });
            });
          `,
        }}
      />
    </>
  );
}