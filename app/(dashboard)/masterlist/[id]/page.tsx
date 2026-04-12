/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MasterlistEntryForm from "../../../components/EntryFormMasterlist";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MasterlistEditPage() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id as string | undefined;

  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await fetch(`/api/masterlist/${id}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load record");
        }

        setInitialData(json);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to load data");
        router.push("/masterlist");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading project...
      </div>
    );
  }

  return (
    <MasterlistEntryForm
      initialData={initialData}
      isEdit={true}
    />
  );
}
