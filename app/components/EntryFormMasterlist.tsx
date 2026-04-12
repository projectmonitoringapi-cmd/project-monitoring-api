/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, ArrowLeft, Pencil, Save, XCircle, Send } from "lucide-react";
import { toast } from "sonner";

/* ================= TYPES ================= */
type FormState = {
  project_id: string;
  contractor: string;
  project_name: string;
  project_location: string;
  contract_id: string;
  original_contract_amount: string;
  revised_contract_amount: string;
  contract_duration: string;
  ntp_date: string;
  original_expiry_date: string;
  contract_time_extension: string;
  revised_expiry_date: string;
  project_engineer: string;
  project_inspector: string;
  resident_engineer: string;
};

const defaultForm: FormState = {
  project_id: "",
  contractor: "",
  project_name: "",
  project_location: "",
  contract_id: "",
  original_contract_amount: "",
  revised_contract_amount: "",
  contract_duration: "",
  ntp_date: "",
  original_expiry_date: "",
  contract_time_extension: "",
  revised_expiry_date: "",
  project_engineer: "",
  project_inspector: "",
  resident_engineer: "",
};

export default function MasterlistEntryForm({
  initialData,
  isEdit = false,
}: {
  initialData?: any;
  isEdit?: boolean;
}) {
  const router = useRouter();

  const [data, setData] = useState<FormState | null>(null);
  const [draft, setDraft] = useState<FormState | null>(null);
  const [isEditing, setIsEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ================= INIT ================= */
  useEffect(() => {
    const base = initialData ? { ...defaultForm, ...initialData } : defaultForm;

    setData(base);
    setDraft(base);
  }, [initialData]);

  /* ================= HELPERS ================= */
  const inputErrorClass = (value: string, required?: boolean) =>
    required && submitted && !value ? "border-red-500 focus:ring-red-500" : "";

  const updateField = (field: keyof FormState, value: string) => {
    setDraft((prev) => ({ ...prev!, [field]: value }));
  };

  /* ================= ACTIONS ================= */
  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setDraft(data);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!draft) return;

    setSubmitted(true);

    if (!draft.project_id || !draft.project_name) {
      toast.error("Please fill required fields");
      return;
    }

    try {
      setSaving(true);

      const endpoint = isEdit
        ? `/api/masterlist/${initialData?.pm_id}`
        : "/api/masterlist";

      const res = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!res.ok) throw new Error();

      toast.success(isEdit ? "Updated successfully" : "Created successfully");

      setData(draft);
      setIsEditing(false);

      router.push("/masterlist");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  if (!draft) return null;

  /* ================= UI ================= */
  return (
    <div className="w-11/12 mx-auto mt-10 space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileText className="text-blue-600" />
          {isEdit ? "Project Details" : "New Project"}
        </h1>
      </div>

      {/* PROJECT INFO */}
      <InfoSection title="Project Information">
        <Grid4>
          <InfoItem
            label="Project ID"
            value={draft.project_id}
            editable={isEditing && !isEdit}
            errorClass={inputErrorClass(draft.project_id, true)}
            onChange={(v) => updateField("project_id", v)}
          />

          <InfoItem
            label="Project Name"
            value={draft.project_name}
            editable={isEditing}
            errorClass={inputErrorClass(draft.project_name, true)}
            onChange={(v) => updateField("project_name", v)}
            colSpan="md:col-span-2"
          />

          <InfoItem
            label="Contractor"
            value={draft.contractor}
            editable={isEditing}
            onChange={(v) => updateField("contractor", v)}
          />

          <InfoItem
            label="Project Location"
            value={draft.project_location}
            editable={isEditing}
            onChange={(v) => updateField("project_location", v)}
            colSpan="md:col-span-2"
          />

          <InfoItem
            label="Contract ID"
            value={draft.contract_id}
            editable={isEditing}
            onChange={(v) => updateField("contract_id", v)}
          />

          <InfoItem
            label="Contract Duration"
            value={draft.contract_duration}
            editable={isEditing}
            onChange={(v) => updateField("contract_duration", v)}
          />

          <InfoItem
            label="Original Contract Amount"
            value={draft.original_contract_amount}
            editable={isEditing}
            onChange={(v) => updateField("original_contract_amount", v)}
          />

          <InfoItem
            label="Revised Contract Amount"
            value={draft.revised_contract_amount}
            editable={isEditing}
            onChange={(v) => updateField("revised_contract_amount", v)}
          />

          {/* ✅ DATE INPUTS (REPLACED) */}
          <InfoItem
            label="NTP Date"
            value={draft.ntp_date}
            editable={isEditing}
            type="date"
            onChange={(v) => updateField("ntp_date", v)}
          />

          <InfoItem
            label="Original Expiry Date"
            value={draft.original_expiry_date}
            editable={isEditing}
            type="date"
            onChange={(v) => updateField("original_expiry_date", v)}
          />

          <InfoItem
            label="Contract Time Extension"
            value={draft.contract_time_extension}
            editable={isEditing}
            onChange={(v) => updateField("contract_time_extension", v)}
          />

          <InfoItem
            label="Revised Expiry Date"
            value={draft.revised_expiry_date}
            editable={isEditing}
            type="date"
            onChange={(v) => updateField("revised_expiry_date", v)}
          />

          <InfoItem
            label="Project Engineer"
            value={draft.project_engineer}
            editable={isEditing}
            onChange={(v) => updateField("project_engineer", v)}
          />

          <InfoItem
            label="Project Inspector"
            value={draft.project_inspector}
            editable={isEditing}
            onChange={(v) => updateField("project_inspector", v)}
          />

          <InfoItem
            label="Resident Engineer"
            value={draft.resident_engineer}
            editable={isEditing}
            onChange={(v) => updateField("resident_engineer", v)}
            colSpan="md:col-span-2"
          />
        </Grid4>
      </InfoSection>

      {/* ACTION BUTTONS */}
      <div className="flex items-center justify-between mt-6">
        {/* LEFT: Back */}
        <Button
          variant="outline"
          onClick={() => router.push("/masterlist")}
          className="h-12 px-6 text-base"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>

        {/* RIGHT: Submit / Update */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 px-10 text-lg font-semibold bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        >
          <Send className="w-5 h-5" />
          {saving
            ? isEdit
              ? "Updating..."
              : "Saving..."
            : isEdit
              ? "Update"
              : "Submit"}
        </Button>
      </div>
    </div>
  );
}

/* ================= SHARED ================= */

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

type InfoItemProps = {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (value: string) => void; // ✅ FIX HERE
  errorClass?: string;
  colSpan?: string;
  type?: string;
};

function InfoItem({
  label,
  value,
  editable,
  onChange,
  errorClass = "",
  colSpan = "",
  type = "text",
}: InfoItemProps) {
  return (
    <div className={colSpan}>
      <Label className="mb-1">{label}</Label>

      {editable ? (
        <input
          type={type}
          value={value || ""}
          onChange={
            (e: React.ChangeEvent<HTMLInputElement>) =>
              onChange?.(e.target.value) // ✅ now typed correctly
          }
          className={`w-full border rounded px-3 py-2 ${errorClass}`}
        />
      ) : (
        <p className="border rounded px-3 py-2 bg-gray-50">{value || "—"}</p>
      )}
    </div>
  );
}
