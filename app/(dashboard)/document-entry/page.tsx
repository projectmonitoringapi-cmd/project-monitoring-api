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

export default function MonitoringPage() {
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
        `/api/project?search=${encodeURIComponent(search)}&page=${page}`,
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
      const res = await fetch(`/api/project/print?search=${search}`);

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "Document_Tracker_Report.pdf"; // 🔥 file name
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
        {/* 🔥 HEADER */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Document Tracker
            </h1>
            <p className="text-sm text-gray-500">
              Manage and monitor all submitted documents
            </p>
          </div>

          <Button
            className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
            onClick={() => router.push("/document-entry/entry")}
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

        {/* 📊 TABLE */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Date Approved</TableHead>
                <TableHead>Updated By</TableHead>
                <TableHead>Assign PE</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-gray-500"
                  >
                    No data found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow
                    key={row.documentId}
                    className="hover:bg-gray-50 transition border-b last:border-none"
                  >
                    <TableCell className="font-medium text-gray-900">
                      {row.projectId || "—"}
                    </TableCell>

                    <TableCell>{row.documentType || "—"}</TableCell>

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

                    <TableCell>{row.dateSubmitted || "—"}</TableCell>
                    <TableCell>{row.dateApproved || "—"}</TableCell>
                    <TableCell>{row.updatedBy || "—"}</TableCell>
                    <TableCell>{row.assignPE || "—"}</TableCell>

                    <TableCell className="max-w-[220px] truncate text-gray-500">
                      {row.remarks || "—"}
                    </TableCell>

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
                            router.push(`/document-entry/${row.documentId}`)
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
                            setOpenDialogId(row.documentId);
                            setConfirmText(""); // ✅ RESET HERE
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>

                        <Dialog
                          open={openDialogId === row.documentId}
                          onOpenChange={(open) => {
                            if (!open) {
                              setOpenDialogId(null);
                              setConfirmText(""); // ✅ RESET ON CLOSE
                            }
                          }}
                        >
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="text-red-600 flex items-center gap-2">
                                <Trash2 className="h-5 w-5" />
                                Delete this record?
                              </DialogTitle>

                              <DialogDescription>
                                This action cannot be undone.
                                <br />
                                To confirm, type:
                                <span className="font-mono bg-muted px-1 py-0.5 rounded ml-1">
                                  {row.projectId}
                                </span>
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-2 mt-2">
                              <Input
                                autoFocus
                                placeholder={`Type ${row.projectId} to confirm`}
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                className={
                                  confirmText && confirmText !== row.projectId
                                    ? "border-red-500"
                                    : ""
                                }
                              />

                              {confirmText && confirmText !== row.projectId && (
                                <p className="text-xs text-red-500">
                                  Must match the Project ID exactly
                                </p>
                              )}

                              {confirmText === row.projectId && (
                                <p className="text-xs text-green-600">
                                  ✓ Match confirmed
                                </p>
                              )}
                            </div>

                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setOpenDialogId(null);
                                  setConfirmText("");
                                }}
                                disabled={deletingId === row.documentId}
                              >
                                Cancel
                              </Button>

                              <Button
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={
                                  confirmText !== row.projectId ||
                                  deletingId === row.documentId
                                }
                                onClick={async () => {
                                  try {
                                    setDeletingId(row.documentId);

                                    /* =====================================================
       1️⃣ DELETE PROJECT
    ===================================================== */
                                    const projectRes = await fetch(
                                      `/api/project/${row.documentId}`,
                                      { method: "DELETE" },
                                    );

                                    if (!projectRes.ok) {
                                      throw new Error("Project delete failed");
                                    }

                                    /* =====================================================
       2️⃣ FETCH BILLING BY projectId
    ===================================================== */
                                    try {
                                      const billingRes = await fetch(
                                        `/api/billing?projectId=${row.projectId}`,
                                      );

                                      const billingData =
                                        await billingRes.json();

                                      if (billingData?.data?.length > 0) {
                                        /* =====================================================
           3️⃣ DELETE ALL RELATED BILLING RECORDS
        ===================================================== */
                                        await Promise.all(
                                          billingData.data.map((b: any) =>
                                            fetch(
                                              `/api/billing/${b.billingId}`,
                                              {
                                                method: "DELETE",
                                              },
                                            ),
                                          ),
                                        );
                                      }
                                    } catch (billingErr) {
                                      console.warn(
                                        "Billing delete failed:",
                                        billingErr,
                                      );
                                      // ❗ do NOT block main delete
                                    }

                                    /* =====================================================
                                      4️⃣ UPDATE UI
                                    ===================================================== */
                                    setData((prev) =>
                                      prev.filter(
                                        (d) => d.documentId !== row.documentId,
                                      ),
                                    );

                                    toast.success(
                                      "Deleted successfully (with billing)",
                                    );

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
                                {deletingId === row.documentId
                                  ? "Deleting..."
                                  : "Delete"}
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

        {/* 📄 PAGINATION */}
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
