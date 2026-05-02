/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";

const SHEET = "HOLIDAYS";

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

/* ================= GET ================= */
export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID!;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET}!A:G`,
    });

    const rows = res.data.values || [];

    const data = rows.slice(1).map((r) => ({
      id: r[0],
      date: r[1],
      name: r[2],
      type: r[3],
      timeIn: r[4],
      timeOut: r[5],
      isWorkingDay: r[6] === "TRUE",
    }));

    /* ================= AUDIT (READ LIST) ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "READ",
      entity: "HOLIDAYS",
      entityId: "LIST",
      oldValue: null,
      newValue: {
        totalRecords: data.length,
      },
    });

    return NextResponse.json(data);

  } catch (error) {
    console.error("GET HOLIDAYS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch holidays" },
      { status: 500 }
    );
  }
}

/* ================= CREATE ================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentUser = await getCurrentUser();

    const { date, name, type, timeIn, timeOut, isWorkingDay } = body;

    if (!date || !name || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (
      (type === "HALF" || type === "CUSTOM") &&
      (!timeIn || !timeOut)
    ) {
      return NextResponse.json(
        { error: "TimeIn and TimeOut required" },
        { status: 400 }
      );
    }

    const id = randomUUID();

    const finalTimeIn = type === "FULL" ? "" : timeIn || "";
    const finalTimeOut = type === "FULL" ? "" : timeOut || "";
    const finalWorkingDay =
      type === "FULL" ? "FALSE" : isWorkingDay ? "TRUE" : "FALSE";

    const newRecord = {
      id,
      date,
      name,
      type,
      timeIn: finalTimeIn,
      timeOut: finalTimeOut,
      isWorkingDay: finalWorkingDay,
    };

    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `${SHEET}!A:G`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          id,
          date,
          name,
          type,
          finalTimeIn,
          finalTimeOut,
          finalWorkingDay,
        ]],
      },
    });

    /* ================= AUDIT (CREATE) ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "CREATE",
      entity: "HOLIDAYS",
      entityId: id,
      oldValue: null,
      newValue: newRecord,
    });

    return NextResponse.json({
      success: true,
      id,
    });

  } catch (error) {
    console.error("POST HOLIDAYS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create holiday" },
      { status: 500 }
    );
  }
}