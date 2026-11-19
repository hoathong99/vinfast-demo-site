import type { SaleItem, SaleProgram, SaleProgramItemRef } from "../data/repositories/types";
import {
  createSaleItemIndex,
  mergeSaleItems,
  normalizeSaleItemName,
  normalizeSaleProgram,
  resolveSaleItems,
  salePrice,
  uniqueSaleItemId,
} from "../lib/sale";
import { createLocalSaleProgramStore } from "../lib/sale-program-store";

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} VNĐ`;
}

function parseJson<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readSeedItems(root: HTMLElement): SaleItem[] {
  const parsed = parseJson<unknown>(root.dataset.saleItems);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const id = String(record.id ?? "").trim();
    const name = String(record.name ?? "").trim();
    return id && name ? [{ id, name }] : [];
  });
}

async function initSaleProgram(root: HTMLElement): Promise<void> {
  const productId = root.dataset.productId;
  if (!productId) return;

  const basePrice = Number(root.dataset.basePrice) || 0;
  const seedProgram = normalizeSaleProgram(parseJson(root.dataset.saleJson), productId);
  const seedItems = readSeedItems(root);

  const store = createLocalSaleProgramStore(seedItems);
  const [override, storedCustomItems] = await Promise.all([
    store.loadProgram(productId),
    store.listCustomItems(),
  ]);

  let customItems = storedCustomItems;
  let catalog = mergeSaleItems(seedItems, customItems);
  let itemIndex = createSaleItemIndex(catalog);
  let state = normalizeSaleProgram(override ?? seedProgram, productId);

  const editButton = root.querySelector<HTMLButtonElement>("[data-sale-edit]");
  const dialog = root.querySelector<HTMLDialogElement>("[data-sale-editor]");
  const form = root.querySelector<HTMLFormElement>("[data-sale-editor-form]");
  if (!editButton || !dialog || !form) return;

  const deal = root.querySelector<HTMLElement>("[data-sale-deal]");
  const dealPrice = root.querySelector<HTMLElement>("[data-sale-deal-price]");
  const dealBase = root.querySelector<HTMLElement>("[data-sale-deal-base]");
  const discounts = root.querySelector<HTMLElement>("[data-sale-discounts]");
  const percentChip = root.querySelector<HTMLElement>("[data-sale-chip-percent]");
  const flatChip = root.querySelector<HTMLElement>("[data-sale-chip-flat]");
  const gifts = root.querySelector<HTMLElement>("[data-sale-gifts]");
  const details = root.querySelector<HTMLElement>("[data-sale-details]");
  const empty = root.querySelector<HTMLElement>("[data-sale-empty]");
  const summary = root.querySelector<HTMLElement>(".sale-program-accordion summary");

  const itemsContainer = form.querySelector<HTMLElement>("[data-sale-items]");
  const detailsContainer = form.querySelector<HTMLElement>("[data-sale-details-rows]");
  const itemTemplate = root.querySelector<HTMLTemplateElement>("[data-sale-item-template]");
  const detailTemplate = root.querySelector<HTMLTemplateElement>("[data-sale-detail-template]");

  function render(): void {
    const resolvedItems = resolveSaleItems(state.items, itemIndex);
    const finalPrice = salePrice(basePrice, state);
    const discounted = finalPrice < basePrice;
    const visible = state.enabled;
    const hasGifts = visible && resolvedItems.length > 0;
    const hasDetails = visible && state.details.length > 0;

    if (deal) deal.hidden = !visible || !discounted;
    if (dealPrice) dealPrice.textContent = formatVnd(finalPrice);
    if (dealBase) dealBase.textContent = formatVnd(basePrice);

    if (discounts) discounts.hidden = !visible || !discounted;
    if (percentChip) {
      percentChip.hidden = !visible || state.percentDiscount <= 0;
      percentChip.textContent = `-${state.percentDiscount}%`;
    }
    if (flatChip) {
      flatChip.hidden = !visible || state.flatDiscount <= 0;
      flatChip.textContent = `-${formatVnd(state.flatDiscount)}`;
    }

    if (gifts) {
      gifts.hidden = !hasGifts;
      gifts.replaceChildren(
        ...resolvedItems.map((item) => {
          const li = document.createElement("li");
          const strong = document.createElement("strong");
          strong.textContent = item.name;
          li.append(strong);
          if (item.note) {
            const note = document.createElement("span");
            note.textContent = item.note;
            li.append(note);
          }
          return li;
        }),
      );
    }

    if (details) {
      details.hidden = !hasDetails;
      details.replaceChildren(
        ...state.details.map((detail) => {
          const li = document.createElement("li");
          const strong = document.createElement("strong");
          strong.textContent = detail.title;
          li.append(strong);
          const text = document.createElement("span");
          text.textContent = detail.text;
          li.append(text);
          return li;
        }),
      );
    }

    if (empty) empty.hidden = !(visible && !discounted && !hasGifts && !hasDetails);

    if (summary) {
      summary.textContent = state.enabled
        ? "Ưu đãi đang áp dụng (demo)"
        : "Ưu đãi đang tạm ẩn (demo)";
    }

    root.dataset.saleJson = JSON.stringify(state);
    root.dispatchEvent(
      new CustomEvent("sale-program:change", {
        bubbles: true,
        detail: { productId, program: state, items: resolvedItems },
      }),
    );
  }

  function appendRow(template: HTMLTemplateElement | null, container: HTMLElement): void {
    if (!template) return;
    container.append(template.content.cloneNode(true));
  }

  function fillForm(program: SaleProgram): void {
    const enabled = form.querySelector<HTMLInputElement>("[data-sale-enabled]");
    const percent = form.querySelector<HTMLInputElement>("[data-sale-percent]");
    const flat = form.querySelector<HTMLInputElement>("[data-sale-flat]");

    if (enabled) enabled.checked = program.enabled;
    if (percent) percent.value = String(program.percentDiscount);
    if (flat) flat.value = String(program.flatDiscount);

    if (itemsContainer) {
      itemsContainer.replaceChildren();
      for (const ref of program.items) {
        if (!itemTemplate) break;
        const fragment = itemTemplate.content.cloneNode(true) as DocumentFragment;
        const row = fragment.querySelector<HTMLElement>("[data-sale-item-row]");
        const name = fragment.querySelector<HTMLInputElement>("[data-sale-item-name]");
        const note = fragment.querySelector<HTMLInputElement>("[data-sale-item-note]");
        const catalogItem = itemIndex.get(ref.itemId);
        if (name) name.value = catalogItem?.name ?? ref.itemId;
        if (note) note.value = ref.note ?? "";
        itemsContainer.append(row ?? fragment);
      }
    }

    if (detailsContainer) {
      detailsContainer.replaceChildren();
      for (const detail of program.details) {
        if (!detailTemplate) break;
        const fragment = detailTemplate.content.cloneNode(true) as DocumentFragment;
        const row = fragment.querySelector<HTMLElement>("[data-sale-detail-row]");
        const title = fragment.querySelector<HTMLInputElement>("[data-sale-detail-title]");
        const text = fragment.querySelector<HTMLTextAreaElement>("[data-sale-detail-text]");
        if (title) title.value = detail.title;
        if (text) text.value = detail.text;
        detailsContainer.append(row ?? fragment);
      }
    }
  }

  function readForm(): SaleProgram {
    const enabled = form.querySelector<HTMLInputElement>("[data-sale-enabled]")?.checked ?? false;
    const percentInput = form.querySelector<HTMLInputElement>("[data-sale-percent]");
    const flatInput = form.querySelector<HTMLInputElement>("[data-sale-flat]");

    const usedIds = new Set(catalog.map((item) => item.id));
    const byName = new Map(catalog.map((item) => [normalizeSaleItemName(item.name), item]));
    const nextCustomItems = [...customItems];

    const items = Array.from(
      itemsContainer?.querySelectorAll<HTMLElement>("[data-sale-item-row]") ?? [],
    ).flatMap((row): SaleProgramItemRef[] => {
      const name = row.querySelector<HTMLInputElement>("[data-sale-item-name]")?.value.trim() ?? "";
      if (!name) return [];

      const note = row.querySelector<HTMLInputElement>("[data-sale-item-note]")?.value.trim() ?? "";
      const key = normalizeSaleItemName(name);
      let catalogItem = byName.get(key);

      if (!catalogItem) {
        catalogItem = { id: uniqueSaleItemId(name, usedIds), name };
        byName.set(key, catalogItem);
        nextCustomItems.push(catalogItem);
      }

      return [{ itemId: catalogItem.id, note }];
    });

    const details = Array.from(
      detailsContainer?.querySelectorAll<HTMLElement>("[data-sale-detail-row]") ?? [],
    ).flatMap((row) => {
      const title = row.querySelector<HTMLInputElement>("[data-sale-detail-title]")?.value.trim() ?? "";
      const text = row.querySelector<HTMLTextAreaElement>("[data-sale-detail-text]")?.value.trim() ?? "";
      return title || text ? [{ title, text }] : [];
    });

    customItems = nextCustomItems;
    catalog = mergeSaleItems(seedItems, customItems);
    itemIndex = createSaleItemIndex(catalog);

    return normalizeSaleProgram(
      {
        enabled,
        percentDiscount: Number(percentInput?.value) || 0,
        flatDiscount: Number(flatInput?.value) || 0,
        items,
        details,
      },
      productId,
    );
  }

  function openEditor(): void {
    fillForm(state);
    root.classList.add("is-editing");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeEditor(): void {
    root.classList.remove("is-editing");
    if (dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  editButton.addEventListener("click", openEditor);

  form.querySelector("[data-sale-close]")?.addEventListener("click", closeEditor);

  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) closeEditor();
  });

  dialog.addEventListener("close", () => root.classList.remove("is-editing"));

  form.querySelector("[data-sale-add-item]")?.addEventListener("click", () => {
    if (itemsContainer) appendRow(itemTemplate, itemsContainer);
  });

  form.querySelector("[data-sale-add-detail]")?.addEventListener("click", () => {
    if (detailsContainer) appendRow(detailTemplate, detailsContainer);
  });

  form.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-sale-remove]");
    if (!button) return;
    button.closest<HTMLElement>("[data-sale-item-row], [data-sale-detail-row]")?.remove();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state = readForm();
    void Promise.all([store.saveCustomItems(customItems), store.saveProgram(state)]).then(() => {
      render();
      closeEditor();
    });
  });

  form.querySelector("[data-sale-reset]")?.addEventListener("click", () => {
    void store.resetProgram(productId).then(async () => {
      customItems = await store.listCustomItems();
      catalog = mergeSaleItems(seedItems, customItems);
      itemIndex = createSaleItemIndex(catalog);
      state = normalizeSaleProgram(seedProgram, productId);
      render();
      closeEditor();
    });
  });

  render();
}

document.querySelectorAll<HTMLElement>("[data-sale-program]").forEach((root) => {
  void initSaleProgram(root).catch((error) => {
    console.error("Sale program init failed", error);
  });
});
