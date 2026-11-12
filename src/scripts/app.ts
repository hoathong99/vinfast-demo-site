type Dict = Record<string, unknown>;

const env = import.meta.env as ImportMetaEnv;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SESSION_KEY = "vf_demo_session";
const UTM_KEY = "vf_demo_utm";
const CLICK_KEY = "vf_demo_click_id";
const LEADS_KEY = "vf_demo_leads";
const EVENTS_KEY = "vf_demo_events";

function isMobile(): boolean {
  return window.matchMedia("(max-width: 768px)").matches;
}

function getClickId(): string {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("gclid") || params.get("fbclid") || "";
  if (id) sessionStorage.setItem(CLICK_KEY, id);
  return sessionStorage.getItem(CLICK_KEY) || "";
}

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getUtm(): Dict {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_KEY) || "{}") as Dict;
  } catch {
    return {};
  }
}

function captureUtm(): void {
  const params = new URLSearchParams(window.location.search);
  const utm = {
    source: params.get("utm_source") || "",
    medium: params.get("utm_medium") || "",
    campaign: params.get("utm_campaign") || "",
    content: params.get("utm_content") || "",
    term: params.get("utm_term") || "",
  };
  const hasValue = Object.values(utm).some(Boolean);
  if (hasValue && !sessionStorage.getItem(UTM_KEY)) {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  }
}

function track(eventName: string, data: Dict = {}): void {
  const payload: Dict = {
    type: "event",
    event: eventName,
    sessionId: getSessionId(),
    pagePath: window.location.pathname,
    pageTitle: document.title,
    referrer: document.referrer,
    utm: getUtm(),
    clickId: getClickId(),
    device: isMobile() ? "mobile" : "desktop",
    browser: navigator.userAgent.slice(0, 120),
    timestamp: new Date().toISOString(),
    ...data,
  };

  const dataLayer = (window as unknown as { dataLayer?: Dict[] }).dataLayer;
  if (Array.isArray(dataLayer)) dataLayer.push({ event: eventName, ...data });

  const endpoint = env.PUBLIC_EVENT_ENDPOINT || env.PUBLIC_SHEET_ENDPOINT;
  if (endpoint && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: "text/plain;charset=UTF-8" });
    navigator.sendBeacon(endpoint, blob);
    return;
  }

  if (endpoint) {
    void fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
    return;
  }

  try {
    const stored = JSON.parse(localStorage.getItem(EVENTS_KEY) || "[]") as Dict[];
    stored.push(payload);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(stored.slice(-60)));
  } catch {
    // Storage can be unavailable in private mode; console is enough for the demo.
  }
  console.debug("[demo track]", eventName, payload);
}

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(value))} VNĐ`;
}

/* ---------------- Mobile drawer ---------------- */

function initDrawer(): void {
  const drawer = document.querySelector<HTMLElement>("#mobile-drawer");
  const openButton = document.querySelector<HTMLButtonElement>("[data-drawer-open]");
  if (!drawer || !openButton) return;

  const panel = drawer.querySelector<HTMLElement>(".drawer-panel");
  const closeButtons = drawer.querySelectorAll<HTMLElement>("[data-drawer-close]");
  let lastFocus: HTMLElement | null = null;

  const open = () => {
    lastFocus = document.activeElement as HTMLElement | null;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    openButton.setAttribute("aria-expanded", "true");
    document.body.classList.add("no-scroll");
    panel?.querySelector<HTMLElement>("a, button")?.focus();
  };

  const close = () => {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    openButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
    lastFocus?.focus();
  };

  openButton.addEventListener("click", open);
  closeButtons.forEach((button) => button.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) close();
  });
}

/* ---------------- Carousels ---------------- */

function initCarousel(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>("[data-carousel-track]");
  if (!track) return;
  const slides = Array.from(track.querySelectorAll<HTMLElement>("[data-carousel-slide]"));
  if (slides.length < 2) return;

  const prev = root.querySelector<HTMLButtonElement>("[data-carousel-prev]");
  const next = root.querySelector<HTMLButtonElement>("[data-carousel-next]");
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-carousel-dot]"));
  const autoplayMs = Number(root.dataset.autoplay || 0);
  let index = 0;
  let timer: number | undefined;
  let paused = false;

  const slideOffset = (slide: HTMLElement): number => {
    const trackRect = track.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    return slideRect.left - trackRect.left + track.scrollLeft;
  };

  const render = (nextIndex: number, smooth = true): void => {
    index = (nextIndex + slides.length) % slides.length;
    track.scrollTo({
      left: slideOffset(slides[index]),
      behavior: smooth && !reducedMotion ? "smooth" : "auto",
    });
    dots.forEach((dot, dotIndex) => {
      dot.setAttribute("aria-current", dotIndex === index ? "true" : "false");
    });
  };

  const syncFromScroll = (): void => {
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    slides.forEach((slide, slideIndex) => {
      const delta = Math.abs(track.scrollLeft - slideOffset(slide));
      if (delta < distance) {
        distance = delta;
        nearest = slideIndex;
      }
    });
    index = nearest;
    dots.forEach((dot, dotIndex) => {
      dot.setAttribute("aria-current", dotIndex === index ? "true" : "false");
    });
  };

  prev?.addEventListener("click", () => render(index - 1));
  next?.addEventListener("click", () => render(index + 1));
  dots.forEach((dot, dotIndex) => dot.addEventListener("click", () => render(dotIndex)));

  let frame = 0;
  track.addEventListener(
    "scroll",
    () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        syncFromScroll();
        frame = 0;
      });
    },
    { passive: true },
  );

  const start = () => {
    if (!autoplayMs || reducedMotion || paused) return;
    stop();
    timer = window.setInterval(() => render(index + 1), autoplayMs);
  };

  const stop = () => {
    if (timer) window.clearInterval(timer);
    timer = undefined;
  };

  root.addEventListener("mouseenter", () => {
    paused = true;
    stop();
  });
  root.addEventListener("mouseleave", () => {
    paused = false;
    start();
  });
  root.addEventListener("focusin", () => {
    paused = true;
    stop();
  });
  root.addEventListener("focusout", () => {
    paused = false;
    start();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  start();
}

/* ---------------- Gallery ---------------- */

function initGallery(): void {
  document.querySelectorAll<HTMLElement>("[data-gallery]").forEach((root) => {
    const main = root.querySelector<HTMLImageElement>("[data-gallery-main]");
    const thumbs = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-gallery-thumb]"));
    if (!main || thumbs.length === 0) return;

    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const src = thumb.dataset.src;
        if (!src) return;
        main.src = src;
        thumbs.forEach((item) => item.setAttribute("aria-current", item === thumb ? "true" : "false"));
      });
    });
  });
}

/* ---------------- Price calculator ---------------- */

function initCalculators(): void {
  document.querySelectorAll<HTMLElement>("[data-calculator]").forEach((root) => {
    const price = Number(root.dataset.price || 0);
    const down = root.querySelector<HTMLInputElement>("[data-calc-down]");
    const term = root.querySelector<HTMLInputElement>("[data-calc-term]");
    if (!price || !down || !term) return;

    const downLabel = root.querySelector<HTMLElement>("[data-calc-down-label]");
    const downValue = root.querySelector<HTMLElement>("[data-calc-down-value]");
    const termLabel = root.querySelector<HTMLElement>("[data-calc-term-label]");
    const monthlyOut = root.querySelector<HTMLElement>("[data-calc-monthly]");
    let tracked = false;

    const update = () => {
      const downPercent = Number(down.value);
      const months = Number(term.value);
      const downAmount = (price * downPercent) / 100;
      const principal = price - downAmount;
      const monthlyRate = 0.08 / 12;
      const monthly = monthlyRate === 0
        ? principal / months
        : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

      if (downLabel) downLabel.textContent = String(downPercent);
      if (downValue) downValue.textContent = formatVnd(downAmount);
      if (termLabel) termLabel.textContent = String(months);
      if (monthlyOut) monthlyOut.textContent = formatVnd(monthly);

      if (!tracked) {
        tracked = true;
        track("calculator_use", { price, downPercent, months });
      }
    };

    down.addEventListener("input", update);
    term.addEventListener("input", update);
    update();
  });
}

/* ---------------- Filter ---------------- */

function initFilters(): void {
  document.querySelectorAll<HTMLElement>("[data-filter-group]").forEach((group) => {
    const grid = document.querySelector<HTMLElement>("[data-vehicle-grid]");
    const empty = document.querySelector<HTMLElement>("[data-empty-state]");
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>("[data-vehicle-card]"));

    group.querySelectorAll<HTMLButtonElement>("[data-filter-min]").forEach((button) => {
      button.addEventListener("click", () => {
        group.querySelectorAll<HTMLButtonElement>("[data-filter-min]").forEach((item) => {
          item.setAttribute("aria-pressed", item === button ? "true" : "false");
        });
        const min = Number(button.dataset.filterMin || 0);
        const max = button.dataset.filterMax ? Number(button.dataset.filterMax) : Number.POSITIVE_INFINITY;
        let visible = 0;
        cards.forEach((card) => {
          const price = Number(card.dataset.price || 0);
          const show = price >= min && price <= max;
          card.hidden = !show;
          if (show) visible += 1;
        });
        if (empty) empty.style.display = visible === 0 ? "block" : "none";
        track("filter_use", { min, max: Number.isFinite(max) ? max : null });
      });
    });
  });
}

/* ---------------- Map facade ---------------- */

function initMap(): void {
  document.querySelectorAll<HTMLElement>("[data-map]").forEach((root) => {
    const button = root.querySelector<HTMLButtonElement>("[data-map-load]");
    const src = root.dataset.mapSrc;
    if (!button || !src) return;
    button.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.title = "Bản đồ showroom demo";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.allowFullscreen = true;
      root.replaceChildren(iframe);
      track("map_load", {});
    });
  });
}

/* ---------------- Lead forms ---------------- */

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidPhone(value: string): boolean {
  const digits = normalizePhone(value);
  return /^0\d{9,10}$/.test(digits) || /^84\d{9,10}$/.test(digits);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setFieldError(form: HTMLFormElement, name: string): void {
  const error = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
  if (!error) return;
  const wrapper = error.closest<HTMLElement>(".field, .consent");
  wrapper?.classList.add("is-invalid");
}

function clearErrors(form: HTMLFormElement): void {
  form.querySelectorAll(".is-invalid").forEach((element) => element.classList.remove("is-invalid"));
}

function firstInvalid(form: HTMLFormElement): HTMLElement | null {
  return form.querySelector<HTMLElement>(
    ".is-invalid input, .is-invalid select, .is-invalid textarea, .is-invalid button",
  );
}

function todayLocal(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function setStatus(form: HTMLFormElement, html: string, type: "success" | "error"): void {
  const status = form.querySelector<HTMLElement>(".form-status");
  if (!status) return;
  status.className = `form-status is-${type}`;
  status.innerHTML = html;
}

async function submitLead(data: Dict): Promise<"api" | "sheet" | "demo"> {
  const api = env.PUBLIC_API_ENDPOINT;
  const sheet = env.PUBLIC_SHEET_ENDPOINT;

  if (api) {
    const response = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return "api";
  }

  if (sheet) {
    // Apps Script accepts a simple text/plain request without a CORS preflight.
    // The response is opaque, so success is optimistic; use PUBLIC_API_ENDPOINT for strict confirmation.
    await fetch(sheet, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ type: "lead", ...data }),
    });
    return "sheet";
  }

  const stored = JSON.parse(localStorage.getItem(LEADS_KEY) || "[]") as Dict[];
  stored.push({ ...data, receivedAt: new Date().toISOString() });
  localStorage.setItem(LEADS_KEY, JSON.stringify(stored.slice(-50)));
  await new Promise((resolve) => window.setTimeout(resolve, 500));
  return "demo";
}

function initForms(): void {
  document.querySelectorAll<HTMLFormElement>("form.lead-form-js").forEach((form) => {
    const startedAt = Date.now();
    const dateInput = form.querySelector<HTMLInputElement>("[data-date-min]");
    if (dateInput) dateInput.min = todayLocal();

    const params = new URLSearchParams(window.location.search);
    const model = params.get("model");
    const vehicleSelect = form.querySelector<HTMLSelectElement>('select[name="vehicleSlug"]');
    if (model && vehicleSelect && Array.from(vehicleSelect.options).some((option) => option.value === model)) {
      vehicleSelect.value = model;
    }

    const utm = getUtm();
    const pagePath = form.querySelector<HTMLInputElement>("[data-page-path]");
    const referrer = form.querySelector<HTMLInputElement>("[data-referrer]");
    const utmSource = form.querySelector<HTMLInputElement>("[data-utm-source]");
    const utmMedium = form.querySelector<HTMLInputElement>("[data-utm-medium]");
    const utmCampaign = form.querySelector<HTMLInputElement>("[data-utm-campaign]");
    const utmContent = form.querySelector<HTMLInputElement>("[data-utm-content]");
    const utmTerm = form.querySelector<HTMLInputElement>("[data-utm-term]");
    const clickId = form.querySelector<HTMLInputElement>("[data-click-id]");
    const sessionId = form.querySelector<HTMLInputElement>("[data-session-id]");
    const elapsed = form.querySelector<HTMLInputElement>("[data-elapsed]");

    if (pagePath) pagePath.value = window.location.pathname;
    if (referrer) referrer.value = document.referrer;
    if (utmSource) utmSource.value = String(utm.source || "");
    if (utmMedium) utmMedium.value = String(utm.medium || "");
    if (utmCampaign) utmCampaign.value = String(utm.campaign || "");
    if (utmContent) utmContent.value = String(utm.content || "");
    if (utmTerm) utmTerm.value = String(utm.term || "");
    if (clickId) clickId.value = getClickId();
    if (sessionId) sessionId.value = getSessionId();

    let startedTracked = false;
    form.addEventListener(
      "focusin",
      () => {
        if (!startedTracked) {
          startedTracked = true;
          track("form_start", { formType: form.dataset.formType || "unknown" });
        }
      },
      { once: true },
    );

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearErrors(form);

      const formData = new FormData(form);
      const data: Dict = {};
      for (const [key, raw] of formData.entries()) {
        if (raw instanceof File) continue;
        if (key === "serviceType") {
          const list = (data.serviceType as string[] | undefined) ?? [];
          list.push(String(raw));
          data.serviceType = list;
        } else {
          data[key] = String(raw);
        }
      }

      const fullName = String(data.fullName || "").trim();
      const phone = String(data.phone || "").trim();
      const email = String(data.email || "").trim();
      const consent = data.consent === "on";
      const preferredDate = String(data.preferredDate || "");

      let hasError = false;
      if (fullName.length < 2) {
        setFieldError(form, "fullName");
        hasError = true;
      }
      if (!isValidPhone(phone)) {
        setFieldError(form, "phone");
        hasError = true;
      }
      if (email && !isValidEmail(email)) {
        setFieldError(form, "email");
        hasError = true;
      }
      if (vehicleSelect && !String(data.vehicleSlug || "")) {
        setFieldError(form, "vehicleSlug");
        hasError = true;
      }
      if (dateInput) {
        if (!preferredDate) {
          setFieldError(form, "preferredDate");
          hasError = true;
        } else if (preferredDate < todayLocal()) {
          setFieldError(form, "preferredDate");
          hasError = true;
        }
      }
      if (form.querySelector('select[name="preferredTime"]') && !String(data.preferredTime || "")) {
        setFieldError(form, "preferredTime");
        hasError = true;
      }
      if (form.querySelector('input[name="serviceType"]') && !(data.serviceType as string[] | undefined)?.length) {
        setFieldError(form, "serviceType");
        hasError = true;
      }
      if (!consent) {
        setFieldError(form, "consent");
        hasError = true;
      }

      if (hasError) {
        track("form_error", { formType: form.dataset.formType || "unknown", code: "validation" });
        firstInvalid(form)?.focus();
        return;
      }

      data.fullName = fullName;
      data.phone = phone;
      data.email = email;
      data.consent = consent;
      data.formType = form.dataset.formType || "unknown";
      data.elapsedMs = Date.now() - startedAt;
      data.timestamp = new Date().toISOString();
      data.device = isMobile() ? "mobile" : "desktop";
      data.browser = navigator.userAgent.slice(0, 120);
      data.clickId = getClickId();
      if (elapsed) elapsed.value = String(data.elapsedMs);

      const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const originalLabel = button?.textContent || "Gửi";
      if (button) {
        button.disabled = true;
        button.textContent = "Đang gửi...";
      }

      try {
        const mode = await submitLead(data);
        form.reset();
        if (dateInput) dateInput.min = todayLocal();
        track("form_submit", { formType: form.dataset.formType || "unknown", mode });

        if (mode === "demo") {
          setStatus(
            form,
            `Đã ghi nhận thông tin ở chế độ demo. Dữ liệu được lưu tạm trong trình duyệt. Gọi <a href="tel:0900000000">0900 000 000</a> nếu cần hỗ trợ ngay.`,
            "success",
          );
        } else {
          setStatus(
            form,
            `Gửi thành công. Đội ngũ demo sẽ liên hệ với bạn. Gọi <a href="tel:0900000000">0900 000 000</a> nếu cần hỗ trợ ngay.`,
            "success",
          );
        }
      } catch {
        track("form_error", { formType: form.dataset.formType || "unknown", code: "network" });
        setStatus(
          form,
          `Không gửi được thông tin. Vui lòng thử lại hoặc gọi <a href="tel:0900000000">0900 000 000</a>.`,
          "error",
        );
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
      }
    });
  });
}

/* ---------------- Misc ---------------- */

function initBackTop(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-back-top]");
  if (!button) return;
  const update = () => button.classList.toggle("is-visible", window.scrollY > 600);
  window.addEventListener("scroll", update, { passive: true });
  update();
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }));
}

function initTracking(): void {
  document.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]");
    if (!target) return;
    track(target.dataset.track || "click", {
      label: target.dataset.label || target.textContent?.trim().slice(0, 80) || "",
      href: target.getAttribute("href") || "",
    });
  });

  const vehicleView = document.querySelector<HTMLElement>("[data-vehicle-view]");
  if (vehicleView) track("vehicle_view", { vehicle: vehicleView.dataset.vehicleView });

  track("page_view", { title: document.title });
}

function initReveal(): void {
  const items = document.querySelectorAll<HTMLElement>(".reveal");
  if (!items.length || reducedMotion || !("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -40px 0px" },
  );
  items.forEach((item) => observer.observe(item));
}

captureUtm();
document.querySelectorAll<HTMLElement>("[data-carousel]").forEach(initCarousel);
initDrawer();
initGallery();
initCalculators();
initFilters();
initMap();
initForms();
initBackTop();
initTracking();
initReveal();
