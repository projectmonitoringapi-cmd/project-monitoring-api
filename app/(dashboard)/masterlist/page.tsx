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
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { toast } from "sonner";

export default function MasterlistPage() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const router = useRouter();

  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/masterlist?search=${encodeURIComponent(search)}&page=${page}`,
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
      const res = await fetch(`/api/masterlist/print?search=${search}`);

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "Project_Masterlist_Report.pdf"; // 🔥 file name
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
  }, [search, page]);

  return (
    <div className="p-6 bg-white min-h-screen mt-2">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Project Masterlist
            </h1>
            <p className="text-sm text-gray-500">
              Centralized project tracking records
            </p>
          </div>

          <Button
            className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
            onClick={() => router.push("/masterlist/entry")}
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        </div>

        {/* 🔍 SEARCH + PRINT */}
        <div className="flex items-center justify-between">
          {/* LEFT: Search */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search projects, status, PE..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>

          {/* RIGHT: Print Button */}
          <Button
            variant="outline"
            className="ml-4 flex items-center gap-2"
            onClick={handleDownloadPDF}
          >
            🖨️ Print
          </Button>
        </div>

        {/* TABLE */}
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Project ID</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Project Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contract ID</TableHead>
                <TableHead>Original Amount</TableHead>
                <TableHead>Revised Amount</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>NTP Date</TableHead>
                <TableHead>Original Expiry</TableHead>
                <TableHead>Extension</TableHead>
                <TableHead>Revised Expiry</TableHead>
                <TableHead>Project Engineer</TableHead>
                <TableHead>Project Inspector</TableHead>
                <TableHead>Resident Engineer</TableHead>
                <TableHead className="text-center pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={16}
                    className="text-center py-12 text-gray-500"
                  >
                    No data found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow
                    key={row.pm_id || row.project_id}
                    className="hover:bg-gray-50"
                  >
                    <TableCell>{row.project_id || "—"}</TableCell>
                    <TableCell>{row.contractor || "—"}</TableCell>
                    <TableCell>{row.project_name || "—"}</TableCell>
                    <TableCell>{row.project_location || "—"}</TableCell>
                    <TableCell>{row.contract_id || "—"}</TableCell>
                    <TableCell>
                      {row.original_contract_amount != null &&
                      row.original_contract_amount != ""
                        ? `₱${row.original_contract_amount}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {row.revised_contract_amount != null &&
                      row.revised_contract_amount != ""
                        ? `₱${row.revised_contract_amount}`
                        : "—"}
                    </TableCell>
                    <TableCell>{row.contract_duration || "—"}</TableCell>
                    <TableCell>{formatDate(row.ntp_date)}</TableCell>
                    <TableCell>
                      {formatDate(row.original_expiry_date)}
                    </TableCell>
                    <TableCell>{row.contract_time_extension || "—"}</TableCell>
                    <TableCell>{formatDate(row.revised_expiry_date)}</TableCell>
                    <TableCell>{row.project_engineer || "—"}</TableCell>
                    <TableCell>{row.project_inspector || "—"}</TableCell>
                    <TableCell>{row.resident_engineer || "—"}</TableCell>

                    {/* ACTIONS */}
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end gap-2">
                        {/* EDIT */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1.5 rounded-lg border-gray-300 
                  hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700"
                          onClick={() =>
                            router.push(`/masterlist/${row.pm_id}`)
                          }
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>

                        {/* DELETE */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1.5 rounded-lg border-red-300 text-red-600
                  hover:bg-red-50 hover:border-red-400 hover:text-red-700"
                          onClick={() => {
                            setOpenDialogId(row.pm_id);
                            setConfirmText(""); // ✅ RESET HERE
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>

                        <Dialog
                          open={openDialogId === row.pm_id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setOpenDialogId(null);
                              setConfirmText("");
                            }
                          }}
                        >
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="text-red-600">
                                Delete project?
                              </DialogTitle>
                              <DialogDescription>
                                Type Project ID to confirm:
                                <span className="font-mono ml-1">
                                  {row.project_id}
                                </span>
                              </DialogDescription>
                            </DialogHeader>

                            <Input
                              placeholder="Type Project ID"
                              value={confirmText}
                              onChange={(e) => setConfirmText(e.target.value)}
                            />

                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setOpenDialogId(null);
                                  setConfirmText("");
                                }}
                              >
                                Cancel
                              </Button>

                              <Button
                                className="bg-red-600 text-white"
                                disabled={
                                  confirmText !== row.project_id ||
                                  deletingId === row.pm_id
                                }
                                onClick={async () => {
                                  try {
                                    setDeletingId(row.pm_id);

                                    const res = await fetch(
                                      `/api/masterlist/${row.pm_id}`,
                                      { method: "DELETE" },
                                    );

                                    if (!res.ok)
                                      throw new Error("Delete failed");

                                    setData((prev) =>
                                      prev.filter((d) => d.pm_id !== row.pm_id),
                                    );

                                    toast.success("Deleted successfully");

                                    setOpenDialogId(null);
                                    setConfirmText("");
                                  } catch (err) {
                                    console.error(err);
                                    toast.error("Failed to delete");
                                  } finally {
                                    setDeletingId(null);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
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
const formatDate = (value: any) => {
  if (!value) return "—";

  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US"); // MM/DD/YYYY
};
