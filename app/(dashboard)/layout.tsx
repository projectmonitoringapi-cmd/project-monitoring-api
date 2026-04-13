/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
"use client";

import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, PlusSquare, FileText, Settings, SquareChartGantt, File, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

const menu = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/#",
  },
  {
    label: "Masterlist",
    icon: SquareChartGantt,
    path: "/masterlist",
  },
  {
    label: "Document Tracking",
    icon: File,
    path: "/document-entry",
  },
  {
    label: "Billing Tracking",
    icon: ReceiptText,
    path: "/billing",
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex h-screen">
      {/* 🧭 SIDEBAR */}
      <aside className="w-64 bg-white border-r flex flex-col">
        {/* 🔥 LOGO */}
        <div className="h-16 flex items-center gap-3 px-4 border-b">
          <img
            src="/DPWH.png" // 🔥 put your logo in /public/logo.png
            alt="Logo"
            className="h-10 w-10 object-contain"
          />

          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-gray-900">DPWH</span>
            <span className="text-xs text-gray-500">Project Monitoring</span>
          </div>
        </div>

        {/* 🔹 MENU */}
        <nav className="flex-1 p-3 space-y-1">
          {menu.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.path);

            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
                  active
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 🧱 MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}
