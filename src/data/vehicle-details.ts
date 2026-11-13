/*
 * Nội dung chi tiết sản phẩm cho từng mẫu xe.
 * Đây là "sheet" dữ liệu riêng: trang chi tiết chỉ đọc nội dung từ file này,
 * không hard-code copy trong component. Có thể thay bằng dữ liệu thật sau.
 */

export type DetailIcon =
  | "front"
  | "side"
  | "wheel"
  | "rear"
  | "steering"
  | "seat"
  | "screen"
  | "battery"
  | "motor"
  | "plug"
  | "shield"
  | "airbag"
  | "cruise"
  | "light"
  | "brake"
  | "tire"
  | "storage";

export type DetailCard = {
  title: string;
  text: string;
  icon?: DetailIcon;
  imageIndex?: number;
};

export type DetailSection = {
  title: string;
  subtitle: string;
  intro: string;
  cards: DetailCard[];
};

export type VehicleDetailContent = {
  infoIntro: string;
  exterior: DetailSection;
  interior: DetailSection;
  performance: DetailSection;
  safety?: DetailSection;
  tech: { label: string; value: string }[];
  catalog: string;
  catalogNote?: string;
};

export const vehicleDetailContent: Record<string, VehicleDetailContent> = {
  "vinfast-vf-3": {
    infoIntro:
      "VF 3 là mẫu ô tô điện mini với thiết kế nhỏ gọn, cá tính và linh hoạt. Xe phù hợp cho nhu cầu di chuyển hằng ngày trong đô thị, dễ đỗ và dễ xoay trở trong không gian chật hẹp.",
    exterior: {
      title: "Thiết Kế Ngoại Thất VinFast VF 3",
      subtitle: "Nhỏ gọn, cá tính và nổi bật",
      intro:
        "VF 3 sở hữu dáng xe vuông vức đặc trưng, mặt ca-lăng khép kín và cụm đèn LED tạo điểm nhấn công nghệ. Tổng thể gọn gàng nhưng vẫn đủ mạnh mẽ để nổi bật giữa phố.",
      cards: [
        {
          title: "Đầu xe",
          text: "Mặt trước vuông vức với dải đèn LED định vị và logo V nổi bật, tạo nhận diện riêng cho dòng xe điện cỡ nhỏ.",
          imageIndex: 0,
        },
        {
          title: "Thân xe",
          text: "Thân xe ngắn, tỷ lệ cân đối giúp VF 3 linh hoạt khi luồn phố và xoay trở trong không gian chật.",
          imageIndex: 1,
        },
        {
          title: "Mâm xe",
          text: "Mâm hợp kim thiết kế khỏe khoắn, kết hợp hốc bánh nhựa đen tạo cảm giác SUV mini vững chãi.",
          imageIndex: 2,
        },
        {
          title: "Đuôi xe",
          text: "Đuôi xe gọn với cụm đèn hậu đặt dọc, hoàn thiện vẻ ngoài cá tính và dễ nhận diện.",
          imageIndex: 3,
        },
      ],
    },
    interior: {
      title: "Thiết Kế Nội Thất VinFast VF 3",
      subtitle: "Tối giản nhưng thực dụng",
      intro:
        "Khoang nội thất VF 3 được tối ưu cho nhu cầu di chuyển đô thị, bố trí gọn gàng và tập trung vào những tiện ích thiết yếu.",
      cards: [
        {
          title: "Khoang lái",
          text: "Vô lăng nhỏ gọn, cụm đồng hồ kỹ thuật số dễ quan sát, giúp người lái làm quen nhanh.",
          icon: "steering",
        },
        {
          title: "Hàng ghế",
          text: "Không gian 4 chỗ với ghế trước thoải mái, hàng ghế sau gập linh hoạt để mở rộng khoang hành lý.",
          icon: "seat",
        },
        {
          title: "Tiện nghi",
          text: "Màn hình giải trí trung tâm, kết nối điện thoại và các tiện ích cơ bản phục vụ hành trình hằng ngày.",
          icon: "screen",
        },
      ],
    },
    performance: {
      title: "Khả Năng Vận Hành VinFast VF 3",
      subtitle: "Linh hoạt trong phố thị",
      intro:
        "Động cơ điện phản hồi tức thì cùng kích thước nhỏ gọn giúp VF 3 di chuyển nhẹ nhàng, êm ái và tiết kiệm chi phí vận hành.",
      cards: [
        {
          title: "Pin VF 3",
          text: "Bộ pin LFP dung lượng 18,64 kWh cho quãng đường tối đa 215 km (NEDC), phù hợp nhu cầu đi lại hằng ngày.",
          icon: "battery",
        },
        {
          title: "Động cơ điện",
          text: "Motor điện công suất 30 kW, mô men xoắn 110 Nm, mang lại khả năng tăng tốc mượt mà.",
          icon: "motor",
        },
        {
          title: "Sạc pin",
          text: "Hỗ trợ sạc nhanh 10–70% trong khoảng 36 phút và sạc tại nhà linh hoạt qua ổ điện thông thường.",
          icon: "plug",
        },
      ],
    },
    safety: {
      title: "Trang Bị An Toàn VinFast VF 3",
      subtitle: "Bảo vệ trong từng hành trình",
      intro:
        "VF 3 được trang bị các hệ thống an toàn cơ bản và kết cấu thân xe chắc chắn, đáp ứng nhu cầu di chuyển đô thị.",
      cards: [
        {
          title: "Túi khí",
          text: "Trang bị túi khí cho hàng ghế trước, giảm thiểu chấn thương trong tình huống va chạm.",
          icon: "airbag",
        },
        {
          title: "An toàn chủ động",
          text: "Hệ thống phanh ABS, phân phối lực phanh điện tử EBD và cân bằng điện tử hỗ trợ kiểm soát xe.",
          icon: "shield",
        },
        {
          title: "Camera & cảm biến",
          text: "Camera lùi và cảm biến hỗ trợ đỗ xe giúp thao tác trong không gian chật trở nên dễ dàng hơn.",
          icon: "cruise",
        },
      ],
    },
    tech: [
      { label: "Động cơ", value: "01 Motor điện" },
      { label: "Công suất tối đa", value: "30 kW" },
      { label: "Mô men xoắn cực đại", value: "110 Nm" },
      { label: "Quãng đường", value: "215 km (NEDC)" },
      { label: "Thời gian sạc nhanh", value: "36 phút (10–70%)" },
      { label: "Dẫn động", value: "RWD / Cầu sau" },
    ],
    catalog: "/catalogs/VF3_Brochure_RGB_T42025.pdf",
  },

  "vinfast-vf-5": {
    infoIntro:
      "VF 5 là mẫu SUV điện cỡ A rộng rãi, cân bằng giữa thiết kế hiện đại, khả năng vận hành linh hoạt và chi phí sử dụng hợp lý cho gia đình trẻ.",
    exterior: {
      title: "Thiết Kế Ngoại Thất VinFast VF 5",
      subtitle: "Hiện đại, cân đối và thực dụng",
      intro:
        "VF 5 mang ngôn ngữ thiết kế SUV điện hiện đại với mặt trước gọn gàng, đường dập nổi mạnh mẽ và tỷ lệ thân xe cân đối.",
      cards: [
        {
          title: "Đầu xe",
          text: "Cụm đèn LED thanh mảnh, mặt ca-lăng khép kín và logo V tạo diện mạo hiện đại, dễ nhận diện.",
          imageIndex: 0,
        },
        {
          title: "Thân xe",
          text: "Đường dập nổi chạy dọc thân xe cùng vòm bánh nhấn mạnh dáng SUV, đồng thời mở rộng không gian bên trong.",
          imageIndex: 1,
        },
        {
          title: "Mâm xe",
          text: "Mâm hợp kim 17 inch thiết kế đa chấu, kết hợp hài hòa với tổng thể khỏe khoắn của xe.",
          imageIndex: 2,
        },
        {
          title: "Đuôi xe",
          text: "Cụm đèn hậu LED và cốp sau gọn gàng giúp VF 5 cân đối ở mọi góc nhìn.",
          imageIndex: 3,
        },
      ],
    },
    interior: {
      title: "Thiết Kế Nội Thất VinFast VF 5",
      subtitle: "Rộng rãi cho gia đình trẻ",
      intro:
        "Không gian nội thất VF 5 tối ưu cho 5 người, sử dụng vật liệu dễ vệ sinh và bố trí tiện ích thuận tiện cho gia đình.",
      cards: [
        {
          title: "Khoang lái",
          text: "Vô lăng thiết kế gọn, màn hình kỹ thuật số và các phím điều khiển bố trí thuận tiện cho người lái.",
          icon: "steering",
        },
        {
          title: "Hàng ghế",
          text: "Hàng ghế sau rộng rãi, hỗ trợ gập linh hoạt để mở rộng khoang hành lý khi cần thiết.",
          icon: "seat",
        },
        {
          title: "Tiện nghi",
          text: "Màn hình giải trí, cổng sạc USB và các tiện ích thiết yếu đáp ứng nhu cầu sử dụng hằng ngày.",
          icon: "screen",
        },
      ],
    },
    performance: {
      title: "Khả Năng Vận Hành VinFast VF 5",
      subtitle: "Êm ái và sẵn sàng mọi hành trình",
      intro:
        "VF 5 cân bằng giữa khả năng vận hành linh hoạt và quãng đường di chuyển, phù hợp cả phố thị lẫn những chuyến đi xa.",
      cards: [
        {
          title: "Pin VF 5",
          text: "Pin dung lượng 42 kWh cho quãng đường tối đa 326 km (NEDC), đáp ứng tốt nhu cầu sử dụng đa dạng.",
          icon: "battery",
        },
        {
          title: "Động cơ điện",
          text: "Motor điện công suất 100 kW, mô men xoắn 260 Nm, mang lại khả năng tăng tốc linh hoạt.",
          icon: "motor",
        },
        {
          title: "Sạc pin",
          text: "Sạc nhanh 10–70% trong khoảng 30 phút, thuận tiện cho những hành trình dài.",
          icon: "plug",
        },
      ],
    },
    safety: {
      title: "Trang Bị An Toàn VinFast VF 5",
      subtitle: "An tâm trên mọi cung đường",
      intro:
        "VF 5 trang bị các hệ thống hỗ trợ lái và an toàn chủ động, giúp người lái tự tin hơn trong mọi tình huống.",
      cards: [
        {
          title: "Túi khí",
          text: "Hệ thống túi khí bảo vệ hành khách, kết hợp kết cấu thân xe chắc chắn.",
          icon: "airbag",
        },
        {
          title: "An toàn chủ động",
          text: "ABS, EBD, ESC và kiểm soát lực kéo giúp xe ổn định khi phanh hoặc vào cua.",
          icon: "shield",
        },
        {
          title: "Hỗ trợ lái",
          text: "Cruise control, camera lùi và cảm biến hỗ trợ người lái trong các tình huống thường gặp.",
          icon: "cruise",
        },
      ],
    },
    tech: [
      { label: "Động cơ", value: "01 Motor điện" },
      { label: "Công suất tối đa", value: "100 kW" },
      { label: "Mô men xoắn cực đại", value: "260 Nm" },
      { label: "Quãng đường", value: "326 km (NEDC)" },
      { label: "Thời gian sạc nhanh", value: "30 phút (10–70%)" },
      { label: "Dẫn động", value: "FWD / Cầu trước" },
    ],
    catalog: "/catalogs/VF5_Brochure_T82025.pdf",
  },

  "vinfast-vf-8": {
    infoIntro:
      "VF 8 là mẫu SUV điện hạng D với không gian rộng rãi, hiệu năng mạnh mẽ và nhiều công nghệ hiện đại, phù hợp gia đình và nhu cầu di chuyển đa dạng.",
    exterior: {
      title: "Thiết Kế Ngoại Thất VinFast VF 8",
      subtitle: "SUV điện cỡ D mạnh mẽ",
      intro:
        "VF 8 gây ấn tượng với thân xe lớn, đường nét mềm mại kết hợp các chi tiết LED hiện đại, tạo nên diện mạo sang trọng và khỏe khoắn.",
      cards: [
        {
          title: "Đầu xe",
          text: "Mặt trước nổi bật với dải đèn LED định vị, logo V và hốc gió thiết kế tinh tế.",
          imageIndex: 0,
        },
        {
          title: "Thân xe",
          text: "Thân xe dài, đường dập nổi mềm mại và vòm bánh lớn tạo tỷ lệ cân đối cho một mẫu SUV cỡ D.",
          imageIndex: 1,
        },
        {
          title: "Mâm xe",
          text: "Mâm hợp kim 19 inch thiết kế thể thao, góp phần hoàn thiện vẻ ngoài mạnh mẽ.",
          imageIndex: 2,
        },
        {
          title: "Đuôi xe",
          text: "Cụm đèn hậu LED kéo dài và cốp điện hỗ trợ sử dụng thuận tiện hơn.",
          imageIndex: 3,
        },
      ],
    },
    interior: {
      title: "Thiết Kế Nội Thất VinFast VF 8",
      subtitle: "Rộng rãi và giàu công nghệ",
      intro:
        "Khoang cabin VF 8 hướng đến sự thoải mái với không gian 5 chỗ rộng, màn hình lớn và nhiều tiện ích thông minh.",
      cards: [
        {
          title: "Khoang lái",
          text: "Vô lăng hiện đại, màn hình kỹ thuật số và màn hình trung tâm lớn giúp điều khiển thuận tiện.",
          icon: "steering",
        },
        {
          title: "Hàng ghế",
          text: "Ghế ngồi rộng rãi, hỗ trợ chỉnh điện và gập linh hoạt để tối ưu khoang hành lý.",
          icon: "seat",
        },
        {
          title: "Tiện nghi",
          text: "Hệ thống giải trí, điều hòa tự động và nhiều cổng sạc mang lại trải nghiệm thoải mái.",
          icon: "screen",
        },
      ],
    },
    performance: {
      title: "Khả Năng Vận Hành VinFast VF 8",
      subtitle: "Sức mạnh của SUV điện",
      intro:
        "Hai động cơ điện và hệ dẫn động AWD giúp VF 8 vận hành mạnh mẽ, ổn định trên nhiều loại địa hình.",
      cards: [
        {
          title: "Pin VF 8",
          text: "Pin dung lượng 87,7 kWh cho quãng đường tối đa 420 km (WLTP).",
          icon: "battery",
        },
        {
          title: "Động cơ điện",
          text: "Công suất tối đa 300 kW, mô men xoắn 620 Nm, tăng tốc 0–100 km/h trong 5,8 giây.",
          icon: "motor",
        },
        {
          title: "Sạc pin",
          text: "Sạc nhanh 10–70% trong khoảng 31 phút, hỗ trợ tốt cho các hành trình dài.",
          icon: "plug",
        },
      ],
    },
    safety: {
      title: "Trang Bị An Toàn VinFast VF 8",
      subtitle: "Công nghệ an toàn toàn diện",
      intro:
        "VF 8 được trang bị gói an toàn chủ động và hỗ trợ lái tiên tiến, bảo vệ hành khách tối đa.",
      cards: [
        {
          title: "Túi khí",
          text: "Hệ thống túi khí toàn diện kết hợp kết cấu thân xe vững chắc.",
          icon: "airbag",
        },
        {
          title: "ADAS",
          text: "Các tính năng hỗ trợ lái nâng cao giúp giảm tải thao tác và tăng độ an toàn.",
          icon: "shield",
        },
        {
          title: "Cruise control",
          text: "Hệ thống kiểm soát hành trình hỗ trợ duy trì tốc độ ổn định trên đường dài.",
          icon: "cruise",
        },
      ],
    },
    tech: [
      { label: "Động cơ", value: "02 Motor điện" },
      { label: "Công suất tối đa", value: "300 kW" },
      { label: "Mô men xoắn cực đại", value: "620 Nm" },
      { label: "Quãng đường", value: "420 km (WLTP)" },
      { label: "Thời gian sạc nhanh", value: "31 phút (10–70%)" },
      { label: "Dẫn động", value: "AWD / 2 cầu" },
    ],
    catalog: "/catalogs/VF8_Brochure_T04.pdf",
  },

  "vinfast-vf-9": {
    infoIntro:
      "VF 9 là mẫu SUV điện cỡ E với không gian 6 chỗ cao cấp, quãng đường di chuyển lớn và nhiều trang bị hiện đại, phù hợp gia đình đông người.",
    exterior: {
      title: "Thiết Kế Ngoại Thất VinFast VF 9",
      subtitle: "Đẳng cấp SUV điện cỡ E",
      intro:
        "VF 9 sở hữu kích thước lớn, thiết kế sang trọng và các chi tiết hoàn thiện tỉ mỉ, phù hợp gia đình đông người và nhu cầu di chuyển cao cấp.",
      cards: [
        {
          title: "Đầu xe",
          text: "Mặt trước bề thế với dải đèn LED, logo V và các chi tiết mạ crôm tạo điểm nhấn sang trọng.",
          imageIndex: 0,
        },
        {
          title: "Thân xe",
          text: "Thân xe dài, đường nét mềm mại và tỷ lệ cân đối, khẳng định vị thế SUV cỡ E.",
          imageIndex: 1,
        },
        {
          title: "Mâm xe",
          text: "Mâm hợp kim 20 inch thiết kế tinh xảo, phù hợp với tổng thể sang trọng của xe.",
          imageIndex: 2,
        },
        {
          title: "Đuôi xe",
          text: "Cụm đèn hậu LED nối liền và cốp điện thông minh mang lại vẻ hiện đại, thuận tiện.",
          imageIndex: 3,
        },
      ],
    },
    interior: {
      title: "Thiết Kế Nội Thất VinFast VF 9",
      subtitle: "Không gian 6 chỗ cao cấp",
      intro:
        "Nội thất VF 9 rộng rãi với 6 chỗ ngồi, chất liệu cao cấp và nhiều tiện nghi cho cả gia đình.",
      cards: [
        {
          title: "Khoang lái",
          text: "Vô lăng và cụm màn hình hiện đại, bố trí khoa học giúp người lái dễ dàng quan sát và điều khiển.",
          icon: "steering",
        },
        {
          title: "Hàng ghế",
          text: "Không gian 6 chỗ với hàng ghế thứ hai, thứ ba linh hoạt, phù hợp gia đình đông người.",
          icon: "seat",
        },
        {
          title: "Tiện nghi",
          text: "Điều hòa tự động, hệ thống giải trí và nhiều cổng sạc phục vụ mọi hành khách.",
          icon: "screen",
        },
      ],
    },
    performance: {
      title: "Khả Năng Vận Hành VinFast VF 9",
      subtitle: "Mạnh mẽ và bền bỉ",
      intro:
        "VF 9 kết hợp hai động cơ điện, hệ dẫn động AWD và pin dung lượng lớn cho quãng đường lên tới 594 km (NEDC).",
      cards: [
        {
          title: "Pin VF 9",
          text: "Pin dung lượng 123 kWh cho quãng đường tối đa 594 km (NEDC).",
          icon: "battery",
        },
        {
          title: "Động cơ điện",
          text: "Công suất tối đa 300 kW, mô men xoắn 620 Nm, vận hành mạnh mẽ và ổn định.",
          icon: "motor",
        },
        {
          title: "Sạc pin",
          text: "Sạc nhanh 10–70% trong khoảng 31 phút, phù hợp cho các chuyến đi dài.",
          icon: "plug",
        },
      ],
    },
    safety: {
      title: "Trang Bị An Toàn VinFast VF 9",
      subtitle: "An toàn toàn diện cho cả gia đình",
      intro:
        "VF 9 trang bị hệ thống túi khí, ADAS và nhiều tính năng hỗ trợ lái, mang lại sự an tâm cho mọi hành trình.",
      cards: [
        {
          title: "Túi khí",
          text: "Hệ thống túi khí bao phủ nhiều vị trí, bảo vệ hành khách tối đa.",
          icon: "airbag",
        },
        {
          title: "ADAS",
          text: "Gói hỗ trợ lái nâng cao giúp giảm tải thao tác và tăng độ an toàn.",
          icon: "shield",
        },
        {
          title: "Cruise control",
          text: "Kiểm soát hành trình giúp duy trì tốc độ ổn định và thoải mái trên đường dài.",
          icon: "cruise",
        },
      ],
    },
    tech: [
      { label: "Động cơ", value: "02 Motor điện" },
      { label: "Công suất tối đa", value: "300 kW" },
      { label: "Mô men xoắn cực đại", value: "620 Nm" },
      { label: "Quãng đường", value: "594 km (NEDC)" },
      { label: "Thời gian sạc nhanh", value: "31 phút (10–70%)" },
      { label: "Dẫn động", value: "AWD / 2 cầu" },
    ],
    catalog: "/catalogs/VF9_Brochure_EN.pdf",
  },

  "vinfast-evo": {
    infoIntro:
      "Evo là mẫu xe máy điện phổ thông với thiết kế trẻ trung, vận hành êm ái và chi phí sử dụng thấp, phù hợp học sinh, sinh viên và người đi làm trong đô thị.",
    exterior: {
      title: "Thiết Kế Ngoại Thất VinFast Evo",
      subtitle: "Trẻ trung và thân thiện",
      intro:
        "Evo sở hữu thiết kế xe máy điện gọn nhẹ, đường nét mềm mại và màu sắc trẻ trung, phù hợp cho nhu cầu di chuyển hằng ngày.",
      cards: [
        {
          title: "Đầu xe",
          text: "Cụm đèn pha LED và mặt nạ đầu xe gọn gàng tạo diện mạo thân thiện, dễ nhận diện.",
          imageIndex: 0,
        },
        {
          title: "Thân xe",
          text: "Thân xe nhỏ gọn, yên xe êm ái và tư thế ngồi thoải mái cho người sử dụng.",
          imageIndex: 1,
        },
        {
          title: "Mâm xe",
          text: "Mâm xe thiết kế chắc chắn, kết hợp lốp bám đường giúp di chuyển ổn định trong phố.",
          imageIndex: 2,
        },
        {
          title: "Đuôi xe",
          text: "Đuôi xe gọn với cụm đèn hậu LED, hoàn thiện tổng thể hài hòa và hiện đại.",
          imageIndex: 3,
        },
      ],
    },
    interior: {
      title: "Tiện Ích & Trang Bị VinFast Evo",
      subtitle: "Tiện dụng cho mỗi ngày",
      intro:
        "Evo được trang bị những tiện ích thiết yếu, giúp việc di chuyển hằng ngày trở nên thuận tiện và thoải mái.",
      cards: [
        {
          title: "Cốp xe",
          text: "Khoang chứa đồ gọn gàng, đủ để mang theo vật dụng cá nhân khi di chuyển.",
          icon: "storage",
        },
        {
          title: "Màn hình LCD",
          text: "Màn hình hiển thị thông tin vận hành cơ bản, dễ quan sát khi lái xe.",
          icon: "screen",
        },
        {
          title: "Đèn LED",
          text: "Hệ thống đèn LED tiết kiệm điện, tăng khả năng chiếu sáng khi di chuyển buổi tối.",
          icon: "light",
        },
      ],
    },
    performance: {
      title: "Khả Năng Vận Hành VinFast Evo",
      subtitle: "Êm ái và tiết kiệm",
      intro:
        "Động cơ điện công suất 1,2 kW cùng pin Lithium-ion cho quãng đường 80 km mỗi lần sạc, đáp ứng nhu cầu đi lại trong đô thị.",
      cards: [
        {
          title: "Pin Evo",
          text: "Pin Lithium-ion cho quãng đường tối đa 80 km mỗi lần sạc, phù hợp nhu cầu đi lại hằng ngày.",
          icon: "battery",
        },
        {
          title: "Động cơ điện",
          text: "Công suất 1,2 kW, tốc độ tối đa 50 km/h, vận hành êm ái và tiết kiệm năng lượng.",
          icon: "motor",
        },
        {
          title: "Sạc pin",
          text: "Thời gian sạc khoảng 4–5 giờ, có thể sạc tại nhà thuận tiện.",
          icon: "plug",
        },
      ],
    },
    safety: {
      title: "Trang Bị An Toàn VinFast Evo",
      subtitle: "An toàn trong phố",
      intro:
        "Evo trang bị hệ thống phanh, lốp bám đường và đèn chiếu sáng, giúp người lái an tâm di chuyển.",
      cards: [
        {
          title: "Phanh xe",
          text: "Hệ thống phanh trước và sau giúp kiểm soát tốc độ trong các tình huống thường gặp.",
          icon: "brake",
        },
        {
          title: "Lốp xe",
          text: "Lốp có độ bám tốt, hỗ trợ cân bằng và ổn định khi di chuyển trên đường phố.",
          icon: "tire",
        },
        {
          title: "Đèn chiếu sáng",
          text: "Đèn LED phía trước và sau tăng khả năng quan sát, đảm bảo an toàn khi đi buổi tối.",
          icon: "light",
        },
      ],
    },
    tech: [
      { label: "Công suất", value: "1,2 kW" },
      { label: "Tốc độ tối đa", value: "50 km/h" },
      { label: "Quãng đường", value: "80 km / lần sạc" },
      { label: "Thời gian sạc", value: "4–5 giờ" },
      { label: "Loại pin", value: "Pin Lithium-ion" },
      { label: "Số chỗ ngồi", value: "2 chỗ" },
    ],
    catalog: "/catalogs/vinfast-evo-brochure.pdf",
    catalogNote: "Catalog demo — thay bằng brochure chính thức khi có file.",
  },

  "vinfast-viper": {
    infoIntro:
      "Viper là mẫu xe máy điện thể thao với thiết kế năng động, hiệu năng vượt trội và quãng đường di chuyển 100 km, phù hợp người dùng yêu thích phong cách mạnh mẽ.",
    exterior: {
      title: "Thiết Kế Ngoại Thất VinFast Viper",
      subtitle: "Thể thao và năng động",
      intro:
        "Viper mang dáng vẻ thể thao với đường nét sắc sảo, cụm đèn LED hiện đại và tem xe nổi bật, phù hợp người dùng yêu thích phong cách năng động.",
      cards: [
        {
          title: "Đầu xe",
          text: "Mặt nạ đầu xe sắc sảo, cụm đèn LED hiện đại tạo điểm nhấn thể thao.",
          imageIndex: 0,
        },
        {
          title: "Thân xe",
          text: "Thân xe được tạo hình khí động học, đường nét dứt khoát và tem xe nổi bật.",
          imageIndex: 1,
        },
        {
          title: "Mâm xe",
          text: "Mâm xe thiết kế thể thao, kết hợp lốp bám đường cho cảm giác vận hành chắc chắn.",
          imageIndex: 2,
        },
        {
          title: "Đuôi xe",
          text: "Đuôi xe gọn, cụm đèn hậu LED và các chi tiết hoàn thiện tạo tổng thể cân đối.",
          imageIndex: 3,
        },
      ],
    },
    interior: {
      title: "Tiện Ích & Trang Bị VinFast Viper",
      subtitle: "Trang bị hiện đại",
      intro:
        "Viper được trang bị các tiện ích cần thiết cho hành trình hằng ngày, kết hợp phong cách thể thao và sự thuận tiện.",
      cards: [
        {
          title: "Cốp xe",
          text: "Khoang chứa đồ tiện dụng, đáp ứng nhu cầu mang theo vật dụng cá nhân.",
          icon: "storage",
        },
        {
          title: "Màn hình LCD",
          text: "Màn hình hiển thị thông tin vận hành rõ ràng, dễ quan sát.",
          icon: "screen",
        },
        {
          title: "Đèn LED",
          text: "Hệ thống đèn LED hiện đại, tăng khả năng chiếu sáng và nhận diện.",
          icon: "light",
        },
      ],
    },
    performance: {
      title: "Khả Năng Vận Hành VinFast Viper",
      subtitle: "Tốc độ và sự linh hoạt",
      intro:
        "Động cơ 1,5 kW, tốc độ tối đa 80 km/h và quãng đường 100 km mỗi lần sạc giúp Viper đáp ứng tốt nhu cầu di chuyển nhanh và linh hoạt.",
      cards: [
        {
          title: "Pin Viper",
          text: "Pin Lithium-ion cho quãng đường tối đa 100 km mỗi lần sạc.",
          icon: "battery",
        },
        {
          title: "Động cơ điện",
          text: "Công suất 1,5 kW, tốc độ tối đa 80 km/h, mang lại trải nghiệm lái mạnh mẽ.",
          icon: "motor",
        },
        {
          title: "Sạc pin",
          text: "Thời gian sạc khoảng 4–5 giờ, thuận tiện cho nhu cầu sử dụng hằng ngày.",
          icon: "plug",
        },
      ],
    },
    safety: {
      title: "Trang Bị An Toàn VinFast Viper",
      subtitle: "Kiểm soát tốt ở tốc độ cao",
      intro:
        "Hệ thống phanh, lốp và khung xe chắc chắn giúp Viper vận hành ổn định và an toàn hơn.",
      cards: [
        {
          title: "Phanh xe",
          text: "Hệ thống phanh trước và sau giúp kiểm soát tốt ở tốc độ cao.",
          icon: "brake",
        },
        {
          title: "Lốp xe",
          text: "Lốp bám đường, kết hợp khung xe chắc chắn cho cảm giác vận hành ổn định.",
          icon: "tire",
        },
        {
          title: "Đèn chiếu sáng",
          text: "Đèn LED hiện đại tăng khả năng quan sát và an toàn khi di chuyển.",
          icon: "light",
        },
      ],
    },
    tech: [
      { label: "Công suất", value: "1,5 kW" },
      { label: "Tốc độ tối đa", value: "80 km/h" },
      { label: "Quãng đường", value: "100 km / lần sạc" },
      { label: "Thời gian sạc", value: "4–5 giờ" },
      { label: "Loại pin", value: "Pin Lithium-ion" },
      { label: "Số chỗ ngồi", value: "2 chỗ" },
    ],
    catalog: "/catalogs/vinfast-viper-brochure.pdf",
    catalogNote: "Catalog demo — thay bằng brochure chính thức khi có file.",
  },
};
