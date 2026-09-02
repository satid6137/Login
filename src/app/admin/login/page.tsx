export default function AdminLoginPage() {
  const clientId = process.env.HEALTH_CLIENT_ID;
  const redirectUri = process.env.ADMIN_REDIRECT_URI;
  const oauthUrl = `https://moph.id.th/oauth/redirect?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center space-y-6">
        <h2 className="text-xl font-bold">Admin Panel</h2>
        <p className="text-sm text-gray-500">
          เข้าสู่ระบบด้วย Provider ID ที่อยู่ใน admin whitelist เท่านั้น
        </p>
        <a
          href={oauthUrl}
          className="block w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700
                     transition-all font-semibold"
        >
          เข้าสู่ระบบด้วย Provider ID
        </a>
      </div>
    </div>
  );
}
