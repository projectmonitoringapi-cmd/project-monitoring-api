/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";

/* ================= COLUMN MAP ================= */
const COLUMN_MAP = {
  id: 0,
  timestamp: 1,
  username: 2,
  action: 3,
  entity: 4,
  entityId: 5,
  oldValue: 6,
  newValue: 7,
};

/* ================= MAP ROW ================= */
function mapRow(row: any[], userMap: Record<string, string>) {
  const username = (row[COLUMN_MAP.username] || "").toString().trim();

  return {
    id: row[COLUMN_MAP.id] || "",
    timestamp: row[COLUMN_MAP.timestamp] || "",
    username,
    name: userMap[username] || username, // ✅ THIS IS THE FIX
    action: row[COLUMN_MAP.action] || "",
    entity: row[COLUMN_MAP.entity] || "",
    entityId: row[COLUMN_MAP.entityId] || "",
    oldValue: row[COLUMN_MAP.oldValue] || "",
    newValue: row[COLUMN_MAP.newValue] || "",
  };
}

/* ================= GET ================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").toLowerCase();
    const page = Number(searchParams.get("page") || 1);
    const pageSize = 20;

    const sheets = await getSheetsClient();

    /* ================= USERS ================= */
    const usersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "USERS!A:G",
    });

    const userRows = (usersRes.data.values || []).slice(1);

    const userMap: Record<string, string> = {};

    userRows.forEach((r) => {
      const name = (r[1] || "").toString().trim();      // B: Name
      const username = (r[2] || "").toString().trim();  // C: Username

      if (username) {
        userMap[username] = name || username;
      }
    });

    console.log("👥 USER MAP:", userMap); // 🔥 DEBUG

    /* ================= AUDIT LOGS ================= */
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "AUDITLOGS!A:H",
    });

    const rows = res.data.values || [];

    const data = rows.slice(1).map((r) => mapRow(r, userMap));

    console.log("📄 SAMPLE LOG:", data[0]); // 🔥 DEBUG

    /* ================= SEARCH ================= */
    const filtered = search
      ? data.filter((d) =>
          [
            d.name,
            d.username,
            d.action,
            d.entity,
            d.entityId,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search)
        )
      : data;

    const total = filtered.length;

    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      data: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("AUDIT GET ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}