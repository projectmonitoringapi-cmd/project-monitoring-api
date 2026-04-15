import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";

export async function GET() {
  try {
    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "PROJECT_MASTERLIST!A2:P",
    });

    const rows = res.data.values || [];

    const data = rows.map((r) => ({
      projectId: r[1],       // Project ID
      projectName: r[3],     // Project Name
      projectEngineer: r[13] // PE
    }));

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json([], { status: 500 });
  }
}