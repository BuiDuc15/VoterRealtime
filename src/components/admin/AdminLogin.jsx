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
      if (!snap.exists()) {
        setError("Session không tồn tại");
        return;
      }

      const stored = atob(snap.data().admin_password || "");
      if (password === stored) {
        sessionStorage.setItem(`admin_authed_${code}`, "true");
        onSuccess();
      } else {
        setError("Mật khẩu không đúng");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full space-y-4 rounded-xl bg-white p-6 shadow">
        <h1 className="text-xl font-bold">Đăng nhập admin</h1>
        <p className="text-sm text-gray-500">Session: {code}</p>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Nhập mật khẩu"
          className="h-12 w-full rounded-lg border px-3"
          minLength={4}
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-lg bg-gray-900 font-semibold text-white disabled:bg-gray-400"
        >
          {loading ? "Đang xác thực..." : "Vào dashboard"}
        </button>
      </form>
    </div>
  );
}

