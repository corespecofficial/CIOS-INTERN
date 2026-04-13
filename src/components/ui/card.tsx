"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
}

export function Card({
  children,
  className,
  hover = true,
  padding = true,
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-[#111827] rounded-2xl border border-gray-800/60",
        hover &&
          "hover:border-[#1E88E5]/30 transition-all duration-300",
        padding && "p-6",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  trend?: { value: string; positive: boolean };
  borderColor?: string;
  className?: string;
}

export function StatCard({
  icon,
  value,
  label,
  trend,
  borderColor = "border-l-[#1E88E5]",
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -2 }}
      className={cn(
        "bg-[#111827] rounded-2xl border border-gray-800/60 p-5 border-l-4",
        borderColor,
        "hover:border-gray-700/80 transition-all duration-300",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/5 text-gray-400">
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend.positive
                ? "text-emerald-400 bg-emerald-400/10"
                : "text-red-400 bg-red-400/10"
            )}
          >
            {trend.positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default Card;
