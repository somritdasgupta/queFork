'use client';

import { useEffect } from 'react';
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
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
            primaryColor="text-slate-200"
            secondaryColor="text-blue-500"
            subtitleColor="text-slate-500"
          />
        </div>

        <div className="space-y-6 text-center mb-12">
          <h1 className="text-[180px] leading-none font-black tracking-tighter bg-gradient-to-b from-slate-200 to-slate-600 text-transparent bg-clip-text">
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
              className="bg-slate-800/50 hover:bg-slate-700/50 border-slate-700/50 border text-slate-300 gap-2 text-base transition-all backdrop-blur-sm"
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
              className="bg-slate-800/50 hover:bg-slate-700/50 border-slate-700/50 border text-slate-300 gap-2 text-base transition-all backdrop-blur-sm"
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
