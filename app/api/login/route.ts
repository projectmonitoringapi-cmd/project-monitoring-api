import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "USERS!A:F",
    });

    const rows = res.data.values || [];

    const userRow = rows.find(
      (row) =>
        row[1]?.toLowerCase() === username.toLowerCase() &&
        row[4] === "TRUE",
    );

    if (!userRow) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const passwordHash = userRow[2];

    const valid = await bcrypt.compare(password, passwordHash);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userRow[0],
        username: userRow[1],
        role: userRow[3],
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}