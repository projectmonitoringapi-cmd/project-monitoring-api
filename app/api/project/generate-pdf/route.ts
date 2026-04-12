/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { form, checklist } = body;

    const html = generateHTML(form, checklist);

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    const arrayBuffer = new Uint8Array(pdfBuffer).slice().buffer;

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=checklist.pdf",
      },
    });
  } catch (err: any) {
    console.error("PDF ERROR:", err); // 👈 IMPORTANT
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function generateHTML(form: any, checklist: any[]) {
  // ✅ group by section (avoid duplicates)
  const grouped = checklist.reduce((acc: any, group: any) => {
    if (!acc[group.section]) {
      acc[group.section] = [];
    }
    acc[group.section].push(group);
    return acc;
  }, {});

  return `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          color: #000;
        }

        .title {
          text-align: center;
          font-weight: bold;
          margin-bottom: 15px;
        }

        .section {
          margin-top: 12px;
          border: 1px solid #000;
        }

        .section-header {
          background: #d9d9d9;
          padding: 6px;
          font-weight: bold;
          border-bottom: 1px solid #000;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        td {
          padding: 6px;
          vertical-align: top;
        }

        .checkbox {
          width: 20px;
          text-align: center;
          font-size: 14px;
        }

        .item-text {
          width: 100%;
          font-size: 12px;
        }

        .remarks {
          font-size: 12px;
          color: #333;
          margin-top: 2px;
        }

        .subsection {
          font-size: 11px;
          padding: 4px 6px;
          background: #f5f5f5;
          border-bottom: 1px solid #ccc;
        }

        .item-row {
          border-bottom: 1px solid #eee;
        }

        .item-row:last-child {
          border-bottom: none;
        }
      </style>
    </head>

    <body>

      <div class="title">
        CHECKLIST OF SUPPORTING DOCUMENTS AND ATTACHMENTS FOR DoTS
      </div>

      ${Object.keys(grouped)
        .map(
          (section) => `
        <div class="section">
          <div class="section-header">${section}</div>

          ${grouped[section]
            .map(
              (group: any) => `
              ${
                group.subsection
                  ? `<div class="subsection">${group.subsection}</div>`
                  : ""
              }

              <table>
                ${group.items
                  .map(
                    (item: any) => `
                  <tr class="item-row">
                    <td class="checkbox">
                      ${item.checked ? "☑" : "☐"}
                    </td>
                    <td class="item-text">
                      <b>${item.itemNo}.</b> ${item.description}
                      ${
                        item.remarks
                          ? `<div class="remarks">Remarks: ${item.remarks}</div>`
                          : ""
                      }
                    </td>
                  </tr>
                `,
                  )
                  .join("")}
              </table>
            `,
            )
            .join("")}
        </div>
      `,
        )
        .join("")}

    </body>
  </html>
  `;
}
