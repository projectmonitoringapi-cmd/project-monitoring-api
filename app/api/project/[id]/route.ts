/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { logAudit } from "@/lib/audit";
import { cookies } from "next/headers";
import { computeProcess } from "@/lib/sla/computeProcess";

/* ================= GET CURRENT USER ================= */
async function getCurrentUser() {
  const cookieStore = await cookies(); // ✅ FIX
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

async function loadOfficeHours(sheets: any) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID!,
    range: "OFFICE_HOURS!A:E",
  });

  const rows = res.data.values || [];

  return rows.slice(1).map((r: any[]) => ({
    day: r[1],
    timeIn: r[2],
    timeOut: r[3],
    isWorkingDay: r[4] === "TRUE",
  }));
}

async function loadHolidays(sheets: any) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID!,
    range: "HOLIDAYS!A:G",
  });

  const rows = res.data.values || [];

  return rows.slice(1).map((r: any[]) => ({
    date: r[1],
    isWorkingDay: r[6] === "TRUE",
  }));
}

async function loadProcessRules(sheets: any) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID!,
    range: "PROCESS_TIME!A:D",
  });

  const rows = res.data.values || [];

  return rows.slice(1).map((r: any[]) => ({
    transaction: r[1],
    prescribeDays: Number(r[2] || 0),
    hours: Number(r[3] || 0),
  }));
}

/* ================= GET (BY ID) ================= */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser(); // ✅ FIX

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:L",
    });

    const rows = (res.data.values || []).slice(1);

    const match = rows.find((r) => r[0] === id);

    if (!match) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ✅ LOG READ (BY ID)
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "READ",
      entity: "DOCUMENT_TRACKER",
      entityId: id,
      oldValue: null,
      newValue: null,
    });

    return NextResponse.json({
      documentId: match[0],
      projectId: match[1],
      documentType: match[2],
      status: match[3],
      dateSubmitted: match[4],
      dateApproved: match[5],
      processTime: match[6],
      processStatus: match[7],
      updatedBy: match[8],
      assignPE: match[9],
      remarks: match[10],
      checklistJson: match[11] || "",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "GET failed" }, { status: 500 });
  }
}

/* ================= UPDATE ================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const currentUser = await getCurrentUser(); // ✅ FIX

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:L",
    });

    const rows = (res.data.values || []).slice(1);

    const rowIndex = rows.findIndex((r) => r[0]?.trim() === id.trim());

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const actualRow = rowIndex + 2;
    const oldRow = rows[rowIndex];

    const oldData = {
      documentId: oldRow[0],
      projectId: oldRow[1],
      documentType: oldRow[2],
      status: oldRow[3],
      dateSubmitted: oldRow[4],
      dateApproved: oldRow[5],
      updatedBy: oldRow[6],
      assignPE: oldRow[7],
      remarks: oldRow[8],
    };

    const dateSubmitted = body.dateSubmitted
      ? formatDateTime(body.dateSubmitted)
      : oldRow[4];

    const dateApproved = body.dateApproved
      ? formatDateTime(body.dateApproved)
      : oldRow[5];

    const documentType = body.documentType ?? oldRow[2];

    const officeHours = await loadOfficeHours(sheets);
    const holidays = await loadHolidays(sheets);
    const rules = await loadProcessRules(sheets);

    const rule = rules.find((r: any) => r.transaction === documentType)

    const { processTime, processStatus } = computeProcess({
      dateSubmitted,
      dateApproved,
      officeHours,
      holidays,
      processRule: rule,
    });

    const checklistJson = body.checklist
      ? JSON.stringify(body.checklist)
      : oldRow[9];

    const updatedRow = [
      id, // A
      body.projectId ?? oldRow[1], // B
      documentType, // C
      body.status ?? oldRow[3], // D

      dateSubmitted, // E
      dateApproved, // F

      processTime, // G ✅
      processStatus, // H ✅

      currentUser.username, // I ✅ moved

      body.assignPE ?? oldRow[9], // J
      body.remarks ?? oldRow[10], // K

      checklistJson, // L
    ];

    console.log("Process Time:",processTime);
    console.log("Process Status:",processStatus);
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `DOCUMENT_TRACKER!A${actualRow}:L${actualRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });

    // ✅ LOG UPDATE
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "UPDATE",
      entity: "DOCUMENT_TRACKER",
      entityId: id,
      oldValue: oldData,
      newValue: {
        projectId: body.projectId,
        documentType: body.documentType,
        status: body.status,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/* ================= DELETE ================= */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser(); // ✅ FIX

    const sheets = await getSheetsClient();

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
    });

    const sheet = meta.data.sheets?.find(
      (s) => s.properties?.title === "DOCUMENT_TRACKER",
    );

    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error("DOCUMENT_TRACKER sheet not found");
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:J",
    });

    const rows = (res.data.values || []).slice(1);

    const rowIndex = rows.findIndex((r) => r[0]?.trim() === id.trim());

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const actualRow = rowIndex + 2;
    const oldRow = rows[rowIndex];

    const oldData = {
      documentId: oldRow[0],
      projectId: oldRow[1],
      documentType: oldRow[2],
      status: oldRow[3],
      dateSubmitted: oldRow[4],
      dateApproved: oldRow[5],
      updatedBy: oldRow[6],
      assignPE: oldRow[7],
      remarks: oldRow[8],
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: actualRow - 1,
                endIndex: actualRow,
              },
            },
          },
        ],
      },
    });

    // ✅ LOG DELETE
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "DELETE",
      entity: "DOCUMENT_TRACKER",
      entityId: id,
      oldValue: oldData,
      newValue: null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

/* ================= HELPERS ================= */
function formatDateTime(value?: string) {
  if (!value) return "";

  const [date, time] = value.split("T");
  if (!date || !time) return "";

  return `${date} ${time}:00`;
}
