import { useEffect, useRef } from "react";

/**
 * Tự động chuyển câu hỏi theo timeout của CHÍNH câu hỏi.
 *
 * Điều kiện bắt buộc:
 * - Câu hỏi đang open
 * - Mode câu hỏi = auto_next
 * - Có question.ends_at (được tính từ timeout câu hỏi)
 *
 * Timeout round và mode round được xử lý riêng ở useAutoNextRound.
 * Hook có thể chạy ở AdminPage và DisplayPage để tăng độ ổn định.
 *
 * KHÔNG để voter tự gọi nextQuestion() sau khi vote:
 * nếu làm vậy, người đầu tiên vote sẽ đóng câu hỏi cho tất cả người còn lại.
 */
export function useAutoNextQuestion({
  currentQuestion,
  enabled = true,
  onNextQuestion,
}) {
  const firedQuestionId = useRef(null);

  useEffect(() => {
    if (!enabled || !currentQuestion || currentQuestion.status !== "open" || !currentQuestion.auto_next) {
      return undefined;
    }

    const fireOnce = () => {
      if (firedQuestionId.current === currentQuestion.id) return;
      firedQuestionId.current = currentQuestion.id;
      onNextQuestion?.();
    };

    if (!currentQuestion.ends_at) {
      return undefined;
    }
    const diff = currentQuestion.ends_at.toMillis() - Date.now();

    if (diff <= 0) {
      fireOnce();
      return undefined;
    }

    const timer = setTimeout(() => {
      fireOnce();
    }, diff);

    return () => clearTimeout(timer);
  }, [
    enabled,
    currentQuestion?.id,
    currentQuestion?.status,
    currentQuestion?.auto_next,
    currentQuestion?.ends_at,
    onNextQuestion,
  ]);
}
