/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { google } from "googleapis";

const SHEET_NAME = "DOCUMENT_CHECKLIST";

async function getSheetClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const typeId = searchParams.get("typeId");

    if (!typeId) {
      return NextResponse.json(
        { error: "typeId is required" },
        { status: 400 },
      );
    }

    const sheets = await getSheetClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `${SHEET_NAME}!A:F`,
    });

    const rows = res.data.values || [];

    // Remove header
    const data = rows.slice(1);

    // Map columns
    const mapped = data
      .map((row) => ({
        typeId: row[0],
        section: row[1],
        subsection: row[2],
        itemNo: row[3],
        description: row[4],
        orderNo: Number(row[5]),
      }))
      .filter((r) => r.typeId === typeId);

    // ✅ Group by section + subsection
    const grouped: Record<string, any> = {};

    for (const item of mapped) {
      const key = `${item.section}||${item.subsection}`;

      if (!grouped[key]) {
        grouped[key] = {
          section: item.section,
          subsection: item.subsection,
          items: [],
        };
      }

      grouped[key].items.push({
        id: `${item.typeId}-${item.orderNo}`,
        itemNo: item.itemNo,
        description: item.description,
        orderNo: item.orderNo,
      });
    }

    // Convert to array + sort
    const result = Object.values(grouped).map((group: any) => ({
      ...group,
      items: group.items.sort((a: any, b: any) => a.orderNo - b.orderNo),
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Checklist API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist" },
      { status: 500 },
    );
  }
}
