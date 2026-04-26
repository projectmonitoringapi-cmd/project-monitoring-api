/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";

/* ================= GET CURRENT USER ================= */
async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");

  if (!session) {
    return {
      username: "system",
      name: "System",
    };
  }

  try {
    const user = JSON.parse(session.value);
    return {
      username: user.username || "system",
      name: user.name || user.username || "System",
    };
  } catch {
    return {
      username: "system",
      name: "System",
    };
  }
}

/* ================= CREATE ================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentUser = await getCurrentUser(); // ✅ FIX

    const {
      projectId,
      documentType,
      status,
      dateSubmitted,
      dateApproved,
      assignPE,
      remarks,
      checklist,
    } = body;

    if (!projectId || !documentType || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const documentId = randomUUID();

    const checklistJson = checklist ? JSON.stringify(checklist) : "";

    const sheets = await getSheetsClient();

    const cleanDateSubmitted = formatDateTime(dateSubmitted);
    const cleanDateApproved = formatDateTime(dateApproved);

    const newRow = [
      documentId,
      projectId || "",
      documentType || "",
      status || "",
      cleanDateSubmitted,
      cleanDateApproved,
      currentUser.username, // ✅ ALWAYS USE SESSION USER
      assignPE || "",
      remarks || "",
      checklistJson,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:J",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [newRow],
      },
    });

    /* ================= AUDIT LOG (CREATE) ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "CREATE",
      entity: "DOCUMENT_TRACKER",
      entityId: documentId,
      oldValue: null,
      newValue: {
        projectId,
        documentType,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      documentId,
    });
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ================= COLUMN MAP ================= */
const COLUMN_MAP = {
  documentId: 0,
  projectId: 1,
  documentType: 2,
  status: 3,
  dateSubmitted: 4,
  dateApproved: 5,
  updatedBy: 6,
  assignPE: 7,
  remarks: 8,
};

function mapRow(row: any[]) {
  return {
    documentId: row[COLUMN_MAP.documentId] || "",
    projectId: row[COLUMN_MAP.projectId] || "",
    documentType: row[COLUMN_MAP.documentType] || "",
    status: row[COLUMN_MAP.status] || "",
    dateSubmitted: row[COLUMN_MAP.dateSubmitted] || "",
    dateApproved: row[COLUMN_MAP.dateApproved] || "",
    updatedBy: row[COLUMN_MAP.updatedBy] || "",
    assignPE: row[COLUMN_MAP.assignPE] || "",
    remarks: row[COLUMN_MAP.remarks] || "",
  };
}

/* ================= DATE FORMAT ================= */
function formatDateTime(value?: string) {
  if (!value) return "";

  const d = new Date(value);
  if (isNaN(d.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/* ================= GET LIST ================= */
export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser(); // ✅ FIX

    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").toLowerCase();
    const page = Number(searchParams.get("page") || 1);
    const pageSize = 50;

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:J",
    });

    const rows = res.data.values || [];
    const data = rows.slice(1).map(mapRow);

    const filtered = search
      ? data.filter((d) =>
          [
            d.documentId,
            d.projectId,
            d.documentType,
            d.status,
            d.updatedBy,
            d.assignPE,
            d.remarks,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search),
        )
      : data;

    const total = filtered.length;

    /* ================= AUDIT LOG (READ LIST) ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "READ",
      entity: "DOCUMENT_TRACKER",
      entityId: "LIST",
      oldValue: null,
      newValue: {
        search,
        totalRecords: total,
        page,
      },
    });

    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      data: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("GET ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}