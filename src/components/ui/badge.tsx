"use client";

import React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "blue" | "gold" | "green" | "red" | "purple" | "gray" | "cyan";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  pulse?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  blue: "bg-[#1E88E5]/15 text-[#1E88E5] border-[#1E88E5]/20",
  gold: "bg-[#FFC107]/15 text-[#FFC107] border-[#FFC107]/20",
  green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  red: "bg-red-500/15 text-red-400 border-red-500/20",
  purple: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  gray: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  cyan: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
};

export function Badge({
  children,
  variant = "blue",
  pulse = false,
  className,
  icon,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border",
        variantStyles[variant],
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              variant === "green" ? "bg-emerald-400" :
              variant === "red" ? "bg-red-400" :
              variant === "gold" ? "bg-[#FFC107]" :
              variant === "blue" ? "bg-[#1E88E5]" :
              variant === "purple" ? "bg-purple-400" :
              variant === "cyan" ? "bg-cyan-400" :
              "bg-gray-400"
            )}
          />
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              variant === "green" ? "bg-emerald-400" :
              variant === "red" ? "bg-red-400" :
              variant === "gold" ? "bg-[#FFC107]" :
              variant === "blue" ? "bg-[#1E88E5]" :
              variant === "purple" ? "bg-purple-400" :
              variant === "cyan" ? "bg-cyan-400" :
              "bg-gray-400"
            )}
          />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

export default Badge;
