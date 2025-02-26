import { cva } from "class-variance-authority";

export const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-center overflow-hidden rounded-xl border p-4 shadow-lg transition-all text-center",
  {
    variants: {
      variant: {
        default:
          "border-slate-800/50 bg-slate-900 backdrop-blur-xl text-slate-300",
        success:
          "border-green-500/20 bg-green-500 backdrop-blur-xl text-green-300",
        error: "border-red-500/20 bg-red-500/10 backdrop-blur-xl text-red-300",
        install:
          "border-blue-500/20 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-xl text-slate-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);
