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

/* ================= GET (BY ID) ================= */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const billingId = id?.trim();
    const currentUser = await getCurrentUser(); // ✅

    if (!billingId) {
      return NextResponse.json({ error: "Missing billingId" }, { status: 400 });
    }

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "BILLING_TRACKER!A:I",
    });

    const rows = (res.data.values || []).slice(1);

    const match = rows.find(
      (r) => (r[0] || "").toString().trim() === billingId,
    );

    if (!match) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = {
      billingId: match[0] || "",
      projectId: match[1] || "",
      billingType: match[2] || "",
      billingCertificateNo: match[3] || "",
      amount: match[4] || "",
      dateSubmitted: match[5] || "",
      status: match[6] || "",
      updatedBy: match[7] || "",
      remarks: match[8] || "",
    };

    /* ================= AUDIT ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "READ",
      entity: "BILLING_TRACKER",
      entityId: billingId,
      oldValue: null,
      newValue: null,
    });

    return NextResponse.json(data);
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
    const billingId = id?.trim();
    const currentUser = await getCurrentUser(); // ✅

    const body = await req.json();

    if (!billingId) {
      return NextResponse.json({ error: "Missing billingId" }, { status: 400 });
    }

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "BILLING_TRACKER!A:I",
    });

    const rows = (res.data.values || []).slice(1);

    const rowIndex = rows.findIndex(
      (r) => (r[0] || "").toString().trim() === billingId,
    );

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const actualRow = rowIndex + 2;
    const oldRow = rows[rowIndex];

    const oldData = {
      billingId: oldRow[0],
      projectId: oldRow[1],
      billingType: oldRow[2],
      billingCertificateNo: oldRow[3],
      amount: oldRow[4],
      status: oldRow[6],
    };

    const updatedRow = [
      billingId,
      body.projectId || "",
      body.billingType || "",
      body.billingCertificateNo || "",
      body.amount || "",
      body.dateSubmitted || "",
      body.status || "",
      currentUser.username, // ✅ always system user
      body.remarks || "",
    ];

    const newData = {
      billingId,
      projectId: body.projectId,
      billingType: body.billingType,
      billingCertificateNo: body.billingCertificateNo,
      amount: body.amount,
      status: body.status,
    };

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `BILLING_TRACKER!A${actualRow}:I${actualRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });

    /* ================= AUDIT ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "UPDATE",
      entity: "BILLING_TRACKER",
      entityId: billingId,
      oldValue: oldData,
      newValue: newData,
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
    const billingId = id?.trim();
    const currentUser = await getCurrentUser(); // ✅

    if (!billingId) {
      return NextResponse.json({ error: "Missing billingId" }, { status: 400 });
    }

    const sheets = await getSheetsClient();

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
    });

    const sheet = meta.data.sheets?.find(
      (s) => s.properties?.title === "BILLING_TRACKER",
    );

    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error("BILLING_TRACKER sheet not found");
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "BILLING_TRACKER!A:I",
    });

    const rows = (res.data.values || []).slice(1);

    const rowIndex = rows.findIndex(
      (r) => (r[0] || "").toString().trim() === billingId,
    );

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const actualRow = rowIndex + 2;
    const oldRow = rows[rowIndex];

    const oldData = {
      billingId: oldRow[0],
      projectId: oldRow[1],
      billingType: oldRow[2],
      billingCertificateNo: oldRow[3],
      amount: oldRow[4],
      status: oldRow[6],
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

    /* ================= AUDIT ================= */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "DELETE",
      entity: "BILLING_TRACKER",
      entityId: billingId,
      oldValue: oldData,
      newValue: null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}