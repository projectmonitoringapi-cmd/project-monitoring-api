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

/* -------------------------------------------------------
   🔧 NORMALIZER
-------------------------------------------------------- */
const normalize = (val: any) => (val ?? "").toString().trim();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawTypeId = searchParams.get("typeId");

    if (!rawTypeId) {
      return NextResponse.json(
        { error: "typeId is required" },
        { status: 400 }
      );
    }

    const typeId = normalize(rawTypeId);

    const sheets = await getSheetClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: `${SHEET_NAME}!A:F`,
    });

    const rows = res.data.values || [];
    const data = rows.slice(1);

    /* -------------------------------------------------------
       MAP + NORMALIZE + FILTER
    -------------------------------------------------------- */
    const mapped = data
      .map((row) => ({
        typeId: normalize(row[0]),
        section: normalize(row[1]),
        subsection: normalize(row[2]),
        itemNo: normalize(row[3]),
        description: normalize(row[4]),
        orderNo: Number(row[5]),
      }))
      .filter((r) => r.typeId === typeId)
      .sort((a, b) => a.orderNo - b.orderNo);

    /* -------------------------------------------------------
       GROUPING (KEEP FIRST SUBSECTION BLOCK ONLY)
    -------------------------------------------------------- */
    const grouped: Record<string, any> = {};
    const seenSubsection = new Set<string>();

    for (const item of mapped) {
      const key = `${item.typeId}||${item.section}||${item.subsection}`;

      const isStartOfBlock = item.itemNo === "1" || item.itemNo === 1;

      // 🔥 If we've already processed this subsection and encounter another "1",
      // it means a duplicate block → skip entirely
      if (isStartOfBlock && seenSubsection.has(key)) {
        continue;
      }

      // mark subsection as seen on first block
      if (isStartOfBlock) {
        seenSubsection.add(key);
      }

      if (!grouped[key]) {
        grouped[key] = {
          typeId: item.typeId,
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

    /* -------------------------------------------------------
       FINAL FORMAT
    -------------------------------------------------------- */
    const result = Object.values(grouped);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Checklist API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist" },
      { status: 500 }
    );
  }
}