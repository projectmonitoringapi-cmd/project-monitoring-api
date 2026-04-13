import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";

/* ================= GET (BY ID) ================= */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "BILLING_TRACKER!A:I",
    });

    const rows = (res.data.values || []).slice(1);

    const match = rows.find((r) => r[0] === id);

    if (!match) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      billingId: match[0],
      projectId: match[1],
      billingType: match[2],
      billingCertificateNo: match[3],
      amount: match[4],
      dateSubmitted: match[5],
      status: match[6],
      updatedBy: match[7],
      remarks: match[8],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "GET failed" }, { status: 500 });
  }
}

/* ================= UPDATE ================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "BILLING_TRACKER!A:I",
    });

    const rows = (res.data.values || []).slice(1);

    const rowIndex = rows.findIndex(
      (r) => r[0]?.trim() === id.trim()
    );

    if (rowIndex === -1) {
      console.log("❌ BILLING ID NOT FOUND:", id);
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const actualRow = rowIndex + 2;

    const updatedRow = [
      id,                               // A billingId
      body.projectId,                   // B
      body.billingType,                 // C
      body.billingCertificateNo || "",  // D
      body.amount || "",                // E
      body.dateSubmitted || "",         // F
      body.status,                      // G
      body.updatedBy || "",             // H
      body.remarks || "",               // I
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `BILLING_TRACKER!A${actualRow}:I${actualRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}

/* ================= DELETE ================= */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "BILLING_TRACKER!A:I",
    });

    const rows = (res.data.values || []).slice(1);

    const rowIndex = rows.findIndex(
      (r) => r[0]?.trim() === id.trim()
    );

    if (rowIndex === -1) {
      console.log("❌ DELETE BILLING NOT FOUND:", id);
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const actualRow = rowIndex + 2;

    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `BILLING_TRACKER!A${actualRow}:I${actualRow}`,
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}