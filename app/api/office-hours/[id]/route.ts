/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";

const SHEET = "OFFICE_HOURS";
const SHEET_ID = 0; // ⚠️ replace with actual gid

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

/* ================= GET ================= */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID!;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET}!A:E`,
    });

    const rows = res.data.values || [];

    const row = rows.find((r: any[]) => r[0] === id);

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row[0],
      day: row[1],
      timeIn: row[2],
      timeOut: row[3],
      isWorkingDay: row[4] === "TRUE",
    });

  } catch (error) {
    console.error("GET OFFICE HOURS BY ID ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch office hours" },
      { status: 500 }
    );
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
    const spreadsheetId = process.env.SPREADSHEET_ID!;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET}!A:E`,
    });

    const rows = res.data.values || [];

    const rowIndex = rows.findIndex((r: any[]) => r[0] === id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existingRow = rows[rowIndex];

    const oldValue = {
      id: existingRow[0],
      day: existingRow[1],
      timeIn: existingRow[2],
      timeOut: existingRow[3],
      isWorkingDay: existingRow[4],
    };

    // 🔴 Validation
    if (!body.day) {
      return NextResponse.json(
        { error: "Day is required" },
        { status: 400 }
      );
    }

    // 🔴 Prevent duplicate day
    const duplicate = rows.some(
      (r, i) => r[1] === body.day && i !== rowIndex
    );

    if (duplicate) {
      return NextResponse.json(
        { error: "Office hours already exist for this day" },
        { status: 400 }
      );
    }

    // 🔴 Normalize
    const workingDay = body.isWorkingDay ? "TRUE" : "FALSE";

    const sheetRow = rowIndex + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET}!B${sheetRow}:E${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          body.day,
          body.timeIn || "",
          body.timeOut || "",
          workingDay,
        ]],
      },
    });

    const newValue = {
      id,
      day: body.day,
      timeIn: body.timeIn || "",
      timeOut: body.timeOut || "",
      isWorkingDay: workingDay,
    };

    /* ================= AUDIT (UPDATE) ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "UPDATE",
      entity: "OFFICE_HOURS",
      entityId: id,
      oldValue,
      newValue,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("PUT OFFICE HOURS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to update office hours" },
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
    const spreadsheetId = process.env.SPREADSHEET_ID!;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET}!A:E`,
    });

    const rows = res.data.values || [];

    const rowIndex = rows.findIndex((r: any[]) => r[0] === id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = rows[rowIndex];

    const oldValue = {
      id: row[0],
      day: row[1],
      timeIn: row[2],
      timeOut: row[3],
      isWorkingDay: row[4],
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: SHEET_ID, // ⚠️ replace
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    /* ================= AUDIT (DELETE) ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "DELETE",
      entity: "OFFICE_HOURS",
      entityId: id,
      oldValue,
      newValue: null,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("DELETE OFFICE HOURS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete office hours" },
      { status: 500 }
    );
  }
}