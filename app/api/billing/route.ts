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

/* =========================================================
   POST → CREATE / UPDATE BILLING
========================================================= */
export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser(); // ✅ FIXED
    const body = await req.json();

    const {
      documentId,
      projectId,
      billingType,
      billingCertificateNo,
      amount,
      dateSubmitted,
      status,
      remarks,
    } = body;

    if (!documentId || !projectId || !billingType || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const billingId = documentId.trim();

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "BILLING_TRACKER!A:I",
    });

    const rows = (res.data.values || []).slice(1);

    const rowIndex = rows.findIndex(
      (r) => (r[0] || "").toString().trim() === billingId,
    );

    const newRow = [
      billingId,
      projectId,
      billingType,
      billingCertificateNo || "",
      amount || "",
      dateSubmitted || "",
      status,
      currentUser.username, // ✅ ALWAYS FROM SESSION
      remarks || "",
    ];

    const newData = {
      billingId,
      projectId,
      billingType,
      billingCertificateNo,
      amount,
      status,
    };

    if (rowIndex !== -1) {
      /* ================= UPDATE ================= */

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

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID!,
        range: `BILLING_TRACKER!A${actualRow}:I${actualRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [newRow] },
      });

      await logAudit({
        username: currentUser.username,
        name: currentUser.name,
        action: "UPDATE",
        entity: "BILLING_TRACKER",
        entityId: billingId,
        oldValue: oldData,
        newValue: newData,
      });

      console.log("🔄 Billing UPDATED:", billingId);
    } else {
      /* ================= CREATE ================= */

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID!,
        range: "BILLING_TRACKER!A:I",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [newRow] },
      });

      await logAudit({
        username: currentUser.username,
        name: currentUser.name,
        action: "CREATE",
        entity: "BILLING_TRACKER",
        entityId: billingId,
        oldValue: null,
        newValue: newData,
      });

      console.log("🆕 Billing CREATED:", billingId);
    }

    return NextResponse.json({ success: true, billingId });
  } catch (error) {
    console.error("POST ERROR:", error);

    await logAudit({
      username: "system",
      name: "System",
      action: "ERROR",
      entity: "BILLING_TRACKER",
      entityId: "POST",
      oldValue: null,
      newValue: { error: "Server error" },
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* =========================================================
   COLUMN MAP
========================================================= */
const COLUMN_MAP = {
  billingId: 0,
  projectId: 1,
  billingType: 2,
  billingCertificateNo: 3,
  amount: 4,
  dateSubmitted: 5,
  status: 6,
  updatedBy: 7,
  remarks: 8,
};

function mapRow(row: any[]) {
  return {
    billingId: row[0] || "",
    projectId: row[1] || "",
    billingType: row[2] || "",
    billingCertificateNo: row[3] || "",
    amount: row[4] || "",
    dateSubmitted: row[5] || "",
    status: row[6] || "",
    updatedBy: row[7] || "",
    remarks: row[8] || "",
  };
}

/* =========================================================
   GET → FETCH BILLING
========================================================= */
export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser(); // ✅ FIXED

    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").toLowerCase();
    const page = Number(searchParams.get("page") || 1);
    const pageSize = 50;

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "BILLING_TRACKER!A:I",
    });

    const rows = res.data.values || [];

    const data = rows.slice(1).map(mapRow);

    const filtered = search
      ? data.filter((d) =>
          [
            d.billingId,
            d.projectId,
            d.billingType,
            d.billingCertificateNo,
            d.amount,
            d.status,
            d.updatedBy,
            d.remarks,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search),
        )
      : data;

    const total = filtered.length;

    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "READ",
      entity: "BILLING_TRACKER",
      entityId: "LIST",
      oldValue: null,
      newValue: {
        search,
        totalRecords: total,
        page,
      },
    });

    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      data: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("GET ERROR:", error);

    await logAudit({
      username: "system",
      name: "System",
      action: "ERROR",
      entity: "BILLING_TRACKER",
      entityId: "GET",
      oldValue: null,
      newValue: { error: "Server error" },
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}