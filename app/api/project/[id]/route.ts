import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";

/* ================= GET (BY ID) ================= */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }, // 👈 params is Promise
) {
  try {
    const { id } = await params; // ✅ REQUIRED

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:J",
    });

    const rows = (res.data.values || []).slice(1); // skip header

    const match = rows.find((r) => r[0] === id);

    if (!match) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      documentId: match[0],
      projectId: match[1],
      documentType: match[2],
      status: match[3],
      dateSubmitted: match[4],
      dateApproved: match[5],
      updatedBy: match[6],
      assignPE: match[7],
      remarks: match[8],
      checklistJson: match[9] || "",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "GET failed" }, { status: 500 });
  }
}

/* ================= UPDATE ================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:J",
    });

    const rows = (res.data.values || []).slice(1); // skip header

    const rowIndex = rows.findIndex((r) => r[0]?.trim() === id.trim());

    if (rowIndex === -1) {
      console.log("❌ ID NOT FOUND:", id);
      console.log(
        "Sheet IDs:",
        rows.map((r) => r[0]),
      );
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const actualRow = rowIndex + 2;

    const checklistJson = body.checklist ? JSON.stringify(body.checklist) : "";

    const updatedRow = [
      id,
      body.projectId || "",
      body.documentType || "",
      body.status || "",
      formatDateTime(body.dateSubmitted),
      formatDateTime(body.dateApproved),
      body.updatedBy || "",
      body.assignPE || "",
      body.remarks || "",
      checklistJson,
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `DOCUMENT_TRACKER!A${actualRow}:J${actualRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

function formatDateTime(value?: string) {
  if (!value) return "";

  const [date, time] = value.split("T");
  if (!date || !time) return "";

  return `${date} ${time}:00`; // normalized format
}

/* ================= DELETE ================= */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const sheets = await getSheetsClient();

    /* =====================================================
       1️⃣ GET SHEET METADATA (for sheetId)
    ===================================================== */
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
    });

    const sheet = meta.data.sheets?.find(
      (s) => s.properties?.title === "DOCUMENT_TRACKER",
    );

    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error("DOCUMENT_TRACKER sheet not found");
    }

    /* =====================================================
       2️⃣ GET DATA
    ===================================================== */
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:J",
    });

    const rows = (res.data.values || []).slice(1);

    const rowIndex = rows.findIndex((r) => r[0]?.trim() === id.trim());

    if (rowIndex === -1) {
      console.log("❌ DELETE NOT FOUND:", id);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const actualRow = rowIndex + 2;

    /* =====================================================
       3️⃣ DELETE ROW (REAL DELETE)
    ===================================================== */
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: actualRow - 1, // zero-based
                endIndex: actualRow,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
