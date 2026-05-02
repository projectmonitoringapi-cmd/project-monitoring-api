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
  day: "",
  timeIn: "",
  timeOut: "",
  isWorkingDay: true,
};

const dayOrder = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function OfficeHoursPage() {
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
      const res = await fetch("/api/office-hours");
      const json = await res.json();

      // 🔹 sort Monday → Sunday
      json.sort(
        (a: any, b: any) =>
          dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
      );

      setData(json);
    } catch {
      toast.error("Failed to load office hours");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= CREATE ================= */
  const handleCreate = async () => {
    if (!form.day) {
      toast.error("Day is required");
      return;
    }

    try {
      const res = await fetch("/api/office-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: crypto.randomUUID(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Office hours added");
      setOpenAdd(false);
      setForm(initialForm);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* ================= UPDATE ================= */
  const handleUpdate = async () => {
    if (!form.day) {
      toast.error("Day is required");
      return;
    }

    try {
      const res = await fetch(`/api/office-hours/${form.id}`, {
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
      const res = await fetch(`/api/office-hours/${deleteId}`, {
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
      <div className="max-w-[900px] mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-4">
          <h1 className="text-xl font-semibold">Office Hours</h1>

          <Button
            onClick={() => {
              setForm(initialForm);
              setOpenAdd(true);
            }} className="bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Office Hours
          </Button>
        </div>

        {/* TABLE */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Working</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <Loader2 className="animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.day}</TableCell>
                    <TableCell>{row.timeIn}</TableCell>
                    <TableCell>{row.timeOut}</TableCell>
                    <TableCell>
                      {row.isWorkingDay ? "Yes" : "No"}
                    </TableCell>

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
              <DialogTitle>Add Office Hours</DialogTitle>
            </DialogHeader>

            <Input
              placeholder="Day (e.g. Monday)"
              value={form.day}
              onChange={(e) =>
                setForm({ ...form, day: e.target.value })
              }
            />

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

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isWorkingDay}
                onChange={(e) =>
                  setForm({ ...form, isWorkingDay: e.target.checked })
                }
              />
              Working Day
            </label>

            <DialogFooter>
              <Button onClick={handleCreate}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* EDIT */}
        <Dialog open={!!openEdit} onOpenChange={() => setOpenEdit(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Office Hours</DialogTitle>
            </DialogHeader>

            <Input
              value={form.day}
              onChange={(e) =>
                setForm({ ...form, day: e.target.value })
              }
            />

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

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isWorkingDay}
                onChange={(e) =>
                  setForm({ ...form, isWorkingDay: e.target.checked })
                }
              />
              Working Day
            </label>

            <DialogFooter>
              <Button onClick={handleUpdate}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete record?</DialogTitle>
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