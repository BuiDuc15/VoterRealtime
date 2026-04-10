export const DISPLAY_DETAIL_SECTION_KEYS = {
  TEAM_SUMMARY: "team_summary",
  QUESTION_BREAKDOWN: "question_breakdown",
};

export const DISPLAY_DETAIL_SECTION_OPTIONS = [
  {
    key: DISPLAY_DETAIL_SECTION_KEYS.TEAM_SUMMARY,
    label: "Tóm tắt đội trong round",
    description: "Hiển thị số phiếu, phần trăm và biểu đồ so sánh các đội.",
  },
  {
    key: DISPLAY_DETAIL_SECTION_KEYS.QUESTION_BREAKDOWN,
    label: "Chi tiết từng câu hỏi",
    description: "Hiển thị breakdown vote theo từng câu hỏi trong round.",
  },
];

export const DEFAULT_DISPLAY_DETAIL_SECTIONS = DISPLAY_DETAIL_SECTION_OPTIONS.map((item) => item.key);

export function normalizeDisplayDetailSections(sessionLike) {
  const rawSections = sessionLike?.display_detail_sections;
  if (Array.isArray(rawSections)) {
    const allowed = new Set(DEFAULT_DISPLAY_DETAIL_SECTIONS);
    return [...new Set(rawSections.filter((key) => allowed.has(key)))];
  }

  return (sessionLike?.display_detail_visibility || "show") === "hide"
    ? []
    : [...DEFAULT_DISPLAY_DETAIL_SECTIONS];
}

