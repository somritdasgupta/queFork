'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Terminal, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedLogo } from '@/components/animated-logo';

export const metadata = {
  title: "Not Found - queFork",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e293b" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" }
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function NotFound() {
  useEffect(() => {
    document.title = "404 | queFork";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg px-4"
      >
        <div className="mb-16">
          <AnimatedLogo 
            animate={true} 
            showSubtitle={false} 
            size="lg" 
            subtitlePosition="bottom"
            primaryColor="text-slate-900"
            secondaryColor="text-blue-500"
            subtitleColor="text-slate-500"
          />
        </div>

        {/* Error Display */}
        <div className="space-y-6 text-center mb-12">
          <h1 className="text-[180px] leading-none font-black tracking-tighter text-slate-900">
            404
          </h1>
          <p className="text-2xl font-medium text-slate-400">
            This page doesn't exist.
          </p>
        </div>

        <div className="flex justify-center gap-6">
          <Link href="/">
            <Button 
              variant="secondary"
              size="lg"
              className="bg-slate-800 hover:bg-slate-700 border-slate-700 border text-slate-400 gap-2 text-base transition-all backdrop-blur-sm"
            >
              <Terminal className="w-4 h-4" />
              Home
            </Button>
          </Link>
          <Link 
            href="https://github.com/somritdasgupta/quefork" 
            target="_blank"
          >
            <Button 
              variant="secondary"
              size="lg"
              className="bg-slate-800 hover:bg-slate-700 border-slate-700 border text-slate-400 gap-2 text-base transition-all backdrop-blur-sm"
            >
              <Github className="w-4 h-4" />
              GitHub
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
