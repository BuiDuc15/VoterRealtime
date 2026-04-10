import {useEffect, useState} from "react";
import {motion} from "framer-motion";

function FireworkBurst({x, y, color, delay = 0}) {
    return (
        <div className="pointer-events-none absolute" style={{left: x, top: y}}>
            <motion.span
                className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{backgroundColor: color}}
                initial={{opacity: 0, scale: 0}}
                animate={{opacity: [0, 1, 0], scale: [0, 1.4, 0]}}
                transition={{duration: 1.2, ease: "easeOut", repeat: Infinity, repeatDelay: 2.2, delay}}
            />
            <motion.span
                className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border"
                style={{borderColor: color}}
                initial={{opacity: 0, scale: 0.2}}
                animate={{opacity: [0, 0.9, 0], scale: [0.2, 1.2, 1.5]}}
                transition={{duration: 1.2, ease: "easeOut", repeat: Infinity, repeatDelay: 2.2, delay}}
            />
        </div>
    );
}

export default function EndSessionCelebration({
                                                  sessionName,
                                                  roundSummaries = [],
                                                  onShowDetails,
                                              }) {

    const orderedRoundSummaries = [...roundSummaries]
        .sort((a, b) => (a.roundOrder || 0) - (b.roundOrder || 0));

    return (
        <div
            className="fixed inset-0 z-50 bg-cover bg-center"
            style={{backgroundImage: "url('/background result.original.png')"}}
        >
            <div className="absolute inset-0 bg-black/40"/>
            <div
                className="relative mx-auto flex h-full max-w-[1376px] flex-col items-center justify-center px-4 py-5 text-center sm:px-6 sm:py-8">
                <div className="w-full max-w-[950px]">
                    <div className="flex items-center justify-center">
                        <div className="w-full max-w-[60rem] text-center">
                            <p className="mt-1.5 text-sm font-bold uppercase tracking-[0.18em] text-amber-300 sm:text-base">
                                Kết quả bình chọn
                            </p>
                            <h1 className="mx-auto mt-2 w-full whitespace-normal break-words text-2xl font-black leading-tight text-white sm:text-4xl lg:text-5xl"
                                style={{textShadow: "0 8px 18px rgba(0,0,0,0.24)"}}>
                                {sessionName}
                            </h1>
                        </div>
                    </div>

                    {orderedRoundSummaries.length > 0 ? (
                        <div className="mt-8">
                            <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-amber-400 sm:text-sm">
                                Bảng vinh danh từng vòng
                            </p>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {orderedRoundSummaries.map((item, index) => {
                                    const isRoundTie = (item.winners?.length || 0) > 1;
                                    const winnerName = item.winners?.length
                                        ? item.winners.map((team) => team.name).join(" & ")
                                        : "Chưa có dữ liệu";

                                    return (
                                        <div key={item.roundId}
                                             className="relative overflow-hidden rounded-3xl border border-white/10 p-5 text-left shadow-2xl"
                                             style={{
                                                 background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05)), rgba(49, 13, 19, 0.5)",
                                                 backdropFilter: "blur(14px)"
                                             }}>
                                            <div
                                                className="absolute bottom-0 left-0 top-0 w-1.5 bg-gradient-to-b from-amber-300 via-rose-400 to-violet-400"/>
                                            <div className="flex items-center justify-between gap-3">
                                                <span
                                                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-300">
                                                    Vòng {index + 1}
                                                </span>
                                                <span
                                                    className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                                                    {isRoundTie ? "Đồng hạng" : "Thắng"}
                                                </span>
                                            </div>
                                            <p className="mt-4 text-base font-semibold uppercase tracking-widest text-slate-300 sm:text-lg">{item.roundName}</p>
                                            <p className="mt-2 text-lg font-black leading-snug text-white sm:text-xl"
                                               style={{textShadow: "0 6px 16px rgba(0,0,0,0.24)"}}>{winnerName}</p>
                                            <div className="mt-4 grid grid-cols-2 gap-3">
                                                <div
                                                    className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                                                    <p className="text-xs uppercase tracking-wider text-slate-400">Phiếu</p>
                                                    <p className="mt-1 text-3xl font-black tabular-nums text-white">{item.winnerVotes || 0}</p>
                                                </div>
                                                <div
                                                    className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                                                    <p className="text-xs uppercase tracking-wider text-slate-400">Tỷ lệ</p>
                                                    <p className="mt-1 text-3xl font-black tabular-nums text-white">{item.winnerPercent || 0}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-5 text-center">
                            <p className="text-lg font-bold text-slate-700">Chưa có dữ liệu bình chọn</p>
                        </div>
                    )}

                    {onShowDetails && (
                        <div className="mt-8 flex justify-center">
                            <button
                                type="button"
                                onClick={onShowDetails}
                                className="rounded-xl border border-indigo-200 bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-indigo-500 hover:shadow-xl sm:text-sm"
                            >
                                Xem chi tiết
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
