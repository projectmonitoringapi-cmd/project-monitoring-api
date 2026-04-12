/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      project_id,
      contractor,
      project_name,
      project_location,
      contract_id,
      original_contract_amount,
      revised_contract_amount,
      contract_duration,
      ntp_date,
      original_expiry_date,
      contract_time_extension,
      revised_expiry_date,
      project_engineer,
      project_inspector,
      resident_engineer,
    } = body;

    if (!project_id || !project_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const pm_id = randomUUID(); // 🔥 internal ID

    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "PROJECT_MASTERLIST!A:P",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            pm_id,
            project_id,
            contractor || "",
            project_name || "",
            project_location || "",
            contract_id || "",
            original_contract_amount || "",
            revised_contract_amount || "",
            contract_duration || "",
            ntp_date || "",
            original_expiry_date || "",
            contract_time_extension || "",
            revised_expiry_date || "",
            project_engineer || "",
            project_inspector || "",
            resident_engineer || "",
          ],
        ],
      },
    });

    return NextResponse.json({
      success: true,
      pm_id,
    });
  } catch (error) {
    console.error("POST ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const COLUMN_MAP = {
  pm_id: 0,
  project_id: 1,
  contractor: 2,
  project_name: 3,
  project_location: 4,
  contract_id: 5,
  original_contract_amount: 6,
  revised_contract_amount: 7,
  contract_duration: 8,
  ntp_date: 9,
  original_expiry_date: 10,
  contract_time_extension: 11,
  revised_expiry_date: 12,
  project_engineer: 13,
  project_inspector: 14,
  resident_engineer: 15,
};

function mapRow(row: any[]) {
  return {
    pm_id: row[COLUMN_MAP.pm_id] || null, // ✅ NOT ""
    project_id: row[COLUMN_MAP.project_id] || "",
    contractor: row[COLUMN_MAP.contractor] || "",
    project_name: row[COLUMN_MAP.project_name] || "",
    project_location: row[COLUMN_MAP.project_location] || "",
    contract_id: row[COLUMN_MAP.contract_id] || "",
    original_contract_amount: row[COLUMN_MAP.original_contract_amount] || "",
    revised_contract_amount: row[COLUMN_MAP.revised_contract_amount] || "",
    contract_duration: row[COLUMN_MAP.contract_duration] || "",
    ntp_date: row[COLUMN_MAP.ntp_date] || "",
    original_expiry_date: row[COLUMN_MAP.original_expiry_date] || "",
    contract_time_extension: row[COLUMN_MAP.contract_time_extension] || "",
    revised_expiry_date: row[COLUMN_MAP.revised_expiry_date] || "",
    project_engineer: row[COLUMN_MAP.project_engineer] || "",
    project_inspector: row[COLUMN_MAP.project_inspector] || "",
    resident_engineer: row[COLUMN_MAP.resident_engineer] || "",
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").toLowerCase();
    const page = Number(searchParams.get("page") || 1);
    const pageSize = 50;

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "PROJECT_MASTERLIST!A:P",
    });

    const rows = res.data.values || [];

    const data = rows
      .slice(1)
      .map(mapRow)
      .filter((d) => d.pm_id); // 🔥 removes broken rows

    const filtered = search
      ? data.filter((d) =>
          [
            d.project_id,
            d.contractor,
            d.project_name,
            d.project_location,
            d.contract_id,
            d.project_engineer,
            d.project_inspector,
            d.resident_engineer,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search),
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
  } catch (error) {
    console.error("GET ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
