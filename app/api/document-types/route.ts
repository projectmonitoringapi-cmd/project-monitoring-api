// /app/api/document-types/route.ts

import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";

export async function GET() {
  try {
    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TYPE!A:B",
    });

    const rows = res.data.values || [];

    const documentTypes = rows.slice(1).map((row) => ({
      id: row[0],
      description: row[1],
    }));

    return NextResponse.json(documentTypes);

  } catch (error) {
    console.error("GET DOCUMENT TYPES ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch document types" },
      { status: 500 }
    );
  }
}