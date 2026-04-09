/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { FileText, ClipboardList, CheckCircle2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

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

export default function EntryForm() {
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
  const [message, setMessage] = useState("");

  function updateField(field: string, value: string) {
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

  useEffect(() => {
    if (!form.documentType) {
      setChecklist([]);
      return;
    }

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
  }, [form.documentType]);

  /* ================= SUBMIT ================= */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const flatChecklist = checklist.flatMap((group) =>
        group.items.map((item) => ({
          checklistId: item.id,
          checked: item.checked,
          remarks: item.remarks,
        })),
      );

      const res = await fetch("/api/project", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          checklist: flatChecklist,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("✅ Saved successfully!");
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
    } catch (err: any) {
      setMessage("❌ " + err.message);
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
                className="h-11 text-base border-2 border-gray-300"
                type="date"
                value={form.dateSubmitted}
                onChange={(e) => updateField("dateSubmitted", e.target.value)}
              />

              <Input
                className="h-11 text-base border-2 border-gray-300"
                type="date"
                value={form.dateApproved}
                onChange={(e) => updateField("dateApproved", e.target.value)}
              />

              <Input
                className="h-11 text-base border-2 border-gray-300"
                placeholder="Updated By"
                value={form.updatedBy}
                onChange={(e) => updateField("updatedBy", e.target.value)}
              />

              <Input
                className="h-11 text-base border-2 border-gray-300"
                placeholder="Assign PE"
                value={form.assignPE}
                onChange={(e) => updateField("assignPE", e.target.value)}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="mt-6 sticky bottom-0 bg-blue-50 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="mr-2 w-4 h-4" />
              {loading ? "Saving..." : "Submit"}
            </Button>

            {message && <p className="text-sm text-gray-700 mt-2">{message}</p>}
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
                            updateChecklist(gIndex, iIndex, "checked", v)
                          }
                        />

                        <div className="flex-1 space-y-2">
                          <p className="text-base text-gray-900 leading-relaxed">
                            <strong>{item.itemNo}.</strong> {item.description}
                          </p>

                          <Input
                            className="h-10 text-base border-2 border-gray-300"
                            placeholder="Remarks (optional)"
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
