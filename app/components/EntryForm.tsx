/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  ClipboardList,
  CheckCircle2,
  Send,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { useRouter } from "next/navigation";

/* ================= TYPES ================= */

type DocumentType = {
  id: string;
  description: string;
};

type ChecklistItem = {
  id: string;
  itemNo: string;
  description: string;
  orderNo: number;
  checked: boolean;
  remarks: string;
};

type ChecklistGroup = {
  section: string;
  subsection: string;
  items: ChecklistItem[];
};

/* ================= COMPONENT ================= */

export default function EntryForm({
  initialData,
  isEdit = false,
}: {
  initialData?: any;
  isEdit?: boolean;
}) {
  const [form, setForm] = useState({
    projectId: "",
    documentType: "",
    status: "",
    dateSubmitted: "",
    dateApproved: "",
    updatedBy: "",
    assignPE: "",
  });

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [checklist, setChecklist] = useState<ChecklistGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateChecklist(
    groupIndex: number,
    itemIndex: number,
    field: string,
    value: any,
  ) {
    setChecklist((prev) => {
      const updated = [...prev];
      updated[groupIndex].items[itemIndex] = {
        ...updated[groupIndex].items[itemIndex],
        [field]: value,
      };
      return updated;
    });
  }

  /* ================= FETCH ================= */

  useEffect(() => {
    fetch("/api/document-types")
      .then((res) => res.json())
      .then(setDocumentTypes)
      .catch(console.error);
  }, []);

  /* ================= PREFILL (EDIT MODE) ================= */

  useEffect(() => {
    if (!initialData || documentTypes.length === 0) return;

    const matchedType = documentTypes.find(
      (d) => d.description === initialData.documentType,
    );

    setForm({
      projectId: initialData.projectId || "",
      documentType: matchedType?.id || "",
      status: initialData.status || "",
      dateSubmitted: initialData.dateSubmitted || "",
      dateApproved: initialData.dateApproved || "",
      updatedBy: initialData.updatedBy || "",
      assignPE: initialData.assignPE || "",
    });
  }, [initialData, documentTypes]);

  /* ================= CHECKLIST LOAD ================= */

  useEffect(() => {
    if (!form.documentType) {
      setChecklist([]);
      return;
    }

    // ✅ EDIT MODE → use saved JSON
    if (isEdit && initialData?.checklistJson) {
      try {
        const parsed = JSON.parse(initialData.checklistJson);
        setChecklist(parsed);
        return;
      } catch (err) {
        console.error("Invalid checklist JSON", err);
      }
    }

    // ✅ CREATE MODE → fetch checklist
    fetch(`/api/checklist?typeId=${form.documentType}`)
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((group: any) => ({
          section: group.section,
          subsection: group.subsection,
          items: group.items.map((item: any) => ({
            ...item,
            checked: false,
            remarks: "",
          })),
        }));

        setChecklist(formatted);
      })
      .catch(console.error);
  }, [form.documentType, isEdit, initialData]);

  /* ================= SUBMIT ================= */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (
        !form.projectId ||
        !form.documentType ||
        !form.status ||
        !form.dateSubmitted ||
        !form.updatedBy ||
        !form.assignPE
      ) {
        toast.error("Please fill in all required fields");
        return;
      }

      // ✅ FORMAT REMARKS (for display only)
      const formattedRemarks = checklist
        .map((group) => {
          const validItems = group.items
            .filter(
              (item) =>
                item.checked && item.remarks && item.remarks.trim() !== "",
            )
            .map((item, index) => {
              return `${index + 1}. ${item.description}\nRemarks: ${item.remarks.trim()}`;
            });

          if (validItems.length === 0) return null;

          return [
            `${group.section}`,
            group.subsection || "",
            "",
            validItems.join("\n\n"),
          ]
            .filter(Boolean)
            .join("\n");
        })
        .filter(Boolean)
        .join("\n\n");

      if (!formattedRemarks) {
        toast.error("Please select at least one checklist item with remarks");
        return;
      }

      const documentTypeDescription =
        documentTypes.find((d) => d.id === form.documentType)?.description ||
        "";

      const endpoint = isEdit
        ? `/api/project/${initialData.documentId}`
        : "/api/project";

      const method = isEdit ? "PUT" : "POST";

      await toast.promise(
        async () => {
          const res = await fetch(endpoint, {
            method,
            body: JSON.stringify({
              ...form,
              documentType: documentTypeDescription,
              remarks: formattedRemarks,
              checklist, // ✅ CRITICAL (JSON storage)
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          return data;
        },
        {
          loading: isEdit ? "Updating..." : "Saving...",
          success: isEdit ? "Updated successfully!" : "Saved successfully!",
          error: (err) => err.message || "Failed to save",
        },
      );

      router.push("/");

      if (!isEdit) {
        setChecklist([]);
        setForm({
          projectId: "",
          documentType: "",
          status: "",
          dateSubmitted: "",
          dateApproved: "",
          updatedBy: "",
          assignPE: "",
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Server error");
    } finally {
      setLoading(false);
    }
  }
  /* ================= UI ================= */

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-white shadow-sm">
        <FileText className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Document Tracker</h1>
      </div>

      {/* MAIN CONTENT */}
      <form onSubmit={handleSubmit} className="flex flex-1 overflow-hidden">
        {/* ================= LEFT (50%) ================= */}
        <div className="w-1/2 border-r bg-blue-50 p-6 overflow-y-auto">
          <div className="bg-white border-2 border-gray-300 rounded-xl p-6 space-y-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              Project Information
            </h2>

            <div className="space-y-4">
              <Input
                required
                className="h-11 text-base border-2 border-gray-300 focus:border-blue-500"
                placeholder="Project ID"
                value={form.projectId}
                onChange={(e) => updateField("projectId", e.target.value)}
              />

              {/* Document Type */}
              <Select
                value={form.documentType || "__empty__"}
                onValueChange={(v) =>
                  updateField("documentType", v && v !== "__empty__" ? v : "")
                }
              >
                <SelectTrigger className="w-full h-11 text-base border-2 border-gray-300">
                  <SelectValue placeholder="Document Type">
                    {documentTypes.find((d) => d.id === form.documentType)
                      ?.description || "Select document type"}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="__empty__">Select type</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status */}
              <Select
                value={form.status || "__empty__"}
                onValueChange={(v) =>
                  updateField("status", v && v !== "__empty__" ? v : "")
                }
              >
                <SelectTrigger className="w-full h-11 text-base border-2 border-gray-300">
                  <SelectValue placeholder="Status">
                    {form.status || "Select status"}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="__empty__">Select status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Input
                required
                className="h-11 text-base border-2 border-gray-300"
                type="date"
                value={form.dateSubmitted}
                onChange={(e) => updateField("dateSubmitted", e.target.value)}
              />

              <Input
                required
                className="h-11 text-base border-2 border-gray-300"
                type="date"
                value={form.dateApproved}
                onChange={(e) => updateField("dateApproved", e.target.value)}
              />

              <Input
                required
                className="h-11 text-base border-2 border-gray-300"
                placeholder="Updated By"
                value={form.updatedBy}
                onChange={(e) => updateField("updatedBy", e.target.value)}
              />

              <Input
                required
                className="h-11 text-base border-2 border-gray-300"
                placeholder="Assign PE"
                value={form.assignPE}
                onChange={(e) => updateField("assignPE", e.target.value)}
              />
            </div>
          </div>
          {/* Submit */}
          <div className="mt-6 sticky bottom-0 bg-blue-50 pt-4 border-t">
            <div className="flex gap-3">
              {/* 🔙 BACK BUTTON */}
              <Button
                type="button"
                variant="outline"
                className="h-12 w-1/2 bg-gray-100 hover:bg-gray-200 text-gray-800"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back
              </Button>

              {/* 🚀 SUBMIT BUTTON */}
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-1/2 text-base bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="mr-2 w-4 h-4" />
                {loading
                  ? isEdit
                    ? "Updating..."
                    : "Saving..."
                  : isEdit
                    ? "Update"
                    : "Submit"}
              </Button>
            </div>
          </div>
        </div>

        {/* ================= RIGHT (50%) ================= */}
        <div className="w-1/2 overflow-y-auto p-6 bg-gray-100">
          {checklist.length > 0 ? (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Checklist
              </h2>

              {checklist.map((group, gIndex) => (
                <div
                  key={`${group.section}-${group.subsection}`}
                  className="bg-white border-2 border-gray-300 rounded-xl p-5"
                >
                  <div className="mb-3">
                    <h3 className="font-semibold text-blue-700">
                      {group.section}
                    </h3>
                    <p className="text-sm text-gray-700">{group.subsection}</p>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item, iIndex) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-4 rounded-lg border border-gray-300 bg-white"
                      >
                        <Checkbox
                          className="w-5 h-5"
                          checked={item.checked}
                          onCheckedChange={(v) =>
                            updateChecklist(
                              gIndex,
                              iIndex,
                              "checked",
                              v === true,
                            )
                          }
                        />

                        <div className="flex-1 space-y-2">
                          <p className="text-base text-gray-900 leading-relaxed">
                            <strong>{item.itemNo}.</strong> {item.description}
                          </p>

                          <Input
                            className="h-10 text-base border-2 border-gray-300"
                            placeholder="Remarks (optional)"
                            value={item.remarks || ""}
                            onChange={(e) =>
                              updateChecklist(
                                gIndex,
                                iIndex,
                                "remarks",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-base">
              Select a document type to load checklist
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
