export const site = {
  name: "VinFast Demo",
  shortName: "VinFast Demo",
  tagline: "Ô tô điện & Xe máy điện chính hãng",
  description:
    "Website demo đại lý VinFast — ô tô điện, xe máy điện, đăng ký lái thử và đặt lịch dịch vụ.",
  legalName: "Công ty TNHH Demo VinFast",
  taxId: "0100000000",
  hotlineSales: "0900 000 000",
  hotlineService: "0900 000 001",
  hotlineSalesHref: "tel:0900000000",
  hotlineServiceHref: "tel:0900000001",
  zaloUrl: "https://zalo.me/0900000000",
  email: "demo@example.com",
  address: "123 Đường Demo, Phường Demo, Quận Demo, Hà Nội",
  mapUrl: "https://www.google.com/maps?q=Hanoi",
  hours: [
    { label: "Thứ 2 – Thứ 6", value: "08:00 – 17:30" },
    { label: "Thứ 7", value: "08:00 – 17:00" },
    { label: "Chủ nhật", value: "08:00 – 12:00" },
  ],
  notice: "Dữ liệu trên website là dữ liệu mẫu cho mục đích demo.",
  nav: [
    { label: "Ô tô điện", href: "o-to-dien/" },
    { label: "Xe máy điện", href: "xe-may-dien/" },
    { label: "Dịch vụ", href: "dat-lich-dich-vu/" },
    { label: "Tin tức", href: "tin-tuc/" },
    { label: "Liên hệ", href: "lien-he/" },
  ],
  cta: { label: "Đăng ký lái thử", href: "dang-ky-lai-thu/" },
} as const;

export type SiteConfig = typeof site;
