"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EntryForm from "../../../components/EntryForm";
import { Progress } from "@/components/ui/progress";

export default function EntryPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    if (!id) return;

    // 🔄 fake progress animation
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 200);

    fetch(`/api/project/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((res) => {
        setData(res);
        setProgress(100);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      })
      .finally(() => {
        clearInterval(interval);
      });

    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-64 space-y-2 text-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-red-500">Record not found</div>;
  }

  return <EntryForm initialData={data} isEdit />;
}
