/**
 * The three sources this project curates itself, plus a brand id for anything
 * imported from the lut-studio library -- one per vendor, so they stay
 * distinguishable in the filter.
 */
export type CuratedSource = 'lumix' | 'cinecolor' | 'nic';
export type LutSource = CuratedSource | (string & {});

/** What the sample still is a picture of, read off the still by scripts/tag-scenes.mjs. */
export type Scene = 'portrait' | 'people' | 'landscape' | 'urban' | 'interior' | 'other';

export type PhotoStyle =
  | 'VLOG'
  | 'STD'
  | 'NAT'
  | 'VIVD'
  | 'PORT'
  | 'LAND'
  | 'FLAT'
  | 'CNEV2'
  | 'CNED2'
  | '709L'
  | 'LCLASN'
  | 'LMONOD'
  | 'LEICAMONO'
  | 'REC709'
  | (string & {});

export interface Creator {
  code: string;
  name: string;
  /** Public path of the avatar, or null when the source publishes none. */
  icon: string | null;
  /** Wide brand mark, for the places that have room for one. */
  wordmark?: string;
  source: LutSource;
  lutCount: number;
  downloads: number;
}

/** How a CineColor entry's before/after stills were arrived at. */
export interface Reconstruction {
  /** The "after" is the shop's own still rather than one we rendered. */
  afterIsOriginal: boolean;
  /** This LUT collapses colours, so the frame came from another pack. */
  borrowedFrame: boolean;
  /** Mean 8-bit error of re-applying the LUT to the recovered frame. */
  roundTripError: number | null;
  /** How far apart the preimages were; high means the LUT is not invertible. */
  ambiguity: number | null;
  beforeSpace: 'REC709';
  recoveredFrom: string | null;
}

export interface Lut {
  code: string;
  source: LutSource;
  /** Display name for an imported brand; the curated three are labelled in code. */
  sourceName?: string;
  /** The library recorded no input profile, so Rec.709 is an inference. */
  inputProfileInferred?: boolean;
  inputProfileRaw?: string | null;
  license?: string | null;
  /** Descriptive tags the source recorded, verbatim. */
  tags?: string[];
  /** Other files the source published for this look, beside the canonical one. */
  deliverables?: { kind: string; label: string; inputProfile: string | null; gridSize: number | null; path: string }[];
  /** A V-Log conversion the source published, relative to its own root. */
  vlogDeliverable?: string | null;
  title: string;
  overview: string;
  /** Null for sources that publish no download counts. */
  downloads: number | null;
  /** Signal the LUT expects as input. */
  photoStyle: PhotoStyle;
  /**
   * Whether that came from the file's own `#LUMIXPHOTOSTYLE` comment. False
   * means this project inferred it and writes it into the served copy; absent
   * means the question never arose for that source.
   */
  photoStyleFromFile?: boolean;
  /** What the source itself claims to want in, in its own words. */
  inputProfileClaim?: string | null;
  usage: 'photo' | 'video';
  scene: Scene;
  /**
   * What the look's own still is a picture of, where it publishes one. Not the
   * same question as `scene`, which describes the picture the card shows: an
   * untrusted own still is classified here but the card shows a shared frame.
   */
  ownScene?: Scene;
  /** Fraction of the still the largest detected face fills; 0 when there is none. */
  sceneFaceArea?: number;
  /** Grid the gallery ships and serves; always 33, what LUMIX Lab imports. */
  gridSize: number;
  /** Grid of the vendor's own file, when it differed. */
  sourceGridSize: number;
  /** Present when the vendor file had to be resampled onto the shipped grid. */
  resample?: { from: number; to: number; meanError: number; maxError: number };
  /**
   * Present when the table holds values the 8-bit strip texture cannot: the
   * browser clamps them, and so does every still rendered here, so the preview
   * is not what a float pipeline would give.
   */
  clamp?: { nodes: number; fraction: number; min: number; max: number } | null;
  /** Bodies whose Photo Style list lacks this LUT's base; null when all have it. */
  unsupportedOn?: string[] | null;
  /**
   * How close this table is to the vendor's own transform. Fujifilm publishes
   * LUTs for ten of its twenty Film Simulation modes, so the rest have to be
   * built -- and a page that presented a reconstruction as the real thing would
   * be lying about the one fact that matters most.
   */
  tier?: 'official' | 'derived' | 'interpreted' | 'technical';
  tierLabel?: string;
  /** One line on where a non-official table actually came from. */
  basis?: string;
  /** Channel-mixer weights, for the derived monochrome modes. */
  mixer?: number[] | null;
  /** CineColor groups its LUTs into packs; LUMIX entries stand alone. */
  pack: string | null;
  packTitle?: string;
  productUrl: string | null;
  creator: Pick<Creator, 'code' | 'name' | 'icon' | 'wordmark'>;
  thumb: { after: string | null; before: string | null };
  reconstruction?: Reconstruction;
  /** Path of the source .cube, or null if it is not on disk. */
  cube: string | null;
  /** Folder under sources/ the path is relative to, when the source name is ambiguous. */
  cubeRoot?: string | null;
}

export interface Catalog {
  generatedAt: string;
  luts: Lut[];
  creators: Creator[];
}
