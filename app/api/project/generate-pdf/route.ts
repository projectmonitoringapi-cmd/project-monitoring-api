/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { checklist, type } = body;

    if (!checklist || checklist.length === 0) {
      return NextResponse.json(
        { error: "Checklist is required" },
        { status: 400 },
      );
    }

    /* -------------------------------------------------------
       ✅ TYPES THAT REQUIRE PER-GROUP PAGE
    -------------------------------------------------------- */
    const PER_GROUP_PAGE_TYPES = new Set([
      "Variation Order (C.O./E.W.O./F.V.O.)",
      "Contract Time Extension",
      "Contract Work Suspension",
      "Contract Work Resumption",
      "PERT/CPM/PDM",
      "Advance Payment",
      "First Progress Billing",
      "Interim Progress Billing",
      "Final Billing",
      "Release of Retention",
    ]);

    const selectedType = (type || "").trim();
    const forcePerGroupPage = PER_GROUP_PAGE_TYPES.has(selectedType);

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

    if (!fs.existsSync(fontRegular)) {
      throw new Error("Roboto-Regular.ttf not found in /public/fonts");
    }

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

    doc.registerFont("Regular", fontRegular);
    doc.registerFont("Bold", fontBold);
    doc.font("Regular");

    /* -------------------------------------------------------
       HEADER
    -------------------------------------------------------- */
    const logoPath = path.join(process.cwd(), "public/DPWH.png");

    const drawHeader = () => {
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 30, { width: 50 });
      }

      doc
        .font("Regular")
        .fontSize(10)
        .text("Republic of the Philippines", { align: "center" })
        .text("DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS", { align: "center" })
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
      doc.y = 120;
    };

    /* -------------------------------------------------------
       CERTIFICATION FUNCTION
    -------------------------------------------------------- */
    const drawCertification = () => {
      const certStartY = doc.page.height - 140;
      const certStartX = 60;
      const certLineWidth = 300;

      doc.font("Regular").fontSize(10);

      doc.text(
        "I hereby certify that the above supporting documents are complete",
        certStartX,
        certStartY,
      );

      doc.moveDown(1.5);

      doc.text("Print Name:", certStartX);
      doc
        .moveTo(certStartX + 90, doc.y - 2)
        .lineTo(certStartX + 90 + certLineWidth, doc.y - 2)
        .stroke();

      doc.moveDown(1);
      doc.text("Designation:", certStartX);
      doc
        .moveTo(certStartX + 90, doc.y - 2)
        .lineTo(certStartX + 90 + certLineWidth, doc.y - 2)
        .stroke();

      doc.moveDown(1);
      doc.text("Date:", certStartX);
      doc
        .moveTo(certStartX + 90, doc.y - 2)
        .lineTo(certStartX + 90 + certLineWidth, doc.y - 2)
        .stroke();
    };

    /* -------------------------------------------------------
       START FIRST PAGE
    -------------------------------------------------------- */
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
       LAYOUT CONFIG
    -------------------------------------------------------- */
    const startX = 50;
    const checkboxSize = 10;
    const colCheckbox = startX;
    const colNumber = startX + 18;
    const colText = startX + 35;
    const maxWidth = 480;

    /* -------------------------------------------------------
       RENDER
    -------------------------------------------------------- */
    Object.keys(grouped).forEach((section) => {
      doc.font("Bold").fontSize(10).text(section, colCheckbox);
      doc.moveDown(0.4);

      grouped[section].forEach((group: any, groupIndex: number) => {
        /* -------------------------------------------------------
           ✅ CONDITIONAL NEW PAGE PER GROUP
        -------------------------------------------------------- */
        if (forcePerGroupPage && groupIndex !== 0) {
          doc.addPage();
          drawHeader();

          doc.font("Bold").fontSize(10).text(section, colCheckbox);
          doc.moveDown(0.4);
        }

        /* SUBSECTION */
        if (group.subsection) {
          doc.font("Bold").fontSize(9).text(group.subsection, colCheckbox);
          doc.moveDown(0.4);
        }

        /* ITEMS */
        group.items.forEach((item: any) => {
          if (doc.y > doc.page.height - 160) {
            doc.addPage();
            drawHeader();

            doc.font("Bold").fontSize(10).text(section, colCheckbox);
            doc.moveDown(0.4);

            if (group.subsection) {
              doc.font("Bold").fontSize(9).text(group.subsection, colCheckbox);
              doc.moveDown(0.4);
            }
          }

          const y = doc.y;

          doc.rect(colCheckbox, y, checkboxSize, checkboxSize).stroke();

          if (item.checked) {
            doc
              .moveTo(colCheckbox + 2, y + 5)
              .lineTo(colCheckbox + 5, y + 8)
              .lineTo(colCheckbox + 9, y + 2)
              .stroke();
          }

          doc.font("Regular").fontSize(9).text(`${item.itemNo}.`, colNumber, y);

          doc.x = colText;
          doc.y = y;
          doc.text(item.description, { width: maxWidth });

          if (item.remarks) {
            doc.moveDown(0.2);
            doc.x = colText + 10;
            doc.text(`Remarks: ${item.remarks}`, {
              width: maxWidth - 10,
            });
          }

          doc.moveDown(0.7);
        });

        doc.moveDown(0.5);

        /* -------------------------------------------------------
           ✅ CERTIFICATION PER PAGE (IF REQUIRED)
        -------------------------------------------------------- */
        if (forcePerGroupPage) {
          drawCertification();
        }
      });

      doc.moveDown(1);
    });

    /* -------------------------------------------------------
       ✅ LAST PAGE CERTIFICATION (NON-PER-GROUP MODE)
    -------------------------------------------------------- */
    if (!forcePerGroupPage) {
      const range = doc.bufferedPageRange();
      const lastPageIndex = range.count - 1;

      doc.switchToPage(lastPageIndex);
      drawCertification();
    }

    doc.end();

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