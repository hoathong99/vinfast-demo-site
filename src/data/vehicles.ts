export type VehicleType = "car" | "motorbike";
export type VehicleCategory = "mini-suv" | "suv" | "pho-thong" | "the-thao";

export type Vehicle = {
  slug: string;
  name: string;
  type: VehicleType;
  category: VehicleCategory;
  tagline: string;
  price: number;
  priceNote: string;
  badge?: string;
  featured: boolean;
  order: number;
  quickSpecs: { label: string; value: string }[];
  specs: { group: string; items: { label: string; value: string }[] }[];
  images: string[];
  colors: { name: string; hex: string }[];
  offers: { title: string; description: string; validUntil: string }[];
  description: string;
  highlights: { title: string; text: string }[];
};

export const vehicles: Vehicle[] = [
  {
    slug: "vinfast-vf-3",
    name: "VinFast VF 3",
    type: "car",
    category: "mini-suv",
    tagline: "Ô tô điện mini cá tính cho phố thị",
    price: 299_000_000,
    priceNote: "Giá demo — liên hệ để nhận báo giá",
    badge: "Bán chạy",
    featured: true,
    order: 1,
    quickSpecs: [
      { label: "Số chỗ ngồi", value: "4" },
      { label: "Quãng đường tối đa", value: "215 km" },
      { label: "Công suất", value: "134 hp" },
    ],
    specs: [
      {
        group: "Vận hành",
        items: [
          { label: "Động cơ", value: "01 Motor điện" },
          { label: "Công suất tối đa", value: "30 kW" },
          { label: "Mô men xoắn cực đại", value: "110 Nm" },
          { label: "Tăng tốc 0–50 km/h", value: "5,3 giây" },
          { label: "Dẫn động", value: "RWD / Cầu sau" },
        ],
      },
      {
        group: "Pin & sạc",
        items: [
          { label: "Quãng đường", value: "215 km (NEDC)" },
          { label: "Sạc nhanh 10–70%", value: "36 phút" },
          { label: "Sạc tại nhà", value: "7–8 giờ" },
        ],
      },
      {
        group: "Kích thước",
        items: [
          { label: "Dài x Rộng x Cao", value: "3.190 x 1.679 x 1.622 mm" },
          { label: "Khoảng sáng gầm", value: "191 mm" },
          { label: "Số chỗ ngồi", value: "4" },
        ],
      },
    ],
    images: [
      "/images/vehicles/vf3/main.webp",
      "/images/vehicles/vf3/gallery-1.webp",
      "/images/vehicles/vf3/gallery-2.webp",
      "/images/vehicles/vf3/gallery-3.webp",
      "/images/vehicles/vf3/gallery-4.webp",
    ],
    colors: [
      { name: "Trắng", hex: "#f5f5f5" },
      { name: "Đen", hex: "#1c1c1c" },
      { name: "Xanh", hex: "#2d6cdf" },
      { name: "Đỏ", hex: "#b4232a" },
    ],
    offers: [
      {
        title: "Miễn 100% lệ phí trước bạ",
        description: "Ưu đãi demo dành cho khách hàng đăng ký trong tháng.",
        validUntil: "2026-12-31",
      },
      {
        title: "Sạc pin 0 đồng",
        description: "Ưu đãi demo áp dụng theo chính sách của đại lý.",
        validUntil: "2026-12-31",
      },
      {
        title: "Hỗ trợ trả góp đến 80%",
        description: "Thủ tục demo, thời gian duyệt nhanh trong 24 giờ.",
        validUntil: "2026-12-31",
      },
    ],
    description:
      "VF 3 là mẫu ô tô điện mini với thiết kế nhỏ gọn, cá tính và linh hoạt. Xe phù hợp cho nhu cầu di chuyển hằng ngày trong đô thị, dễ đỗ và dễ xoay trở trong không gian chật hẹp.",
    highlights: [
      {
        title: "Thiết kế nhỏ gọn",
        text: "Kích thước compact giúp xe dễ luồn lách và đỗ xe trong phố.",
      },
      {
        title: "Vận hành linh hoạt",
        text: "Motor điện phản hồi tức thì, mang lại cảm giác lái nhẹ nhàng.",
      },
      {
        title: "Chi phí sử dụng thấp",
        text: "Chi phí năng lượng và bảo dưỡng thấp hơn xe xăng cùng phân khúc.",
      },
    ],
  },
  {
    slug: "vinfast-vf-5",
    name: "VinFast VF 5",
    type: "car",
    category: "suv",
    tagline: "SUV điện cỡ A rộng rãi cho gia đình trẻ",
    price: 529_000_000,
    priceNote: "Giá demo — liên hệ để nhận báo giá",
    featured: true,
    order: 2,
    quickSpecs: [
      { label: "Số chỗ ngồi", value: "5" },
      { label: "Quãng đường tối đa", value: "326 km" },
      { label: "Công suất", value: "134 hp" },
    ],
    specs: [
      {
        group: "Vận hành",
        items: [
          { label: "Động cơ", value: "01 Motor điện" },
          { label: "Công suất tối đa", value: "100 kW" },
          { label: "Mô men xoắn cực đại", value: "260 Nm" },
          { label: "Tăng tốc 0–100 km/h", value: "10,3 giây" },
          { label: "Dẫn động", value: "FWD / Cầu trước" },
        ],
      },
      {
        group: "Pin & sạc",
        items: [
          { label: "Quãng đường", value: "326 km (NEDC)" },
          { label: "Sạc nhanh 10–70%", value: "30 phút" },
          { label: "Sạc tại nhà", value: "8–10 giờ" },
        ],
      },
      {
        group: "Kích thước",
        items: [
          { label: "Dài x Rộng x Cao", value: "3.967 x 1.723 x 1.612 mm" },
          { label: "Khoảng sáng gầm", value: "173 mm" },
          { label: "Số chỗ ngồi", value: "5" },
        ],
      },
    ],
    images: [
      "/images/vehicles/vf5/main.webp",
      "/images/vehicles/vf5/gallery-1.webp",
      "/images/vehicles/vf5/gallery-2.webp",
      "/images/vehicles/vf5/gallery-3.webp",
      "/images/vehicles/vf5/gallery-4.webp",
    ],
    colors: [
      { name: "Trắng", hex: "#f5f5f5" },
      { name: "Xám", hex: "#6f7378" },
      { name: "Đỏ", hex: "#b4232a" },
      { name: "Xanh", hex: "#1c4f9c" },
    ],
    offers: [
      {
        title: "Tặng gói phụ kiện demo",
        description: "Gói phụ kiện mẫu dành cho khách hàng đặt xe trong tháng.",
        validUntil: "2026-12-31",
      },
      {
        title: "Hỗ trợ trả góp 80%",
        description: "Ưu đãi demo, lãi suất và thời hạn theo ngân hàng liên kết.",
        validUntil: "2026-12-31",
      },
    ],
    description:
      "VF 5 mang đến không gian rộng rãi trong một thân xe cỡ A, phù hợp với gia đình trẻ và nhu cầu di chuyển đa dụng. Thiết kế hiện đại, trang bị tiện nghi và khả năng vận hành ổn định.",
    highlights: [
      {
        title: "Không gian rộng rãi",
        text: "Khoang cabin tối ưu cho 5 người và hành lý hằng ngày.",
      },
      {
        title: "Trang bị tiện nghi",
        text: "Màn hình trung tâm, điều hòa tự động và các tính năng an toàn cơ bản.",
      },
      {
        title: "Phù hợp gia đình",
        text: "Tầm hoạt động đủ cho nhu cầu đi làm, đưa đón và du lịch gần.",
      },
    ],
  },
  {
    slug: "vinfast-vf-8",
    name: "VinFast VF 8",
    type: "car",
    category: "suv",
    tagline: "SUV điện hạng D với công nghệ hiện đại",
    price: 1_019_000_000,
    priceNote: "Giá demo — liên hệ để nhận báo giá",
    badge: "Nổi bật",
    featured: true,
    order: 3,
    quickSpecs: [
      { label: "Số chỗ ngồi", value: "5" },
      { label: "Quãng đường tối đa", value: "420 km" },
      { label: "Công suất", value: "402 hp" },
    ],
    specs: [
      {
        group: "Vận hành",
        items: [
          { label: "Động cơ", value: "02 Motor điện" },
          { label: "Công suất tối đa", value: "300 kW" },
          { label: "Mô men xoắn cực đại", value: "620 Nm" },
          { label: "Tăng tốc 0–100 km/h", value: "5,8 giây" },
          { label: "Dẫn động", value: "AWD / 2 cầu" },
        ],
      },
      {
        group: "Pin & sạc",
        items: [
          { label: "Quãng đường", value: "420 km (WLTP)" },
          { label: "Sạc nhanh 10–70%", value: "31 phút" },
          { label: "Sạc tại nhà", value: "8–10 giờ" },
        ],
      },
      {
        group: "Kích thước",
        items: [
          { label: "Dài x Rộng x Cao", value: "4.750 x 1.934 x 1.667 mm" },
          { label: "Khoảng sáng gầm", value: "175 mm" },
          { label: "Số chỗ ngồi", value: "5" },
        ],
      },
    ],
    images: [
      "/images/vehicles/vf8/main.webp",
      "/images/vehicles/vf8/gallery-1.webp",
      "/images/vehicles/vf8/gallery-2.webp",
      "/images/vehicles/vf8/gallery-3.webp",
      "/images/vehicles/vf8/gallery-4.webp",
    ],
    colors: [
      { name: "Trắng", hex: "#f5f5f5" },
      { name: "Đen", hex: "#1c1c1c" },
      { name: "Đỏ", hex: "#9e1b22" },
      { name: "Xám", hex: "#6f7378" },
    ],
    offers: [
      {
        title: "Ưu đãi 3% giá bán lẻ",
        description: "Chính sách demo cho khách hàng chuyển đổi xe xăng sang xe điện.",
        validUntil: "2026-12-31",
      },
      {
        title: "Miễn phí sạc 1 năm",
        description: "Ưu đãi demo áp dụng theo điều kiện của chương trình.",
        validUntil: "2026-12-31",
      },
    ],
    description:
      "VF 8 là mẫu SUV điện hạng D với thiết kế khí động học, công nghệ hỗ trợ lái và khả năng vận hành mạnh mẽ. Không gian nội thất rộng rãi, phù hợp cho gia đình và hành trình dài.",
    highlights: [
      {
        title: "Hiệu suất mạnh mẽ",
        text: "Hai mô tơ điện cho công suất 402 hp và mô men xoắn 620 Nm.",
      },
      {
        title: "Công nghệ hỗ trợ lái",
        text: "Hệ thống ADAS và các tính năng an toàn chủ động.",
      },
      {
        title: "Thiết kế khí động học",
        text: "Tối ưu khả năng cắt gió và tầm hoạt động của xe.",
      },
    ],
  },
  {
    slug: "vinfast-vf-9",
    name: "VinFast VF 9",
    type: "car",
    category: "suv",
    tagline: "SUV điện 6 chỗ cao cấp cho gia đình",
    price: 1_499_000_000,
    priceNote: "Giá demo — liên hệ để nhận báo giá",
    featured: true,
    order: 4,
    quickSpecs: [
      { label: "Số chỗ ngồi", value: "6" },
      { label: "Quãng đường tối đa", value: "594 km" },
      { label: "Công suất", value: "402 hp" },
    ],
    specs: [
      {
        group: "Vận hành",
        items: [
          { label: "Động cơ", value: "02 Motor điện" },
          { label: "Công suất tối đa", value: "300 kW" },
          { label: "Mô men xoắn cực đại", value: "620 Nm" },
          { label: "Tăng tốc 0–100 km/h", value: "6,5 giây" },
          { label: "Dẫn động", value: "AWD / 2 cầu" },
        ],
      },
      {
        group: "Pin & sạc",
        items: [
          { label: "Quãng đường", value: "594 km (NEDC)" },
          { label: "Sạc nhanh 10–70%", value: "31 phút" },
          { label: "Sạc tại nhà", value: "10–12 giờ" },
        ],
      },
      {
        group: "Kích thước",
        items: [
          { label: "Dài x Rộng x Cao", value: "5.118 x 2.000 x 1.696 mm" },
          { label: "Khoảng sáng gầm", value: "173 mm" },
          { label: "Số chỗ ngồi", value: "6" },
        ],
      },
    ],
    images: [
      "/images/vehicles/vf9/main.webp",
      "/images/vehicles/vf9/gallery-1.webp",
      "/images/vehicles/vf9/gallery-2.webp",
      "/images/vehicles/vf9/gallery-3.webp",
      "/images/vehicles/vf9/gallery-4.webp",
    ],
    colors: [
      { name: "Trắng", hex: "#f5f5f5" },
      { name: "Đen", hex: "#1c1c1c" },
      { name: "Đỏ", hex: "#9e1b22" },
      { name: "Xanh", hex: "#1c4f9c" },
    ],
    offers: [
      {
        title: "Ưu đãi đặc biệt cho khách hàng demo",
        description: "Liên hệ đại lý để nhận báo giá và chính sách mới nhất.",
        validUntil: "2026-12-31",
      },
      {
        title: "Hỗ trợ trả góp linh hoạt",
        description: "Thời hạn vay đến 8 năm theo ngân hàng liên kết.",
        validUntil: "2026-12-31",
      },
    ],
    description:
      "VF 9 là mẫu SUV điện 6 chỗ cao cấp với không gian rộng rãi, trang bị tiện nghi và công nghệ an toàn. Xe phù hợp cho gia đình đông người và nhu cầu di chuyển đường dài.",
    highlights: [
      {
        title: "6 chỗ ngồi cao cấp",
        text: "Không gian rộng rãi cho cả gia đình và hành lý.",
      },
      {
        title: "Tầm hoạt động dài",
        text: "Quãng đường lên đến 594 km theo chu trình NEDC.",
      },
      {
        title: "Tiện nghi cao cấp",
        text: "Ghế da, màn hình lớn và hệ thống hỗ trợ lái hiện đại.",
      },
    ],
  },
  {
    slug: "vinfast-evo",
    name: "VinFast Evo",
    type: "motorbike",
    category: "pho-thong",
    tagline: "Xe máy điện phổ thông cho học sinh, sinh viên",
    price: 22_000_000,
    priceNote: "Giá demo — liên hệ để nhận báo giá",
    badge: "Giá tốt",
    featured: true,
    order: 5,
    quickSpecs: [
      { label: "Quãng đường", value: "80 km" },
      { label: "Tốc độ tối đa", value: "50 km/h" },
      { label: "Số chỗ ngồi", value: "2" },
    ],
    specs: [
      {
        group: "Vận hành",
        items: [
          { label: "Công suất", value: "1,2 kW" },
          { label: "Tốc độ tối đa", value: "50 km/h" },
          { label: "Quãng đường", value: "80 km / lần sạc" },
        ],
      },
      {
        group: "Pin & sạc",
        items: [
          { label: "Loại pin", value: "Pin Lithium-ion" },
          { label: "Thời gian sạc", value: "4–5 giờ" },
          { label: "Sạc tại nhà", value: "Có" },
        ],
      },
      {
        group: "Tiện ích",
        items: [
          { label: "Cốp xe", value: "Có" },
          { label: "Màn hình", value: "LCD" },
          { label: "Đèn LED", value: "Có" },
        ],
      },
    ],
    images: [
      "/images/vehicles/evo/main.webp",
      "/images/vehicles/evo/gallery-1.webp",
      "/images/vehicles/evo/gallery-2.webp",
      "/images/vehicles/evo/gallery-3.webp",
      "/images/vehicles/evo/gallery-4.webp",
    ],
    colors: [
      { name: "Trắng", hex: "#f5f5f5" },
      { name: "Đen", hex: "#1c1c1c" },
      { name: "Xanh", hex: "#2d6cdf" },
    ],
    offers: [
      {
        title: "Tặng mũ bảo hiểm demo",
        description: "Quà tặng mẫu khi mua xe tại đại lý.",
        validUntil: "2026-12-31",
      },
      {
        title: "Trả góp 0% demo",
        description: "Chương trình demo áp dụng cho một số dòng xe.",
        validUntil: "2026-12-31",
      },
    ],
    description:
      "Evo là mẫu xe máy điện phổ thông với thiết kế gọn nhẹ, dễ sử dụng và chi phí vận hành thấp. Xe phù hợp cho học sinh, sinh viên và nhu cầu di chuyển trong đô thị.",
    highlights: [
      {
        title: "Dễ sử dụng",
        text: "Thiết kế nhẹ, yên thấp, phù hợp nhiều đối tượng người dùng.",
      },
      {
        title: "Chi phí thấp",
        text: "Sạc điện tại nhà với chi phí thấp hơn nhiều so với xăng.",
      },
      {
        title: "An toàn",
        text: "Hệ thống phanh, đèn chiếu sáng và lốp bám đường.",
      },
    ],
  },
  {
    slug: "vinfast-viper",
    name: "VinFast Viper",
    type: "motorbike",
    category: "the-thao",
    tagline: "Xe máy điện thể thao, phong cách năng động",
    price: 35_000_000,
    priceNote: "Giá demo — liên hệ để nhận báo giá",
    featured: true,
    order: 6,
    quickSpecs: [
      { label: "Quãng đường", value: "100 km" },
      { label: "Tốc độ tối đa", value: "80 km/h" },
      { label: "Số chỗ ngồi", value: "2" },
    ],
    specs: [
      {
        group: "Vận hành",
        items: [
          { label: "Công suất", value: "1,5 kW" },
          { label: "Tốc độ tối đa", value: "80 km/h" },
          { label: "Quãng đường", value: "100 km / lần sạc" },
        ],
      },
      {
        group: "Pin & sạc",
        items: [
          { label: "Loại pin", value: "Pin Lithium-ion" },
          { label: "Thời gian sạc", value: "4–5 giờ" },
          { label: "Sạc tại nhà", value: "Có" },
        ],
      },
      {
        group: "Tiện ích",
        items: [
          { label: "Cốp xe", value: "Có" },
          { label: "Màn hình", value: "LCD" },
          { label: "Đèn LED", value: "Có" },
        ],
      },
    ],
    images: [
      "/images/vehicles/viper/main.webp",
      "/images/vehicles/viper/gallery-1.webp",
      "/images/vehicles/viper/gallery-2.webp",
      "/images/vehicles/viper/gallery-3.webp",
      "/images/vehicles/viper/gallery-4.webp",
    ],
    colors: [
      { name: "Đen", hex: "#1c1c1c" },
      { name: "Đỏ", hex: "#b4232a" },
      { name: "Xanh", hex: "#1c4f9c" },
    ],
    offers: [
      {
        title: "Tặng phụ kiện demo",
        description: "Gói phụ kiện mẫu khi mua xe tại đại lý.",
        validUntil: "2026-12-31",
      },
      {
        title: "Bảo hành pin mở rộng",
        description: "Chính sách demo áp dụng theo điều kiện của đại lý.",
        validUntil: "2026-12-31",
      },
    ],
    description:
      "Viper mang phong cách thể thao, mạnh mẽ với khả năng vận hành linh hoạt. Xe phù hợp cho người dùng trẻ yêu thích thiết kế năng động và trải nghiệm lái xe điện.",
    highlights: [
      {
        title: "Thiết kế thể thao",
        text: "Đường nét góc cạnh, tem xe nổi bật và phong cách năng động.",
      },
      {
        title: "Vận hành linh hoạt",
        text: "Tốc độ tối đa 80 km/h, phù hợp di chuyển trong đô thị.",
      },
      {
        title: "Trang bị tiện ích",
        text: "Cốp chứa đồ, đèn LED và màn hình hiển thị thông tin.",
      },
    ],
  },
];

export const cars = vehicles.filter((v) => v.type === "car").sort((a, b) => a.order - b.order);
export const motorbikes = vehicles.filter((v) => v.type === "motorbike").sort((a, b) => a.order - b.order);

export function getVehicle(slug: string) {
  return vehicles.find((v) => v.slug === slug);
}

export function getVehiclesByType(type: VehicleType) {
  return type === "car" ? cars : motorbikes;
}
