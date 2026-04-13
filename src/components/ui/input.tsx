"use client";

import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Input ── */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-xl bg-[#0A0E1A] border border-gray-700 text-white placeholder:text-gray-500",
            "px-4 py-2.5 text-sm outline-none transition-all duration-200",
            "focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            icon && "pl-10",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
);

Input.displayName = "Input";

/* ── Textarea ── */

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-xl bg-[#0A0E1A] border border-gray-700 text-white placeholder:text-gray-500",
          "px-4 py-2.5 text-sm outline-none transition-all duration-200 min-h-[100px] resize-y",
          "focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/20",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
);

Textarea.displayName = "Textarea";

/* ── SearchInput ── */

interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onSearch?: (value: string) => void;
}

export function SearchInput({
  onSearch,
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
      <input
        type="search"
        className={cn(
          "w-full rounded-xl bg-[#0A0E1A] border border-gray-700 text-white placeholder:text-gray-500",
          "pl-10 pr-4 py-2.5 text-sm outline-none transition-all duration-200",
          "focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/20"
        )}
        onChange={(e) => onSearch?.(e.target.value)}
        {...props}
      />
    </div>
  );
}
