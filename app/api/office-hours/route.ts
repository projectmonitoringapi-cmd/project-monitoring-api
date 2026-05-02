import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";

const SHEET = "OFFICE_HOURS";

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
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID!;
    
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET}!A:E`,
    });

    const rows = res.data.values || [];

    const data = rows.slice(1).map((r) => ({
      id: r[0],
      day: r[1],
      timeIn: r[2],
      timeOut: r[3],
      isWorkingDay: r[4] === "TRUE",
    }));

    /* ================= AUDIT (READ LIST) ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "READ",
      entity: "OFFICE_HOURS",
      entityId: "LIST",
      oldValue: null,
      newValue: {
        totalRecords: data.length,
      },
    });

    return NextResponse.json(data);

  } catch (error) {
    console.error("GET OFFICE HOURS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch office hours" },
      { status: 500 }
    );
  }
}

/* ================= CREATE ================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentUser = await getCurrentUser();

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID!;

    const { id, day, timeIn, timeOut, isWorkingDay } = body;

    // 🔴 VALIDATION
    if (!id || !day) {
      return NextResponse.json(
        { error: "Missing required fields (id, day)" },
        { status: 400 }
      );
    }

    // 🔴 Load existing rows
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET}!A:E`,
    });

    const rows = res.data.values || [];

    const exists = rows.some((r) => r[1] === day);

    if (exists) {
      return NextResponse.json(
        { error: "Office hours already defined for this day" },
        { status: 400 }
      );
    }

    // 🔴 Normalize
    const workingDay = isWorkingDay ? "TRUE" : "FALSE";

    const newRecord = {
      id,
      day,
      timeIn: timeIn || "",
      timeOut: timeOut || "",
      isWorkingDay: workingDay,
    };

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET}!A:E`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          id,
          day,
          timeIn || "",
          timeOut || "",
          workingDay,
        ]],
      },
    });

    /* ================= AUDIT (CREATE) ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "CREATE",
      entity: "OFFICE_HOURS",
      entityId: id,
      oldValue: null,
      newValue: newRecord,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("POST OFFICE HOURS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create office hours" },
      { status: 500 }
    );
  }
}