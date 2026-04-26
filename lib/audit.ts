/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSheetsClient } from "@/lib/googleSheets";
import { randomUUID } from "crypto";

export async function logAudit(entry: any) {
  try {
    const sheets = await getSheetsClient();

    const {
      username = "unknown",
      name = username, // ✅ fallback
      action = "UNKNOWN",
      entity = "",
      entityId = "",
      oldValue = {},
      newValue = {},
    } = entry;

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID!,
      range: "AUDITLOGS!A:I", // ✅ UPDATED RANGE
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          randomUUID(),                     // A: ID
          new Date().toISOString(),         // B: Timestamp
          username,                         // C: Username
          name,                             // D: Name ✅ NEW
          action,                           // E: Action
          entity,                           // F: Entity
          entityId,                         // G: EntityID
          JSON.stringify(oldValue || {}),   // H: OldValue
          JSON.stringify(newValue || {}),   // I: NewValue
        ]],
      },
    });
  } catch (err) {
    console.error("AUDIT LOG ERROR:", err);
    // ❗ Do NOT throw → never break main logic
  }
}