"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { Toaster as Sonner, toast, type ToasterProps } from "sonner";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, X } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const TOAST_CONFIG = {
  viewport: {
    position:
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-2 sm:p-4",
  },
  base: {
    toast: "flex items-center justify-center text-sm min-h-[32px]",
    title: "text-sm font-medium flex items-center gap-2",
    description: "text-xs opacity-90",
    action:
      "inline-flex h-6 items-center justify-center rounded-md border border-slate-800/30 bg-transparent px-2 text-xs font-medium transition-colors hover:bg-slate-100/10 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
    close:
      "absolute right-1 top-1 rounded-md p-0.5 text-slate-400/50 opacity-0 transition-opacity hover:text-slate-400 focus:opacity-100 focus:outline-none group-hover:opacity-100",
  },
  custom: {
    container:
      "relative flex items-center gap-2 rounded-lg border backdrop-blur-2xl backdrop-saturate-150 bg-white/[0.01]",
    simple: "p-1.5 min-h-[32px]",
    normal: "p-2 min-h-[40px]",
    large: "p-2.5 min-h-[48px]",
    installPrompt: {
      wrapper:
        "border-blue-500/70 bg-slate-900/95 shadow-lg p-2 min-h-[48px] backdrop-blur-2xl backdrop-saturate-150",
      title: "text-slate-200 text-sm font-medium truncate",
      description: "text-slate-400/90 text-xs mt-0.5 truncate",
      skipButton:
        "px-2 py-1 text-xs text-slate-400/90 hover:text-slate-300 transition-colors",
      installButton:
        "px-2 py-1 text-xs bg-blue-500/10 text-blue-400/90 rounded border border-blue-500/20 hover:bg-blue-500/20 transition-colors",
    },
    successPrompt: {
      wrapper:
        "border-blue-500/70 bg-slate-900/95 shadow-lg p-2 min-h-[48px] backdrop-blur-2xl backdrop-saturate-150",
      checkmark: "text-black text-xs",
      text: "text-xs font-medium text-slate-200",
    },
  },
  sonner: {
    position: "top-center" as const,
    theme: "dark" as const,
    closeButton: false,
    richColors: true,
    expand: false,
    visibleToasts: 3,
    gap: 4,
    style: {
      maxWidth: "380px",
      width: "min-content",
      minWidth: "min(380px, 90vw)",
      padding: "0", // Remove default padding
    },
  },
};

// Toast variants using the config
export const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-center overflow-hidden rounded-lg border shadow-lg transition-all text-center backdrop-blur-2xl backdrop-saturate-150",
  {
    variants: {
      variant: {
        default:
          "border-slate-800/20 bg-slate-900/80 text-slate-300/90 p-1.5 min-h-[32px]",
        success:
          "border-green-500/20 bg-green-500/80 text-green-300/90 p-1.5 min-h-[32px]",
        error:
          "border-red-500/20 bg-red-500/80 text-red-300/90 p-2 min-h-[32px]",
        install:
          "border-blue-500/20 bg-slate-900/[0.02] text-slate-200/90 p-2.5 min-h-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Radix Toast Components
const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(TOAST_CONFIG.viewport.position, className)}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(TOAST_CONFIG.base.action, className)}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(TOAST_CONFIG.base.close, className)}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn(TOAST_CONFIG.base.title, className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn(TOAST_CONFIG.base.description, className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

// Sonner Toaster Component
export function Toaster() {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      {...TOAST_CONFIG.sonner}
      theme={theme as ToasterProps["theme"]}
      toastOptions={{
        style: TOAST_CONFIG.sonner.style,
        classNames: {
          toast: TOAST_CONFIG.base.toast,
          title: TOAST_CONFIG.base.title,
          description: TOAST_CONFIG.base.description,
          actionButton: TOAST_CONFIG.base.action,
          cancelButton: TOAST_CONFIG.base.action,
        },
      }}
    />
  );
}

// PWA Installation Toast Functions
export const showInstallPrompt = (deferredPrompt: any) => {
  toast.custom(
    (toastId) => (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          TOAST_CONFIG.custom.container,
          TOAST_CONFIG.custom.installPrompt.wrapper
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img
            src="/logo.png"
            alt="queFork logo"
            width={32}
            height={32}
            className="rounded-md object-cover antialiased"
          />
          <p className={TOAST_CONFIG.custom.installPrompt.title}>
            Install queFork
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => toast.dismiss(toastId)}
            className={TOAST_CONFIG.custom.installPrompt.skipButton}
          >
            Later
          </button>
          <button
            onClick={async () => {
              if (deferredPrompt) {
                toast.dismiss(toastId);
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === "accepted") {
                  showInstallSuccess();
                }
              }
            }}
            className={TOAST_CONFIG.custom.installPrompt.installButton}
          >
            Install
          </button>
        </div>
      </motion.div>
    ),
    {
      duration: 8000,
      className: "!p-0 !bg-transparent !border-0 !shadow-none max-w-[90vw]",
    }
  );
};

export const showInstallSuccess = () => {
  toast.custom(
    () => (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          TOAST_CONFIG.custom.container,
          TOAST_CONFIG.custom.successPrompt.wrapper
        )}
      >
        <Check
          className={cn(
            "h-4 w-4 bg-green-500 rounded-full",
            TOAST_CONFIG.custom.successPrompt.checkmark
          )}
        />
        <p className={TOAST_CONFIG.custom.successPrompt.text}>
          queFork installed successfully
        </p>
      </motion.div>
    ),
    { duration: 2000 }
  );
};

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
