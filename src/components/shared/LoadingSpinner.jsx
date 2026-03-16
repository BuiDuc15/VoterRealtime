export default function LoadingSpinner({ label = "Đang tải..." }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <div className="flex items-center gap-3 text-gray-600">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
        <span>{label}</span>
      </div>
    </div>
  );
}

