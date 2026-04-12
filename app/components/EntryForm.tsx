/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { FileText, Send, ArrowLeft } from "lucide-react";

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

type FormState = {
  projectId: string;
  documentType: string;
  status: string;
  dateSubmitted: string;
  dateApproved: string;
  updatedBy: string;
  assignPE: string;
};

/* ================= COMPONENT ================= */

export default function EntryForm({
  initialData,
  isEdit = false,
}: {
  initialData?: any;
  isEdit?: boolean;
}) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
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

  /* ================= HELPERS ================= */

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  function updateChecklist(
    groupIndex: number,
    itemIndex: number,
    field: keyof ChecklistItem,
    value: string | boolean,
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

  /* ================= PREFILL ================= */

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

  /* ================= CHECKLIST ================= */

  useEffect(() => {
    if (!form.documentType) {
      setChecklist([]);
      return;
    }

    if (isEdit && initialData?.checklistJson) {
      try {
        setChecklist(JSON.parse(initialData.checklistJson));
        return;
      } catch (err) {
        console.error("Invalid checklist JSON", err);
      }
    }

    fetch(`/api/checklist?typeId=${form.documentType}`)
      .then((res) => res.json())
      .then((data) => {
        setChecklist(
          data.map((group: any) => ({
            section: group.section,
            subsection: group.subsection,
            items: group.items.map((item: any) => ({
              ...item,
              checked: false,
              remarks: "",
            })),
          })),
        );
      })
      .catch(console.error);
  }, [form.documentType, isEdit, initialData]);

  /* ================= PDF ================= */

  async function generatePDF(checklist: ChecklistGroup[]) {
    if (typeof window === "undefined") return;

    const html2pdf = (await import("html2pdf.js")).default;

    const res = await fetch("/api/project/generate-pdf", {
      method: "POST",
      body: JSON.stringify({ checklist }),
    });

    const { html } = await res.json();

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    await html2pdf()
      .set({
        margin: 10,
        filename: "checklist.pdf",
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4" },
      })
      .from(container)
      .save();

    document.body.removeChild(container);
  }

  /* ================= SUBMIT ================= */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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

    setLoading(true);

    try {
      const formattedRemarks = checklist
        .map((group) => {
          const validItems = group.items
            .filter((i) => i.checked && i.remarks?.trim())
            .map(
              (item, index) =>
                `${index + 1}. ${item.description}\nRemarks: ${item.remarks.trim()}`,
            );

          if (!validItems.length) return null;

          return [group.section, group.subsection, "", validItems.join("\n\n")]
            .filter(Boolean)
            .join("\n");
        })
        .filter(Boolean)
        .join("\n\n");

      if (!formattedRemarks) {
        toast.error("Please select checklist items with remarks");
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
              checklist,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          return data;
        },
        {
          loading: isEdit ? "Updating..." : "Saving...",
          success: isEdit ? "Updated successfully!" : "Saved successfully!",
          error: (err) => err.message || "Failed",
        },
      );

      await generatePDF(checklist);

      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Server error");
    } finally {
      setLoading(false);
    }
  }

  /* ================= UI ================= */

  return (
    <div className="h-screen flex flex-col">
      {/* HEADER */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-white">
        <FileText className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Document Tracker</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 overflow-hidden">
        {/* LEFT */}
        <div className="w-1/2 border-r bg-blue-50 p-6 overflow-y-auto">
          <InfoSection title="Project Information">
            <div className="space-y-4">
              <InfoItem
                label="Project ID"
                value={form.projectId}
                editable
                onChange={(v) => updateField("projectId", v)}
              />

              <Field label="Document Type">
                <Select
                  value={form.documentType || "__empty__"}
                  onValueChange={(v: string | null) =>
                    updateField("documentType", v && v !== "__empty__" ? v : "")
                  }
                >
                  <SelectTrigger className="w-full h-10 px-3">
                    <SelectValue>
                      {documentTypes.find((d) => d.id === form.documentType)
                        ?.description || "Select document type"}
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="__empty__">Select type</SelectItem>
                    {documentTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Status">
                <Select
                  value={form.status || "__empty__"}
                  onValueChange={(v: string | null) =>
                    updateField("status", v && v !== "__empty__" ? v : "")
                  }
                >
                  <SelectTrigger className="w-full h-10 px-3">
                    <SelectValue>{form.status || "Select status"}</SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="__empty__">Select status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <InfoItem
                label="Date Submitted"
                value={form.dateSubmitted}
                editable
                type="date"
                onChange={(v) => updateField("dateSubmitted", v)}
              />

              <InfoItem
                label="Date Approved"
                value={form.dateApproved}
                editable
                type="date"
                onChange={(v) => updateField("dateApproved", v)}
              />

              <InfoItem
                label="Updated By"
                value={form.updatedBy}
                editable
                onChange={(v) => updateField("updatedBy", v)}
              />

              <InfoItem
                label="Assign PE"
                value={form.assignPE}
                editable
                onChange={(v) => updateField("assignPE", v)}
              />
            </div>
          </InfoSection>

          {/* ACTION BAR */}
          <div className="mt-6 sticky bottom-0 bg-blue-50 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="mr-2 w-5 h-5" />
                Back
              </Button>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 px-10 text-lg bg-blue-600 text-white flex gap-2"
              >
                <Send className="w-5 h-5" />
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

        {/* RIGHT */}
        <div className="w-1/2 overflow-y-auto p-6 bg-gray-100">
          {checklist.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a document type to load checklist
            </div>
          ) : (
            <div className="space-y-6">
              {checklist.map((group, gIndex) => (
                <div
                  key={gIndex}
                  className="bg-white p-5 rounded-xl border shadow-sm"
                >
                  {/* SECTION */}
                  <h3 className="font-semibold text-blue-700 text-base">
                    {group.section}
                  </h3>

                  {/* SUBSECTION (DO NOT REMOVE) */}
                  {group.subsection && (
                    <p className="text-sm text-gray-600 mt-1 mb-3">
                      {group.subsection}
                    </p>
                  )}

                  {/* ITEMS */}
                  <div className="space-y-4">
                    {group.items.map((item, iIndex) => (
                      <div
                        key={item.id}
                        className="flex gap-3 p-3 rounded-lg"
                      >
                        {/* CHECKBOX */}
                        <Checkbox
                          className="border-2 border-gray-700 mt-1"
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

                        {/* CONTENT */}
                        <div className="flex-1 space-y-2">
                          <p className="text-sm text-gray-900 leading-relaxed">
                            <strong>{item.itemNo}.</strong> {item.description}
                          </p>

                          <Input
                            className="h-10"
                            placeholder="Remarks"
                            value={item.remarks}
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
          )}
        </div>
      </form>
    </div>
  );
}

function InfoSection({ title, children }: any) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="p-5 border rounded-xl bg-white shadow-sm">{children}</div>
    </div>
  );
}

function Grid4({ children }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {children}
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

type InfoItemProps = {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  type?: string;
};

function InfoItem({
  label,
  value,
  editable,
  onChange,
  type = "text",
}: InfoItemProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>

      {editable ? (
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full border rounded px-3 py-2 h-10"
        />
      ) : (
        <p className="border rounded px-3 py-2 bg-gray-50 h-10">
          {value || "—"}
        </p>
      )}
    </div>
  );
}
