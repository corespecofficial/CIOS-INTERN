"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabGroupProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  children?: (activeTab: string) => React.ReactNode;
}

export function TabGroup({
  tabs,
  defaultTab,
  onChange,
  className,
  children,
}: TabGroupProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id || "");

  const handleChange = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-1 p-1 bg-[#0A0E1A] rounded-xl border border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              active === tab.id ? "text-white" : "text-gray-400 hover:text-gray-200"
            )}
          >
            {active === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-0 bg-[#111827] rounded-lg border border-gray-700"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {children && <div className="mt-4">{children(active)}</div>}
    </div>
  );
}

export default TabGroup;
