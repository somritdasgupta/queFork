export default function Offline() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-200 mb-4">
          You're Offline
        </h1>
        <p className="text-slate-400">
          Please check your internet connection and try again
        </p>
      </div>
    </div>
  );
}
