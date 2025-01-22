'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedLogo } from '@/components/animated-logo';

const quotes = [
  "Looks like this page took a REST break!",
  "This endpoint returned a 404",
  "Even the best APIs have their off days!"
];

export default function NotFound() {
  const [randomQuote, setRandomQuote] = useState(quotes[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-center"
        >
          <div className="w-[200px] h-[75px]">
            <AnimatedLogo animate={false} showSubtitle={false} />
          </div>
        </motion.div>

        {/* 404 Text */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-4"
        >
          <p className="text-xl text-gray-600">{randomQuote}</p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-center gap-4"
        >
          <Link href="/">
            <Button variant="default" className="gap-2">
              <Home className="w-4 h-4" />
              Home
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
