"use client";

import { ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  SquareChartGantt,
  File,
  ReceiptText,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menu = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/#" },
  { label: "Masterlist", icon: SquareChartGantt, path: "/masterlist" },
  { label: "Document Tracking", icon: File, path: "/document-entry" },
  { label: "Billing Tracking", icon: ReceiptText, path: "/billing" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen">
      {/* 🧭 SIDEBAR */}
      <aside
        className={cn(
          "bg-white border-r flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* 🔥 HEADER / LOGO */}
        <div className="h-16 flex items-center justify-between px-3 border-b">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <img
                src="/DPWH.png"
                alt="Logo"
                className="h-10 w-10 object-contain"
              />
              <div className="leading-tight">
                <div className="text-sm font-semibold text-gray-900">
                  DPWH
                </div>
                <div className="text-xs text-gray-500">
                  Project Monitoring
                </div>
              </div>
            </div>
          )}

          {/* 🔘 TOGGLE BUTTON */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-gray-100"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* 🔹 MENU */}
        <nav className="flex-1 p-2 space-y-1">
          {menu.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.path);

            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={cn(
                  "w-full flex items-center rounded-lg text-sm transition",
                  collapsed
                    ? "justify-center py-3"
                    : "gap-3 px-3 py-2",
                  active
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Icon className="h-5 w-5" />

                {/* ❗ Hide label when collapsed */}
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 🧱 MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}