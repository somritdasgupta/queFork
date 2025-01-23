'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Terminal, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedLogo } from '@/components/animated-logo';

export default function NotFound() {
  useEffect(() => {
    document.title = "404 | queFork";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg px-4"
      >
        {/* Logo */}
        <div className="mb-16">
          <AnimatedLogo animate={false} showSubtitle={false} />
        </div>

        {/* Error Display */}
        <div className="space-y-6 text-center mb-12">
          <h1 className="text-[180px] leading-none font-black tracking-tighter text-gray-900">
            404
          </h1>
          <p className="text-2xl font-medium text-gray-500">
            This page doesn't exist.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-6">
          <Link href="/">
            <Button 
              variant="secondary"
              size="lg"
              className="bg-slate-100 hover:bg-slate-200/80  border-slate-200 border-2 text-slate-600 gap-2 text-base transition-all backdrop-blur-sm"
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
              className="bg-slate-100 hover:bg-slate-200/80 border-slate-200 border-2 text-slate-600 gap-2 text-base transition-all backdrop-blur-sm"
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
