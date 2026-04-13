"use client";

import React from "react";
import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  online?: boolean;
  level?: number;
  className?: string;
}

const sizeMap: Record<AvatarSize, { container: string; text: string; dot: string; badge: string }> = {
  sm: { container: "h-8 w-8", text: "text-xs", dot: "h-2 w-2 border", badge: "text-[8px] -bottom-1 -right-1 h-4 w-4" },
  md: { container: "h-10 w-10", text: "text-sm", dot: "h-2.5 w-2.5 border-2", badge: "text-[9px] -bottom-1 -right-1 h-4.5 w-4.5" },
  lg: { container: "h-14 w-14", text: "text-lg", dot: "h-3 w-3 border-2", badge: "text-[10px] -bottom-0.5 -right-0.5 h-5 w-5" },
  xl: { container: "h-20 w-20", text: "text-2xl", dot: "h-4 w-4 border-2", badge: "text-xs -bottom-0.5 -right-0.5 h-6 w-6" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const gradients = [
  "from-[#1E88E5] to-[#1565C0]",
  "from-[#FFC107] to-[#FFA000]",
  "from-emerald-400 to-emerald-600",
  "from-purple-400 to-purple-600",
  "from-rose-400 to-rose-600",
  "from-cyan-400 to-cyan-600",
];

function pickGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export function Avatar({
  src,
  name,
  size = "md",
  online,
  level,
  className,
}: AvatarProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(s.container, "rounded-full object-cover ring-2 ring-gray-800")}
        />
      ) : (
        <div
          className={cn(
            s.container,
            "rounded-full flex items-center justify-center bg-gradient-to-br ring-2 ring-gray-800 font-bold text-white",
            pickGradient(name),
            s.text
          )}
        >
          {getInitials(name)}
        </div>
      )}

      {online !== undefined && (
        <span
          className={cn(
            "absolute top-0 right-0 rounded-full border-[#111827]",
            s.dot,
            online ? "bg-emerald-400" : "bg-gray-500"
          )}
        />
      )}

      {level !== undefined && (
        <span
          className={cn(
            "absolute flex items-center justify-center rounded-full bg-[#FFC107] text-gray-900 font-bold",
            s.badge
          )}
        >
          {level}
        </span>
      )}
    </div>
  );
}

export default Avatar;
