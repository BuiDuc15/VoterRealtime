import { QRCodeSVG } from "qrcode.react";

export default function DisplayWaiting({ sessionName, code, isEnded }) {
  const voteUrl = `${window.location.origin}/vote/${code}`;

  return (
    <div className="relative flex min-h-[60vh] w-full flex-col items-center justify-center text-center">
      <p className="mb-4 text-5xl sm:text-7xl">{isEnded ? "🎉" : "🗳️"}</p>
      <h1 className="text-3xl font-extrabold text-slate-800 sm:text-5xl">{sessionName || "VoteRealtime"}</h1>
      <p className="mt-3 text-base text-slate-500 sm:mt-4 sm:text-xl">
        {isEnded ? "Cảm ơn tất cả đã tham gia!" : "Sự kiện sắp bắt đầu..."}
      </p>
      {!isEnded ? (
        <div className="fixed bottom-5 right-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:bottom-7 sm:right-7 sm:p-4">
          <QRCodeSVG value={voteUrl} size={88} bgColor="#ffffff" fgColor="#1e1b4b" />
          <p className="mt-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">Quét để vote</p>
        </div>
      ) : null}
    </div>
  );
}
