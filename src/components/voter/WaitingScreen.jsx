export default function WaitingScreen({ message }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-slate-50 p-4">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-2xl">⏳</div>
        <p className="text-lg font-semibold text-slate-700">{message}</p>
        <p className="mt-2 text-sm text-slate-500">Màn hình sẽ tự cập nhật khi phiên hoặc vòng có thay đổi mới.</p>
      </div>
    </div>
  );
}

