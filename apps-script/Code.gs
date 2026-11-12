/**
 * VinFast CarOn Demo — Google Apps Script backend
 *
 * What it does
 *  - Receives form submissions and tracking events from the static site.
 *  - Appends rows to the bound Google Sheet.
 *  - Sends an email and/or Telegram notification for new leads.
 *  - Provides setup, backup and cleanup helpers.
 *
 * Deploy
 *  1. Create a Google Sheet.
 *  2. Extensions > Apps Script, paste this file.
 *  3. Run setup() once and authorize.
 *  4. Deploy > New deployment > Web app
 *       Execute as: Me
 *       Who has access: Anyone
 *  5. Copy the /exec URL into PUBLIC_SHEET_ENDPOINT in the site build env.
 *
 * Security notes
 *  - Set SHARED_SECRET in Script Properties and send it from a trusted proxy
 *    (Cloudflare Worker). Do not put the secret in browser code.
 *  - Direct browser posts are text/plain + no-cors, so the response is opaque.
 *    Use a Worker proxy if you need real error responses and rate limiting.
 */

const LEAD_SHEET = "Leads";
const EVENT_SHEET = "Events";
const ERROR_SHEET = "Errors";
const CONFIG_SHEET = "Config";

const LEAD_HEADERS = [
  "LeadID", "CreatedAt", "FormType", "FullName", "Phone", "Email",
  "Vehicle", "VehicleSlug", "Showroom", "PreferredDate", "PreferredTime",
  "ServiceType", "Message", "Consent", "ConsentVersion", "PagePath",
  "Referrer", "UTMSource", "UTMMedium", "UTMCampaign", "UTMContent", "UTMTerm",
  "ClickID", "Device", "Browser", "SessionID", "IPHash", "Status", "Owner",
  "Note", "FollowUpAt", "UpdatedAt",
];

const EVENT_HEADERS = [
  "EventID", "Timestamp", "EventName", "SessionID", "PagePath", "PageTitle",
  "VehicleSlug", "Label", "MetadataJSON", "Referrer", "UTMSource", "UTMMedium",
  "UTMCampaign", "Device", "Browser",
];

const ERROR_HEADERS = ["Timestamp", "Context", "Message", "Stack"];

const VEHICLE_NAMES = {
  "vinfast-vf-3": "VinFast VF 3",
  "vinfast-vf-5": "VinFast VF 5",
  "vinfast-vf-8": "VinFast VF 8",
  "vinfast-vf-9": "VinFast VF 9",
  "vinfast-evo": "VinFast Evo",
  "vinfast-viper": "VinFast Viper",
};

const FORM_TYPES = ["test_drive", "service", "contact", "quote"];
const EVENT_NAMES = [
  "page_view", "vehicle_view", "cta_click", "zalo_open", "form_start",
  "form_submit", "form_error", "calculator_use", "filter_use", "map_load",
];

/* ------------------------------------------------------------------ */
/* Menu and setup                                                      */
/* ------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("CarOn Demo")
    .addItem("Setup sheet", "setup")
    .addItem("Send test lead", "sendTestLead")
    .addItem("Backup now", "backupNow")
    .addItem("Clean old events", "cleanupEvents")
    .addToUi();
}

function setup() {
  const ss = getSpreadsheet_();
  const leads = ensureSheet_(ss, LEAD_SHEET, LEAD_HEADERS);
  const events = ensureSheet_(ss, EVENT_SHEET, EVENT_HEADERS);
  const errors = ensureSheet_(ss, ERROR_SHEET, ERROR_HEADERS);
  const config = ensureSheet_(ss, CONFIG_SHEET, ["Key", "Value"]);

  styleHeader_(leads, LEAD_HEADERS);
  styleHeader_(events, EVENT_HEADERS);
  styleHeader_(errors, ERROR_HEADERS);
  styleHeader_(config, ["Key", "Value"]);

  leads.setFrozenRows(1);
  events.setFrozenRows(1);
  errors.setFrozenRows(1);
  config.setFrozenRows(1);

  leads.getRange("B2:B").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  leads.getRange("AF2:AF").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  events.getRange("B2:B").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  errors.getRange("A2:A").setNumberFormat("yyyy-mm-dd hh:mm:ss");

  leads.setColumnWidth(1, 170);
  leads.setColumnWidth(2, 155);
  leads.setColumnWidth(4, 170);
  leads.setColumnWidth(5, 120);
  leads.setColumnWidth(13, 260);
  leads.setColumnWidth(16, 210);
  events.setColumnWidth(2, 155);
  events.setColumnWidth(5, 210);
  events.setColumnWidth(9, 280);

  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["New", "Contacted", "Qualified", "Won", "Lost"], true)
    .build();
  leads.getRange("AB2:AB").setDataValidation(statusRule);

  if (config.getLastRow() < 2) {
    config.appendRow(["SHOWROOM_NAME", "VinFast CarOn Demo"]);
    config.appendRow(["SHOWROOM_ADDRESS", "123 Đường Demo, Hà Nội"]);
  }

  ss.toast("CarOn Demo sheet is ready.", "Setup complete", 5);
}

function sendTestLead() {
  const result = appendLead_({
    formType: "test_drive",
    fullName: "Khách Demo",
    phone: "0900000000",
    email: "demo@example.com",
    vehicleSlug: "vinfast-vf-3",
    preferredDate: Utilities.formatDate(new Date(Date.now() + 86400000), "Asia/Ho_Chi_Minh", "yyyy-MM-dd"),
    preferredTime: "09:00",
    message: "Đây là lead kiểm tra do Apps Script tạo.",
    consent: true,
    consentVersion: "demo-2026-11",
    pagePath: "/dang-ky-lai-thu/",
    referrer: "https://example.com/",
    utm: { source: "demo", medium: "test", campaign: "setup" },
    company_website: "",
    elapsedMs: 5000,
  });
  getSpreadsheet_().toast(JSON.stringify(result), "Test lead", 8);
}

/* ------------------------------------------------------------------ */
/* HTTP handlers                                                       */
/* ------------------------------------------------------------------ */

function doGet() {
  return json_({ ok: true, service: "vinfast-caron-demo-sheet", time: new Date().toISOString() });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const payload = parsePayload_(e);
    if (!payload) return json_({ ok: false, error: "INVALID_PAYLOAD" });

    const props = getProps_();
    if (props.sharedSecret && payload.secret !== props.sharedSecret) {
      return json_({ ok: false, error: "UNAUTHORIZED" });
    }

    if (payload.type === "event") {
      appendEvent_(payload);
      return json_({ ok: true });
    }

    return json_(appendLead_(payload));
  } catch (error) {
    logError_("doPost", error);
    return json_({ ok: false, error: "SERVER_ERROR" });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function parsePayload_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (ignored) {}
  }
  if (e && e.parameter) {
    const payload = {};
    Object.keys(e.parameter).forEach((key) => { payload[key] = e.parameter[key]; });
    if (Object.keys(payload).length) return payload;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Lead handling                                                       */
/* ------------------------------------------------------------------ */

function appendLead_(payload) {
  const clean = cleanLead_(payload);
  if (!clean.ok) return { ok: false, error: "VALIDATION", fields: clean.errors };

  // Honeypot: pretend success, do not write.
  if (clean.spam) return { ok: true, ignored: true };

  const ss = getSpreadsheet_();
  const sheet = ensureSheet_(ss, LEAD_SHEET, LEAD_HEADERS);
  const now = new Date();
  const duplicate = findRecentDuplicate_(sheet, clean.phone, clean.formType, now);
  if (duplicate) {
    return { ok: true, duplicate: true, leadId: duplicate };
  }

  const leadId = "LD-" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyyMMdd") + "-" +
    Utilities.getUuid().slice(0, 6).toUpperCase();

  const row = [
    leadId,
    now,
    clean.formType,
    clean.fullName,
    clean.phone,
    clean.email,
    clean.vehicle,
    clean.vehicleSlug,
    clean.showroom,
    clean.preferredDate,
    clean.preferredTime,
    clean.serviceType,
    clean.message,
    clean.consent,
    clean.consentVersion,
    clean.pagePath,
    clean.referrer,
    clean.utmSource,
    clean.utmMedium,
    clean.utmCampaign,
    clean.utmContent,
    clean.utmTerm,
    clean.clickId,
    clean.device,
    clean.browser,
    clean.sessionId,
    "", // IP hash is not available to Apps Script; add it in a Worker proxy.
    "New",
    "",
    "",
    "",
    now,
  ];

  sheet.appendRow(row);
  notify_(clean, leadId);
  return { ok: true, leadId: leadId };
}

function cleanLead_(payload) {
  const errors = {};
  const formType = text_(payload.formType, 30) || "contact";
  if (FORM_TYPES.indexOf(formType) === -1) errors.formType = "Invalid form type.";

  const fullName = text_(payload.fullName, 80);
  if (fullName.length < 2) errors.fullName = "Name is required.";

  const phone = normalizePhone_(payload.phone);
  if (!/^0\d{9,10}$/.test(phone) && !/^84\d{9,10}$/.test(phone)) errors.phone = "Invalid phone.";

  const email = text_(payload.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email.";

  const consent = payload.consent === true || payload.consent === "true" || payload.consent === "on";
  if (!consent) errors.consent = "Consent is required.";

  const elapsedMs = Number(payload.elapsedMs || 0);
  if (elapsedMs && elapsedMs < 1000) errors.elapsedMs = "Submitted too quickly.";

  const preferredDate = text_(payload.preferredDate, 10);
  if (preferredDate) {
    const today = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || preferredDate < today) {
      errors.preferredDate = "Invalid date.";
    }
  }

  const serviceType = Array.isArray(payload.serviceType)
    ? payload.serviceType.map((item) => text_(item, 50)).filter(Boolean).join(", ")
    : text_(payload.serviceType, 200);

  const utm = payload.utm && typeof payload.utm === "object" ? payload.utm : {};
  const vehicleSlug = text_(payload.vehicleSlug, 80);
  const vehicle = VEHICLE_NAMES[vehicleSlug] || text_(payload.vehicle, 120);

  if (["test_drive", "service", "quote"].indexOf(formType) !== -1 && !vehicleSlug) {
    errors.vehicleSlug = "Vehicle is required.";
  }
  if (["test_drive", "service"].indexOf(formType) !== -1 && !preferredDate) {
    errors.preferredDate = "Date is required.";
  }
  if (formType === "service" && !serviceType) {
    errors.serviceType = "Service type is required.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors: errors,
    spam: Boolean(text_(payload.company_website, 120)),
    formType: formType,
    fullName: fullName,
    phone: phone,
    email: email,
    vehicle: vehicle,
    vehicleSlug: vehicleSlug,
    showroom: text_(payload.showroom, 120) || getConfigValue_("SHOWROOM_NAME") || "VinFast CarOn Demo",
    preferredDate: preferredDate,
    preferredTime: text_(payload.preferredTime, 10),
    serviceType: serviceType,
    message: text_(payload.message, 1000),
    consent: consent,
    consentVersion: text_(payload.consentVersion, 30),
    pagePath: text_(payload.pagePath, 300),
    referrer: text_(payload.referrer, 500),
    utmSource: text_(utm.source || payload.utmSource, 100),
    utmMedium: text_(utm.medium || payload.utmMedium, 100),
    utmCampaign: text_(utm.campaign || payload.utmCampaign, 150),
    utmContent: text_(utm.content || payload.utmContent, 150),
    utmTerm: text_(utm.term || payload.utmTerm, 150),
    clickId: text_(payload.clickId, 200),
    device: text_(payload.device, 40),
    browser: text_(payload.browser, 80),
    sessionId: text_(payload.sessionId, 80),
  };
}

function findRecentDuplicate_(sheet, phone, formType, now) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return "";
  const start = Math.max(2, lastRow - 300);
  const values = sheet.getRange(start, 1, lastRow - start + 1, LEAD_HEADERS.length).getValues();
  const cutoff = now.getTime() - 10 * 60 * 1000;
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const row = values[i];
    const created = row[1] instanceof Date ? row[1].getTime() : new Date(row[1]).getTime();
    if (created >= cutoff && row[2] === formType && normalizePhone_(row[4]) === phone) {
      return String(row[0] || "");
    }
  }
  return "";
}

/* ------------------------------------------------------------------ */
/* Event handling                                                      */
/* ------------------------------------------------------------------ */

function appendEvent_(payload) {
  const eventName = text_(payload.event, 60);
  if (EVENT_NAMES.indexOf(eventName) === -1) return;

  const ss = getSpreadsheet_();
  const sheet = ensureSheet_(ss, EVENT_SHEET, EVENT_HEADERS);
  const utm = payload.utm && typeof payload.utm === "object" ? payload.utm : {};
  const metadata = JSON.stringify(payload).slice(0, 2000);
  const eventId = "EV-" + Utilities.getUuid().slice(0, 8).toUpperCase();

  sheet.appendRow([
    eventId,
    new Date(),
    eventName,
    text_(payload.sessionId, 80),
    text_(payload.pagePath, 300),
    text_(payload.pageTitle, 200),
    text_(payload.vehicle || payload.vehicleSlug, 80),
    text_(payload.label, 120),
    metadata,
    text_(payload.referrer, 500),
    text_(utm.source, 100),
    text_(utm.medium, 100),
    text_(utm.campaign, 150),
    text_(payload.device, 40),
    text_(payload.browser, 80),
  ]);
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

function notify_(lead, leadId) {
  const props = getProps_();
  const subjects = {
    test_drive: "Lái thử mới",
    service: "Đặt lịch dịch vụ mới",
    quote: "Yêu cầu báo giá mới",
    contact: "Liên hệ mới",
  };
  const subject = `[CarOn Demo] ${subjects[lead.formType] || "Lead mới"} — ${lead.fullName}`;
  const body = [
    `LeadID: ${leadId}`,
    `Loại: ${lead.formType}`,
    `Họ tên: ${lead.fullName}`,
    `Điện thoại: ${lead.phone}`,
    `Email: ${lead.email || "-"}`,
    `Xe: ${lead.vehicle || "-"}`,
    `Ngày mong muốn: ${lead.preferredDate || "-"} ${lead.preferredTime || ""}`,
    `Dịch vụ: ${lead.serviceType || "-"}`,
    `Ghi chú: ${lead.message || "-"}`,
    `Trang: ${lead.pagePath || "-"}`,
    `Nguồn: ${lead.utmSource || "-"} / ${lead.utmMedium || "-"} / ${lead.utmCampaign || "-"}`,
    `Session: ${lead.sessionId || "-"}`,
  ].join("\n");

  if (props.notifyEmail) {
    try {
      MailApp.sendEmail({ to: props.notifyEmail, subject: subject, body: body });
    } catch (error) {
      logError_("notifyEmail", error);
    }
  }

  if (props.telegramToken && props.telegramChatId) {
    try {
      const url = "https://api.telegram.org/bot" + props.telegramToken + "/sendMessage";
      UrlFetchApp.fetch(url, {
        method: "post",
        payload: {
          chat_id: props.telegramChatId,
          text: body,
          disable_web_page_preview: "true",
        },
        muteHttpExceptions: true,
      });
    } catch (error) {
      logError_("notifyTelegram", error);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getSpreadsheet_() {
  const active = SpreadsheetApp.getActive();
  if (active) return active;
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("Set SPREADSHEET_ID in Script Properties or bind the script to a Sheet.");
  return SpreadsheetApp.openById(id);
}

function getProps_() {
  const props = PropertiesService.getScriptProperties();
  return {
    notifyEmail: props.getProperty("NOTIFY_EMAIL") || "",
    telegramToken: props.getProperty("TELEGRAM_BOT_TOKEN") || "",
    telegramChatId: props.getProperty("TELEGRAM_CHAT_ID") || "",
    sharedSecret: props.getProperty("SHARED_SECRET") || "",
  };
}

function getConfigValue_(key) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(CONFIG_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return "";
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0]) === key) return String(values[i][1] || "");
  }
  return "";
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function styleHeader_(sheet, headers) {
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setFontWeight("bold").setBackground("#008fde").setFontColor("#ffffff");
  range.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 34);
}

function normalizePhone_(value) {
  return String(value || "").replace(/\D/g, "");
}

function text_(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max || 500);
}

function json_(object) {
  return ContentService.createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

function logError_(context, error) {
  try {
    const ss = getSpreadsheet_();
    const sheet = ensureSheet_(ss, ERROR_SHEET, ERROR_HEADERS);
    sheet.appendRow([
      new Date(),
      context,
      String(error && error.message ? error.message : error),
      String(error && error.stack ? error.stack : "").slice(0, 2000),
    ]);
  } catch (ignored) {
    // Nothing else to do.
  }
}

/* ------------------------------------------------------------------ */
/* Maintenance                                                         */
/* ------------------------------------------------------------------ */

function backupNow() {
  const ss = getSpreadsheet_();
  const file = DriveApp.getFileById(ss.getId());
  const name = "CarOn-Demo-backup-" + Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyyMMdd-HHmm");
  file.makeCopy(name);
  getSpreadsheet_().toast("Backup created: " + name, "Backup", 5);
}

function cleanupEvents() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(EVENT_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return;
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const values = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
  let deleted = 0;
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const timestamp = values[i][0] instanceof Date ? values[i][0] : new Date(values[i][0]);
    if (timestamp < cutoff) {
      sheet.deleteRow(i + 2);
      deleted += 1;
    }
  }
  getSpreadsheet_().toast("Deleted " + deleted + " old event rows.", "Cleanup", 5);
}
