/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleSheets";
import bcrypt from "bcrypt";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Please enter username and password." },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "USERS!A:G",
    });

    const rows = (res.data.values || []).slice(1);

    const userRow = rows.find(
      (r) =>
        (r[2] || "").toLowerCase().trim() ===
        username.toLowerCase().trim()
    );

    if (!userRow) {
      return NextResponse.json(
        { error: "Username does not exist." },
        { status: 401 }
      );
    }

    const isActive = (userRow[5] || "").toUpperCase().trim() === "TRUE";

    if (!isActive) {
      return NextResponse.json(
        { error: "Account is inactive." },
        { status: 401 }
      );
    }

    const passwordHash = userRow[3];
    const isMatch = await bcrypt.compare(password, passwordHash);

    if (!isMatch) {
      return NextResponse.json(
        { error: "Password is incorrect." },
        { status: 401 }
      );
    }

    const user = {
      id: userRow[0],
      name: userRow[1],
      username: userRow[2],
      role: (userRow[4] || "user").toLowerCase().trim(),
    };

    const resOut = NextResponse.json({
      success: true,
      user,
    });

    /* 🔥 FIX: MAKE COOKIE READABLE */
    resOut.cookies.set("session", JSON.stringify(user), {
      httpOnly: false, // ✅ KEY FIX
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    await logAudit({
      username: user.username,
      action: "LOGIN_SUCCESS",
      entity: "AUTH",
      entityId: user.id,
      oldValue: null,
      newValue: { role: user.role },
    });

    return resOut;
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}