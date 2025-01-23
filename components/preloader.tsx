"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatedLogo } from "./animated-logo";

export function Preloader() {
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const is404Page = () => {
      return (
        pathname === "/404" ||
        pathname === "/not-found" ||
        pathname.includes("not-found") ||
        document.title.includes("404") ||
        document
          .querySelector('meta[name="status"]')
          ?.getAttribute("content") === "404"
      );
    };

    const minLoadingTime = 2000;
    const startTime = Date.now();

    const handleLoad = () => {
      if (is404Page()) {
        setLoading(false);
        return;
      }

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      setTimeout(() => setLoading(false), remainingTime);
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, [pathname]);

  if (!loading || pathname === "/404" || pathname === "/not-found") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-slate-400/25 backdrop-blur-sm">
      <AnimatedLogo />
      <div className="flex flex-col items-center gap-2">
        <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 animate-progress rounded-full" />
        </div>
      </div>
    </div>
  );
}
