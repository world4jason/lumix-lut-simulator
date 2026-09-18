/**
 * The name a look is shown under.
 *
 * Vendors put the camera profile into the name -- "Arrakis-VLog", "kodak portra
 * 400 + vlog", "Green Teal V-Log L". On a card that reads as part of the look,
 * and beside the Input badge, which already says V-Log, it is said twice. Only
 * a trailing profile is dropped: in "V Log to Rec709 no.12" the words describe
 * what the table does, and they stay. G'MIC's ++ / + / - / -- strength marks
 * stay too, because they are what tells four variants of one film apart.
 *
 * Display only. Codes, files, and the catalogue keep the vendor's name.
 */
const TRAILING_LOG = /(?:\s+|[_-])v[\s_-]?log(?:[\s_-]?l)?\s*$/i;

export function displayTitle(title: string): string {
  const cleaned = title.replace(TRAILING_LOG, '').trim();
  return cleaned || title;
}
