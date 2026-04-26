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

import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function UsersPage() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const initialForm = {
    id: "",
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "user",
    isActive: true,
  };

  const [form, setForm] = useState<any>(initialForm);

  /* ================= FETCH ================= */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/users?search=${encodeURIComponent(search)}`,
      );
      const json = await res.json();
      setData(json.data || []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  /* ================= CREATE ================= */
  const handleCreate = async () => {
    if (!form.name || !form.username || !form.password) {
      toast.error("All fields are required");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("User created");

      setOpenAdd(false);
      setForm(initialForm);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* ================= UPDATE ================= */
  const handleUpdate = async () => {
    if (!form.name || !form.username) {
      toast.error("Required fields missing");
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res = await fetch(`/api/users/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("User updated");

      setOpenEdit(null);
      setForm(initialForm);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/users/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      toast.success("User deleted");
      setDeleteId(null);
      fetchUsers();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-[1000px] mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-4">
          <h1 className="text-xl font-semibold">User Management</h1>

          <Button
            onClick={() => {
              setForm(initialForm); // ✅ RESET
              setOpenAdd(true);
            }} className="bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add User
          </Button>
        </div>

        {/* SEARCH */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* TABLE */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
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
                data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>{u.isActive ? "Active" : "Inactive"}</TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setForm({
                            id: u.id,
                            name: u.name,
                            username: u.username,
                            role: u.role,
                            isActive: u.isActive,
                            password: "",
                            confirmPassword: "",
                          });
                          setOpenEdit(u);
                        }}
                      >
                        <Pencil className="w-4 h-4" /> Update
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => setDeleteId(u.id)}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ================= ADD ================= */}
        <Dialog
          open={openAdd}
          onOpenChange={(open) => {
            setOpenAdd(open);
            if (!open) setForm(initialForm); // ✅ RESET on close
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
            </DialogHeader>

            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <Input
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />

            <Input
              type="password"
              placeholder="Password"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <Input
              type="password"
              placeholder="Confirm Password"
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
            />

            {/* Role */}
            <select
              className="border p-2 rounded"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>

            {/* Active */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              Active
            </label>

            <DialogFooter>
              <Button onClick={handleCreate}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ================= EDIT ================= */}
        <Dialog
          open={!!openEdit}
          onOpenChange={(open) => {
            if (!open) {
              setOpenEdit(null);
              setForm(initialForm); // ✅ RESET
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>

            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />

            <Input
              type="password"
              placeholder="New Password"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <Input
              type="password"
              placeholder="Confirm Password"
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
            />

            <select
              className="border p-2 rounded"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              Active
            </label>

            <DialogFooter>
              <Button onClick={handleUpdate}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ================= DELETE CONFIRM ================= */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User?</DialogTitle>
            </DialogHeader>

            <p>This will deactivate the user.</p>

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
