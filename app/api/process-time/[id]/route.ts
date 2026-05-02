/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";

const SHEET = "PROCESS_TIME";
const SHEET_ID = 0; // ⚠️ replace

/* ================= GET CURRENT USER ================= */
async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");

  if (!session) return { username: "system", name: "System" };

  try {
    const user = JSON.parse(session.value);
    return {
      username: user.username || "system",
      name: user.name || user.username || "System",
    };
  } catch {
    return { username: "system", name: "System" };
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
    const currentUser = await getCurrentUser();

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `${SHEET}!A:D`,
    });

    const rows = res.data.values || [];

    const rowIndex = rows.findIndex((r: any[]) => r[0] === id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existing = rows[rowIndex];

    const oldValue = {
      id: existing[0],
      transaction: existing[1],
      prescribeDays: existing[2],
      hours: existing[3],
    };

    const sheetRow = rowIndex + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `${SHEET}!B${sheetRow}:D${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          body.transaction,
          Number(body.prescribeDays || 0),
          Number(body.hours || 0),
        ]],
      },
    });

    const newValue = {
      id,
      transaction: body.transaction,
      prescribeDays: Number(body.prescribeDays || 0),
      hours: Number(body.hours || 0),
    };

    /* ================= AUDIT ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "UPDATE",
      entity: "PROCESS_TIME",
      entityId: id,
      oldValue,
      newValue,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("PUT PROCESS TIME ERROR:", error);

    return NextResponse.json(
      { error: "Failed to update" },
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
    const currentUser = await getCurrentUser();

    const sheets = await getSheetsClient();

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
    });

    const sheet = meta.data.sheets?.find(
      (s) => s.properties?.title === SHEET
    );

    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error("PROCESS_TIME sheet not found");
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `${SHEET}!A:D`,
    });

    const rows = res.data.values || [];

    const rowIndex = rows.findIndex((r: any[]) => r[0] === id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = rows[rowIndex];

    const oldValue = {
      id: row[0],
      transaction: row[1],
      prescribeDays: row[2],
      hours: row[3],
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    /* ================= AUDIT ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "DELETE",
      entity: "PROCESS_TIME",
      entityId: id,
      oldValue,
      newValue: null,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("DELETE PROCESS TIME ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}