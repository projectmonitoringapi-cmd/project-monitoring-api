/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:I",
    });

    const rows = res.data.values || [];

    const data = rows.slice(1).map((row) => ({
      status: row[3] || "",
      dateSubmitted: row[4] || "",
    }));

    let filtered = data.filter((d) => d.status === "Pending");

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      filtered = filtered.filter((d) => {
        if (!d.dateSubmitted) return false;
        const date = new Date(d.dateSubmitted);
        return date >= fromDate && date <= toDate;
      });
    }

    return NextResponse.json({
      total: filtered.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load pending count" },
      { status: 500 }
    );
  }
}