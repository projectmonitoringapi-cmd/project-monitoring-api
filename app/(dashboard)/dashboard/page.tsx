"use client";

import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  /* ✅ APPLIED FILTER (IMPORTANT) */
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  /* 🔹 KPI STATES */
  const [totalProjects, setTotalProjects] = useState(0);
  const [pending, setPending] = useState(0);
  const [approved, setApproved] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [compiled, setCompiled] = useState(0);

  const [loading, setLoading] = useState(false);

  /* 🔹 TABLE STATE */
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  const statuses = ["Pending", "Approved", "Returned", "Compiled"];

  /* 🔥 FETCH KPI */
  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);

        let query = "";
        if (appliedFrom && appliedTo) {
          query = `?from=${appliedFrom}&to=${appliedTo}`;
        }

        const [
          totalRes,
          pendingRes,
          approvedRes,
          rejectedRes,
          compiledRes,
        ] = await Promise.all([
          fetch(`/api/dashboard/totalProject${query}`),
          fetch(`/api/dashboard/pending${query}`),
          fetch(`/api/dashboard/approved${query}`),
          fetch(`/api/dashboard/rejected${query}`),
          fetch(`/api/dashboard/compiled${query}`),
        ]);

        const totalData = await totalRes.json();
        const pendingData = await pendingRes.json();
        const approvedData = await approvedRes.json();
        const rejectedData = await rejectedRes.json();
        const compiledData = await compiledRes.json();

        setTotalProjects(totalData.totalProjects || 0);
        setPending(pendingData.total || 0);
        setApproved(approvedData.total || 0);
        setRejected(rejectedData.total || 0);
        setCompiled(compiledData.total || 0);

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [appliedFrom, appliedTo]);

  /* 🔥 FETCH DOCUMENT TYPE BREAKDOWN */
  useEffect(() => {
    async function fetchDocTypes() {
      try {
        setLoadingTable(true);

        let url = "/api/dashboard/docTypeBreakdown";

        if (appliedFrom && appliedTo) {
          url += `?from=${appliedFrom}&to=${appliedTo}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        setDocTypes(data || []);
      } catch (error) {
        console.error("DocType fetch error:", error);
        setDocTypes([]);
      } finally {
        setLoadingTable(false);
      }
    }

    fetchDocTypes();
  }, [appliedFrom, appliedTo]);

  /* ✅ APPLY FILTER */
  const handleApply = () => {
    if (from && to && new Date(from) > new Date(to)) {
      alert("From date cannot be later than To date");
      return;
    }

    setAppliedFrom(from);
    setAppliedTo(to);
  };

  /* ✅ CLEAR FILTER */
  const handleClear = () => {
    setFrom("");
    setTo("");
    setAppliedFrom("");
    setAppliedTo("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Dashboard Overview
        </h1>
      </div>

      {/* FILTER */}
      <div className="bg-white border rounded-2xl shadow-sm p-4 flex gap-4 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            className="border rounded-lg px-3 py-2 text-sm"
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            className="border rounded-lg px-3 py-2 text-sm"
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        {/* ACTION BUTTONS */}
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          onClick={handleApply}
        >
          Apply
        </button>

        <button
          className="border px-4 py-2 rounded-lg text-sm"
          onClick={handleClear}
        >
          Clear
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card title="Total Projects" value={loading ? "..." : totalProjects} highlight />
        <Card title="Pending" value={loading ? "..." : pending} />
        <Card title="Approved" value={loading ? "..." : approved} />
        <Card title="Returned" value={loading ? "..." : rejected} />
        <Card title="Compiled" value={loading ? "..." : compiled} />
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-2xl shadow-sm p-4">
        <h2 className="text-md font-semibold text-gray-700 mb-4">
          Document Type Breakdown
        </h2>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="text-left p-2">Document Type</th>
              {statuses.map((s) => (
                <th key={s} className="p-2 text-center">{s}</th>
              ))}
              <th className="p-2 text-center">Total</th>
            </tr>
          </thead>

          <tbody>
            {loadingTable ? (
              <tr>
                <td colSpan={statuses.length + 2} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : docTypes.length === 0 ? (
              <tr>
                <td colSpan={statuses.length + 2} className="text-center p-4">
                  No data available
                </td>
              </tr>
            ) : (
              docTypes.map((row: any) => (
                <tr key={row.documentType} className="border-b">
                  <td className="p-2">{row.documentType}</td>

                  {statuses.map((s) => (
                    <td key={s} className="p-2 text-center">
                      {row[s] || 0}
                    </td>
                  ))}

                  <td className="p-2 text-center font-semibold">
                    {row.total || 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* 🔹 CARD */
function Card({ title, value, highlight }: any) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm bg-white ${
        highlight ? "border-blue-500" : ""
      }`}
    >
      <p className="text-xs text-gray-500">{title}</p>
      <h2 className="text-2xl font-semibold mt-1">{value}</h2>
    </div>
  );
}