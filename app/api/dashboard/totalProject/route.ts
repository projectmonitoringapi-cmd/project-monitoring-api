/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";

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
  ntp_date: 9, // 🔥 use this as dateSubmitted
  original_expiry_date: 10,
  contract_time_extension: 11,
  revised_expiry_date: 12,
  project_engineer: 13,
  project_inspector: 14,
  resident_engineer: 15,
};

function mapRow(row: any[]) {
  return {
    pm_id: row[COLUMN_MAP.pm_id] || null,
    ntp_date: row[COLUMN_MAP.ntp_date] || "",
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "PROJECT_MASTERLIST!A:P",
    });

    const rows = res.data.values || [];

    const data = rows
      .slice(1)
      .map(mapRow)
      .filter((d) => d.pm_id);

    /* 🔹 FILTER BY DATE */
    let filtered = data;

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      filtered = data.filter((d) => {
        if (!d.ntp_date) return false;

        const date = new Date(d.ntp_date);
        return date >= fromDate && date <= toDate;
      });
    }

    return NextResponse.json({
      totalProjects: filtered.length,
    });
  } catch (error) {
    console.error("TOTAL PROJECT ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load total projects" },
      { status: 500 }
    );
  }
}