"use client";

import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusSquare,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menu = [
  {
    label: "Monitoring",
    icon: LayoutDashboard,
    path: "/document-entry",
  },
  {
    label: "Add Document",
    icon: PlusSquare,
    path: "/document-entry/entry",
  },
  {
    label: "Document Types",
    icon: FileText,
    path: "/document-types",
  },
  {
    label: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex h-screen">
      {/* 🧭 SIDEBAR */}
      <aside className="w-64 bg-white border-r flex flex-col">
        {/* 🔥 LOGO */}
        <div className="h-16 flex items-center px-6 border-b font-bold text-lg">
          DPWH Project Monitoring
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
                    : "text-gray-600 hover:bg-gray-100"
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
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}