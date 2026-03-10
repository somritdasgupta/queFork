import React, { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
}

export function AppPreloader({ children }: Props) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const progressWidthClass =
    progress >= 100
      ? 'w-full'
      : progress >= 90
        ? 'w-[90%]'
        : progress >= 70
          ? 'w-[70%]'
          : progress >= 45
            ? 'w-[45%]'
            : progress >= 20
              ? 'w-[20%]'
              : 'w-0';

  const contentRevealClass =
    progress >= 100
      ? 'blur-0 opacity-100'
      : progress >= 90
        ? 'blur-[2px] opacity-90'
        : progress >= 70
          ? 'blur-[6px] opacity-70'
          : progress >= 45
            ? 'blur-[11px] opacity-45'
            : progress >= 20
              ? 'blur-[16px] opacity-20'
              : 'blur-[20px] opacity-0';

  useEffect(() => {
    // Simulate real loading stages
    const stages = [
      { target: 20, delay: 100 },   // DOM parsed
      { target: 45, delay: 300 },   // Styles loaded
      { target: 70, delay: 500 },   // Components mounted
      { target: 90, delay: 800 },   // API client ready
      { target: 100, delay: 1000 }, // Ready
    ];

    stages.forEach(({ target, delay }) => {
      setTimeout(() => setProgress(target), delay);
    });

    setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setReady(true), 400);
    }, 1200);
  }, []);

  if (ready) return <>{children}</>;

  return (
    <>
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-400 ${fadeOut ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'}`}
      >
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-[20px] font-black tracking-tight"><span className="text-foreground">que</span><span className="text-primary">Fork</span></h1>
          <div className="w-48 h-[2px] bg-border overflow-hidden">
            <div className={`h-full bg-primary transition-all duration-300 ease-out ${progressWidthClass}`} />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground/60 tracking-wider uppercase">
            {progress < 30 ? 'Initializing' : progress < 60 ? 'Loading modules' : progress < 90 ? 'Preparing workspace' : 'Ready'}
          </p>
        </div>
      </div>
      {/* Render children behind with blur */}
      <div className={`transition-all duration-500 ${contentRevealClass}`}>
        {children}
      </div>
    </>
  );
}
