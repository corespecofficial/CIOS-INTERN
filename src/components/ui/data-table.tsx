"use client";

import React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: "default" | "danger";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  actions?: RowAction<T>[];
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  actions,
  emptyIcon,
  emptyTitle = "No data found",
  emptyDescription = "There are no records to display.",
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-16 text-gray-400",
          className
        )}
      >
        <div className="p-4 rounded-2xl bg-white/5 mb-4">
          {emptyIcon || <Inbox className="h-8 w-8" />}
        </div>
        <p className="text-sm font-medium text-gray-300">{emptyTitle}</p>
        <p className="text-xs mt-1">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-800">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
            {actions && actions.length > 0 && (
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={rowKey(row, idx)}
              className="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3 text-sm text-gray-300", col.className)}>
                  {col.render
                    ? col.render(row, idx)
                    : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
              {actions && actions.length > 0 && (
                <td className="px-4 py-3 text-sm text-right">
                  <div className="flex items-center justify-end gap-1">
                    {actions.map((action, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => action.onClick(row)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                          action.variant === "danger"
                            ? "text-red-400 hover:bg-red-500/10"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
