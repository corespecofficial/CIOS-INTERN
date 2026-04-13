"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ── ProgressBar ── */

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  color?: string;
  height?: string;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  color = "bg-gradient-to-r from-[#1E88E5] to-[#42A5F5]",
  height = "h-2.5",
  showLabel = false,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-gray-400">{value} / {max}</span>
          <span className="text-xs text-gray-400 font-medium">{Math.round(pct)}%</span>
        </div>
      )}
      <div className={cn("w-full rounded-full bg-gray-800/60 overflow-hidden", height)}>
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ── XPRing ── */

interface XPRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  glowColor?: string;
  label?: string;
  className?: string;
}

export function XPRing({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color = "#1E88E5",
  glowColor = "rgba(30,136,229,0.4)",
  label,
  className,
}: XPRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, Math.max(0, value / max));
  const offset = circumference * (1 - pct);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1f2937"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 6px ${glowColor})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">
          {Math.round(pct * 100)}%
        </span>
        {label && (
          <span className="text-[10px] text-gray-400 mt-0.5">{label}</span>
        )}
      </div>
    </div>
  );
}
