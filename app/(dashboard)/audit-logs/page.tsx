/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

export default function AuditLogsPage() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/audit-logs?search=${encodeURIComponent(search)}&page=${page}`
      );

      const json = await res.json();

      setData(json.data || []);
      setTotalPages(json.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, page]);

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-[1200px] mx-auto space-y-6">

        {/* HEADER */}
        <div className="border-b pb-4">
          <h1 className="text-xl font-semibold">Audit Logs</h1>
          <p className="text-sm text-gray-500">
            System activity tracking
          </p>
        </div>

        {/* SEARCH */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search name, user, action..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>

        {/* TABLE */}
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    No logs found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50">

                    {/* TIME */}
                    <TableCell>{formatDate(log.timestamp)}</TableCell>

                    {/* USER */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {log.name || log.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {log.username}
                        </span>
                      </div>
                    </TableCell>

                    {/* ACTION */}
                    <TableCell>
                      <span className={getActionStyle(log.action)}>
                        {log.action}
                      </span>
                    </TableCell>

                    <TableCell>{log.entity}</TableCell>

                    {/* HUMAN READABLE CHANGES */}
                    <TableCell>
                      <details>
                        <summary className="cursor-pointer text-blue-600">
                          View
                        </summary>

                        <pre className="text-xs bg-gray-100 p-3 mt-2 rounded max-h-40 overflow-auto whitespace-pre-wrap">
                          {formatJSON(log.oldValue, log.newValue)}
                        </pre>
                      </details>
                    </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </Button>

          <span className="text-sm">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

const formatDate = (value: any) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US");
};

/* 🔥 HUMAN READABLE JSON */
const formatJSON = (oldVal: string, newVal: string) => {
  try {
    const oldObj = oldVal ? JSON.parse(oldVal) : {};
    const newObj = newVal ? JSON.parse(newVal) : {};

    const allKeys = new Set([
      ...Object.keys(oldObj || {}),
      ...Object.keys(newObj || {}),
    ]);

    const changes: string[] = [];

    allKeys.forEach((key) => {
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];

      if (oldValue === newValue) return;

      const label = formatKey(key);

      if (oldValue === undefined) {
        changes.push(`➕ ${label}: ${formatValue(newValue)}`);
      } else if (newValue === undefined) {
        changes.push(`❌ ${label}: ${formatValue(oldValue)}`);
      } else {
        changes.push(
          `✏️ ${label}: ${formatValue(oldValue)} → ${formatValue(newValue)}`
        );
      }
    });

    return changes.length ? changes.join("\n") : "No changes";
  } catch {
    return "Invalid data";
  }
};

const formatKey = (key: string) => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (str) => str.toUpperCase());
};

const formatValue = (val: any) => {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
};

/* ================= ACTION STYLES ================= */

const getActionStyle = (action: string) => {
  switch (action) {
    case "CREATE":
      return "text-green-600 font-semibold";
    case "UPDATE":
      return "text-blue-600 font-semibold";
    case "DELETE":
      return "text-red-600 font-semibold";
    case "READ":
      return "text-gray-600";
    default:
      return "text-gray-500";
  }
};