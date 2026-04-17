/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";

const STATUS_LIST = ["Pending", "Approved", "Returned", "Compiled"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const sheets = await getSheetsClient();

    /* 🔹 1. GET DOCUMENT TYPES */
    const docTypeRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TYPE!A:B",
    });

    const docTypeRows = docTypeRes.data.values || [];

    const documentTypes = docTypeRows.slice(1).map((row) => ({
      id: row[0],
      description: row[1],
    }));

    /* 🔹 2. GET DOCUMENT TRACKER */
    const trackerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:I",
    });

    const trackerRows = trackerRes.data.values || [];

    let trackerData = trackerRows.slice(1).map((row) => ({
      documentType: row[2] || "",
      status: row[3] || "",
      dateSubmitted: row[4] || "",
    }));

    /* 🔹 3. DATE FILTER */
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      trackerData = trackerData.filter((d) => {
        if (!d.dateSubmitted) return false;
        const date = new Date(d.dateSubmitted);
        return date >= fromDate && date <= toDate;
      });
    }

    /* 🔹 4. BUILD BREAKDOWN */
    const result = documentTypes.map((dt) => {
      const row: any = {
        documentType: dt.description,
      };

      let total = 0;

      STATUS_LIST.forEach((status) => {
        const count = trackerData.filter(
          (t) =>
            t.documentType === dt.description &&
            t.status === status
        ).length;

        row[status] = count;
        total += count;
      });

      row.total = total;

      return row;
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error("DOC TYPE BREAKDOWN ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load document type breakdown" },
      { status: 500 }
    );
  }
}