/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { checklist } = body;

    if (!checklist || checklist.length === 0) {
      return NextResponse.json(
        { error: "Checklist is required" },
        { status: 400 },
      );
    }

    /* -------------------------------------------------------
       STREAM SETUP
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
    /* -------------------------------------------------------
       2️⃣ Setup PDF (STREAMING)
    -------------------------------------------------------- */
    console.log(fontRegular, fontBold);

    const stream = new PassThrough();

    const doc = new PDFDocument({
      size: "A4",
      layout: "portrait",
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
       HEADER
    -------------------------------------------------------- */
    const logoPath = path.join(process.cwd(), "public", "DPWH.png");

    const drawHeader = () => {
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 30, { width: 50 });
      }

      doc
        .font("Regular")
        .fontSize(10)
        .text("Republic of the Philippines", { align: "center" })
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

      doc.moveDown(1.5);

      doc
        .font("Bold")
        .fontSize(12)
        .text("CHECKLIST OF SUPPORTING DOCUMENTS AND ATTACHMENTS FOR DoTS", {
          align: "center",
        });

      doc.moveDown(1);
    };

    drawHeader();

    /* -------------------------------------------------------
   GROUP DATA
-------------------------------------------------------- */
    const grouped = checklist.reduce((acc: any, group: any) => {
      if (!acc[group.section]) acc[group.section] = [];
      acc[group.section].push(group);
      return acc;
    }, {});

    /* -------------------------------------------------------
   CONFIG (LAYOUT)
-------------------------------------------------------- */
    const startX = 50;
    const checkboxSize = 10;
    const colCheckbox = startX;
    const colNumber = startX + 18;
    const colText = startX + 35;
    const maxWidth = 480;

    /* -------------------------------------------------------
   HELPER: ROMAN NUMERALS
-------------------------------------------------------- */
    function toRoman(num: number) {
      const romans = [
        "",
        "I",
        "II",
        "III",
        "IV",
        "V",
        "VI",
        "VII",
        "VIII",
        "IX",
        "X",
      ];
      return romans[num] || num;
    }

    /* -------------------------------------------------------
   RENDER CHECKLIST
-------------------------------------------------------- */
    Object.keys(grouped).forEach((section, sIndex) => {
      const roman = toRoman(sIndex + 1);
      const colHeader = colText; // ✅ align with item text

      // 🔥 Page break safety
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
        drawHeader();
      }

      /* -------------------------------
     SECTION HEADER (II. Title)
  -------------------------------- */
     doc.font("Bold").fontSize(10).text(section, colCheckbox, doc.y);

      doc.moveDown(0.3);

      grouped[section].forEach((group: any) => {
        /* -------------------------------
       SUBSECTION
    -------------------------------- */
        if (group.subsection) {
          doc
            .font("Bold")
            .fontSize(9)
            .text(group.subsection, colCheckbox, doc.y);

          doc.moveDown(0.4);
        }

        /* -------------------------------
       ITEMS
    -------------------------------- */
        group.items.forEach((item: any, index: number) => {
          const y = doc.y;

          const text = `${item.description}`;
          const number = `${item.itemNo}.`;

          const textHeight = doc.heightOfString(text, {
            width: maxWidth,
          });

          // 🔥 Page break
          if (doc.y + textHeight > doc.page.height - 60) {
            doc.addPage();
            drawHeader();
          }

          /* ✅ CHECKBOX (DRAWN) */
          doc.rect(colCheckbox, y, checkboxSize, checkboxSize).stroke();

          if (item.checked) {
            doc
              .moveTo(colCheckbox + 2, y + 5)
              .lineTo(colCheckbox + 5, y + 8)
              .lineTo(colCheckbox + 9, y + 2)
              .stroke();
          }

          /* ✅ NUMBER COLUMN */
          doc.font("Regular").fontSize(9).text(number, colNumber, y);

          /* ✅ TEXT COLUMN */
          doc.font("Regular").fontSize(9).text(text, colText, y, {
            width: maxWidth,
          });

          /* ✅ REMARKS (INDENTED) */
          if (item.remarks) {
            doc
              .font("Regular")
              .fontSize(9)
              .fillColor("#000")
              .text(`Remarks: ${item.remarks}`, colText + 10, doc.y);

            doc.fillColor("#000");
          }

          doc.moveDown(0.5);
        });

        doc.moveDown(0.5);
      });

      doc.moveDown(1);
    });

    doc.end();

    /* -------------------------------------------------------
       RETURN STREAM
    -------------------------------------------------------- */
    return new Response(webStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=Checklist_Report.pdf",
      },
    });
  } catch (err: any) {
    console.error("❌ PDF ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
