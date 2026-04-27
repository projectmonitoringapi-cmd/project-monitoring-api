/* eslint-disable @typescript-eslint/no-unused-vars */
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

import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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
        `/api/audit-logs?search=${encodeURIComponent(search)}&page=${page}`,
      );

      const json = await res.json();

      console.log("TARGET ROW:", json.data?.[2]);
      console.log("RAW newValue:", json.data?.[2]?.newValue);
      console.log("TYPE of newValue:", typeof json.data?.[2]?.newValue);

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
          <p className="text-sm text-gray-500">System activity tracking</p>
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
                          {formatJSON(log.oldValue, log.newValue, log.action)}
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
const safeParse = (val: any) => {
  if (!val) return {};

  // already object
  if (typeof val === "object") return val;

  if (typeof val === "string") {
    const str = val.trim();

    if (!str) return {};

    try {
      return JSON.parse(str);
    } catch {
      try {
        // 🔥 handle double-encoded JSON (common in Sheets)
        return JSON.parse(JSON.parse(str));
      } catch {
        console.warn("Failed to parse JSON:", str);
        return {};
      }
    }
  }

  return {};
};

const formatJSON = (oldVal: any, newVal: any, action: string) => {
  const oldObj = safeParse(oldVal);
  const newObj = safeParse(newVal);

  /* ================= CREATE ================= */
  if (action === "CREATE") {
    if (!newObj || Object.keys(newObj).length === 0) {
      return "⚠️ No data recorded for CREATE";
    }
    return formatFullObject(newObj, "Created Data");
  }

  /* ================= DELETE ================= */
  if (action === "DELETE") {
    return formatFullObject(oldObj, "Deleted Data");
  }

  /* ================= UPDATE ================= */
  if (action === "UPDATE") {
    // 🔥 HANDLE EMPTY NEW VALUE (your current issue)
    if (!newObj || Object.keys(newObj).length === 0) {
      return [
        "⚠️ Update detected but no new data recorded",
        "",
        "📌 Previous Data",
        ...formatObjectLines(oldObj),
      ].join("\n");
    }

    return formatDiff(oldObj, newObj);
  }

  /* ================= READ ================= */
  if (action === "READ") {
    return formatFullObject(newObj, "Query Details");
  }

  return "No data";
};

const formatFullObject = (obj: any, title: string) => {
  const entries = Object.entries(obj || {});

  if (entries.length === 0) return "No data";

  return [
    `📌 ${title}`,
    ...entries.map(
      ([key, value]) => `${formatKey(key)}: ${formatValue(value)}`,
    ),
  ].join("\n");
};

const formatDiff = (oldObj: any, newObj: any) => {
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  const changes: string[] = [];
  const before: string[] = [];
  const after: string[] = [];

  allKeys.forEach((key) => {
    const oldValue = oldObj[key];
    const newValue = newObj[key];

    const label = formatKey(key);

    // skip unchanged
    if (oldValue === newValue) return;

    // track diff
    if (oldValue === undefined) {
      changes.push(`➕ ${label}: ${formatValue(newValue)}`);
    } else if (newValue === undefined) {
      changes.push(`❌ ${label}: ${formatValue(oldValue)}`);
    } else {
      changes.push(
        `✏️ ${label}: ${formatValue(oldValue)} → ${formatValue(newValue)}`,
      );
    }

    // build before/after view
    if (oldValue !== undefined) {
      before.push(`${label}: ${formatValue(oldValue)}`);
    }

    if (newValue !== undefined) {
      after.push(`${label}: ${formatValue(newValue)}`);
    }
  });

  // 🔥 If everything looks deleted → backend issue fallback
  if (Object.keys(newObj).length === 0 && Object.keys(oldObj).length > 0) {
    return [
      "⚠️ Incomplete update data (backend issue)",
      "",
      "📌 Previous Data",
      ...formatObjectLines(oldObj),
    ].join("\n");
  }

  return [
    "📊 Changes",
    ...changes,
    "",
    "📌 Before",
    ...before,
    "",
    "📌 After",
    ...after,
  ].join("\n");
};

const formatObjectLines = (obj: any) => {
  return Object.entries(obj || {}).map(
    ([key, value]) => `${formatKey(key)}: ${formatValue(value)}`,
  );
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
