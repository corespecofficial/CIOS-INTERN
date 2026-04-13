"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ── Wise quotes ── */
const quotes = [
  "Success is the sum of small efforts, repeated day in and day out.",
  "The expert in anything was once a beginner.",
  "Your limitation - it's only your imagination.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Little things make big days.",
  "It's going to be hard, but hard does not mean impossible.",
];

function randomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

/* ── Spinner ── */

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeMap = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };
  return (
    <svg
      className={cn("animate-spin text-[#1E88E5]", sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

/* ── LoadingScreen ── */

export function LoadingScreen() {
  const quote = React.useMemo(randomQuote, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0E1A]">
      {/* Logo */}
      <motion.img
        src="https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png"
        alt="CIOS"
        className="h-20 w-20 mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Animated dots */}
      <div className="flex gap-2 mb-8">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-3 w-3 rounded-full bg-[#1E88E5]"
            animate={{ y: [0, -12, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Quote */}
      <motion.p
        className="text-sm text-gray-400 text-center max-w-xs px-4 italic"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        &ldquo;{quote}&rdquo;
      </motion.p>
    </div>
  );
}

/* ── PageSkeleton ── */

interface PageSkeletonProps {
  rows?: number;
  className?: string;
}

export function PageSkeleton({ rows = 4, className }: PageSkeletonProps) {
  return (
    <div className={cn("space-y-4 animate-pulse", className)}>
      {/* Header skeleton */}
      <div className="h-8 w-48 rounded-lg bg-gray-800/60" />
      <div className="h-4 w-72 rounded-lg bg-gray-800/40" />

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-800/40" />
        ))}
      </div>

      {/* Content rows */}
      <div className="space-y-3 mt-6">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-800/30" />
        ))}
      </div>
    </div>
  );
}
