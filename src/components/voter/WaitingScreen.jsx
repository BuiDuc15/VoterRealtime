export default function WaitingScreen({ message }) {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#312e81_0,_#0f172a_65%)] p-4">
      <div className="pointer-events-none absolute -top-20 left-1/3 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-1/3 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="relative w-full rounded-3xl border border-white/20 bg-white/10 p-6 text-center text-white shadow-lg backdrop-blur">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl">⏳</div>
        <p className="text-lg font-semibold">{message}</p>
        <p className="mt-2 text-sm text-slate-200">Màn hình sẽ tự cập nhật khi phiên hoặc vòng có thay đổi mới.</p>
      </div>
    </div>
  );
}

