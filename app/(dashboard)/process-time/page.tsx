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

import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ProcessTimePage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const initialForm = {
    id: "",
    transaction: "",
    prescribeDays: "",
    hours: "",
  };

  const [form, setForm] = useState<any>(initialForm);

  /* ================= FETCH ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/process-time");
      const json = await res.json();
      setData(json || []);
    } catch {
      toast.error("Failed to load process time");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= CREATE ================= */
  const handleCreate = async () => {
    if (!form.transaction) {
      toast.error("Transaction is required");
      return;
    }

    try {
      const res = await fetch("/api/process-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: crypto.randomUUID(),
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Created successfully");

      setOpenAdd(false);
      setForm(initialForm);
      fetchData();
    } catch {
      toast.error("Create failed");
    }
  };

  /* ================= UPDATE ================= */
  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/process-time/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();

      toast.success("Updated successfully");

      setOpenEdit(null);
      setForm(initialForm);
      fetchData();
    } catch {
      toast.error("Update failed");
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/process-time/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast.success("Deleted successfully");

      setDeleteId(null);
      fetchData();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-[900px] mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-4">
          <h1 className="text-xl font-semibold">Process Time Config</h1>

          <Button
            onClick={() => {
              setForm(initialForm);
              setOpenAdd(true);
            }}
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Process Time
          </Button>
        </div>

        {/* TABLE */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.transaction}</TableCell>
                    <TableCell>{row.prescribeDays}</TableCell>
                    <TableCell>{row.hours}</TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setForm({
                            id: row.id,
                            transaction: row.transaction,
                            prescribeDays: row.prescribeDays,
                            hours: row.hours,
                          });
                          setOpenEdit(row);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                        Update
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => setDeleteId(row.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ================= ADD ================= */}
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Process Time</DialogTitle>
            </DialogHeader>

            <Input
              placeholder="Transaction"
              value={form.transaction}
              onChange={(e) =>
                setForm({ ...form, transaction: e.target.value })
              }
            />

            <Input
              type="number"
              placeholder="Prescribe Days"
              value={form.prescribeDays}
              onChange={(e) =>
                setForm({ ...form, prescribeDays: e.target.value })
              }
            />

            <Input
              type="number"
              placeholder="Hours"
              value={form.hours}
              onChange={(e) =>
                setForm({ ...form, hours: e.target.value })
              }
            />

            <DialogFooter>
              <Button onClick={handleCreate}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ================= EDIT ================= */}
        <Dialog open={!!openEdit} onOpenChange={() => setOpenEdit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Process Time</DialogTitle>
            </DialogHeader>

            <Input
              value={form.transaction}
              onChange={(e) =>
                setForm({ ...form, transaction: e.target.value })
              }
            />

            <Input
              type="number"
              value={form.prescribeDays}
              onChange={(e) =>
                setForm({ ...form, prescribeDays: e.target.value })
              }
            />

            <Input
              type="number"
              value={form.hours}
              onChange={(e) =>
                setForm({ ...form, hours: e.target.value })
              }
            />

            <DialogFooter>
              <Button onClick={handleUpdate}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ================= DELETE ================= */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this record?</DialogTitle>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 text-white"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}