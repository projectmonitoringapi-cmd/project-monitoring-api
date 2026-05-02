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

/* -------------------------------------------------------
   🔐 GET CURRENT USER FROM SESSION
-------------------------------------------------------- */
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
   Column Mapping
-------------------------------------------------------- */
const COLUMN_MAP = {
  documentId: 0,
  projectId: 1,
  documentType: 2,
  status: 3,
  dateSubmitted: 4,
  dateApproved: 5,
  processTime: 6,
  processStatus: 7,
  updatedBy: 8,
  assignPE: 9,
  remarks: 10,
};

function mapRow(row: any[]) {
  return {
    documentId: row[0] || "",
    projectId: row[1] || "",
    documentType: row[2] || "",
    status: row[3] || "",
    dateSubmitted: row[4] || "",
    dateApproved: row[5] || "",
    processTime: row[6] || "",
    processStatus: row[7] || "",
    updatedBy: row[8] || "",
    assignPE: row[9] || "",
    remarks: row[10] || "",
  };
}

/* -------------------------------------------------------
   API
-------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser(); // ✅ FIXED

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").toLowerCase();

    /* -------------------------------------------------------
       1️⃣ Fetch Data (Google Sheets)
    -------------------------------------------------------- */
    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "DOCUMENT_TRACKER!A:K",
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
            d.processTime,
            d.processStatus,
            d.updatedBy,
            d.assignPE,
            d.remarks,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search),
        )
      : data;

    /* -------------------------------------------------------
       ✅ AUDIT LOG (EXPORT PDF)
    -------------------------------------------------------- */
    await logAudit({
      username: currentUser.username,
      name: currentUser.name,
      action: "EXPORT_PDF",
      entity: "DOCUMENT_TRACKER",
      entityId: "REPORT",
      oldValue: null,
      newValue: {
        search,
        totalRecords: filtered.length,
        exportedAt: new Date().toISOString(),
      },
    });

    /* -------------------------------------------------------
       2️⃣ Setup PDF
    -------------------------------------------------------- */
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

    const stream = new PassThrough();

    const doc = new PDFDocument({
      size: "A3",
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
       FONT CHECK
    -------------------------------------------------------- */
    if (!fs.existsSync(fontRegular)) {
      throw new Error("Roboto-Regular.ttf not found in /public/fonts");
    }

    doc.registerFont("Regular", fontRegular);
    doc.registerFont("Bold", fontBold);
    doc.font("Regular");

    /* -------------------------------------------------------
       HEADER
    -------------------------------------------------------- */
    const logoPath = path.join(process.cwd(), "public", "DPWH.png");

    const drawHeader = () => {
      doc.y = doc.page.margins.top;

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, doc.y, { width: 50 });
      }

      doc
        .font("Regular")
        .fontSize(10)
        .text("Republic of the Philippines", 0, doc.y, { align: "center" })
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
      "Project",
      "Type",
      "Status",
      "Date Submitted",
      "Date Approved",
      "Process Time",
      "Process Status",
      "Updated By",
      "Assign PE",
      "Remarks",
    ];

    const startX = 40;
    const usableWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Fit inside page
    const widths = [
      70, // Project
      80, // Type
      60, // Status
      80, // Submitted
      80, // Approved
      60, // Time
      70, // Proc Status
      70, // Updated
      70, // PE
      usableWidth - 610, // auto fit remarks
    ];

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
       ROWS
    -------------------------------------------------------- */
    filtered.forEach((row, idx) => {
      const values = [
        row.projectId,
        row.documentType,
        row.status,
        row.dateSubmitted,
        row.dateApproved,
        row.processTime,
        row.processStatus,
        row.updatedBy,
        row.assignPE,
        row.remarks,
      ];

      row.remarks = formatRemarks(row.remarks);

      let rowHeight = 0;

      values.forEach((val, i) => {
        const h = doc.heightOfString(String(val || ""), {
          width: widths[i],
          lineGap: 2,
        });
        if (h > rowHeight) rowHeight = h;
      });

      const isFirstRow = idx === 0;

      if (!isFirstRow && doc.y + rowHeight > doc.page.height - 80) {
        doc.addPage();
        drawHeader();
        drawTableHeader();
      }

      const y = doc.y;

      if (idx % 2 === 0) {
        const tableWidth = widths.reduce((a, b) => a + b, 0);

        doc
          .rect(startX, y - 2, tableWidth, rowHeight + 4)
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
       PAGE NUMBERS
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
       RETURN
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

function formatRemarks(text: string) {
  if (!text) return "";

  return text
    .replace(/Remarks:/g, "\n   Remarks:")
    .replace(/\d+\./g, (match) => `\n${match}`)
    .trim();
}
