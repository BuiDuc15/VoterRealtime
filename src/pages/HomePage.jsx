import CreateSessionForm from "../components/home/CreateSessionForm";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-100 via-violet-50 to-sky-100 px-4 py-8 sm:py-12">
      <div className="mb-6 text-center sm:mb-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-3xl shadow-lg shadow-violet-500/30 sm:h-20 sm:w-20 sm:text-4xl">
          🗳️
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
          VoteRealtime
        </h1>
        <p className="mt-1 text-sm text-gray-500 sm:text-base">
          Công cụ bình chọn realtime cho sự kiện
        </p>
      </div>
      <CreateSessionForm />
    </div>
  );
}
