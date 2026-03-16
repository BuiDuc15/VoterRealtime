import CreateSessionForm from "../components/home/CreateSessionForm";

export default function HomePage() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl p-4 md:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Voting Realtime</h1>
        <p className="mt-2 text-gray-600">Tạo session và nhận ngay link Vote / Display / Admin.</p>
      </div>
      <CreateSessionForm />
    </div>
  );
}

