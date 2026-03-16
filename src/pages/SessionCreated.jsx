import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SessionUrlCard from "../components/shared/SessionUrlCard";

export default function SessionCreated() {
  const { code } = useParams();
  const navigate = useNavigate();

  const baseUrl = useMemo(() => window.location.origin, []);

  const voteUrl = `${baseUrl}/vote/${code}`;
  const displayUrl = `${baseUrl}/display/${code}`;
  const adminUrl = `${baseUrl}/admin/${code}`;

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl space-y-4 p-4 md:p-8">
      <div className="rounded-2xl bg-white p-5 shadow">
        <h1 className="text-2xl font-bold">✅ Session đã được tạo</h1>
        <p className="mt-2 text-gray-600">Mã session: {code}</p>
      </div>

      <SessionUrlCard title="Link Vote" icon="📱" url={voteUrl} showQR />
      <SessionUrlCard title="Màn hình chiếu" icon="📺" url={displayUrl} showQR />
      <SessionUrlCard
        title="Trang Admin"
        icon="⚙️"
        url={adminUrl}
        showQR={false}
        warning="Hãy lưu mật khẩu admin của bạn"
      />

      <button
        type="button"
        onClick={() => navigate(`/admin/${code}`)}
        className="h-12 rounded-lg bg-blue-600 px-4 font-semibold text-white"
      >
        Đi đến trang Admin →
      </button>
    </div>
  );
}

