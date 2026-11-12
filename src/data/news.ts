export type NewsItem = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
  body: string[];
};

export const news: NewsItem[] = [
  {
    slug: "uu-dai-lai-thu-vf-3-demo",
    title: "Trải nghiệm VF 3 tại showroom demo",
    excerpt:
      "Đăng ký lái thử VF 3 để cảm nhận thiết kế nhỏ gọn, khả năng vận hành linh hoạt và không gian phù hợp cho phố thị.",
    date: "2026-11-10",
    category: "Ưu đãi",
    image: "/images/news-1.webp",
    body: [
      "VF 3 là mẫu ô tô điện mini được nhiều khách hàng quan tâm nhờ thiết kế cá tính và khả năng di chuyển linh hoạt trong đô thị. Chương trình lái thử demo tại showroom giúp khách hàng trải nghiệm thực tế trước khi quyết định.",
      "Khách hàng có thể đăng ký trực tuyến, chọn khung giờ phù hợp và nhận tư vấn từ đội ngũ kinh doanh. Thông tin trên trang là dữ liệu mẫu cho mục đích demo.",
      "Để đăng ký, vui lòng sử dụng form Đăng ký lái thử hoặc liên hệ hotline demo trên website.",
    ],
  },
  {
    slug: "dich-vu-5-sao-demo",
    title: "Quy trình dịch vụ 5 sao tại xưởng demo",
    excerpt:
      "Từ tiếp nhận, kiểm tra đến bàn giao xe, quy trình dịch vụ được thiết kế để mang lại trải nghiệm thuận tiện và minh bạch.",
    date: "2026-11-06",
    category: "Dịch vụ",
    image: "/images/news-2.webp",
    body: [
      "Xưởng dịch vụ demo tiếp nhận xe theo quy trình chuẩn: ghi nhận tình trạng, kiểm tra tổng quát và tư vấn hạng mục cần thực hiện. Khách hàng được thông báo trước khi tiến hành sửa chữa.",
      "Trang thiết bị và quy trình trong nội dung này là mô phỏng cho website demo. Khi triển khai thật, đại lý sẽ cập nhật thông tin xưởng, thời gian và chính sách thực tế.",
      "Khách hàng có thể đặt lịch dịch vụ trực tuyến để giảm thời gian chờ tại showroom.",
    ],
  },
  {
    slug: "kinh-nghiem-cham-soc-pin-demo",
    title: "5 lưu ý chăm sóc pin xe điện",
    excerpt:
      "Duy trì thói quen sạc hợp lý, tránh để pin cạn kiệt và kiểm tra định kỳ giúp kéo dài tuổi thọ pin.",
    date: "2026-11-01",
    category: "Kinh nghiệm",
    image: "/images/news-3.webp",
    body: [
      "Pin là bộ phận quan trọng của xe điện. Để duy trì hiệu suất, nên hạn chế để pin ở mức quá thấp trong thời gian dài và tránh sạc quá đầy nếu không cần thiết.",
      "Nên sạc xe ở nơi khô ráo, thoáng mát, sử dụng thiết bị sạc phù hợp với hướng dẫn của nhà sản xuất. Kiểm tra định kỳ giúp phát hiện sớm các dấu hiệu bất thường.",
      "Nội dung trên là thông tin tham khảo cho website demo, không thay thế hướng dẫn chính thức từ VinFast.",
    ],
  },
];

export function getNews(slug: string) {
  return news.find((item) => item.slug === slug);
}
