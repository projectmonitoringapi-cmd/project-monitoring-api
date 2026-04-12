import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> } // ✅ FIX
) {
  try {
    const { id: pm_id } = await context.params; // ✅ FIX

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "PROJECT_MASTERLIST!A:P",
    });

    const rows = res.data.values || [];

    const row = rows.find((r) => r[0] === pm_id);

    if (!row) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      pm_id: row[0],
      project_id: row[1] || "",
      contractor: row[2] || "",
      project_name: row[3] || "",
      project_location: row[4] || "",
      contract_id: row[5] || "",
      original_contract_amount: row[6] || "",
      revised_contract_amount: row[7] || "",
      contract_duration: row[8] || "",
      ntp_date: row[9] || "",
      original_expiry_date: row[10] || "",
      contract_time_extension: row[11] || "",
      revised_expiry_date: row[12] || "",
      project_engineer: row[13] || "",
      project_inspector: row[14] || "",
      resident_engineer: row[15] || "",
    });
  } catch (error) {
    console.error("GET BY ID ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> } // ✅ FIX
) {
  try {
    const { id: pm_id } = await context.params; // ✅ FIX
    const body = await req.json();

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "PROJECT_MASTERLIST!A:P",
    });

    const rows = res.data.values || [];

    const rowIndex = rows.findIndex((r) => r[0] === pm_id);

    if (rowIndex === -1) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    // ⚠️ Adjust if you have header row
    const sheetRow = rowIndex + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `PROJECT_MASTERLIST!A${sheetRow}:P${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            pm_id,
            body.project_id || "",
            body.contractor || "",
            body.project_name || "",
            body.project_location || "",
            body.contract_id || "",
            body.original_contract_amount || "",
            body.revised_contract_amount || "",
            body.contract_duration || "",
            body.ntp_date || "",
            body.original_expiry_date || "",
            body.contract_time_extension || "",
            body.revised_expiry_date || "",
            body.project_engineer || "",
            body.project_inspector || "",
            body.resident_engineer || "",
          ],
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pm_id } = await context.params;

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "PROJECT_MASTERLIST!A:P",
    });

    const rows = res.data.values || [];

    const rowIndex = rows.findIndex((r) => r[0] === pm_id);

    if (rowIndex === -1) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    // ⚠️ Adjust for header row
    const sheetRow = rowIndex + 1;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // ⚠️ IMPORTANT: replace if your sheet ID is different
                dimension: "ROWS",
                startIndex: sheetRow - 1,
                endIndex: sheetRow,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}