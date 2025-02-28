import { cn } from "@/lib/utils";

export const LoadingDots = () => (
  <div className="flex items-center justify-center h-full">
    <div className="flex space-x-2">
      {[1, 2, 3].map((i) => (
        <div
          key={`loading-dot-${i}`}
          className={cn(
            "w-3 h-3 bg-slate-600 rounded-full",
            "animate-bounce",
            i === 1 && "animation-delay-0",
            i === 2 && "animation-delay-150",
            i === 3 && "animation-delay-300"
          )}
          style={{
            animationDuration: "1s",
            animationDelay: `${(i - 1) * 0.15}s`,
          }}
        />
      ))}
    </div>
  </div>
);
