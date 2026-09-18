import raw from "../data/catalog.json";
import type { Catalog, Lut } from "../types";
import { displayTitle } from "./title";
export const catalog = raw as unknown as Catalog;
catalog.luts = catalog.luts.map((lut) => ({
  ...lut,
  title: displayTitle(lut.title),
}));
let uploads: Lut[] = [];
export function setUploadedCatalog(luts: Lut[]) {
  uploads = luts;
}
export function findLut(code: string) {
  return (
    uploads.find((lut) => lut.code === code) ??
    catalog.luts.find((lut) => lut.code === code)
  );
}
