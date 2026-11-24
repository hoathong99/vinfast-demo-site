import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = "C:/Users/anhvn1/Desktop/RP/AI salve camp";
const home = join(root, "Đại lý VinFast CarOn – Ô tô điện & Xe máy điện chính hãng_files");
const out = join(root, "site", "public", "images");

const folders = {
  vf3: join(root, "Ô tô điện VinFast VF 3 - VinFast CarOn_files"),
  vf5: join(root, "Ô tô điện VinFast VF 5 - VinFast CarOn_files"),
  vf8: join(root, "Ô tô điện VinFast VF 8 - VinFast CarOn_files"),
  vf9: join(root, "Ô tô điện VinFast VF 9 - VinFast CarOn_files"),
  evo: join(root, "Xe máy điện VinFast Evo - VinFast CarOn_files"),
  viper: join(root, "Xe máy điện VinFast Viper - VinFast CarOn_files"),
};

const jobs = [
  // Hero slides
  { src: join(home, "Gemini_Generated_Image_c0eifnc0eifnc0ei-2048x1143_8KgB.png"), dest: "hero-1.webp", width: 1920, height: 900 },
  { src: join(home, "Gemini_Generated_Image_c0eifnc0eifnc0ei-2048x1143_8KgB.png"), dest: "hero-1-960.webp", width: 960, height: 450 },
  { src: join(home, "Gemini_Generated_Image_g3gwgeg3gwgeg3gw-2048x1143_8KgB.png"), dest: "hero-2.webp", width: 1920, height: 900 },
  { src: join(home, "Gemini_Generated_Image_g3gwgeg3gwgeg3gw-2048x1143_8KgB.png"), dest: "hero-2-960.webp", width: 960, height: 450 },
  { src: join(home, "Gemini_Generated_Image_5zbsf5zbsf5zbsf5-2048x1143_8KgB.png"), dest: "hero-3.webp", width: 1920, height: 900 },
  { src: join(home, "Gemini_Generated_Image_5zbsf5zbsf5zbsf5-2048x1143_8KgB.png"), dest: "hero-3-960.webp", width: 960, height: 450 },
  { src: join(home, "Gemini_Generated_Image_5zbsf5zbsf5zbsf5-2048x1143_8KgB.png"), dest: "service-banner.webp", width: 1920, height: 900 },

  // Brand
  { src: join(home, "Logo-VinFast-CarOn-Cao_8KgB.png"), dest: "logo.svg", width: 240, height: 298, fit: "inside", transparent: true },
  { src: join(home, "Logo-VinFast-CarOn-Cao_8KgB.png"), dest: "favicon.png", width: 64, height: 64, fit: "contain", pad: "#ffffff" },

  // News
  { src: join(home, "Thiet-ke-chua-co-ten_8KgB.png"), dest: "news-1.webp", width: 800, height: 450 },
  { src: join(home, "Logo-Ghi-5-1024x576_8KgB.png"), dest: "news-2.webp", width: 800, height: 450 },
  { src: join(home, "Logo-Trang-1024x576_8KgB.png"), dest: "news-3.webp", width: 800, height: 450 },

  // Vehicle main images
  { src: join(home, "VF3_8KgB.webp"), dest: "vehicles/vf3/main.webp", width: 1200, height: 675 },
  { src: join(home, "VF5_8KgB.webp"), dest: "vehicles/vf5/main.webp", width: 1200, height: 675 },
  { src: join(home, "VF8_8KgB.webp"), dest: "vehicles/vf8/main.webp", width: 1200, height: 675 },
  { src: join(home, "VF9_8KgB.webp"), dest: "vehicles/vf9/main.webp", width: 1200, height: 675 },
  { src: join(home, "evo_8KgB.webp"), dest: "vehicles/evo/main.webp", width: 1200, height: 675 },
  { src: join(home, "Viper_8KgB.webp"), dest: "vehicles/viper/main.webp", width: 1200, height: 675 },

  // VF3 gallery
  { src: join(folders.vf3, "VF3-IMAGE-1_XSFG.jpg"), dest: "vehicles/vf3/gallery-1.webp", width: 900, height: 675 },
  { src: join(folders.vf3, "VF3-IMAGE-2_XSFG.jpg"), dest: "vehicles/vf3/gallery-2.webp", width: 900, height: 675 },
  { src: join(folders.vf3, "VF3-IMAGE-3_XSFG.jpg"), dest: "vehicles/vf3/gallery-3.webp", width: 900, height: 675 },
  { src: join(folders.vf3, "VF3-IMAGE-4_XSFG.jpg"), dest: "vehicles/vf3/gallery-4.webp", width: 900, height: 675 },

  // VF5 gallery
  { src: join(folders.vf5, "VF5-IMAGE-1_Usy6.jpg"), dest: "vehicles/vf5/gallery-1.webp", width: 900, height: 675 },
  { src: join(folders.vf5, "VF5-IMAGE-2_Usy6.jpg"), dest: "vehicles/vf5/gallery-2.webp", width: 900, height: 675 },
  { src: join(folders.vf5, "VF5-IMAGE-3_Usy6.jpg"), dest: "vehicles/vf5/gallery-3.webp", width: 900, height: 675 },
  { src: join(folders.vf5, "VF5-IMAGE-4_Usy6.jpg"), dest: "vehicles/vf5/gallery-4.webp", width: 900, height: 675 },

  // VF8 gallery
  { src: join(folders.vf8, "VF8-1-1_xir7.jpg"), dest: "vehicles/vf8/gallery-1.webp", width: 900, height: 675 },
  { src: join(folders.vf8, "VF8-2_xir7.jpg"), dest: "vehicles/vf8/gallery-2.webp", width: 900, height: 675 },
  { src: join(folders.vf8, "VF8-3_xir7.jpg"), dest: "vehicles/vf8/gallery-3.webp", width: 900, height: 675 },
  { src: join(folders.vf8, "VF8-4_xir7.jpg"), dest: "vehicles/vf8/gallery-4.webp", width: 900, height: 675 },

  // VF9 gallery
  { src: join(folders.vf9, "VF9-IMAGE-1_0MrP.jpg"), dest: "vehicles/vf9/gallery-1.webp", width: 900, height: 675 },
  { src: join(folders.vf9, "VF9-IMAGE-2_0MrP.jpg"), dest: "vehicles/vf9/gallery-2.webp", width: 900, height: 675 },
  { src: join(folders.vf9, "VF9-IMAGE-3_0MrP.jpg"), dest: "vehicles/vf9/gallery-3.webp", width: 900, height: 675 },
  { src: join(folders.vf9, "VF9-IMAGE-4_0MrP.jpg"), dest: "vehicles/vf9/gallery-4.webp", width: 900, height: 675 },

  // Evo gallery (transparent PNG)
  { src: join(folders.evo, "vinfast-evo-1_uDt-.png"), dest: "vehicles/evo/gallery-1.webp", width: 900, height: 675, fit: "contain", pad: "#ffffff" },
  { src: join(folders.evo, "vinfast-evo-2_uDt-.png"), dest: "vehicles/evo/gallery-2.webp", width: 900, height: 675, fit: "contain", pad: "#ffffff" },
  { src: join(folders.evo, "vinfast-evo-3_uDt-.png"), dest: "vehicles/evo/gallery-3.webp", width: 900, height: 675, fit: "contain", pad: "#ffffff" },
  { src: join(folders.evo, "vinfast-evo-4_uDt-.png"), dest: "vehicles/evo/gallery-4.webp", width: 900, height: 675, fit: "contain", pad: "#ffffff" },

  // Viper gallery
  { src: join(folders.viper, "vinfast-viper-1_Rtmc.jpg"), dest: "vehicles/viper/gallery-1.webp", width: 900, height: 675 },
  { src: join(folders.viper, "vinfast-viper-2_Rtmc.jpg"), dest: "vehicles/viper/gallery-2.webp", width: 900, height: 675 },
  { src: join(folders.viper, "vinfast-viper-3_Rtmc.jpg"), dest: "vehicles/viper/gallery-3.webp", width: 900, height: 675 },
  { src: join(folders.viper, "vinfast-viper-4_Rtmc.jpg"), dest: "vehicles/viper/gallery-4.webp", width: 900, height: 675 },
];

let ok = 0;
let missing = 0;

for (const job of jobs) {
  if (!existsSync(job.src)) {
    console.warn(`MISSING ${job.src}`);
    missing++;
    continue;
  }
  const dest = join(out, job.dest);
  mkdirSync(dirname(dest), { recursive: true });
  let image = sharp(job.src).rotate();
  if (job.transparent) {
    image = image.resize(job.width, job.height, { fit: job.fit || "cover", position: "centre" }).webp({ quality: 88, alphaQuality: 100 });
  } else if (job.pad) {
    image = image
      .resize(job.width, job.height, { fit: job.fit || "contain", background: job.pad })
      .flatten({ background: job.pad })
      .webp({ quality: 82 });
  } else {
    image = image
      .resize(job.width, job.height, { fit: job.fit || "cover", position: "centre" })
      .flatten({ background: "#ffffff" })
      .webp({ quality: 80 });
  }
  await image.toFile(dest);
  ok++;
  console.log(`OK ${job.dest}`);
}

console.log(`\nDone: ${ok} written, ${missing} missing.`);
