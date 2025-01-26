interface AnimatedLogoProps {
  animate?: boolean;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  primaryColor?: string;  // Color for 'que'
  secondaryColor?: string;  // Color for 'Fork'
  subtitleColor?: string;
  subtitlePosition?: 'bottom' | 'right';
  className?: string;
}

export function AnimatedLogo({
  animate = true,
  showSubtitle = true,
  size = 'md',
  primaryColor = 'text-slate-50',
  secondaryColor = 'text-blue-500',
  subtitleColor = 'text-slate-500',
  subtitlePosition = 'bottom',
  className = ''
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

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

const containerClasses = subtitlePosition === 'right' 
    ? 'flex flex-row items-center gap-3' 
    : 'flex flex-col items-center gap-3';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex items-baseline">
        <span
          className={`font-bold tracking-tight ${animationClasses.title1} ${primaryColor} ${sizeClasses[size]}`}
        >
          que
        </span>
        <span
          className={`font-black tracking-tight ${animationClasses.title2} ${secondaryColor} ${sizeClasses[size]}`}
        >
          Fork
        </span>
      </div>
      {showSubtitle && (
        <div className={`flex items-center gap-3 ${animationClasses.subtitle}`}>
          {subtitlePosition === 'bottom' && <div className="h-[1px] w-12 bg-slate-700/50" />}
          <span
            className={`text-sm ${subtitleColor} ${animationClasses.text} tracking-wider font-medium text-slate-100`}
          >
            by Somrit Dasgupta
          </span>
          {subtitlePosition === 'bottom' && <div className="h-[1px] w-12 bg-slate-700/50" />}
        </div>
      )}
    </div>
  );
}
