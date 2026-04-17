import { NextResponse } from "next/server";

/* 🔹 MOCK DATA (replace with DB later) */
const data = [
  {
    projectId: "P-001",
    documentType: "Invoice",
    status: "Pending",
    dateSubmitted: "2026-04-10",
  },
  {
    projectId: "P-002",
    documentType: "Invoice",
    status: "Approved",
    dateSubmitted: "2026-04-11",
  },
  {
    projectId: "P-003",
    documentType: "Contract",
    status: "Returned",
    dateSubmitted: "2026-04-12",
  },
  {
    projectId: "P-004",
    documentType: "Contract",
    status: "Pending",
    dateSubmitted: "2026-04-13",
  },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    /* 🔹 FILTER */
    let filtered = data;

    if (from && to) {
      filtered = data.filter((item) => {
        const d = new Date(item.dateSubmitted);
        return d >= new Date(from) && d <= new Date(to);
      });
    }

    /* 🔹 TOTAL */
    const totalProjects = filtered.length;

    /* 🔹 STATUS COUNTS */
    const statusCounts: Record<string, number> = {};

    filtered.forEach((item) => {
      statusCounts[item.status] =
        (statusCounts[item.status] || 0) + 1;
    });

    /* 🔹 DOC MATRIX */
    const docMatrix: Record<string, any> = {};

    filtered.forEach((item) => {
      if (!docMatrix[item.documentType]) {
        docMatrix[item.documentType] = {};
      }

      docMatrix[item.documentType][item.status] =
        (docMatrix[item.documentType][item.status] || 0) + 1;
    });

    return NextResponse.json({
      totalProjects,
      statusCounts,
      docMatrix,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}