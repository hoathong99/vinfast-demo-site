import { productRepository } from "./repositories/products";
import type { Product, ProductCategory, ProductColor, ProductType } from "./repositories/types";

export type Vehicle = Product;
export type VehicleType = ProductType;
export type VehicleCategory = ProductCategory;
export type VehicleColor = ProductColor;

/**
 * Backwards-compatible vehicle facade. It reads through the product
 * repository, so switching to a DB only changes the adapter.
 */
export const vehicles: Product[] = productRepository.list();

export const cars = productRepository.listByType("car");
export const motorbikes = productRepository.listByType("motorbike");

export function getVehicle(slug: string) {
  return productRepository.getById(slug);
}

export function getVehiclesByType(type: VehicleType) {
  return productRepository.listByType(type);
}
