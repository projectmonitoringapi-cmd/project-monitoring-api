/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";

const SHEET = "HOLIDAYS";
const SHEET_ID = 0; // ⚠️ replace with actual gid

/* ================= GET CURRENT USER ================= */
async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");

  if (!session) {
    return { username: "system", name: "System" };
  }

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
      range: `${SHEET}!A:G`,
    });

    const rows = res.data.values || [];

    const row = rows.find((r: any[]) => r[0] === id);

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: row[0],
      date: row[1],
      name: row[2],
      type: row[3],
      timeIn: row[4],
      timeOut: row[5],
      isWorkingDay: row[6] === "TRUE",
    });

  } catch (error) {
    console.error("GET HOLIDAY BY ID ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch holiday" },
      { status: 500 }
    );
  }
}

/* ================= PUT ================= */
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
      range: `${SHEET}!A:G`,
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((r: any[]) => r[0] === id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existingRow = rows[rowIndex];

    const oldValue = {
      id: existingRow[0],
      date: existingRow[1],
      name: existingRow[2],
      type: existingRow[3],
      timeIn: existingRow[4],
      timeOut: existingRow[5],
      isWorkingDay: existingRow[6],
    };

    // 🔴 VALIDATION
    if (!body.date || !body.name || !body.type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (
      (body.type === "HALF" || body.type === "CUSTOM") &&
      (!body.timeIn || !body.timeOut)
    ) {
      return NextResponse.json(
        { error: "TimeIn and TimeOut required" },
        { status: 400 }
      );
    }

    // 🔴 Normalize
    const finalTimeIn = body.type === "FULL" ? "" : body.timeIn || "";
    const finalTimeOut = body.type === "FULL" ? "" : body.timeOut || "";
    const finalWorkingDay =
      body.type === "FULL"
        ? "FALSE"
        : body.isWorkingDay
        ? "TRUE"
        : "FALSE";

    // 🔴 Duplicate check
    const duplicate = rows.some(
      (r, i) => r[1] === body.date && i !== rowIndex
    );

    if (duplicate) {
      return NextResponse.json(
        { error: "Holiday already exists for this date" },
        { status: 400 }
      );
    }

    const sheetRow = rowIndex + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET}!B${sheetRow}:G${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          body.date,
          body.name,
          body.type,
          finalTimeIn,
          finalTimeOut,
          finalWorkingDay,
        ]],
      },
    });

    const newValue = {
      id,
      date: body.date,
      name: body.name,
      type: body.type,
      timeIn: finalTimeIn,
      timeOut: finalTimeOut,
      isWorkingDay: finalWorkingDay,
    };

    /* ================= AUDIT (UPDATE) ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "UPDATE",
      entity: "HOLIDAYS",
      entityId: id,
      oldValue,
      newValue,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("PUT HOLIDAY ERROR:", error);

    return NextResponse.json(
      { error: "Failed to update holiday" },
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
      range: `${SHEET}!A:G`,
    });

    const rows = res.data.values || [];
    const rowIndex = rows.findIndex((r: any[]) => r[0] === id);

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = rows[rowIndex];

    const oldValue = {
      id: row[0],
      date: row[1],
      name: row[2],
      type: row[3],
      timeIn: row[4],
      timeOut: row[5],
      isWorkingDay: row[6],
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: SHEET_ID,
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
      entity: "HOLIDAYS",
      entityId: id,
      oldValue,
      newValue: null,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("DELETE HOLIDAY ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete holiday" },
      { status: 500 }
    );
  }
}