import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";

const SHEET = "PROCESS_TIME";

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
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `${SHEET}!A:D`,
    });

    const rows = res.data.values || [];

    const data = rows.slice(1).map((r) => ({
      id: r[0],
      transaction: r[1],
      prescribeDays: Number(r[2] || 0),
      hours: Number(r[3] || 0),
    }));

    /* ================= AUDIT ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "READ",
      entity: "PROCESS_TIME",
      entityId: "LIST",
      oldValue: null,
      newValue: { totalRecords: data.length },
    });

    return NextResponse.json(data);

  } catch (error) {
    console.error("GET PROCESS TIME ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch process time" },
      { status: 500 }
    );
  }
}

/* ================= CREATE ================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentUser = await getCurrentUser();

    const { id, transaction, prescribeDays, hours } = body;

    if (!id || !transaction) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    const newRecord = {
      id,
      transaction,
      prescribeDays: Number(prescribeDays || 0),
      hours: Number(hours || 0),
    };

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `${SHEET}!A:D`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          id,
          transaction,
          newRecord.prescribeDays,
          newRecord.hours,
        ]],
      },
    });

    /* ================= AUDIT ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "CREATE",
      entity: "PROCESS_TIME",
      entityId: id,
      oldValue: null,
      newValue: newRecord,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("POST PROCESS TIME ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create process time" },
      { status: 500 }
    );
  }
}