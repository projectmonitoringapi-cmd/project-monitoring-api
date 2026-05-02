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

const initialForm = {
  id: "",
  date: "",
  name: "",
  type: "",
  timeIn: "",
  timeOut: "",
  isWorkingDay: true,
};

export default function HolidaysPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<any>(initialForm);

  /* ================= FETCH ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/holidays");
      const json = await res.json();

      // 🔹 sort by date ASC
      json.sort((a: any, b: any) =>
        a.date.localeCompare(b.date)
      );

      setData(json);
    } catch {
      toast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= CREATE ================= */
  const handleCreate = async () => {
    if (!form.date || !form.name || !form.type) {
      toast.error("Required fields missing");
      return;
    }

    if (
      (form.type === "HALF" || form.type === "CUSTOM") &&
      (!form.timeIn || !form.timeOut)
    ) {
      toast.error("Time required for HALF/CUSTOM");
      return;
    }

    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: crypto.randomUUID(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Holiday added");

      setOpenAdd(false);
      setForm(initialForm);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* ================= UPDATE ================= */
  const handleUpdate = async () => {
    if (!form.date || !form.name || !form.type) {
      toast.error("Required fields missing");
      return;
    }

    try {
      const res = await fetch(`/api/holidays/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Updated successfully");

      setOpenEdit(null);
      setForm(initialForm);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/holidays/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      toast.success("Deleted successfully");
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-[1000px] mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-4">
          <h1 className="text-xl font-semibold">Holidays</h1>

          <Button
            onClick={() => {
              setForm(initialForm);
              setOpenAdd(true);
            }}
            className="bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Holiday
          </Button>
        </div>

        {/* TABLE */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.timeIn || "-"}</TableCell>
                    <TableCell>{row.timeOut || "-"}</TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setForm(row);
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

        {/* ADD */}
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Holiday</DialogTitle>
            </DialogHeader>

            <Input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm({ ...form, date: e.target.value })
              }
            />

            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <select
              className="border p-2 rounded"
              value={form.type}
              onChange={(e) => {
                const type = e.target.value;
                setForm({
                  ...form,
                  type,
                  // 🔹 auto normalize
                  isWorkingDay: type === "FULL" ? false : true,
                  timeIn: type === "FULL" ? "" : form.timeIn,
                  timeOut: type === "FULL" ? "" : form.timeOut,
                });
              }}
            >
              <option value="">Select Type</option>
              <option value="FULL">FULL</option>
              <option value="HALF">HALF</option>
              <option value="CUSTOM">CUSTOM</option>
            </select>

            {(form.type === "HALF" || form.type === "CUSTOM") && (
              <>
                <Input
                  placeholder="Time In"
                  value={form.timeIn}
                  onChange={(e) =>
                    setForm({ ...form, timeIn: e.target.value })
                  }
                />

                <Input
                  placeholder="Time Out"
                  value={form.timeOut}
                  onChange={(e) =>
                    setForm({ ...form, timeOut: e.target.value })
                  }
                />
              </>
            )}

            <DialogFooter>
              <Button onClick={handleCreate}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* EDIT */}
        <Dialog open={!!openEdit} onOpenChange={() => setOpenEdit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Holiday</DialogTitle>
            </DialogHeader>

            <Input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm({ ...form, date: e.target.value })
              }
            />

            <Input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <select
              className="border p-2 rounded"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value })
              }
            >
              <option value="FULL">FULL</option>
              <option value="HALF">HALF</option>
              <option value="CUSTOM">CUSTOM</option>
            </select>

            {(form.type === "HALF" || form.type === "CUSTOM") && (
              <>
                <Input
                  value={form.timeIn}
                  onChange={(e) =>
                    setForm({ ...form, timeIn: e.target.value })
                  }
                />

                <Input
                  value={form.timeOut}
                  onChange={(e) =>
                    setForm({ ...form, timeOut: e.target.value })
                  }
                />
              </>
            )}

            <DialogFooter>
              <Button onClick={handleUpdate}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete holiday?</DialogTitle>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button className="bg-red-600 text-white" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}