interface AnimatedLogoProps {
  animate?: boolean;
  showSubtitle?: boolean;
}

export function AnimatedLogo({
  animate = true,
  showSubtitle = true,
}: AnimatedLogoProps) {
  const animationClasses = animate
    ? {
        title1: "animate-slideUp",
        title2: "animate-slideDown",
        subtitle: "opacity-0 animate-fadeIn",
        text: "animate-slideLeft",
      }
    : {
        title1: "",
        title2: "",
        subtitle: "opacity-100",
        text: "",
      };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-baseline">
        <span
          className={`text-4xl font-bold tracking-tight ${animationClasses.title1} text-slate-800`}
        >
          que
        </span>
        <span
          className={`text-4xl font-black tracking-tight ${animationClasses.title2} text-blue-600`}
        >
          Fork
        </span>
      </div>
      {showSubtitle && (
        <div className={`flex items-center gap-3 ${animationClasses.subtitle}`}>
          <div className="h-[1px] w-12 bg-slate-900" />
          <span
            className={`text-sm text-slate-900 ${animationClasses.text} tracking-wider font-semibold`}
          >
            by Somrit Dasgupta
          </span>
          <div className="h-[1px] w-12 bg-slate-900" />
        </div>
      )}
    </div>
  );
}
