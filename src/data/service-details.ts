export type ServiceType = "car" | "motorbike";
export type ServiceTypePath = "o-to" | "xe-may-dien";

export interface ServiceDetailSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  steps?: string[];
  image?: string;
  imageAlt?: string;
}

export interface ServiceRelatedLink {
  label: string;
  href: string;
}

export interface ServiceDetail {
  type: ServiceType;
  typePath: ServiceTypePath;
  typeLabel: string;
  slug: string;
  title: string;
  intro: string;
  heroImage: string;
  heroAlt: string;
  bookingService: string;
  sections: ServiceDetailSection[];
  related: ServiceRelatedLink[];
}

const carMaintenanceRelated: ServiceRelatedLink[] = [
  { label: "Bảo hành ô tô", href: "dich-vu/o-to/bao-hanh/" },
  { label: "Đồng sơn ô tô", href: "dich-vu/o-to/dong-son/" },
  { label: "Vệ sinh khoang máy", href: "dich-vu/o-to/ve-sinh-khoang-may/" },
  { label: "Vệ sinh nội thất", href: "dich-vu/o-to/ve-sinh-noi-that/" },
];

const bikeMaintenanceRelated: ServiceRelatedLink[] = [
  { label: "Bảo hành xe máy điện", href: "dich-vu/xe-may-dien/bao-hanh/" },
  { label: "Dịch vụ xe máy điện", href: "dich-vu/xe-may-dien/" },
];

export const serviceDetails: ServiceDetail[] = [
  {
    type: "car",
    typePath: "o-to",
    typeLabel: "Dịch vụ ô tô",
    slug: "bao-duong-dinh-ky",
    title: "Bảo dưỡng định kỳ ô tô điện",
    intro:
      "Bảo dưỡng định kỳ giúp xe duy trì trạng thái ổn định, kéo dài tuổi thọ chi tiết, phát hiện sớm hư hỏng và đảm bảo vận hành an toàn.",
    heroImage: "images/services/detail-bao-duong-car-banner.jpg",
    heroAlt: "Bảo dưỡng định kỳ ô tô điện VinFast",
    bookingService: "bao-duong",
    sections: [
      {
        heading: "Bảo dưỡng ô tô điện gồm những gì?",
        paragraphs: [
          "Xe ô tô điện có ít bộ phận chuyển động hơn xe xăng, không cần thay dầu động cơ thường xuyên. Tuy nhiên, một số hạng mục vẫn cần được kiểm tra định kỳ để xe hoạt động ổn định và an toàn.",
        ],
        bullets: [
          "Động cơ điện: vệ sinh, bôi trơn bạc đạn và kiểm tra hệ thống dây dẫn.",
          "Chất làm mát pin: kiểm tra nhiệt độ và mức dung dịch làm mát.",
          "Dầu hộp số: chỉ áp dụng với xe có hộp số.",
          "Má phanh: kiểm tra độ mòn và hiệu quả phanh.",
          "Lốp xe: kiểm tra áp suất, độ mòn và vết nứt.",
          "Cần gạt nước: thay lưỡi gạt định kỳ.",
          "Phần mềm xe: cập nhật phiên bản mới khi có.",
          "Pin và hệ thống làm mát pin: kiểm tra định kỳ tại xưởng dịch vụ.",
        ],
      },
      {
        heading: "Quy trình bảo dưỡng 5 bước",
        steps: [
          "Nhắc nhở khách hàng về thời gian cần bảo dưỡng và đặt lịch hẹn.",
          "Tiếp nhận xe, kiểm tra và tư vấn phương án bảo dưỡng phù hợp.",
          "Tiến hành bảo dưỡng, sửa chữa các chi tiết cần thiết.",
          "Bàn giao xe đã được bảo dưỡng cho khách hàng.",
          "Chăm sóc và tư vấn sau khi xe được bảo dưỡng.",
        ],
        image: "images/services/warranty-car-2.webp",
        imageAlt: "Kỹ thuật viên kiểm tra lốp xe VinFast",
      },
      {
        heading: "Các mốc bảo dưỡng tham khảo",
        paragraphs: [
          "Lịch bảo dưỡng có thể khác nhau theo từng dòng xe. Dưới đây là các mốc tham khảo, khách hàng nên kiểm tra sổ bảo hành hoặc liên hệ xưởng để được tư vấn chính xác.",
        ],
        bullets: [
          "Lọc gió điều hòa: 1 năm hoặc 12.000 km.",
          "Dầu phanh: kiểm tra sau 1 năm, sau đó mỗi năm hoặc 12.000 km.",
          "Bảo dưỡng điều hòa: 5 năm hoặc 60.000 km.",
          "Pin khóa điều khiển: 2 năm hoặc 24.000 km.",
          "Pin bộ T-box: 6 năm hoặc 72.000 km.",
          "Nước làm mát động cơ/pin: mỗi năm hoặc 12.000 km; thay mới ở 10 năm hoặc 120.000 km.",
          "Các hạng mục khác như lốp, má phanh, hệ thống treo, cổng sạc, ắc quy, gạt nước: kiểm tra mỗi năm hoặc 12.000 km.",
        ],
      },
      {
        heading: "Chi phí bảo dưỡng",
        paragraphs: [
          "Ô tô điện không cần thay dầu động cơ, lọc nhớt hay nhiều chi tiết chuyển động như xe xăng. Nhờ đó, chi phí bảo dưỡng định kỳ thường thấp hơn và thời gian thực hiện cũng nhanh hơn.",
        ],
      },
    ],
    related: carMaintenanceRelated,
  },
  {
    type: "motorbike",
    typePath: "xe-may-dien",
    typeLabel: "Dịch vụ xe máy điện",
    slug: "bao-duong-dinh-ky",
    title: "Bảo dưỡng định kỳ xe máy điện",
    intro:
      "Để xe máy điện VinFast luôn hoạt động ổn định và an toàn, bảo dưỡng định kỳ là bước quan trọng giúp phát hiện sớm hư hỏng và duy trì tuổi thọ xe.",
    heroImage: "images/services/warranty-bike-2.webp",
    heroAlt: "Khu vực bảo dưỡng xe máy điện VinFast",
    bookingService: "bao-duong",
    sections: [
      {
        heading: "Lịch bảo dưỡng khuyến nghị",
        paragraphs: [
          "Lịch bảo dưỡng được khuyến nghị theo số km đã di chuyển. Khách hàng nên theo dõi và đặt lịch đúng mốc để xe được kiểm tra đầy đủ.",
        ],
        bullets: [
          "Mốc 1.000 km: kiểm tra tổng quát sau thời gian đầu sử dụng.",
          "Mốc 5.000 km: kiểm tra phanh, lốp, hệ thống điện và siết lại các mối nối.",
          "Mốc 10.000 km: kiểm tra pin, động cơ, hệ thống điện và các bộ phận hao mòn.",
          "Mốc 20.000 km: bảo dưỡng chuyên sâu, kiểm tra toàn bộ hệ thống.",
          "Các mốc tiếp theo: thực hiện theo hướng dẫn trong sổ bảo hành.",
        ],
        image: "images/services/detail-bao-duong-bike.jpg",
        imageAlt: "Bảo dưỡng xe máy điện VinFast",
      },
      {
        heading: "Các hạng mục kiểm tra",
        bullets: [
          "Pin và hệ thống sạc.",
          "Động cơ điện và dây dẫn.",
          "Phanh trước, phanh sau và tay phanh.",
          "Lốp xe, áp suất lốp và độ mòn.",
          "Hệ thống điện, đèn chiếu sáng, còi và tín hiệu.",
          "Ốc vít, khung xe và các mối nối.",
          "Vệ sinh xe và kiểm tra các chi tiết hao mòn.",
        ],
      },
      {
        heading: "Quy trình bảo dưỡng 5 bước",
        steps: [
          "Nhắc nhở khách hàng về thời gian cần bảo dưỡng và đặt lịch hẹn.",
          "Tiếp nhận xe, kiểm tra và tư vấn phương án bảo dưỡng phù hợp.",
          "Tiến hành bảo dưỡng, sửa chữa các chi tiết cần thiết.",
          "Bàn giao xe đã được bảo dưỡng cho khách hàng.",
          "Chăm sóc và tư vấn sau khi xe được bảo dưỡng.",
        ],
      },
    ],
    related: bikeMaintenanceRelated,
  },
  {
    type: "car",
    typePath: "o-to",
    typeLabel: "Dịch vụ ô tô",
    slug: "bao-hanh",
    title: "Bảo hành ô tô VinFast",
    intro:
      "Chính sách bảo hành áp dụng cho các hư hỏng do lỗi phần mềm, lỗi chất lượng linh kiện hoặc lỗi lắp ráp, với điều kiện xe được sử dụng và bảo dưỡng đúng cách.",
    heroImage: "images/services/warranty-car-1.webp",
    heroAlt: "Khách hàng nhận xe tại showroom VinFast",
    bookingService: "bao-hanh",
    sections: [
      {
        heading: "Thời hạn bảo hành",
        bullets: [
          "10 năm hoặc 200.000 km, tùy điều kiện nào đến trước, cho Fadil, Lux A 2.0, Lux SA 2.0, President, Nerio Green, VF 7, VF 8 và VF 9.",
          "7 năm hoặc 160.000 km, tùy điều kiện nào đến trước, cho VF 3, VF 5 và VF 6.",
          "Thời hạn cụ thể được ghi trong sổ bảo hành đi kèm xe.",
        ],
      },
      {
        heading: "Một số hạng mục bảo hành",
        bullets: [
          "Ắc-quy ô tô điện: 1 năm, không giới hạn quãng đường.",
          "Lốp xe: bảo hành lỗi nguyên vật liệu hoặc lỗi sản xuất theo điều kiện của nhà sản xuất lốp.",
          "Bộ sạc treo tường chính hãng: 2 năm, không giới hạn số km.",
          "Sơn ngoại thất: 3 năm, không giới hạn số km.",
          "Bộ phận treo: 5 năm hoặc 100.000 km, tùy điều kiện nào đến trước.",
        ],
      },
      {
        heading: "Trường hợp không thuộc phạm vi bảo hành",
        bullets: [
          "Hư hỏng do sửa chữa, điều chỉnh hoặc đấu nối phụ kiện không chính hãng.",
          "Hoán cải kết cấu, thay đổi công suất hoặc thiết kế ban đầu.",
          "Tai nạn, ngập nước, hỏa hoạn, thiên tai hoặc tác động từ bên ngoài.",
          "Hao mòn tự nhiên như má phanh, lốp, gạt nước, pin điều khiển, cầu chì.",
          "Không tuân thủ lịch bảo dưỡng hoặc bảo dưỡng không đúng hướng dẫn.",
        ],
      },
      {
        heading: "Lưu ý",
        paragraphs: [
          "Để đảm bảo quyền lợi bảo hành, khách hàng nên xem chi tiết trong Sổ bảo hành đi kèm xe và đưa xe đến xưởng dịch vụ ủy quyền của VinFast khi phát hiện bất thường.",
        ],
      },
    ],
    related: [
      { label: "Bảo dưỡng định kỳ ô tô", href: "dich-vu/o-to/bao-duong-dinh-ky/" },
      { label: "Đồng sơn ô tô", href: "dich-vu/o-to/dong-son/" },
    ],
  },
  {
    type: "motorbike",
    typePath: "xe-may-dien",
    typeLabel: "Dịch vụ xe máy điện",
    slug: "bao-hanh",
    title: "Bảo hành xe máy điện VinFast",
    intro:
      "Xe máy điện VinFast sử dụng pin LFP có thời hạn bảo hành xe 6 năm/không giới hạn số km và thời hạn bảo hành pin lên tới 8 năm/không giới hạn số km.",
    heroImage: "images/services/warranty-bike-1.webp",
    heroAlt: "Kỹ thuật viên bảo dưỡng xe máy điện VinFast",
    bookingService: "bao-hanh",
    sections: [
      {
        heading: "Thời hạn bảo hành",
        bullets: [
          "Xe máy điện dùng pin LFP: bảo hành xe 6 năm/không giới hạn số km.",
          "Pin LFP: bảo hành 8 năm/không giới hạn số km.",
          "Các dòng xe còn lại: bảo hành 3 năm/không giới hạn số km.",
        ],
      },
      {
        heading: "Phạm vi và điều kiện bảo hành",
        bullets: [
          "Áp dụng cho lỗi vật liệu, lỗi sản xuất hoặc lỗi lắp ráp.",
          "Xe được sử dụng đúng mục đích và bảo dưỡng đúng lịch.",
          "Bảo hành được thực hiện tại xưởng dịch vụ hoặc nhà phân phối ủy quyền của VinFast.",
          "Phụ tùng thay thế trong bảo hành là linh kiện chính hãng.",
        ],
      },
      {
        heading: "Trường hợp không thuộc phạm vi bảo hành",
        bullets: [
          "Tai nạn, va chạm, ngập nước hoặc tác động từ bên ngoài.",
          "Tự ý sửa chữa, thay thế phụ tùng không chính hãng.",
          "Hao mòn tự nhiên của lốp, phanh, dây curoa và các chi tiết tiêu hao.",
          "Không bảo dưỡng định kỳ hoặc sử dụng sai hướng dẫn.",
        ],
      },
      {
        heading: "Lưu ý",
        paragraphs: [
          "Khách hàng nên giữ sổ bảo hành và đưa xe đến xưởng dịch vụ ủy quyền khi phát hiện bất thường để được kiểm tra kịp thời.",
        ],
      },
    ],
    related: [
      { label: "Bảo dưỡng định kỳ xe máy điện", href: "dich-vu/xe-may-dien/bao-duong-dinh-ky/" },
      { label: "Dịch vụ xe máy điện", href: "dich-vu/xe-may-dien/" },
    ],
  },
  {
    type: "car",
    typePath: "o-to",
    typeLabel: "Dịch vụ ô tô",
    slug: "dong-son",
    title: "Đồng sơn ô tô",
    intro:
      "Sửa chữa hư hỏng nhẹ, hư hỏng nặng và sơn lại theo đúng màu nguyên bản, hạn chế tối đa biến dạng vỏ xe và đảm bảo thẩm mỹ sau sửa chữa.",
    heroImage: "images/services/car-dong-son.webp",
    heroAlt: "Kỹ thuật viên đồng sơn ô tô VinFast",
    bookingService: "dong-son",
    sections: [
      {
        heading: "Sửa chữa hư hỏng nhẹ",
        paragraphs: [
          "Sử dụng trang thiết bị hiện đại giúp rút ngắn thời gian sửa chữa, hạn chế biến dạng bề mặt vỏ xe và giữ nguyên kết cấu vật liệu sau khi xử lý.",
        ],
      },
      {
        heading: "Sửa chữa hư hỏng nặng",
        bullets: [
          "Hàn dây Mig CO2 đường kính 0,8 mm, hạn chế nhiệt và biến dạng vỏ xe.",
          "Hàn điểm điện trở đồng bộ với nhà máy sản xuất để đảm bảo thẩm mỹ.",
          "Bộ nắn khung Spanesi và thước đo điện tử 3D giúp phục hồi chính xác góc đặt bánh xe.",
        ],
      },
      {
        heading: "Quy trình sơn",
        bullets: [
          "Quy trình sơn 14 bước giúp lớp sơn mịn, bóng và đúng màu.",
          "Phòng sơn sấy Blowtherm đạt tiêu chuẩn chất lượng và môi trường.",
          "Sơn gốc nước an toàn, thân thiện môi trường và có độ che phủ màu tốt.",
          "Đèn soi màu Solary, thiết bị đo độ dày/độ bóng Elcometer và hệ thống hút bụi trung tâm.",
        ],
      },
    ],
    related: [
      { label: "Bảo dưỡng định kỳ ô tô", href: "dich-vu/o-to/bao-duong-dinh-ky/" },
      { label: "Vệ sinh khoang máy", href: "dich-vu/o-to/ve-sinh-khoang-may/" },
      { label: "Vệ sinh nội thất", href: "dich-vu/o-to/ve-sinh-noi-that/" },
    ],
  },
  {
    type: "car",
    typePath: "o-to",
    typeLabel: "Dịch vụ ô tô",
    slug: "ve-sinh-khoang-may",
    title: "Vệ sinh khoang máy ô tô",
    intro:
      "Quy trình vệ sinh khoang máy 5 bước giúp loại bỏ bụi bẩn, dầu mỡ, kiểm tra sớm các dấu hiệu bất thường và bảo vệ các chi tiết điện.",
    heroImage: "images/services/car-engine-clean.jpg",
    heroAlt: "Vệ sinh khoang máy ô tô",
    bookingService: "ve-sinh",
    sections: [
      {
        heading: "Quy trình 5 bước",
        steps: [
          "Kiểm tra khoang động cơ, phát hiện dây đứt, giắc lỏng và che chắn các chi tiết điện.",
          "Tẩy và làm sạch bằng chổi, cọ chuyên dụng xung quanh động cơ.",
          "Sấy khô khoang động cơ, lau chùi và kiểm tra lại hệ thống điện.",
          "Xịt dưỡng để nhựa và kim loại dưới capo có độ bóng tốt.",
          "Nghiệm thu và bàn giao xe cho khách hàng.",
        ],
      },
      {
        heading: "Lưu ý",
        paragraphs: [
          "Khoang máy có nhiều chi tiết điện và cảm biến. Nên thực hiện tại xưởng dịch vụ để được che chắn đúng cách và kiểm tra an toàn sau khi vệ sinh.",
        ],
      },
    ],
    related: [
      { label: "Vệ sinh nội thất", href: "dich-vu/o-to/ve-sinh-noi-that/" },
      { label: "Bảo dưỡng định kỳ ô tô", href: "dich-vu/o-to/bao-duong-dinh-ky/" },
    ],
  },
  {
    type: "car",
    typePath: "o-to",
    typeLabel: "Dịch vụ ô tô",
    slug: "ve-sinh-noi-that",
    title: "Vệ sinh nội thất ô tô",
    intro:
      "Quy trình vệ sinh nội thất 10 bước giúp khoang cabin sạch sẽ, khử mùi, bảo vệ các bề mặt da, nhựa và tạo cảm giác thoải mái khi sử dụng.",
    heroImage: "images/services/car-interior-clean.jpg",
    heroAlt: "Vệ sinh nội thất ô tô",
    bookingService: "ve-sinh",
    sections: [
      {
        heading: "Quy trình 10 bước",
        steps: [
          "Rửa sạch xe.",
          "Tháo ghế và sàn.",
          "Dùng dung dịch chuyên dụng và dụng cụ đánh sạch bề mặt da.",
          "Vệ sinh taplo và táp-pi cửa.",
          "Vệ sinh các khe kẽ và hốc điều hòa.",
          "Vệ sinh trần xe.",
          "Vệ sinh các khe và gioăng cánh cửa.",
          "Vệ sinh khoang cốp và lốp dự phòng.",
          "Dưỡng da ghế, nhựa và cao su gioăng cửa.",
          "Rửa lại ngoại thất và dưỡng lốp.",
        ],
      },
      {
        heading: "Lưu ý",
        paragraphs: [
          "Nên vệ sinh nội thất định kỳ, đặc biệt sau khi xe di chuyển trong điều kiện bụi bẩn hoặc có mùi ẩm. Xưởng dịch vụ sẽ kiểm tra và tư vấn phương án phù hợp với chất liệu nội thất.",
        ],
      },
    ],
    related: [
      { label: "Vệ sinh khoang máy", href: "dich-vu/o-to/ve-sinh-khoang-may/" },
      { label: "Bảo dưỡng định kỳ ô tô", href: "dich-vu/o-to/bao-duong-dinh-ky/" },
    ],
  },
];

export function getServiceDetail(typePath: string, slug: string): ServiceDetail | undefined {
  return serviceDetails.find((item) => item.typePath === typePath && item.slug === slug);
}
