const labels: Record<string, string> = {
  VLOG: "V-Log",
  REC709: "Rec.709",
  STD: "Standard",
  NAT: "Natural",
  VIVD: "Vivid",
  PORT: "Portrait",
  LAND: "Landscape",
  FLAT: "Flat",
  CNED2: "Cinelike D2",
  CNEV2: "Cinelike V2",
  "709L": "Like709",
  MONO: "Monochrome",
  LMONO: "L.Monochrome",
  LMONOS: "L.Monochrome S",
  LMONOD: "L.Monochrome D",
  LEICAMONO: "LEICA Monochrome",
  LCLASN: "L.ClassicNeo",
};
export const photoStyleLabel = (style: string) => labels[style] ?? style;
export const signalStyles = new Set(["709L", "CNED2", "CNEV2", "FLAT"]);
export const beforeFrameFor = (style: string, id: string) =>
  `sample/_before/${id}-neutral${signalStyles.has(style) ? "-" + style.toLowerCase() : ""}.webp`;
