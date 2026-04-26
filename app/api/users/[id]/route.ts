import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import bcrypt from "bcrypt";
import { logAudit } from "@/lib/audit"; // ✅ ADDED
import { getCurrentUser } from "@/lib/auth"; // ✅ OPTIONAL (better than "system")

/* ================= UPDATE ================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { name, username, role, isActive, password } = body;

    const currentUser = await getCurrentUser();

    if (!name || !username) {
      await logAudit({
        username: currentUser?.username || "system",
        action: "UPDATE_FAILED",
        entity: "USER",
        entityId: id,
        oldValue: null,
        newValue: { reason: "Missing required fields" },
      });

      return NextResponse.json(
        { error: "Name and Username are required" },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "USERS!A:G",
    });

    const rows = (res.data.values || []).slice(1);

    const rowIndex = rows.findIndex((r) => r[0] === id);

    if (rowIndex === -1) {
      await logAudit({
        username: currentUser?.username || "system",
        action: "UPDATE_FAILED",
        entity: "USER",
        entityId: id,
        oldValue: null,
        newValue: { reason: "User not found" },
      });

      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    /* ================= DUPLICATE CHECK ================= */
    const duplicate = rows.some(
      (r, i) =>
        i !== rowIndex &&
        (r[2] || "").toLowerCase().trim() ===
          username.toLowerCase().trim()
    );

    if (duplicate) {
      await logAudit({
        username: currentUser?.username || "system",
        action: "UPDATE_FAILED",
        entity: "USER",
        entityId: id,
        oldValue: null,
        newValue: { reason: "Duplicate username", username },
      });

      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    const existing = rows[rowIndex];

    /* ================= CAPTURE OLD DATA ================= */
    const oldData = {
      name: existing[1],
      username: existing[2],
      role: existing[4],
      isActive: existing[5],
    };

    /* ================= PASSWORD ================= */
    let passwordHash = existing[3];

    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const actualRow = rowIndex + 2;

    const updatedRow = [
      id,
      name.trim(),
      username.trim(),
      passwordHash,
      role || "user",
      isActive === false ? "FALSE" : "TRUE",
      existing[6],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `USERS!A${actualRow}:G${actualRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [updatedRow] },
    });

    /* ================= AUDIT LOG (SUCCESS) ================= */
    await logAudit({
      username: currentUser?.username || "system",
      action: "UPDATE",
      entity: "USER",
      entityId: id,
      oldValue: oldData,
      newValue: {
        name,
        username,
        role,
        isActive,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("UPDATE USER ERROR:", err);

    await logAudit({
      username: "system",
      action: "UPDATE_ERROR",
      entity: "USER",
      entityId: "",
      oldValue: null,
      newValue: { error: "Server error" },
    });

    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}

/* ================= DELETE (SOFT) ================= */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const currentUser = await getCurrentUser();

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "USERS!A:G",
    });

    const rows = (res.data.values || []).slice(1);

    const rowIndex = rows.findIndex((r) => r[0] === id);

    if (rowIndex === -1) {
      await logAudit({
        username: currentUser?.username || "system",
        action: "DELETE_FAILED",
        entity: "USER",
        entityId: id,
        oldValue: null,
        newValue: { reason: "User not found" },
      });

      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const existing = rows[rowIndex];
    const actualRow = rowIndex + 2;

    /* ================= OLD DATA ================= */
    const oldData = {
      name: existing[1],
      username: existing[2],
      role: existing[4],
      isActive: existing[5],
    };

    const updatedRow = [
      existing[0],
      existing[1],
      existing[2],
      existing[3],
      existing[4],
      "FALSE",
      existing[6],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `USERS!A${actualRow}:G${actualRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [updatedRow] },
    });

    /* ================= AUDIT LOG ================= */
    await logAudit({
      username: currentUser?.username || "system",
      action: "DELETE",
      entity: "USER",
      entityId: id,
      oldValue: oldData,
      newValue: {
        ...oldData,
        isActive: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);

    await logAudit({
      username: "system",
      action: "DELETE_ERROR",
      entity: "USER",
      entityId: "",
      oldValue: null,
      newValue: { error: "Server error" },
    });

    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}