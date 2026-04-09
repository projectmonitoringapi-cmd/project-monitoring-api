import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      projectId,
      documentType,
      status,
      dateSubmitted,
      dateApproved,
      updatedBy,
      assignPE,
      remarks,
    } = body;

    // strict validation (important)
    if (!projectId || !documentType || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            projectId,
            documentType,
            status,
            dateSubmitted || "",
            dateApproved || "",
            updatedBy || "",
            assignPE || "",
            remarks || "",
          ],
        ],
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}