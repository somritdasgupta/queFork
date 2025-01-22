export function AnimatedLogo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-baseline">
        <span className="text-4xl font-bold tracking-tight animate-slideUp text-slate-800">
          que
        </span>
        <span className="text-4xl font-black tracking-tight animate-slideDown text-blue-600">
          Fork
        </span>
      </div>
      <div className="flex items-center gap-3 opacity-0 animate-fadeIn">
        <div className="h-[1px] w-12 bg-slate-900" />
        <span className="text-sm text-slate-900 animate-slideLeft tracking-wider font-semibold">
          by Somrit Dasgupta
        </span>
        <div className="h-[1px] w-12 bg-slate-900" />
      </div>
    </div>
  );
}
