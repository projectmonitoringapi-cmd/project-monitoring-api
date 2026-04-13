/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { randomUUID } from "crypto";

/* =========================================================
   POST → CREATE BILLING
========================================================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      projectId,
      billingType,
      billingCertificateNo,
      amount,
      dateSubmitted,
      status,
      updatedBy,
      remarks,
    } = body;

    console.log(body);

    // ✅ validation
    if (!projectId || !billingType || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const billingId = randomUUID();

    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "BILLING_TRACKER!A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            billingId,                     // A
            projectId,                     // B
            billingType,                   // C
            billingCertificateNo || "",    // D
            amount || "",                  // E
            dateSubmitted || "",           // F
            status,                        // G
            updatedBy || "",               // H
            remarks || "",                 // I
          ],
        ],
      },
    });

    return NextResponse.json({
      success: true,
      billingId,
    });
  } catch (error) {
    console.error("POST ERROR:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
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
    billingId: row[COLUMN_MAP.billingId] || "",
    projectId: row[COLUMN_MAP.projectId] || "",
    billingType: row[COLUMN_MAP.billingType] || "",
    billingCertificateNo: row[COLUMN_MAP.billingCertificateNo] || "",
    amount: row[COLUMN_MAP.amount] || "",
    dateSubmitted: row[COLUMN_MAP.dateSubmitted] || "",
    status: row[COLUMN_MAP.status] || "",
    updatedBy: row[COLUMN_MAP.updatedBy] || "",
    remarks: row[COLUMN_MAP.remarks] || "",
  };
}

/* =========================================================
   GET → FETCH BILLING
========================================================= */
export async function GET(req: Request) {
  try {
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

    // skip header
    const data = rows.slice(1).map(mapRow);

    // 🔍 SEARCH
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
            .includes(search)
        )
      : data;

    const total = filtered.length;

    // 📄 PAGINATION
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
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}