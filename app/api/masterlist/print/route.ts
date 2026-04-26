/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import fs from "fs";
import path from "path";
import { getSheetsClient } from "@/lib/googleSheets";
import { logAudit } from "@/lib/audit";
import { cookies } from "next/headers";

/* ================= GET CURRENT USER ================= */
async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");

  if (!session) {
    return {
      username: "system",
      name: "System",
    };
  }

  try {
    const user = JSON.parse(session.value);
    return {
      username: user.username || "system",
      name: user.name || user.username || "System",
    };
  } catch {
    return {
      username: "system",
      name: "System",
    };
  }
}

/* -------------------------------------------------------
   COLUMN MAP
-------------------------------------------------------- */
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
  ntp_date: 9,
  original_expiry_date: 10,
  contract_time_extension: 11,
  revised_expiry_date: 12,
  project_engineer: 13,
  project_inspector: 14,
  resident_engineer: 15,
};

function mapRow(row: any[]) {
  return {
    pm_id: row[0] || null,
    project_id: row[1] || "",
    contractor: row[2] || "",
    project_name: row[3] || "",
    project_location: row[4] || "",
    contract_id: row[5] || "",
    original_contract_amount: row[6] || "",
    revised_contract_amount: row[7] || "",
    contract_duration: row[8] || "",
    ntp_date: row[9] || "",
    original_expiry_date: row[10] || "",
    contract_time_extension: row[11] || "",
    revised_expiry_date: row[12] || "",
    project_engineer: row[13] || "",
    project_inspector: row[14] || "",
    resident_engineer: row[15] || "",
  };
}

/* -------------------------------------------------------
   API
-------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").toLowerCase();

    const currentUser = await getCurrentUser(); // ✅ FIX

    /* -------------------------------------------------------
       FETCH DATA
    -------------------------------------------------------- */
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

    const filtered = search
      ? data.filter((d) =>
          [
            d.project_id,
            d.contractor,
            d.project_name,
            d.project_location,
            d.contract_id,
            d.project_engineer,
            d.project_inspector,
            d.resident_engineer,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search),
        )
      : data;

    /* -------------------------------------------------------
       ✅ AUDIT LOG (FIXED)
    -------------------------------------------------------- */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "EXPORT_PDF",
      entity: "PROJECT_MASTERLIST",
      entityId: "REPORT",
      oldValue: null,
      newValue: {
        search,
        totalRecords: filtered.length,
      },
    });

    /* -------------------------------------------------------
       PDF SETUP
    -------------------------------------------------------- */
    const fontRegular = path.join(
      process.cwd(),
      "public/fonts/Roboto-Regular.ttf",
    );
    const fontBold = path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf");

    const stream = new PassThrough();

    const doc = new PDFDocument({
      size: "A2",
      layout: "landscape",
      margins: { top: 40, left: 40, right: 40, bottom: 30 },
      bufferPages: true,
      font: fontRegular,
    });

    doc.pipe(stream);

    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
      },
    });

    doc.registerFont("Regular", fontRegular);
    doc.registerFont("Bold", fontBold);
    doc.font("Regular");

    /* -------------------------------------------------------
       HEADER
    -------------------------------------------------------- */
    const logoPath = path.join(process.cwd(), "public", "DPWH.png");

    const drawHeader = () => {
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 30, { width: 50 });
      }

      doc
        .font("Regular")
        .fontSize(10)
        .text("Republic of the Philippines", 0, 30, { align: "center" })
        .text("DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS", { align: "center" })
        .font("Bold")
        .fontSize(12)
        .text("CAGAYAN DE ORO CITY 2ND DISTRICT ENGINEERING OFFICE", {
          align: "center",
        })
        .font("Regular")
        .fontSize(10)
        .text("Macabalan, Cagayan de Oro City", { align: "center" });

      doc.moveDown(2);
    };

    drawHeader();

    /* -------------------------------------------------------
       TABLE HEADER
    -------------------------------------------------------- */
    const headers = [
      "Project ID",
      "Contractor",
      "Project Name",
      "Location",
      "Contract ID",
      "Original Contract Amount",
      "Revised Contract Amount",
      "Contract Duration",
      "NTP Date",
      "Original Expiry Date",
      "Contract Time Extension",
      "Revised Expiry Date",
      "Project Engineer",
      "Project Inspector",
      "Resident Engineer",
    ];

    const widths = [
      100, 100, 100, 120, 100, 120, 120, 100, 100, 100, 100, 100, 100, 100, 100,
    ];

    const drawTableHeader = () => {
      const startX = 40;
      const startY = doc.y;

      doc.font("Bold").fontSize(13);

      headers.forEach((h, i) => {
        const x = startX + widths.slice(0, i).reduce((a, b) => a + b, 0);

        doc.text(h, x, startY, {
          width: widths[i] - 6,
          align: "center",
        });
      });

      doc.moveDown(0.5);

      const lineY = doc.y;

      doc
        .moveTo(startX, lineY)
        .lineTo(startX + widths.reduce((a, b) => a + b, 0), lineY)
        .stroke();

      doc.moveDown(0.5);
    };

    drawTableHeader();

    /* -------------------------------------------------------
       ROWS
    -------------------------------------------------------- */
    filtered.forEach((row, idx) => {
      const values = [
        row.project_id,
        row.contractor,
        row.project_name,
        row.project_location,
        row.contract_id,
        row.original_contract_amount,
        row.revised_contract_amount,
        row.contract_duration,
        row.ntp_date,
        row.original_expiry_date,
        row.contract_time_extension,
        row.revised_expiry_date,
        row.project_engineer,
        row.project_inspector,
        row.resident_engineer,
      ];

      let rowHeight = 0;

      values.forEach((val, i) => {
        const h = doc.heightOfString(String(val || ""), {
          width: widths[i] - 6,
        });
        if (h > rowHeight) rowHeight = h;
      });

      if (doc.y + rowHeight > doc.page.height - 60) {
        doc.addPage();
        drawHeader();
        drawTableHeader();
      }

      const y = doc.y;

      if (idx % 2 === 0) {
        doc
          .rect(40, y - 2, doc.page.width - 80, rowHeight + 4)
          .fillColor("#f5f5f5")
          .fill();
        doc.fillColor("#000");
      }

      values.forEach((val, i) => {
        const x = 40 + widths.slice(0, i).reduce((a, b) => a + b, 0);

        doc
          .font("Regular")
          .fontSize(10)
          .text(String(val || ""), x, y, {
            width: widths[i],
            align: "center",
          });
      });

      doc.y = y + rowHeight + 6;
    });

    /* -------------------------------------------------------
       PAGE NUMBER
    -------------------------------------------------------- */
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      const footerY = doc.page.height - 50;

      doc.text(`Page ${i + 1} of ${pageCount}`, 0, footerY, {
        align: "center",
        width: doc.page.width,
        lineBreak: false,
      });
    }

    doc.end();

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=Project_Masterlist.pdf",
      },
    });
  } catch (err: any) {
    console.error("PDF ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}