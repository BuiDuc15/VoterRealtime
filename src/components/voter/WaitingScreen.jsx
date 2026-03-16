export default function WaitingScreen({ message }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center p-4">
      <div className="w-full rounded-2xl bg-white p-6 text-center shadow">
        <p className="text-lg font-semibold text-gray-700">{message}</p>
      </div>
    </div>
  );
}

