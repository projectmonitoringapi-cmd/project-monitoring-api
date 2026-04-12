/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { randomUUID } from "crypto"; // ✅ UUID generator

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      projectId,
      documentType,
      status,
      dateSubmitted,
      dateApproved,
      updatedBy,
      assignPE,
      remarks,
      checklist, // ✅ NEW (raw checklist object)
    } = body;

    // ✅ strict validation
    if (!projectId || !documentType || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ generate Document ID
    const documentId = randomUUID();

    // ✅ convert checklist → JSON string
    const checklistJson = checklist
      ? JSON.stringify(checklist)
      : "";

    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:J", // 🔥 UPDATED (added column J)
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            documentId,           // A
            projectId,            // B
            documentType,         // C
            status,               // D
            dateSubmitted || "",  // E
            dateApproved || "",   // F
            updatedBy || "",      // G
            assignPE || "",       // H
            remarks || "",        // I (formatted)
            checklistJson,        // J ✅ JSON
          ],
        ],
      },
    });

    return NextResponse.json({
      success: true,
      documentId,
    });

  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").toLowerCase();
    const page = Number(searchParams.get("page") || 1);
    const pageSize = 50;

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:I",
    });

    const rows = res.data.values || [];

    // ⚠️ Skip header row if you have one
    const data = rows.slice(1).map(mapRow);

    // 🔍 SEARCH (aligned with your columns)
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
            .includes(search)
        )
      : data;

    const total = filtered.length;

    // 📄 PAGINATION (50 rows)
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
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}