import rawVehicles from "./vehicles.json";

export type VehicleType = "car" | "motorbike";
export type VehicleCategory = "mini-suv" | "suv" | "pho-thong" | "the-thao";

export type VehicleColor = {
  name: string;
  hex: string;
  image: string;
};

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
  colors: VehicleColor[];
  offers: { title: string; description: string; validUntil: string }[];
  description: string;
  highlights: { title: string; text: string }[];
};

export const vehicles = rawVehicles as Vehicle[];

export const cars = vehicles.filter((v) => v.type === "car").sort((a, b) => a.order - b.order);
export const motorbikes = vehicles.filter((v) => v.type === "motorbike").sort((a, b) => a.order - b.order);

export function getVehicle(slug: string) {
  return vehicles.find((v) => v.slug === slug);
}

export function getVehiclesByType(type: VehicleType) {
  return type === "car" ? cars : motorbikes;
}
