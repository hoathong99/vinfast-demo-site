import {
  DEMO_LEADS_KEY,
  recordSubmission,
  resolveLeadTarget,
  type ConfigSource,
  type LeadTarget,
} from "./sheet-config";

export interface SubmitResult {
  mode: "sheet" | "api" | "demo";
  source: ConfigSource;
  endpoint: string;
  leadId?: string;
  duplicate?: boolean;
}

type LeadData = Record<string, unknown>;

function readDemoLeads(): LeadData[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(DEMO_LEADS_KEY) || "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as LeadData[]) : [];
  } catch {
    return [];
  }
}

function saveDemoLead(data: LeadData): void {
  try {
    const stored = readDemoLeads();
    stored.push({ ...data, receivedAt: new Date().toISOString() });
    localStorage.setItem(DEMO_LEADS_KEY, JSON.stringify(stored.slice(-50)));
  } catch {
    // Private mode can block localStorage; the UI still confirms the demo submission.
  }
}

function logLead(data: LeadData, result: SubmitResult): void {
  recordSubmission({
    mode: result.mode,
    source: result.source,
    endpoint: result.endpoint,
    formType: String(data.formType || "unknown"),
    fullName: String(data.fullName || ""),
    phone: String(data.phone || ""),
    leadId: result.leadId,
    duplicate: result.duplicate,
  });
}

/**
 * Sends a lead to the active backend.
 *
 * - `sheet`: direct Apps Script Web App. The request is text/plain + no-cors,
 *   so the browser cannot read the response; success is optimistic.
 * - `api`: a JSON/CORS proxy. Errors and the returned lead ID are surfaced.
 * - `demo`: stores the lead in localStorage.
 */
export async function submitLead(data: LeadData, targetOverride?: LeadTarget): Promise<SubmitResult> {
  const target = targetOverride ?? resolveLeadTarget();
  const payload = { type: "lead", ...data };

  if (target.kind === "api") {
    const response = await fetch(target.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    let body: Record<string, unknown> | null = null;
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      body = null;
    }

    if (!response.ok) throw new Error(`API ${response.status}`);
    if (body && body.ok === false) {
      throw new Error(String(body.error || "API từ chối dữ liệu."));
    }

    const result: SubmitResult = {
      mode: "api",
      source: target.source,
      endpoint: target.endpoint,
      leadId: typeof body?.leadId === "string" ? body.leadId : undefined,
      duplicate: Boolean(body?.duplicate),
    };
    logLead(data, result);
    return result;
  }

  if (target.kind === "sheet") {
    // Apps Script accepts a simple text/plain request without a CORS preflight.
    await fetch(target.endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload),
    });

    const result: SubmitResult = {
      mode: "sheet",
      source: target.source,
      endpoint: target.endpoint,
    };
    logLead(data, result);
    return result;
  }

  saveDemoLead(payload);
  await new Promise((resolve) => window.setTimeout(resolve, 350));

  const result: SubmitResult = { mode: "demo", source: "demo", endpoint: "" };
  logLead(data, result);
  return result;
}
