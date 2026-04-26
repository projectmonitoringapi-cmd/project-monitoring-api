import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { logAudit } from "@/lib/audit"; // ✅ ADDED

/* ================= CREATE USER ================= */
export async function POST(req: Request) {
  try {
    const { name, username, password, role, isActive, updatedBy } =
      await req.json();

    if (!name || !username || !password) {
      await logAudit({
        username: updatedBy || "system",
        action: "CREATE_FAILED",
        entity: "USER",
        entityId: "",
        oldValue: null,
        newValue: { reason: "Missing required fields" },
      });

      return NextResponse.json(
        { error: "Name, username, and password are required" },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "USERS!A:G",
    });

    const rows = res.data.values || [];

    /* ================= DUPLICATE CHECK ================= */
    const exists = rows.some(
      (r) =>
        (r[2] || "").toString().toLowerCase().trim() ===
        username.toLowerCase().trim()
    );

    if (exists) {
      await logAudit({
        username: updatedBy || "system",
        action: "CREATE_FAILED",
        entity: "USER",
        entityId: "",
        oldValue: null,
        newValue: { reason: "Username already exists", username },
      });

      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 10);

    const newId = randomUUID();

    const newRow = [
      newId,
      name.trim(),
      username.trim(),
      hash,
      role || "user",
      isActive === false ? "FALSE" : "TRUE",
      new Date().toISOString(),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "USERS!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [newRow] },
    });

    /* ================= AUDIT LOG (CREATE SUCCESS) ================= */
    await logAudit({
      username: updatedBy || "system",
      action: "CREATE",
      entity: "USER",
      entityId: newId,
      oldValue: null,
      newValue: {
        name,
        username,
        role,
        isActive,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CREATE USER ERROR:", err);

    await logAudit({
      username: "system",
      action: "CREATE_ERROR",
      entity: "USER",
      entityId: "",
      oldValue: null,
      newValue: { error: "Server error" },
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ================= GET USERS ================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").toLowerCase();
    const page = Number(searchParams.get("page") || 1);
    const pageSize = 20;

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "USERS!A:G",
    });

    const rows = res.data.values || [];

    const data = rows.slice(1).map((r) => ({
      id: r[0] || "",
      name: r[1] || "",
      username: r[2] || "",
      role: r[4] || "user",
      isActive: (r[5] || "").toString().toUpperCase() === "TRUE",
      createdAt: r[6] || "",
    }));

    /* ================= SEARCH ================= */
    const filtered = search
      ? data.filter((u) =>
          `${u.name} ${u.username} ${u.role}`
            .toLowerCase()
            .includes(search)
        )
      : data;

    const total = filtered.length;

    /* ================= AUDIT LOG (READ LIST) ================= */
    await logAudit({
      username: "system", // 🔥 replace with real user later
      action: "READ",
      entity: "USER",
      entityId: "LIST",
      oldValue: null,
      newValue: {
        search,
        totalRecords: total,
        page,
      },
    });

    /* ================= PAGINATION ================= */
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
    console.error("GET USERS ERROR:", err);

    await logAudit({
      username: "system",
      action: "READ_ERROR",
      entity: "USER",
      entityId: "LIST",
      oldValue: null,
      newValue: { error: "Server error" },
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}