import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import CountdownBar from "../shared/CountdownBar";

export default function VoteCard({
  question,
  teams,
  questionScopeKey,
  showRoundLabel,
  roundName,
  roundEndsAt,
  roundDuration,
  questionDuration,
  onSubmit,
  submitting = false,
  submitError = null,
}) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    setSelected([]);
  }, [question?.id, questionScopeKey]);

  function toggle(teamId) {
    if (submitting) return;
    if (question.vote_mode === "single") {
      setSelected((prev) => (prev[0] === teamId ? [] : [teamId]));
    } else {
      setSelected((prev) => (prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]));
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-indigo-50/40">
      {/* Header — vibrant gradient with strong text */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-purple-700 to-violet-800 px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-8">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-white/5" />

        <div className="relative space-y-2.5 sm:space-y-3">
          {showRoundLabel ? (
            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm sm:text-xs">
              {roundName}
            </span>
          ) : null}
          <h1 className="text-xl font-bold leading-snug text-white drop-shadow-sm sm:text-2xl">
            {question.text}
          </h1>
          {question.description ? (
            <p className="text-sm leading-relaxed text-white/80 sm:text-base">{question.description}</p>
          ) : null}
          {roundEndsAt ? (
            <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/75">Thời gian round còn lại</p>
              <CountdownBar endsAt={roundEndsAt} duration={roundDuration} />
            </div>
          ) : null}
          {question.ends_at ? (
            <div className="pt-1">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/75">Thời gian câu hỏi còn lại</p>
              <CountdownBar endsAt={question.ends_at} duration={questionDuration} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-3 px-4 pb-28 pt-5 sm:space-y-4 sm:px-5 sm:pt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 sm:text-sm">
          {question.vote_mode === "single" ? "Chọn 1 đội" : "Chọn nhiều đội"}
        </p>

        {teams.map((team) => {
          const active = selected.includes(team.id);
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => toggle(team.id)}
              className={`group relative flex min-h-[72px] w-full items-center overflow-hidden rounded-2xl px-5 py-4 text-left transition-all duration-200 active:scale-[0.98] sm:min-h-[88px] sm:px-6 sm:py-5 ${
                active
                  ? "shadow-lg ring-3 ring-offset-2"
                  : "shadow-md hover:shadow-lg"
              }`}
              style={{
                backgroundColor: team.color,
                ...(active ? { ringColor: team.color } : {}),
              }}
              disabled={submitting}
            >
              {/* Subtle gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-transparent" />
              <div className={`absolute inset-0 transition-opacity duration-200 ${active ? "bg-white/10 opacity-100" : "opacity-0"}`} />

              <span className="relative z-10 text-lg font-bold tracking-wide text-white drop-shadow-sm sm:text-xl">
                {team.name}
              </span>

              {/* Checkmark indicator */}
              <span
                className={`absolute right-4 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full transition-all duration-200 sm:right-5 ${
                  active
                    ? "h-7 w-7 bg-white shadow-md sm:h-8 sm:w-8"
                    : "h-6 w-6 border-2 border-white/40 bg-white/15 sm:h-7 sm:w-7"
                }`}
              >
                {active ? <Check size={16} strokeWidth={3} style={{ color: team.color }} /> : null}
              </span>
            </button>
          );
        })}

        {submitError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
            <p className="text-sm font-medium text-red-600">{submitError}</p>
          </div>
        ) : null}
      </div>

      {/* Sticky submit */}
      <div className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white/95 px-4 pb-5 pt-3 backdrop-blur-md safe-area-pb sm:px-5">
        <button
          type="button"
          onClick={() => onSubmit(selected)}
          disabled={!selected.length || submitting}
          className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold tracking-wide transition-all duration-200 sm:h-16 sm:text-lg ${
            selected.length && !submitting
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 active:scale-[0.98]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {submitting ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Đang ghi nhận...
            </>
          ) : (
            "Gửi bình chọn"
          )}
        </button>
      </div>
    </div>
  );
}
