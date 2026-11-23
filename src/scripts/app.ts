import { submitLead } from "../lib/lead-submit";
import {
  SHEET_CONFIG_EVENT,
  SHEET_CONFIG_KEY,
  resolveEventEndpoint,
  resolveLeadTarget,
  targetLabel,
} from "../lib/sheet-config";

type Dict = Record<string, unknown>;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SESSION_KEY = "vf_demo_session";
const UTM_KEY = "vf_demo_utm";
const CLICK_KEY = "vf_demo_click_id";
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

  const endpoint = resolveEventEndpoint();
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

/* ---------------- Carousels ---------------- */

function initCarousel(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>("[data-carousel-track]");
  if (!track) return;
  const originals = Array.from(track.querySelectorAll<HTMLElement>("[data-carousel-slide]"));
  if (originals.length < 2) return;

  const isFade = root.dataset.carouselMode === "fade";
  const count = originals.length;
  const prev = root.querySelector<HTMLButtonElement>("[data-carousel-prev]");
  const next = root.querySelector<HTMLButtonElement>("[data-carousel-next]");
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-carousel-dot]"));
  const autoplayMs = Number(root.dataset.autoplay || 0);

  let slides = originals;
  let index = 0;
  let timer: number | undefined;
  let paused = false;
  let ignoreClick = false;

  /*
   * Scroll carousels get a clone on each side. Wrapping from the last slide to
   * the first (or the other way round) keeps scrolling in the same direction
   * instead of animating backwards through every slide.
   */
  if (!isFade) {
    const leadClone = originals[count - 1].cloneNode(true) as HTMLElement;
    const tailClone = originals[0].cloneNode(true) as HTMLElement;
    for (const clone of [leadClone, tailClone]) {
      clone.dataset.carouselClone = "true";
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll<HTMLElement>("a, button, [tabindex]").forEach((node) => {
        node.setAttribute("tabindex", "-1");
      });
    }
    track.prepend(leadClone);
    track.append(tailClone);
    slides = [leadClone, ...originals, tailClone];
    index = 1;
  }

  const realIndex = (): number => (isFade ? index : (index - 1 + count) % count);

  const syncDots = (): void => {
    const active = realIndex();
    dots.forEach((dot, dotIndex) => {
      dot.setAttribute("aria-current", dotIndex === active ? "true" : "false");
    });
    if (isFade) {
      root.dispatchEvent(new CustomEvent("carousel:change", { detail: { index: active } }));
    }
  };

  const syncFadeSlides = (): void => {
    const previousSlot = (index - 1 + count) % count;
    const nextSlot = (index + 1) % count;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === index;
      slide.classList.toggle("is-active", active);
      slide.classList.toggle("is-prev", !active && count > 2 && slideIndex === previousSlot);
      slide.classList.toggle("is-next", !active && count > 2 && slideIndex === nextSlot);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      slide.querySelectorAll<HTMLElement>("a, button").forEach((node) => {
        node.tabIndex = active ? 0 : -1;
      });
    });
    syncDots();
  };

  const slideOffset = (slide: HTMLElement): number => {
    const trackRect = track.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    return slideRect.left - trackRect.left + track.scrollLeft;
  };

  const scrollToSlide = (target: number, smooth = true): void => {
    index = target;
    if (!smooth) {
      const previous = track.style.scrollBehavior;
      track.style.scrollBehavior = "auto";
      track.scrollTo({ left: slideOffset(slides[target]), behavior: "auto" });
      track.style.scrollBehavior = previous;
    } else {
      track.scrollTo({
        left: slideOffset(slides[target]),
        behavior: reducedMotion ? "auto" : "smooth",
      });
    }
    syncDots();
  };

  let wrapTimer: number | undefined;

  const settleLoop = (): void => {
    if (isFade) return;
    if (index === 0) scrollToSlide(count, false);
    else if (index === count + 1) scrollToSlide(1, false);
  };

  const scheduleLoop = (): void => {
    if (isFade) return;
    window.clearTimeout(wrapTimer);
    if (index === 0 || index === count + 1) {
      wrapTimer = window.setTimeout(settleLoop, 900);
    }
  };

  const render = (target: number, smooth = true): void => {
    if (isFade) {
      index = ((target % count) + count) % count;
      syncFadeSlides();
      return;
    }
    scrollToSlide(Math.max(0, Math.min(count + 1, target)), smooth);
    scheduleLoop();
  };

  if (isFade) {
    syncFadeSlides();
  } else {
    scrollToSlide(1, false);
  }

  const syncFromScroll = (): void => {
    if (isFade) return;
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
    syncDots();
  };

  prev?.addEventListener("click", () => render(index - 1));
  next?.addEventListener("click", () => render(index + 1));
  dots.forEach((dot, dotIndex) =>
    dot.addEventListener("click", () => render(isFade ? dotIndex : dotIndex + 1)),
  );

  /* Drag / swipe horizontally */
  let drag: {
    id: number;
    startX: number;
    startY: number;
    startScroll: number;
    startIndex: number;
    distance: number;
    moved: boolean;
  } | null = null;
  let settleTimer: number | undefined;

  const clearFadeDrag = (): void => {
    slides.forEach((slide) => {
      slide.style.removeProperty("opacity");
      slide.style.removeProperty("transform");
      slide.style.removeProperty("visibility");
    });
  };

  const paintFadeDrag = (distance: number): void => {
    const direction = distance < 0 ? 1 : -1;
    const target = (index + direction + count) % count;
    const progress = Math.min(1, Math.abs(distance) / 160);
    const active = slides[index];
    const incoming = slides[target];
    active.style.opacity = String(1 - progress * 0.7);
    active.style.transform = `translateX(${distance * 0.12}px)`;
    incoming.style.visibility = "visible";
    incoming.style.opacity = String(progress * 0.7);
    incoming.style.transform = `translateX(${direction * (1 - progress) * 48}px)`;
  };

  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScroll: track.scrollLeft,
      startIndex: index,
      distance: 0,
      moved: false,
    };
    root.classList.add("is-dragging");
    paused = true;
    stop();
    if (!isFade) {
      try {
        track.setPointerCapture(event.pointerId);
      } catch {
        /* pointer capture is optional */
      }
    }
  });

  track.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const distance = event.clientX - drag.startX;
    const vertical = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.abs(distance) < 5) return;
      if (Math.abs(vertical) > Math.abs(distance) * 1.15) {
        // Vertical intent: let the page scroll instead of hijacking the gesture.
        drag = null;
        root.classList.remove("is-dragging");
        clearFadeDrag();
        paused = false;
        start();
        return;
      }
      drag.moved = true;
      if (isFade) {
        try {
          track.setPointerCapture(event.pointerId);
        } catch {
          /* pointer capture is optional */
        }
      }
    }
    drag.distance = distance;
    if (isFade) {
      paintFadeDrag(distance);
    } else {
      track.scrollLeft = drag.startScroll - distance;
    }
    event.preventDefault();
  });

  const endDrag = (event: PointerEvent): void => {
    if (!drag || event.pointerId !== drag.id) return;
    const { moved, startIndex, startScroll, distance } = drag;
    drag = null;
    try {
      track.releasePointerCapture(event.pointerId);
    } catch {
      /* pointer capture is optional */
    }
    if (moved) {
      ignoreClick = true;
      window.setTimeout(() => {
        ignoreClick = false;
      }, 80);

      if (isFade) {
        if (Math.abs(distance) >= 60) {
          const direction = distance < 0 ? 1 : -1;
          render(startIndex + direction);
        } else {
          syncFadeSlides();
        }
        requestAnimationFrame(() => {
          root.classList.remove("is-dragging");
          clearFadeDrag();
        });
      } else {
        const width = track.clientWidth || 1;
        // Positive when the content moved forward (next slide).
        const delta = track.scrollLeft - startScroll;
        // Treat short flicks as one slide, longer drags as however many slides they span.
        const steps =
          Math.abs(delta) < 60 ? 0 : Math.sign(delta) * Math.max(1, Math.round(Math.abs(delta) / width));
        /*
         * Keep scroll-snap disabled while the slide animates into place.
         * Re-enabling it straight away makes the browser snap back to the
         * nearest slide and cancels the programmatic scroll.
         */
        window.clearTimeout(settleTimer);
        render(startIndex + steps);
        settleTimer = window.setTimeout(() => root.classList.remove("is-dragging"), 800);
      }
    } else {
      root.classList.remove("is-dragging");
    }
    paused = false;
    start();
  };

  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  root.addEventListener(
    "click",
    (event) => {
      if (!ignoreClick) return;
      ignoreClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  let frame = 0;
  track.addEventListener(
    "scroll",
    () => {
      if (isFade || frame) return;
      frame = requestAnimationFrame(() => {
        syncFromScroll();
        frame = 0;
      });
    },
    { passive: true },
  );

  if (!isFade) {
    if ("onscrollend" in track) track.addEventListener("scrollend", settleLoop);

    let resizeTimer: number | undefined;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        scrollToSlide(Math.max(0, Math.min(count + 1, index)), false);
      }, 150);
    });
  }

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

/* ---------------- Product showcase ---------------- */

function initProductShowcase(): void {
  document.querySelectorAll<HTMLElement>("[data-product-showcase]").forEach((section) => {
    const carousel = section.querySelector<HTMLElement>("[data-carousel]");
    const buttons = Array.from(section.querySelectorAll<HTMLButtonElement>("button[data-color-index]"));
    if (!carousel || !buttons.length) return;

    const setActive = (index: number): void => {
      buttons.forEach((button, buttonIndex) => {
        const active = buttonIndex === index;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.colorIndex || 0);
        const dots = carousel.querySelectorAll<HTMLButtonElement>("[data-carousel-dot]");
        dots[index]?.click();
        setActive(index);
      });
    });

    carousel.addEventListener("carousel:change", (event) => {
      const detail = (event as CustomEvent<{ index: number }>).detail;
      if (typeof detail?.index === "number") setActive(detail.index);
    });

    const active = carousel.querySelector<HTMLElement>(".product-slide.is-active");
    setActive(Number(active?.dataset.colorIndex || 0));
  });
}

function initImageLightbox(): void {
  const lightbox = document.querySelector<HTMLElement>("[data-image-lightbox]");
  if (!lightbox) return;

  const image = lightbox.querySelector<HTMLImageElement>("[data-lightbox-image]");
  const caption = lightbox.querySelector<HTMLElement>("[data-lightbox-caption]");
  const closeButton = lightbox.querySelector<HTMLButtonElement>("[data-lightbox-close]");
  let lastFocus: HTMLElement | null = null;

  const open = (src: string, alt: string): void => {
    if (!image) return;
    image.src = src;
    image.alt = alt;
    if (caption) caption.textContent = alt;
    lastFocus = document.activeElement as HTMLElement | null;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    closeButton?.focus();
  };

  const close = (): void => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    lastFocus?.focus();
  };

  document.querySelectorAll<HTMLButtonElement>("[data-image-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.closest<HTMLElement>("[data-product-showcase]");
      const active = section?.querySelector<HTMLElement>(".product-slide.is-active");
      const img = active?.querySelector<HTMLImageElement>("img");
      if (!img) return;
      open(img.currentSrc || img.src, img.alt);
    });
  });

  closeButton?.addEventListener("click", close);

  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
    if (event.key === "Tab") {
      event.preventDefault();
      closeButton?.focus();
    }
  });

  // The dark backdrop is intentionally inert: only the close button exits inspect mode.
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) event.stopPropagation();
  });
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
  const panel = document.querySelector<HTMLElement>("[data-filter-panel]");
  const grid = document.querySelector<HTMLElement>("[data-vehicle-grid]");
  if (!panel || !grid) return;

  const empty = document.querySelector<HTMLElement>("[data-empty-state]");
  const cards = Array.from(grid.querySelectorAll<HTMLElement>("[data-vehicle-card]"));
  const count = panel.querySelector<HTMLElement>("[data-filter-count]");
  const typeButtons = Array.from(panel.querySelectorAll<HTMLButtonElement>("[data-filter-type]"));
  const minInput = panel.querySelector<HTMLInputElement>("[data-price-min-input]");
  const maxInput = panel.querySelector<HTMLInputElement>("[data-price-max-input]");
  const fill = panel.querySelector<HTMLElement>("[data-price-fill]");
  const readout = panel.querySelector<HTMLElement>("[data-price-readout]");
  const resetButton = panel.querySelector<HTMLButtonElement>("[data-filter-reset]");
  const priceToggle = panel.querySelector<HTMLButtonElement>("[data-price-toggle]");
  const priceBody = panel.querySelector<HTMLElement>("[data-price-body]");

  const sliderMin = Number(panel.dataset.priceMin || 0);
  const sliderMax = Number(panel.dataset.priceMax || 0);
  const hasPrice = Boolean(minInput && maxInput && sliderMax > sliderMin);

  let category = "";
  let minValue = sliderMin;
  let maxValue = sliderMax;

  const formatPrice = (value: number): string => `${new Intl.NumberFormat("vi-VN").format(value)} VNĐ`;

  const apply = (): void => {
    let visible = 0;
    cards.forEach((card) => {
      const price = Number(card.dataset.price || 0);
      const matchesType = !category || card.dataset.category === category;
      const matchesPrice = !hasPrice || (price >= minValue && price <= maxValue);
      const show = matchesType && matchesPrice;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (empty) empty.style.display = visible === 0 ? "block" : "none";
    if (count) count.textContent = `${visible} mẫu xe`;
  };

  const paintSlider = (): void => {
    if (!hasPrice || !minInput || !maxInput) return;
    const span = sliderMax - sliderMin;
    const start = span > 0 ? ((minValue - sliderMin) / span) * 100 : 0;
    const end = span > 0 ? ((maxValue - sliderMin) / span) * 100 : 100;
    if (fill) {
      fill.style.setProperty("--fill-start", String(start / 100));
      fill.style.setProperty("--fill-end", String((100 - end) / 100));
    }
    if (readout) readout.textContent = `Từ ${formatPrice(minValue)} — Đến ${formatPrice(maxValue)}`;
    minInput.value = String(minValue);
    maxInput.value = String(maxValue);
    // When both thumbs meet, the lower one has to stay on top so it can be dragged back.
    minInput.style.zIndex = minValue >= maxValue ? "4" : "2";
    maxInput.style.zIndex = maxValue <= minValue ? "2" : "3";
  };

  const trackPrice = (): void => {
    track("filter_use", {
      type: category || "all",
      min: hasPrice ? minValue : null,
      max: hasPrice ? maxValue : null,
    });
  };

  const handleInput = (changed: "min" | "max"): void => {
    if (!minInput || !maxInput) return;
    let low = Number(minInput.value);
    let high = Number(maxInput.value);
    if (low > high) {
      if (changed === "min") {
        low = high;
        minInput.value = String(low);
      } else {
        high = low;
        maxInput.value = String(high);
      }
    }
    minValue = low;
    maxValue = high;
    paintSlider();
    apply();
  };

  minInput?.addEventListener("input", () => handleInput("min"));
  maxInput?.addEventListener("input", () => handleInput("max"));
  minInput?.addEventListener("change", trackPrice);
  maxInput?.addEventListener("change", trackPrice);

  typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      category = button.dataset.filterType || "";
      typeButtons.forEach((item) => {
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      });
      apply();
      trackPrice();
    });
  });

  resetButton?.addEventListener("click", () => {
    category = "";
    minValue = sliderMin;
    maxValue = sliderMax;
    typeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.filterType === "" ? "true" : "false");
    });
    paintSlider();
    apply();
    track("filter_use", { reset: true });
  });

  const setPriceExpanded = (expanded: boolean): void => {
    if (!priceToggle) return;
    priceToggle.setAttribute("aria-expanded", String(expanded));
    if (priceBody) priceBody.hidden = !expanded;
  };

  priceToggle?.addEventListener("click", () => {
    setPriceExpanded(priceToggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", (event) => {
    if (!priceToggle || priceToggle.getAttribute("aria-expanded") !== "true") return;
    const target = event.target as Node;
    if (priceToggle.contains(target) || priceBody?.contains(target)) return;
    setPriceExpanded(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !priceToggle) return;
    if (priceToggle.getAttribute("aria-expanded") !== "true") return;
    setPriceExpanded(false);
    priceToggle.focus();
  });

  paintSlider();
  apply();
}

/* ---------------- Compare table ---------------- */

function initCompare(): void {
  document.querySelectorAll<HTMLElement>("[data-compare]").forEach((root) => {
    const select = root.querySelector<HTMLSelectElement>("[data-compare-select]");
    const body = root.querySelector<HTMLElement>("[data-compare-body]");
    const price = root.querySelector<HTMLElement>("[data-compare-price]");
    if (!select || !body) return;

    const update = (): void => {
      const option = select.selectedOptions[0];
      if (!option) return;
      let specs: Record<string, string> = {};
      try {
        specs = JSON.parse(option.dataset.specs || "{}") as Record<string, string>;
      } catch {
        specs = {};
      }
      if (price) price.textContent = option.dataset.price || "";
      body.querySelectorAll<HTMLElement>("[data-compare-value]").forEach((cell) => {
        const label = cell.dataset.compareValue || "";
        cell.textContent = specs[label] || "—";
      });
      track("compare_use", { model: option.value });
    };

    select.addEventListener("change", update);
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

function fillTrackingFields(form: HTMLFormElement): void {
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

  if (pagePath) pagePath.value = window.location.pathname;
  if (referrer) referrer.value = document.referrer;
  if (utmSource) utmSource.value = String(utm.source || "");
  if (utmMedium) utmMedium.value = String(utm.medium || "");
  if (utmCampaign) utmCampaign.value = String(utm.campaign || "");
  if (utmContent) utmContent.value = String(utm.content || "");
  if (utmTerm) utmTerm.value = String(utm.term || "");
  if (clickId) clickId.value = getClickId();
  if (sessionId) sessionId.value = getSessionId();
}

function initSheetStatus(): void {
  const nodes = document.querySelectorAll<HTMLElement>("[data-sheet-status]");
  if (!nodes.length) return;

  const update = (): void => {
    const target = resolveLeadTarget();
    nodes.forEach((node) => {
      node.dataset.mode = target.kind;
      node.textContent =
        target.kind === "demo"
          ? "Chưa nối Google Sheet — đăng ký chỉ được lưu tạm trong trình duyệt."
          : `Đăng ký được gửi tới ${targetLabel(target)}.`;
    });
  };

  update();
  window.addEventListener("storage", (event) => {
    if (!event.key || event.key === SHEET_CONFIG_KEY) update();
  });
  window.addEventListener(SHEET_CONFIG_EVENT, update);
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

    fillTrackingFields(form);
    const elapsed = form.querySelector<HTMLInputElement>("[data-elapsed]");

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
        const result = await submitLead(data);
        form.reset();
        fillTrackingFields(form);
        if (dateInput) dateInput.min = todayLocal();
        track("form_submit", {
          formType: form.dataset.formType || "unknown",
          mode: result.mode,
          source: result.source,
        });

        if (result.mode === "demo") {
          setStatus(
            form,
            `Đã ghi nhận thông tin ở chế độ demo. Dữ liệu được lưu tạm trong trình duyệt. Gọi <a href="tel:0900000000">0900 000 000</a> nếu cần hỗ trợ ngay.`,
            "success",
          );
        } else if (result.mode === "sheet") {
          setStatus(
            form,
            `Đã gửi đăng ký tới Google Sheet. Kiểm tra tab <strong>Leads</strong> để xác nhận. Gọi <a href="tel:0900000000">0900 000 000</a> nếu cần hỗ trợ ngay.`,
            "success",
          );
        } else {
          const lead = result.leadId
            ? ` Mã lead: <strong>${escapeHtml(result.leadId)}</strong>.`
            : "";
          setStatus(
            form,
            `Gửi thành công.${lead} Đội ngũ demo sẽ liên hệ với bạn. Gọi <a href="tel:0900000000">0900 000 000</a> nếu cần hỗ trợ ngay.`,
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

/* ---------------- Header behaviour ---------------- */

function initNav(): void {
  const items = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-item]"));
  if (!items.length) return;

  const closeAll = (except?: HTMLElement): void => {
    items.forEach((item) => {
      if (item === except) return;
      item.classList.remove("is-open");
      item.querySelector<HTMLButtonElement>("[data-nav-toggle]")?.setAttribute("aria-expanded", "false");
    });
  };

  items.forEach((item) => {
    const button = item.querySelector<HTMLButtonElement>("[data-nav-toggle]");
    if (!button) return;
    button.addEventListener("click", () => {
      const open = !item.classList.contains("is-open");
      closeAll(item);
      item.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
    });
    item.addEventListener("mouseenter", () => button.setAttribute("aria-expanded", "true"));
    item.addEventListener("mouseleave", () => {
      if (!item.classList.contains("is-open")) button.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (event) => {
    if (!(event.target as Element).closest("[data-nav-item]")) closeAll();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAll();
  });
}

function initHeaderScroll(): void {
  const header = document.querySelector<HTMLElement>(".site-header");
  if (!header) return;
  let lastY = window.scrollY;
  let hidden = false;

  const setHidden = (value: boolean): void => {
    if (hidden === value) return;
    hidden = value;
    header.classList.toggle("is-hidden", value);
  };

  const compactHeader = window.matchMedia("(max-width: 1080px)");

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      if (compactHeader.matches) {
        // Keep the visible menu row on phones/tablets instead of auto-hiding it.
        setHidden(false);
        lastY = y;
        return;
      }
      if (document.body.classList.contains("no-scroll")) return;
      if (document.querySelector(".nav-item.is-open")) return;
      if (y <= 120) {
        setHidden(false);
        lastY = y;
        return;
      }
      if (y - lastY > 6) setHidden(true);
      else if (lastY - y > 6) setHidden(false);
      lastY = y;
    },
    { passive: true },
  );
}

/* ---------------- Test drive form ---------------- */

interface BookingVehicle {
  slug: string;
  name: string;
  type: string;
  image: string;
  price: string;
}

function initBookingForms(): void {
  document.querySelectorAll<HTMLElement>("[data-booking]").forEach((root) => {
    const select = root.querySelector<HTMLSelectElement>("[data-booking-vehicle]");
    const image = root.querySelector<HTMLImageElement>("[data-booking-image]");
    if (!select || !image) return;

    const nameEl = root.querySelector<HTMLElement>("[data-booking-name]");
    const priceEl = root.querySelector<HTMLElement>("[data-booking-price]");
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-booking-tab]"));

    let list: BookingVehicle[] = [];
    try {
      list = JSON.parse(root.dataset.vehicles || "[]") as BookingVehicle[];
    } catch {
      list = [];
    }

    const update = (animate = true): void => {
      const option = select.selectedOptions[0];
      if (!option) return;
      const src = option.dataset.image;
      if (src && image.getAttribute("src") !== src) {
        if (animate && !reducedMotion) {
          image.classList.add("is-swapping");
          const preload = new Image();
          const reveal = (): void => {
            image.src = src;
            image.classList.remove("is-swapping");
          };
          preload.onload = reveal;
          preload.onerror = reveal;
          preload.src = src;
        } else {
          image.src = src;
        }
      }
      const name = option.dataset.name || option.textContent || "";
      image.alt = name;
      if (nameEl) nameEl.textContent = name;
      if (priceEl) priceEl.textContent = option.dataset.price || "";
    };

    const fill = (type: string): void => {
      const filtered = list.filter((vehicle) => vehicle.type === type);
      select.innerHTML = "";
      filtered.forEach((vehicle) => {
        const option = new Option(vehicle.name, vehicle.slug);
        option.dataset.image = vehicle.image;
        option.dataset.name = vehicle.name;
        option.dataset.price = vehicle.price;
        select.add(option);
      });
      if (filtered.length) select.value = filtered[0].slug;
      update(false);
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((other) => {
          const active = other === tab;
          other.classList.toggle("is-active", active);
          other.setAttribute("aria-selected", String(active));
        });
        fill(tab.dataset.bookingTab || "car");
      });
    });

    select.addEventListener("change", () => update());

    const form = root.querySelector<HTMLFormElement>("form");
    form?.addEventListener("reset", () => {
      window.setTimeout(() => update(false), 0);
    });

    const model = new URLSearchParams(window.location.search).get("model");
    const match = model ? list.find((vehicle) => vehicle.slug === model) : undefined;
    if (match) {
      const tab = tabs.find((item) => item.dataset.bookingTab === match.type);
      tab?.click();
      if (Array.from(select.options).some((option) => option.value === match.slug)) {
        select.value = match.slug;
      }
    }
    update(false);
  });
}

captureUtm();
initNav();
initHeaderScroll();
document.querySelectorAll<HTMLElement>("[data-carousel]").forEach(initCarousel);
initProductShowcase();
initImageLightbox();
initBookingForms();
initGallery();
initCalculators();
initFilters();
initCompare();
initMap();
initForms();
initSheetStatus();
initBackTop();
initTracking();
initReveal();
