/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { logAudit } from "@/lib/audit";
import { cookies } from "next/headers";

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

/* ================= GET (BY ID) ================= */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pm_id } = await context.params;
    const currentUser = await getCurrentUser(); // ✅ FIX

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "PROJECT_MASTERLIST!A:P",
    });

    const rows = res.data.values || [];

    const row = rows.find((r) => r[0] === pm_id);

    if (!row) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    const data = {
      pm_id: row[0],
      project_id: row[1] || "",
      contractor: row[2] || "",
      project_name: row[3] || "",
      project_location: row[4] || "",
      contract_id: row[5] || "",
      original_contract_amount: row[6] || "",
      revised_contract_amount: row[7] || "",
      contract_duration: row[8] || "",
      ntp_date: row[9] || "",
      original_expiry_date: row[10] || "",
      contract_time_extension: row[11] || "",
      revised_expiry_date: row[12] || "",
      project_engineer: row[13] || "",
      project_inspector: row[14] || "",
      resident_engineer: row[15] || "",
    };

    /* ================= AUDIT LOG ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "READ",
      entity: "PROJECT_MASTERLIST",
      entityId: pm_id,
      oldValue: null,
      newValue: null,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET BY ID ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ================= UPDATE ================= */
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pm_id } = await context.params;
    const body = await req.json();
    const currentUser = await getCurrentUser(); // ✅ FIX

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "PROJECT_MASTERLIST!A:P",
    });

    const rows = res.data.values || [];

    const rowIndex = rows.findIndex((r) => r[0] === pm_id);

    if (rowIndex === -1) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    const oldRow = rows[rowIndex];

    const oldData = {
      pm_id: oldRow[0],
      project_id: oldRow[1],
      contractor: oldRow[2],
      project_name: oldRow[3],
      project_location: oldRow[4],
      contract_id: oldRow[5],
    };

    const sheetRow = rowIndex + 1;

    const updatedData = {
      pm_id,
      project_id: body.project_id,
      contractor: body.contractor,
      project_name: body.project_name,
      project_location: body.project_location,
      contract_id: body.contract_id,
    };

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `PROJECT_MASTERLIST!A${sheetRow}:P${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            pm_id,
            body.project_id || "",
            body.contractor || "",
            body.project_name || "",
            body.project_location || "",
            body.contract_id || "",
            body.original_contract_amount || "",
            body.revised_contract_amount || "",
            body.contract_duration || "",
            body.ntp_date || "",
            body.original_expiry_date || "",
            body.contract_time_extension || "",
            body.revised_expiry_date || "",
            body.project_engineer || "",
            body.project_inspector || "",
            body.resident_engineer || "",
          ],
        ],
      },
    });

    /* ================= AUDIT LOG ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "UPDATE",
      entity: "PROJECT_MASTERLIST",
      entityId: pm_id,
      oldValue: oldData,
      newValue: updatedData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ================= DELETE ================= */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pm_id } = await context.params;
    const currentUser = await getCurrentUser(); // ✅ FIX

    const sheets = await getSheetsClient();

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
    });

    const sheet = meta.data.sheets?.find(
      (s) => s.properties?.title === "PROJECT_MASTERLIST"
    );

    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error("PROJECT_MASTERLIST sheet not found");
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "PROJECT_MASTERLIST!A:P",
    });

    const rows = res.data.values || [];

    const rowIndex = rows.findIndex((r) => r[0] === pm_id);

    if (rowIndex === -1) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    const oldRow = rows[rowIndex];

    const oldData = {
      pm_id: oldRow[0],
      project_id: oldRow[1],
      contractor: oldRow[2],
      project_name: oldRow[3],
    };

    const sheetRow = rowIndex + 1;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: sheetRow - 1,
                endIndex: sheetRow,
              },
            },
          },
        ],
      },
    });

    /* ================= AUDIT LOG ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "DELETE",
      entity: "PROJECT_MASTERLIST",
      entityId: pm_id,
      oldValue: oldData,
      newValue: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}