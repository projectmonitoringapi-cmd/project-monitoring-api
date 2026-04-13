/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import fs from "fs";
import path from "path";
import { getSheetsClient } from "@/lib/googleSheets";

/* -------------------------------------------------------
   Column Mapping
-------------------------------------------------------- */
const COLUMN_MAP = {
  documentId: 0,
  projectId: 1,
  documentType: 2,
  status: 3,
  dateSubmitted: 4,
  dateApproved: 5,
  updatedBy: 6,
  assignPE: 7,
  remarks: 8,
};

function mapRow(row: any[]) {
  return {
    documentId: row[0] || "",
    projectId: row[1] || "",
    documentType: row[2] || "",
    status: row[3] || "",
    dateSubmitted: row[4] || "",
    dateApproved: row[5] || "",
    updatedBy: row[6] || "",
    assignPE: row[7] || "",
    remarks: row[8] || "",
  };
}

/* -------------------------------------------------------
   API
-------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").toLowerCase();

    /* -------------------------------------------------------
       1️⃣ Fetch Data (Google Sheets)
    -------------------------------------------------------- */
    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:I",
    });

    const rows = res.data.values || [];
    const data = rows.slice(1).map(mapRow);

    const filtered = search
      ? data.filter((d) =>
          [
            d.documentId,
            d.projectId,
            d.documentType,
            d.status,
            d.updatedBy,
            d.assignPE,
            d.remarks,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search),
        )
      : data;

    const fontRegular = path.join(
      process.cwd(),
      "public",
      "fonts",
      "Roboto-Regular.ttf",
    );

    const fontBold = path.join(
      process.cwd(),
      "public",
      "fonts",
      "Roboto-Bold.ttf",
    );
    /* -------------------------------------------------------
       2️⃣ Setup PDF (STREAMING)
    -------------------------------------------------------- */
    console.log(fontRegular, fontBold);

    const stream = new PassThrough();

    const doc = new PDFDocument({
      size: "A4",
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
        stream.on("error", (err) => controller.error(err));
      },
    });

    /* -------------------------------------------------------
       3️⃣ FONT FIX (CRITICAL - NO HELVETICA ERROR)
    -------------------------------------------------------- */
    if (!fs.existsSync(fontRegular)) {
      throw new Error("Roboto-Regular.ttf not found in /public/fonts");
    }

    doc.registerFont("Regular", fontRegular);
    doc.registerFont("Bold", fontBold);
    doc.font("Regular");
    /* -------------------------------------------------------
       4️⃣ HEADER (DPWH STYLE)
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
        .text("DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS", {
          align: "center",
        })
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
       5️⃣ TABLE HEADER
    -------------------------------------------------------- */
    const headers = [
      "Project",
      "Type",
      "Status",
      "Date Submitted",
      "Date Approved",
      "Updated By",
      "Assign PE",
      "Remarks",
    ];

    const widths = [80, 80, 70, 90, 90, 90, 80, 180];

    const drawTableHeader = () => {
      const startX = 40;
      const y = doc.y;

      doc.font("Bold").fontSize(9);

      headers.forEach((h, i) => {
        const x = startX + widths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(h, x, y, { width: widths[i] });
      });

      doc
        .moveTo(startX, y + 12)
        .lineTo(startX + widths.reduce((a, b) => a + b, 0), y + 12)
        .stroke();

      doc.moveDown(1);
    };

    drawTableHeader();

    /* -------------------------------------------------------
       6️⃣ ROWS (NO CUT, AUTO WRAP)
    -------------------------------------------------------- */
    filtered.forEach((row, idx) => {
      const values = [
        row.projectId,
        row.documentType,
        row.status,
        row.dateSubmitted,
        row.dateApproved,
        row.updatedBy,
        row.assignPE,
        row.remarks,
      ];

      let rowHeight = 0;

      values.forEach((val, i) => {
        const h = doc.heightOfString(String(val || ""), {
          width: widths[i],
        });
        if (h > rowHeight) rowHeight = h;
      });

      // 🔥 Page break BEFORE drawing
      if (doc.y + rowHeight > doc.page.height - 60) {
        doc.addPage();
        drawHeader();
        drawTableHeader();
      }

      const y = doc.y;

      // Zebra striping
      if (idx % 2 === 0) {
        doc
          .rect(40, y - 2, 800, rowHeight + 4)
          .fillColor("#f5f5f5")
          .fill();
        doc.fillColor("#000");
      }

      values.forEach((val, i) => {
        const x = 40 + widths.slice(0, i).reduce((a, b) => a + b, 0);

        doc
          .font("Regular")
          .fontSize(8)
          .text(String(val || ""), x, y, {
            width: widths[i],
          });
      });

      doc.y = y + rowHeight + 6;
    });

    /* -------------------------------------------------------
       7️⃣ PAGE NUMBERS
    -------------------------------------------------------- */
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      const footerY = doc.page.height - doc.page.margins.bottom - 30;

      doc.fontSize(9).text(`Page ${i + 1} of ${pageCount}`, 50, footerY, {
        width: doc.page.width - 100,
        align: "center",
      });
    }

    doc.end();

    /* -------------------------------------------------------
       8️⃣ RETURN
    -------------------------------------------------------- */
    return new Response(webStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          "attachment; filename=Document_Tracker_Report.pdf",
      },
    });
  } catch (err: any) {
    console.error("❌ PDF ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}
