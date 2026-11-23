import {
  buildAllowedOrigins,
  buildSuggestedWorkerEndpoint,
  clearSheetConfig,
  clearSubmissionLog,
  getEnvDefaults,
  isAppsScriptEndpoint,
  normalizeOrigin,
  originError,
  parseOrigins,
  readSheetConfig,
  readSubmissionLog,
  readWorkerSettings,
  resolveLeadTarget,
  saveSheetConfig,
  saveWorkerSettings,
  validateEndpoint,
  workerNameError,
  workersSubdomainError,
  WORKER_SETTINGS_KEY,
  type LeadTarget,
  type LeadTransport,
  type SubmissionLogEntry,
} from "../lib/sheet-config";
import { submitLead } from "../lib/lead-submit";

const form = document.querySelector<HTMLFormElement>("[data-sheet-config-form]");
if (form) init(form);

const workerForm = document.querySelector<HTMLFormElement>("[data-worker-settings-form]");
if (workerForm) initWorkerSettings(workerForm);

function init(configForm: HTMLFormElement): void {
  const endpointInput = configForm.querySelector<HTMLInputElement>('[name="endpoint"]');
  const sheetUrlInput = configForm.querySelector<HTMLInputElement>('[name="sheetUrl"]');
  const transportSelect = configForm.querySelector<HTMLSelectElement>('[name="transport"]');
  const logEventsInput = configForm.querySelector<HTMLInputElement>('[name="logEvents"]');
  const status = configForm.querySelector<HTMLElement>("[data-config-status]");
  const testConnectionButton = configForm.querySelector<HTMLButtonElement>("[data-test-connection]");
  const testLeadButton = configForm.querySelector<HTMLButtonElement>("[data-test-lead]");
  const clearButton = configForm.querySelector<HTMLButtonElement>("[data-clear-config]");
  const clearLogButton = document.querySelector<HTMLButtonElement>("[data-clear-log]");
  const logRoot = document.querySelector<HTMLElement>("[data-submission-log]");
  const activeLabel = document.querySelector<HTMLElement>("[data-config-active-label]");
  const activeEndpoint = document.querySelector<HTMLElement>("[data-config-active-endpoint]");
  const activeCard = document.querySelector<HTMLElement>("[data-config-active]");
  const activeSource = document.querySelector<HTMLElement>("[data-config-source]");
  const activeUpdated = document.querySelector<HTMLElement>("[data-config-updated]");
  const openEndpoint = document.querySelector<HTMLAnchorElement>("[data-open-endpoint]");
  const openSheet = document.querySelector<HTMLAnchorElement>("[data-open-sheet]");

  if (!endpointInput || !sheetUrlInput || !transportSelect || !logEventsInput || !status) return;

  const env = getEnvDefaults();

  /* ---------------- Initial values ---------------- */

  const stored = readSheetConfig();
  if (stored) {
    endpointInput.value = stored.endpoint;
    sheetUrlInput.value = stored.sheetUrl;
    transportSelect.value = stored.transport;
    logEventsInput.checked = stored.logEvents;
  } else {
    endpointInput.value = env.api || env.sheet;
    transportSelect.value = env.sheet && !env.api ? "sheet" : "api";
  }

  fillEnv();
  refreshActive();
  renderLog();

  /* ---------------- Form actions ---------------- */

  configForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const validation = validateEndpoint(endpointInput.value);
    setFieldError("endpoint", !validation.ok);
    if (!validation.ok) {
      setStatusMessage(validation.error, "error");
      endpointInput.focus();
      return;
    }

    const transport = selectedTransport();
    if (transport === "sheet" && !isAppsScriptEndpoint(validation.endpoint)) {
      setStatusMessage(
        "Chế độ Apps Script trực tiếp nên dùng URL script.google.com/.../exec. Nếu bạn dùng Cloudflare Worker, hãy chọn “Cloudflare Worker / API proxy”.",
        "error",
      );
      return;
    }

    const saved = saveSheetConfig({
      endpoint: validation.endpoint,
      sheetUrl: sheetUrlInput.value,
      transport,
      logEvents: logEventsInput.checked,
    });

    if (!saved) {
      setStatusMessage("Không lưu được cấu hình. Trình duyệt có thể đang chặn localStorage.", "error");
      return;
    }

    setStatusMessage(
      "Đã lưu cấu hình trong trình duyệt này. Các form đăng ký sẽ dùng endpoint mới ngay từ lần gửi tiếp theo.",
      "success",
    );
    refreshActive();
  });

  testConnectionButton?.addEventListener("click", async () => {
    const validation = validateEndpoint(endpointInput.value);
    setFieldError("endpoint", !validation.ok);
    if (!validation.ok) {
      setStatusMessage(validation.error, "error");
      endpointInput.focus();
      return;
    }

    setBusy(testConnectionButton, "Đang kiểm tra...");
    setStatusMessage("Đang kiểm tra kết nối tới endpoint...", "info");
    try {
      const health = await checkHealth(validation.endpoint, selectedTransport());
      if (health.configured === false) {
        setStatusMessage(
          "Endpoint phản hồi nhưng Worker chưa cấu hình đủ secrets. Kiểm tra <code>SHEET_ID</code> và <code>GOOGLE_SERVICE_ACCOUNT_JSON_B64</code> trong Cloudflare → Worker → Settings → Variables and Secrets.",
          "error",
        );
        return;
      }
      setStatusMessage(
        `Kết nối OK — ${escapeHtml(String(health.service || "endpoint phản hồi"))}` +
          (health.time ? `, lúc ${escapeHtml(String(health.time))}` : "") +
          `. Hãy bấm “Gửi lead thử” để xác nhận dữ liệu vào Sheet.`,
        "success",
      );
    } catch (error) {
      setStatusMessage(
        `Chưa đọc được phản hồi từ endpoint (${escapeHtml(errorMessage(error))}). ` +
          (isAppsScriptEndpoint(validation.endpoint)
            ? "Apps Script thường chặn CORS; hãy cập nhật Code.gs mới (hỗ trợ JSONP), hoặc dùng “Gửi lead thử” và kiểm tra tab Leads."
            : "Kiểm tra URL, quyền truy cập Web App và cấu hình CORS của proxy."),
        "error",
      );
    } finally {
      setBusy(testConnectionButton, null);
    }
  });

  testLeadButton?.addEventListener("click", async () => {
    const validation = validateEndpoint(endpointInput.value);
    setFieldError("endpoint", !validation.ok);
    if (!validation.ok) {
      setStatusMessage(validation.error, "error");
      endpointInput.focus();
      return;
    }

    const transport = selectedTransport();
    if (transport === "sheet" && !isAppsScriptEndpoint(validation.endpoint)) {
      setStatusMessage(
        "Chế độ Apps Script trực tiếp nên dùng URL script.google.com/.../exec. Nếu đây là Cloudflare Worker, hãy chọn “Cloudflare Worker / API proxy”.",
        "error",
      );
      return;
    }

    const target: LeadTarget = {
      kind: transport,
      endpoint: validation.endpoint,
      source: "config",
    };

    setBusy(testLeadButton, "Đang gửi...");
    setStatusMessage("Đang gửi lead thử...", "info");

    try {
      const result = await submitLead(buildTestLead(), target);
      if (result.mode === "sheet") {
        setStatusMessage(
          "Đã gửi lead thử tới Google Sheet (no-cors nên trình duyệt không đọc được phản hồi). " +
            "Mở Sheet, kiểm tra tab <strong>Leads</strong> — dòng mới nhất có ghi chú “Lead thử từ trang cấu hình”.",
          "success",
        );
      } else {
        setStatusMessage(
          `Gửi lead thử thành công qua API${result.leadId ? ` — mã <strong>${escapeHtml(result.leadId)}</strong>` : ""}.`,
          "success",
        );
      }
      renderLog();
    } catch (error) {
      setStatusMessage(
        `Gửi lead thử thất bại: ${escapeHtml(errorMessage(error))}. Kiểm tra endpoint, CORS trong <code>ALLOWED_ORIGINS</code> và quyền Editor của service account trên Sheet.`,
        "error",
      );
    } finally {
      setBusy(testLeadButton, null);
    }
  });

  clearButton?.addEventListener("click", () => {
    clearSheetConfig();
    endpointInput.value = "";
    sheetUrlInput.value = "";
    logEventsInput.checked = true;
    transportSelect.value = "api";
    setFieldError("endpoint", false);
    setStatusMessage(
      "Đã xóa cấu hình trong trình duyệt. Trang sẽ dùng biến môi trường (env/.env) hoặc chế độ demo.",
      "info",
    );
    refreshActive();
  });

  clearLogButton?.addEventListener("click", () => {
    clearSubmissionLog();
    renderLog();
  });

  endpointInput.addEventListener("input", () => {
    const value = endpointInput.value.trim();
    setFieldError("endpoint", false);
    if (!value) {
      updateEndpointHint("");
      return;
    }
    const error = validateEndpoint(value).error;
    updateEndpointHint(error);
  });

  window.addEventListener("storage", (event) => {
    if (!event.key || event.key === "vf_demo_sheet_config" || event.key === WORKER_SETTINGS_KEY) refreshActive();
  });

  /* ---------------- Helpers ---------------- */

  function selectedTransport(): LeadTransport {
    return transportSelect?.value === "api" ? "api" : "sheet";
  }

  function setFieldError(name: string, invalid: boolean): void {
    const error = configForm.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    error?.closest<HTMLElement>(".field")?.classList.toggle("is-invalid", invalid);
  }

  function setStatusMessage(html: string, type: "success" | "error" | "info"): void {
    if (!status) return;
    status.className = `form-status is-${type}`;
    status.innerHTML = html;
  }

  function updateEndpointHint(message: string): void {
    const hint = configForm.querySelector<HTMLElement>("[data-endpoint-hint]");
    if (!hint) return;
    hint.textContent = message || "URL Cloudflare Worker nên kết thúc bằng /lead.";
    hint.classList.toggle("is-error", Boolean(message));
  }

  function refreshActive(): void {
    const target = resolveLeadTarget();
    if (activeCard) activeCard.dataset.mode = target.kind;
    if (activeLabel) {
      activeLabel.textContent =
        target.kind === "demo"
          ? "Chưa kết nối Google Sheet"
          : target.kind === "api"
            ? "Đang gửi qua Cloudflare Worker / API"
            : "Đang gửi trực tiếp vào Google Sheet";
    }
    if (activeEndpoint) {
      activeEndpoint.textContent = target.endpoint || "Dữ liệu đang được lưu tạm trong localStorage (demo).";
    }
    if (activeSource) {
      activeSource.textContent =
        target.source === "config" ? "Cấu hình trình duyệt" : target.source === "env" ? "Biến môi trường (env/.env)" : "Demo";
    }

    const current = readSheetConfig();
    if (activeUpdated) {
      activeUpdated.textContent = current?.updatedAt
        ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(current.updatedAt))
        : "—";
    }

    if (openEndpoint) {
      if (target.endpoint) {
        openEndpoint.href = target.endpoint;
        openEndpoint.hidden = false;
      } else {
        openEndpoint.hidden = true;
      }
    }
    if (openSheet) {
      const sheetUrl = current?.sheetUrl || "";
      if (sheetUrl) {
        openSheet.href = sheetUrl;
        openSheet.hidden = false;
      } else {
        openSheet.hidden = true;
      }
    }

    const sourceBadge = document.querySelector<HTMLElement>("[data-config-source-badge]");
    if (sourceBadge) {
      sourceBadge.textContent = target.source === "config" ? "Local" : target.source === "env" ? ".env" : "Demo";
      sourceBadge.dataset.source = target.source;
    }
  }

  function fillEnv(): void {
    const values: Array<[string, boolean]> = [
      [env.api || "chưa đặt", Boolean(env.api)],
      [env.event || "chưa đặt", Boolean(env.event)],
      [env.workerName || "chưa đặt", Boolean(env.workerName)],
      [env.workersSubdomain || "chưa đặt", Boolean(env.workersSubdomain)],
      [env.productionOrigin || "chưa đặt", Boolean(env.productionOrigin)],
      [env.sheet || "chưa đặt", Boolean(env.sheet)],
    ];
    const nodes = [
      document.querySelector<HTMLElement>("[data-env-api]"),
      document.querySelector<HTMLElement>("[data-env-event]"),
      document.querySelector<HTMLElement>("[data-env-worker-name]"),
      document.querySelector<HTMLElement>("[data-env-workers-subdomain]"),
      document.querySelector<HTMLElement>("[data-env-production-origin]"),
      document.querySelector<HTMLElement>("[data-env-sheet]"),
    ];
    nodes.forEach((node, index) => {
      if (!node) return;
      node.textContent = values[index][0];
      node.classList.toggle("is-empty", !values[index][1]);
    });
  }

  function renderLog(): void {
    if (!logRoot) return;
    const entries = readSubmissionLog();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "config-log-empty";
      empty.textContent = "Chưa có lead nào được gửi từ trình duyệt này.";
      logRoot.replaceChildren(empty);
      return;
    }
    logRoot.replaceChildren(...entries.slice(0, 12).map(renderLogEntry));
  }

  function renderLogEntry(entry: SubmissionLogEntry): HTMLElement {
    const item = document.createElement("div");
    item.className = "config-log-item";

    const head = document.createElement("div");
    head.className = "config-log-head";

    const name = document.createElement("strong");
    name.textContent = entry.fullName || "Không tên";
    head.append(name);

    const mode = document.createElement("span");
    mode.className = "config-badge";
    mode.dataset.mode = entry.mode;
    mode.textContent = entry.mode === "sheet" ? "Sheet" : entry.mode === "api" ? "API" : "Demo";
    head.append(mode);

    const meta = document.createElement("p");
    meta.className = "config-log-meta";
    const parts = [
      entry.phone || "—",
      entry.formType || "—",
      new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.at)),
    ];
    if (entry.leadId) parts.push(`Lead ${entry.leadId}`);
    if (entry.duplicate) parts.push("trùng 10 phút");
    meta.textContent = parts.join(" · ");

    const endpoint = document.createElement("p");
    endpoint.className = "config-log-endpoint";
    endpoint.textContent = entry.endpoint || "localStorage";

    item.append(head, meta, endpoint);
    return item;
  }
}

/* ---------------- Worker setup helpers ---------------- */

function initWorkerSettings(workerForm: HTMLFormElement): void {
  const workerNameInput = workerForm.querySelector<HTMLInputElement>('[name="workerName"]') as HTMLInputElement;
  const subdomainInput = workerForm.querySelector<HTMLInputElement>('[name="workersSubdomain"]') as HTMLInputElement;
  const productionInput = workerForm.querySelector<HTMLInputElement>('[name="productionOrigin"]') as HTMLInputElement;
  const status = workerForm.querySelector<HTMLElement>("[data-worker-status]") as HTMLElement;
  const suggestedEndpoint = document.querySelector<HTMLElement>("[data-suggested-endpoint]");
  const suggestedOrigins = document.querySelector<HTMLElement>("[data-suggested-origins]");
  const suggestedWorkerName = document.querySelector<HTMLElement>("[data-suggested-worker-name]");
  const currentOrigin = document.querySelector<HTMLElement>("[data-current-origin]");
  const originCheck = document.querySelector<HTMLElement>("[data-origin-check]");
  const copyOriginsButton = document.querySelector<HTMLButtonElement>("[data-copy-allowed-origins]");
  const copyConfigButton = document.querySelector<HTMLButtonElement>("[data-copy-worker-config]");
  const useEndpointButton = document.querySelector<HTMLButtonElement>("[data-use-suggested-endpoint]");
  const endpointInput = document.querySelector<HTMLInputElement>('[data-sheet-config-form] [name="endpoint"]');
  const transportSelect = document.querySelector<HTMLSelectElement>('[data-sheet-config-form] [name="transport"]');
  const configForm = document.querySelector<HTMLFormElement>("[data-sheet-config-form]");

  if (!workerNameInput || !subdomainInput || !productionInput || !status) return;

  const env = getEnvDefaults();
  const stored = readWorkerSettings();
  workerNameInput.value = stored?.workerName || env.workerName || "vinfast-lead-api";
  subdomainInput.value = stored?.workersSubdomain || env.workersSubdomain || "";
  const storedOrigins = stored?.productionOrigins?.length
    ? stored.productionOrigins
    : parseOrigins(env.productionOrigin);
  productionInput.value = storedOrigins.join(", ");

  if (currentOrigin) currentOrigin.textContent = window.location.origin;
  updatePreview();

  workerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const settings = validateWorkerInputs();
    if (!settings) return;

    const saved = saveWorkerSettings(settings);
    if (!saved) {
      setWorkerStatus("Không lưu được thông tin Worker. Trình duyệt có thể đang chặn localStorage.", "error");
      return;
    }

    updatePreview();
    setWorkerStatus(
      "Đã lưu thông tin Worker trong trình duyệt này. Hãy copy <code>ALLOWED_ORIGINS</code> sang Cloudflare → Worker → Settings → Variables and Secrets.",
      "success",
    );
  });

  [workerNameInput, subdomainInput, productionInput].forEach((input) => {
    input.addEventListener("input", () => {
      setWorkerFieldError(input.name, false);
      updatePreview();
    });
  });

  copyOriginsButton?.addEventListener("click", async () => {
    const origins = readOrigins();
    if (!origins.length) {
      setWorkerStatus("Nhập production origin hợp lệ trước khi copy.", "error");
      return;
    }
    const allowed = buildAllowedOrigins(origins);
    const copied = await copyText(allowed);
    setWorkerStatus(
      copied
        ? `Đã copy <code>ALLOWED_ORIGINS</code>: <code>${escapeHtml(allowed)}</code>`
        : "Không copy được. Hãy copy thủ công từ ô ALLOWED_ORIGINS bên dưới.",
      copied ? "success" : "error",
    );
  });

  copyConfigButton?.addEventListener("click", async () => {
    const workerName = workerNameInput.value.trim();
    const workersSubdomain = subdomainInput.value.trim();
    const origins = readOrigins();
    if (!workerName || !origins.length) {
      setWorkerStatus("Cần có Worker name và production origin hợp lệ trước khi copy cấu hình.", "error");
      return;
    }

    const allowed = buildAllowedOrigins(origins);
    const endpoint = buildSuggestedWorkerEndpoint({ workerName, workersSubdomain });
    const text = [
      `Worker name: ${workerName}`,
      `ALLOWED_ORIGINS=${allowed}`,
      endpoint ? `Suggested endpoint: ${endpoint}` : "Suggested endpoint: add a workers.dev subdomain or use your custom domain",
      "Worker secrets: SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON_B64, ALLOWED_ORIGINS, IP_HASH_SALT",
    ].join("\n");

    const copied = await copyText(text);
    setWorkerStatus(
      copied
        ? "Đã copy cấu hình Worker. Dán vào ghi chú hoặc Cloudflare Dashboard khi tạo Worker."
        : "Không copy được cấu hình. Hãy copy thủ công các giá trị bên dưới.",
      copied ? "success" : "error",
    );
  });

  useEndpointButton?.addEventListener("click", () => {
    const endpoint = buildSuggestedWorkerEndpoint({
      workerName: workerNameInput.value.trim(),
      workersSubdomain: subdomainInput.value.trim(),
    });
    if (!endpoint) {
      setWorkerStatus(
        "Cần nhập Worker name và workers.dev subdomain để tạo URL gợi ý. Nếu dùng custom domain, hãy tự dán URL vào form endpoint.",
        "error",
      );
      return;
    }

    if (endpointInput) {
      endpointInput.value = endpoint;
      endpointInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (transportSelect) transportSelect.value = "api";
    setWorkerStatus(
      "Đã điền URL gợi ý vào form endpoint và chọn Cloudflare Worker / API proxy. Bấm “Lưu cấu hình” để áp dụng.",
      "success",
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    configForm?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    endpointInput?.focus({ preventScroll: true });
  });

  function validateWorkerInputs(): {
    workerName: string;
    workersSubdomain: string;
    productionOrigins: string[];
  } | null {
    const workerName = workerNameInput.value.trim();
    const workersSubdomain = subdomainInput.value.trim();
    const rawOrigins = productionInput.value.trim();
    const nameError = workerNameError(workerName);
    const subdomainError = workersSubdomainError(workersSubdomain);

    const parts = rawOrigins
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    let originIssue = "";
    if (!parts.length) {
      originIssue = "Vui lòng nhập production origin của website.";
    } else {
      for (const part of parts) {
        const error = originError(part);
        if (error) {
          originIssue = error;
          break;
        }
      }
    }

    setWorkerFieldError("workerName", Boolean(nameError));
    setWorkerFieldError("workersSubdomain", Boolean(subdomainError));
    setWorkerFieldError("productionOrigin", Boolean(originIssue));

    if (nameError) {
      setWorkerStatus(nameError, "error");
      workerNameInput.focus();
      return null;
    }
    if (subdomainError) {
      setWorkerStatus(subdomainError, "error");
      subdomainInput.focus();
      return null;
    }
    if (originIssue) {
      setWorkerStatus(originIssue, "error");
      productionInput.focus();
      return null;
    }

    const productionOrigins = Array.from(
      new Set(parts.map((item) => normalizeOrigin(item)).filter(Boolean)),
    );
    if (!productionOrigins.length) {
      setWorkerStatus("Production origin chưa hợp lệ.", "error");
      productionInput.focus();
      return null;
    }

    return { workerName, workersSubdomain, productionOrigins };
  }

  function readOrigins(): string[] {
    return Array.from(
      new Set(
        productionInput.value
          .split(",")
          .map((item) => normalizeOrigin(item))
          .filter(Boolean),
      ),
    );
  }

  function updatePreview(): void {
    const workerName = workerNameInput.value.trim();
    const workersSubdomain = subdomainInput.value.trim();
    const origins = readOrigins();
    const allowed = buildAllowedOrigins(origins);
    const endpoint = buildSuggestedWorkerEndpoint({ workerName, workersSubdomain });

    if (suggestedEndpoint) suggestedEndpoint.textContent = endpoint || "—";
    if (suggestedOrigins) suggestedOrigins.textContent = allowed || "—";
    if (suggestedWorkerName) suggestedWorkerName.textContent = workerName || "—";
    if (currentOrigin) currentOrigin.textContent = window.location.origin;

    if (!originCheck) return;
    const allowedList = allowed ? allowed.split(",") : [];
    const matched = allowedList.includes(window.location.origin);
    originCheck.className = `form-status is-${matched ? "success" : "info"}`;
    originCheck.textContent = matched
      ? `Origin hiện tại (${window.location.origin}) nằm trong ALLOWED_ORIGINS.`
      : `Lưu ý: origin hiện tại (${window.location.origin}) chưa nằm trong ALLOWED_ORIGINS. Nếu đây là môi trường demo thật, hãy thêm origin này vào Production origin.`;
  }

  function setWorkerFieldError(name: string, invalid: boolean): void {
    const error = workerForm.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    error?.closest<HTMLElement>(".field")?.classList.toggle("is-invalid", invalid);
  }

  function setWorkerStatus(html: string, type: "success" | "error" | "info"): void {
    status.className = `form-status is-${type}`;
    status.innerHTML = html;
  }
}

/* ---------------- Health check ---------------- */

async function checkHealth(
  endpoint: string,
  transport: LeadTransport,
): Promise<Record<string, unknown>> {
  if (transport === "sheet" && isAppsScriptEndpoint(endpoint)) {
    try {
      return await jsonpPing(endpoint);
    } catch {
      // Older Code.gs deployments return JSON without JSONP. A no-cors fetch at
      // least confirms the browser can reach the deployment.
      await fetch(endpoint, { method: "GET", mode: "no-cors", cache: "no-store" });
      return { ok: true, service: "Apps Script (không đọc được nội dung do CORS)" };
    }
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as Record<string, unknown>;
    if (body.ok === false) throw new Error(String(body.error || "Endpoint báo lỗi"));
    return body;
  } finally {
    window.clearTimeout(timer);
  }
}

function jsonpPing(endpoint: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const callback = `__vfSheetPing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement("script");
    const cleanup = (): void => {
      window.clearTimeout(timer);
      script.remove();
      try {
        delete (window as unknown as Record<string, unknown>)[callback];
      } catch {
        // Ignore.
      }
    };
    const finish = (error?: Error, data?: Record<string, unknown>): void => {
      cleanup();
      if (error) reject(error);
      else resolve(data || {});
    };
    const timer = window.setTimeout(() => finish(new Error("timeout")), 12000);

    (window as unknown as Record<string, unknown>)[callback] = (data: Record<string, unknown>) => {
      finish(undefined, data);
    };
    script.onerror = () => finish(new Error("script-error"));
    script.src = withQuery(endpoint, { callback, ping: String(Date.now()) });
    script.async = true;
    document.head.append(script);
  });
}

function withQuery(endpoint: string, params: Record<string, string>): string {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

/* ---------------- Test payload ---------------- */

function buildTestLead(): Record<string, unknown> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const pad = (value: number): string => String(value).padStart(2, "0");
  const preferredDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  const phone = `09${String(Date.now()).slice(-8)}`;
  const session = (() => {
    try {
      return sessionStorage.getItem("vf_demo_session") || crypto.randomUUID?.() || `s-${Date.now()}`;
    } catch {
      return `s-${Date.now()}`;
    }
  })();

  return {
    formType: "test_drive",
    fullName: "Khách Test Cấu Hình",
    phone,
    email: "test@example.com",
    vehicleSlug: "vinfast-vf-3",
    vehicle: "VinFast VF 3",
    showroom: "VinFast Demo — Kiểm tra cấu hình",
    preferredDate,
    preferredTime: "09:00",
    message: `Lead thử từ trang cấu hình (${new Date().toISOString()}).`,
    consent: true,
    consentVersion: "config-test",
    pagePath: window.location.pathname,
    referrer: document.referrer,
    utm: {},
    company_website: "",
    elapsedMs: 5000,
    device: window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop",
    browser: navigator.userAgent.slice(0, 120),
    sessionId: session,
    timestamp: new Date().toISOString(),
    clickId: "",
  };
}

/* ---------------- UI helpers ---------------- */

function setBusy(button: HTMLButtonElement, label: string | null): void {
  if (label) {
    if (!button.dataset.label) button.dataset.label = button.textContent || "";
    button.disabled = true;
    button.textContent = label;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.label || button.textContent;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall back to a temporary textarea below.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
