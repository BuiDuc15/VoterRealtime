export default function AlreadyVoted() {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 text-center shadow-sm">
      <p className="text-lg font-bold text-emerald-700">Bạn đã bình chọn ở vòng này</p>
      <p className="mt-1 text-sm text-emerald-700">Kết quả đang cập nhật theo thời gian thực. Bạn có thể theo dõi thay đổi ngay bên dưới.</p>
    </div>
  );
}

