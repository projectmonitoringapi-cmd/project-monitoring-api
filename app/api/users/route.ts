/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { logAudit } from "@/lib/audit";

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

function normalize(value: any) {
  return (value || "").toString().toLowerCase().trim();
}

/* ================= CREATE USER ================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentUser = await getCurrentUser();

    const {
      name,
      username,
      password,
      role,
      isActive,
    } = body;

    /* ===== VALIDATION ===== */
    if (!name || !username || !password) {
      await logAudit({
        username: currentUser.username,
        name: currentUser.name,
        action: "CREATE_FAILED",
        entity: "USER",
        entityId: "",
        oldValue: null,
        newValue: {
          reason: "Missing required fields",
          name,
          username,
        },
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

    /* ===== DUPLICATE CHECK ===== */
    const exists = rows.some(
      (r) => normalize(r[2]) === normalize(username)
    );

    if (exists) {
      await logAudit({
        username: currentUser.username,
        name: currentUser.name,
        action: "CREATE_FAILED",
        entity: "USER",
        entityId: "",
        oldValue: null,
        newValue: {
          reason: "Username already exists",
          username,
        },
      });

      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    /* ===== CREATE ===== */
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

    /* ===== AUDIT SUCCESS ===== */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
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
      name: "System",
      action: "CREATE_ERROR",
      entity: "USER",
      entityId: "",
      oldValue: null,
      newValue: {
        error: "Server error",
      },
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ================= GET USERS ================= */
export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();

    const { searchParams } = new URL(req.url);

    const search = normalize(searchParams.get("search"));
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
      isActive: normalize(r[5]) === "true",
      createdAt: r[6] || "",
    }));

    /* ===== SEARCH ===== */
    const filtered = search
      ? data.filter((u) =>
          `${u.name} ${u.username} ${u.role}`
            .toLowerCase()
            .includes(search)
        )
      : data;

    const total = filtered.length;

    /* ===== AUDIT READ ===== */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
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

    /* ===== PAGINATION ===== */
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
      name: "System",
      action: "READ_ERROR",
      entity: "USER",
      entityId: "LIST",
      oldValue: null,
      newValue: {
        error: "Server error",
      },
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}