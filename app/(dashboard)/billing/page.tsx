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

export default function MonitoringPage() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/billing?search=${encodeURIComponent(search)}&page=${page}`
      );

      const json = await res.json();

      setData(json.data || []);
      setTotalPages(json.totalPages || 1);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`/api/billing/print?search=${search}`);

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "Billing_Tracker_Report.pdf";
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, page]); // ✅ no warning now

  return (
    <div className="p-6 bg-white min-h-screen mt-2">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Billing Tracker
            </h1>
            <p className="text-sm text-gray-500">
              Manage and monitor all billing records
            </p>
          </div>
        </div>

        {/* SEARCH + PRINT */}
        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search billing..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>

          <Button
            variant="outline"
            className="ml-4 flex items-center gap-2"
            onClick={handleDownloadPDF}
          >
            🖨️ Print
          </Button>
        </div>

        {/* TABLE */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Project ID</TableHead>
                <TableHead>Billing Type</TableHead>
                <TableHead>Billing Certificate No.</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated By</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    No data found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow
                    key={row.billingId}
                    className="hover:bg-gray-50 transition border-b last:border-none"
                  >
                    <TableCell className="font-medium text-gray-900">
                      {row.projectId || "—"}
                    </TableCell>

                    <TableCell>{row.billingType || "—"}</TableCell>

                    <TableCell>{row.billingCertificateNo || "—"}</TableCell>

                    <TableCell>
                      {row.amount
                        ? Number(row.amount).toLocaleString("en-PH", {
                            style: "currency",
                            currency: "PHP",
                          })
                        : "—"}
                    </TableCell>

                    <TableCell>{row.dateSubmitted || "—"}</TableCell>

                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                          row.status === "Approved"
                            ? "bg-green-50 text-green-700"
                            : row.status === "Rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {row.status || "—"}
                      </span>
                    </TableCell>

                    <TableCell>{row.updatedBy || "—"}</TableCell>

                    <TableCell className="max-w-[220px] truncate text-gray-500">
                      {row.remarks || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>

          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

      </div>
    </div>
  );
}