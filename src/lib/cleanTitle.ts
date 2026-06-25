/**
 * Cleans raw track titles from common file-naming artifacts:
 * - Strips trailing YouTube IDs and noise tags: [VnSWx5 3W7M], [HD], (HQ), (Official Video)
 * - Strips leading track number prefixes: "01.", "1 -", "[03] -", "(2)"
 * - Converts fully-UPPERCASE titles to Title Case
 * - Leaves mixed-case titles untouched
 */
export function cleanTitle(raw: string): string {
  let title = raw.trim();
  if (!title) return raw;

  // Strip trailing noise: YouTube IDs, quality tags, descriptor tags
  // Matches: [VnSWx5 3W7M], [HD], (HQ), (Official Video), (Official Audio), (Lyric Video), etc.
  title = title
    .replace(/\s*[\[(][A-Za-z0-9_\-\s]{2,20}[\])]\s*$/g, "")
    .trim();

  // Strip leading bracket number: [01], (01), [01] -, (01) -
  title = title.replace(/^[\[(]\d{1,3}[)\]][\s\-–_.]*/, "").trim();

  // Strip leading number + explicit separator: 01. or 01- or 01 -
  title = title.replace(/^\d{1,3}\s*[-–.]\s*(?=\D)/, "").trim();

  // Strip zero-padded track numbers followed by a space: "01 Title", "09 Title"
  // Zero-padded = almost universally a track number, never a real word
  title = title.replace(/^0\d\s+/, "").trim();

  // Strip small track numbers (1-30) followed by a space + uppercase letter or common word
  // e.g. "1 Kasih" but NOT "50 Ways" or "3 Little Birds" (kept as-is since ambiguous)
  title = title.replace(/^([1-9]|[12]\d|30)\s+(?=[A-ZÀ-ɏ])/, "").trim();

  if (!title) return raw.trim();

  // Title Case only when every letter is uppercase (e.g. "NEW TOOTH" → "New Tooth")
  const letters = title.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 1 && letters === letters.toUpperCase()) {
    title = title
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return title;
}
