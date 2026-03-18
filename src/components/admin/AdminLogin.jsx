import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function AdminLogin({ code, onSuccess }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "sessions", code));
      if (!snap.exists()) { setError("Session không tồn tại"); return; }
      const stored = atob(snap.data().admin_password || "");
      if (password === stored) { sessionStorage.setItem(`admin_authed_${code}`, "true"); onSuccess(); }
      else { setError("Mật khẩu không đúng"); }
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-violet-50 to-sky-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xl sm:p-6">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-xl text-white">⚙️</div>
          <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Đăng nhập Admin</h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">Phiên: <span className="font-mono font-semibold">{code}</span></p>
        </div>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu" className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 sm:h-12" minLength={4} required />
        {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}
        <button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:bg-gray-400 sm:h-12 sm:text-base">{loading ? "Đang xác thực..." : "Vào dashboard"}</button>
      </form>
    </div>
  );
}
