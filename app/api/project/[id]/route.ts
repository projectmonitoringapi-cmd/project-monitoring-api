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
      body.dateSubmitted || "",
      body.dateApproved?.trim() || "", // ✅ optional handled
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

/* ================= DELETE ================= */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // ✅ FIX: async params

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:J",
    });

    // ✅ skip header row
    const rows = (res.data.values || []).slice(1);

    // ✅ robust match (trim important)
    const rowIndex = rows.findIndex((r) => r[0]?.trim() === id.trim());

    if (rowIndex === -1) {
      console.log("❌ DELETE NOT FOUND:", id);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ✅ adjust index (because of slice + 1-based sheet)
    const actualRow = rowIndex + 2;

    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `DOCUMENT_TRACKER!A${actualRow}:J${actualRow}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
