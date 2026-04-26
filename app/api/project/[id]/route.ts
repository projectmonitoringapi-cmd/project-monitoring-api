import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { logAudit } from "@/lib/audit";
import { cookies } from "next/headers";

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
      range: "DOCUMENT_TRACKER!A:J",
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
      updatedBy: match[6],
      assignPE: match[7],
      remarks: match[8],
      checklistJson: match[9] || "",
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

    const checklistJson = body.checklist
      ? JSON.stringify(body.checklist)
      : oldRow[9];

    const updatedRow = [
      id,
      body.projectId ?? oldRow[1],
      body.documentType ?? oldRow[2],
      body.status ?? oldRow[3],

      body.dateSubmitted ? formatDateTime(body.dateSubmitted) : oldRow[4],

      body.dateApproved ? formatDateTime(body.dateApproved) : oldRow[5],

      currentUser.username, // ✅ ALWAYS TRACK WHO UPDATED
      body.assignPE ?? oldRow[7],
      body.remarks ?? oldRow[8],

      checklistJson,
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `DOCUMENT_TRACKER!A${actualRow}:J${actualRow}`,
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
