import React, { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
}

export function AppPreloader({ children }: Props) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

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
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-400"
        style={{ opacity: fadeOut ? 0 : 1, pointerEvents: fadeOut ? 'none' : 'auto' }}
      >
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-[20px] font-black tracking-tight"><span className="text-foreground">que</span><span className="text-primary">Fork</span></h1>
          <div className="w-48 h-[2px] bg-border overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground/60 tracking-wider uppercase">
            {progress < 30 ? 'Initializing' : progress < 60 ? 'Loading modules' : progress < 90 ? 'Preparing workspace' : 'Ready'}
          </p>
        </div>
      </div>
      {/* Render children behind with blur */}
      <div
        className="transition-all duration-500"
        style={{
          filter: `blur(${Math.max(0, 20 - progress / 5)}px)`,
          opacity: Math.min(1, progress / 100),
        }}
      >
        {children}
      </div>
    </>
  );
}
