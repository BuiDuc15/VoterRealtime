export default function WaitingScreen({ message, sub, children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-start px-4 pt-16">
      <div className="mb-4 text-4xl">⏳</div>
      <h2 className="mb-2 text-center text-xl font-semibold text-gray-800">{message}</h2>
      {sub ? <p className="text-center text-sm text-gray-400">{sub}</p> : null}
      {children}
    </div>
  );
}
