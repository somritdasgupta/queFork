"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedLogo } from "@/components/shared/animated-logo";

export default function NotFound() {
  useEffect(() => {
    document.title = "404 | queFork";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div>
          <AnimatedLogo
            animate={true}
            showSubtitle={true}
            size="lg"
            primaryColor="text-slate-200"
            secondaryColor="text-blue-500"
            subtitleColor="text-slate-300"
          />
        </div>

        {/* Error Graphic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="my-16 relative"
        >
          {/* Decorative circles */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-blue-500/5 animate-pulse" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-blue-500/5 animate-pulse delay-75" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 rounded-full bg-blue-500/5 animate-pulse delay-150" />
          </div>
          <div className="relative text-center">
            <div className="text-[160px] font-black tracking-tighter text-slate-800 relative z-10">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <span className="text-[150px] font-black tracking-tighter bg-gradient-to-b from-slate-200 via-slate-400 to-transparent bg-clip-text text-transparent">
                404
              </span>
            </div>
            {/* Glowing orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl" />
          </div>
        </motion.div>

        {/* Error Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6 text-center"
        >
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-200">
              Page Not Found
            </h2>
            <p className="text-sm text-slate-400">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Action Button */}
          <div>
            <Link href="/">
              <Button
                variant="default"
                className="p-4 bg-blue-600/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20 gap-2"
              >
                <Terminal className="w-4" />
                Return Home
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
