/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
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
  Logs,
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ================= MENU ================= */
const menu = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Masterlist", icon: SquareChartGantt, path: "/masterlist" },
  { label: "Document Tracking", icon: File, path: "/document-entry" },
  { label: "Billing Tracking", icon: ReceiptText, path: "/billing" },
  { label: "Audit Logs", icon: Logs, path: "/audit-logs", adminOnly: true },
  { label: "Users", icon: User, path: "/users", adminOnly: true },
];

/* ================= READ SESSION ================= */
function getSession() {
  try {
    if (typeof document === "undefined") return null;

    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("session="));

    if (!cookie) return null;

    const value = decodeURIComponent(cookie.split("=")[1]);

    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);

  /* ✅ Lazy init → NO useEffect, NO warning */
  const [session] = useState<any>(() => getSession());

  /* ✅ Prevent hydration mismatch */
  if (!session) return null;

  const role = (session.role || "user").toLowerCase().trim();
  const name = session.name || "User";

  /* ================= FILTER MENU ================= */
  const filteredMenu = menu.filter((item) => {
    if (item.adminOnly && role !== "admin") return false;
    return true;
  });

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      toast.success("Logged out");

      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Logout failed");
    }
  };

  return (
    <div className="flex h-screen">
      {/* SIDEBAR */}
      <aside
        className={cn(
          "bg-white border-r flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* HEADER */}
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

        {/* MENU */}
        <nav className="flex-1 p-2 space-y-1">
          {filteredMenu.map((item) => {
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
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* USER + LOGOUT */}
        <div className="border-t p-3">
          {!collapsed && (
            <div className="mb-2 text-sm text-gray-600">
              Logged in as:
              <div className="font-medium text-gray-900">{name}</div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center rounded-lg text-sm transition text-red-600 hover:bg-red-50",
              collapsed
                ? "justify-center py-3"
                : "gap-3 px-3 py-2"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}