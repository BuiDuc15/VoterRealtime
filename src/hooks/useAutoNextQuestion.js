import { useEffect, useRef } from "react";

/**
 * Tự động chuyển câu hỏi theo 2 trigger:
 * 1) Hết timer (ends_at)
 * 2) Đã đủ phiếu từ toàn bộ voter đang online
 *
 * Điều kiện bắt buộc: câu hỏi phải có auto_next=true.
 * Hook có thể chạy ở AdminPage và DisplayPage để tăng độ ổn định.
 *
 * KHÔNG để voter tự gọi nextQuestion() sau khi vote:
 * nếu làm vậy, người đầu tiên vote sẽ đóng câu hỏi cho tất cả người còn lại.
 */
export function useAutoNextQuestion({
  currentQuestion,
  enabled = true,
  onNextQuestion,
  onlineCount = 0,
  totalVotes = 0,
}) {
  const triggered = useRef(false);

  useEffect(() => {
    if (!enabled || !currentQuestion || currentQuestion.status !== "open" || !currentQuestion.auto_next) {
      triggered.current = false;
      return undefined;
    }

    // Chuyển ngay khi tất cả voter đang online đã gửi phiếu.
    if (onlineCount > 0 && totalVotes >= onlineCount) {
      if (!triggered.current) {
        triggered.current = true;
        onNextQuestion?.();
      }
      return undefined;
    }

    if (!currentQuestion.ends_at) {
      triggered.current = false;
      return undefined;
    }

    triggered.current = false;
    const diff = currentQuestion.ends_at.toMillis() - Date.now();

    if (diff <= 0) {
      onNextQuestion?.();
      return undefined;
    }

    const timer = setTimeout(() => {
      if (!triggered.current) {
        triggered.current = true;
        onNextQuestion?.();
      }
    }, diff);

    return () => clearTimeout(timer);
  }, [
    enabled,
    currentQuestion?.id,
    currentQuestion?.status,
    currentQuestion?.auto_next,
    currentQuestion?.ends_at,
    onlineCount,
    totalVotes,
    onNextQuestion,
  ]);
}
