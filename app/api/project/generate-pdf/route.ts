/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { checklist } = body;

    const html = generateHTML(checklist);

    return NextResponse.json({ html });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function generateHTML(checklist: any[]) {
  const grouped = checklist.reduce((acc: any, group: any) => {
    if (!acc[group.section]) acc[group.section] = [];
    acc[group.section].push(group);
    return acc;
  }, {});

  return `
    <style>
      body {
        font-family: Arial;
        font-size: 12px;
      }

      .title {
        text-align: center;
        margin-bottom: 15px;
      }

      .section {
        border: 1px solid #000;
        margin-top: 10px;
        page-break-inside: avoid;
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
      }

      .remarks {
        font-size: 11px;
        margin-top: 2px;
      }
    </style>

    <div id="pdf-template">
      <h2 class="title">
        CHECKLIST OF SUPPORTING DOCUMENTS AND ATTACHMENTS FOR DoTS
      </h2>

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
                  ? `<div style="padding:4px;">${group.subsection}</div>`
                  : ""
              }

              <table>
                ${group.items
                  .map(
                    (item: any) => `
                  <tr>
                    <td class="checkbox">
                      ${item.checked ? "☑" : "☐"}
                    </td>
                    <td>
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
    </div>
  `;
}