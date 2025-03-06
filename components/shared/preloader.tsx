"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatedLogo } from "./animated-logo";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, AlertCircle, CircleDot } from "lucide-react";

type LoadingStage = {
  id: string;
  label: string;
  duration: number;
  icon: React.ReactNode;
  description: string;
};

const loadingStages: LoadingStage[] = [
  {
    id: "init",
    label: "Initializing Core",
    duration: 500,
    icon: <CircleDot className="h-3.5 w-3.5" />,
    description: "Setting up application core...",
  },
  {
    id: "env",
    label: "Loading Environment",
    duration: 400,
    icon: <CircleDot className="h-3.5 w-3.5" />,
    description: "Loading environment variables and configurations...",
  },
  {
    id: "workers",
    label: "Service Workers",
    duration: 400,
    icon: <CircleDot className="h-3.5 w-3.5" />,
    description: "Initializing service workers and background tasks...",
  },
  {
    id: "api",
    label: "API Services",
    duration: 300,
    icon: <CircleDot className="h-3.5 w-3.5" />,
    description: "Setting up API interceptors and WebSocket handlers...",
  },
  {
    id: "cache",
    label: "Cache System",
    duration: 300,
    icon: <CircleDot className="h-3.5 w-3.5" />,
    description: "Preparing cache and storage systems...",
  },
  {
    id: "ready",
    label: "Finalizing",
    duration: 400,
    icon: <CircleDot className="h-3.5 w-3.5" />,
    description: "Completing initialization...",
  },
];

export function Preloader() {
  const [loading, setLoading] = useState(true);
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const shouldSkipLoader = () => {
      const path = pathname || window.location.pathname;
      const is404 =
        path === "/404" ||
        path === "/not-found" ||
        path?.includes("404") ||
        path?.includes("not-found");
      const hasErrorStatus =
        document
          .querySelector('meta[name="status"]')
          ?.getAttribute("content") === "404";
      const hasErrorTitle =
        document.title.toLowerCase().includes("404") ||
        document.title.toLowerCase().includes("not found");

      return is404 || hasErrorStatus || hasErrorTitle;
    };

    if (shouldSkipLoader()) {
      setLoading(false);
      return;
    }

    let stageTimeout: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const startLoading = () => {
      let currentProgress = 0;
      let stageIndex = 0;

      const updateProgress = () => {
        currentProgress += 1;
        setProgress(currentProgress);
      };

      const nextStage = () => {
        if (stageIndex < loadingStages.length) {
          setCurrentStage(stageIndex);
          stageIndex++;
          stageTimeout = setTimeout(
            nextStage,
            loadingStages[stageIndex - 1].duration
          );
        } else {
          clearInterval(progressInterval);
          setTimeout(() => setLoading(false), 200);
        }
      };

      progressInterval = setInterval(updateProgress, 20);
      nextStage();
    };

    if (document.readyState === "complete") {
      startLoading();
    } else {
      window.addEventListener("load", startLoading);
      return () => window.removeEventListener("load", startLoading);
    }

    return () => {
      clearTimeout(stageTimeout);
      clearInterval(progressInterval);
    };
  }, [pathname]);

  if (!loading || pathname?.includes("not-found") || pathname === "/404") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-md">
      <div className="w-full max-w-sm px-4 flex flex-col items-center gap-8">
        {/* Logo with Scale Animation */}
        <div className="animate-zoom-in">
          <AnimatedLogo
            animate={true}
            showSubtitle={true}
            size="lg"
            subtitlePosition="bottom"
            primaryColor="text-slate-50"
            secondaryColor="text-blue-500"
            subtitleColor="text-slate-200"
          />
        </div>

        {/* Loading Stage */}
        <div className="w-full space-y-4">
          {/* Current Stage Info */}
          <div className="text-center space-y-1 animate-fade-in">
            <h3 className="text-sm font-medium text-slate-200">
              {loadingStages[currentStage]?.label}
            </h3>
            <p className="text-xs text-slate-400">
              {loadingStages[currentStage]?.description}
            </p>
          </div>

          {/* Stage Indicators with Checkmarks */}
          <div className="grid grid-cols-6 gap-2">
            {loadingStages.map((stage, index) => (
              <div
                key={stage.id}
                className={cn(
                  "flex flex-col items-center transition-all duration-500",
                  index <= currentStage ? "opacity-100" : "opacity-40"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                    index < currentStage && "bg-blue-500/20 text-blue-400",
                    index === currentStage &&
                      "bg-blue-500/30 text-blue-500 ring-2 ring-blue-500/50",
                    index > currentStage && "bg-slate-800/50 text-slate-600"
                  )}
                >
                  {index < currentStage ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : index === currentStage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "h-0.5 w-full mt-2 rounded-full transition-all duration-500",
                    index <= currentStage ? "bg-blue-500" : "bg-slate-800"
                  )}
                />
              </div>
            ))}
          </div>

          {/* Progress Info */}
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-medium">
              {Math.min(progress, 100)}% Complete
            </span>
            <span className="text-slate-500">
              Stage {currentStage + 1} of {loadingStages.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
