import { Atelie } from '../types';

/**
 * Robust helper to match a registered Ateliê by ID or Name.
 * Handles exact ID matches, exact/partial canonical name matches,
 * and strips HubSpot-generated slug prefixes like 'atelie-'.
 */
export function findMatchingAtelie(atelieIdOrName: string, atelies: Atelie[]): Atelie | undefined {
  if (!atelieIdOrName) return undefined;
  
  const trimmed = atelieIdOrName.trim();
  if (!trimmed) return undefined;

  // 1. Direct ID match
  const directMatch = atelies.find(a => a.id === trimmed);
  if (directMatch) return directMatch;
  
  // Try exact match after stripping any "atelie-" or "atelie" prefix from both IDs
  const stripPrefix = (idStr: string) => idStr.toLowerCase().replace(/^atelie-?/, '').trim();
  const strippedTrimmed = stripPrefix(trimmed);
  if (strippedTrimmed) {
    const strippedIdMatch = atelies.find(a => stripPrefix(a.id) === strippedTrimmed);
    if (strippedIdMatch) return strippedIdMatch;
  }

  // 2. Canonicalization helper for standardizing strings
  const canonical = (str: string) => {
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, "") // remove all non-alphanumeric chars
      .trim();
  };

  const targetCanonical = canonical(trimmed);
  if (!targetCanonical) return undefined;

  // Try exact canonical match on ID or name
  const exactMatch = atelies.find(a => canonical(a.id) === targetCanonical || canonical(a.name) === targetCanonical);
  if (exactMatch) return exactMatch;
  
  // Try partial match: e.g. "atelie02" matches "atelie02terreo" or vice versa
  const partialMatch = atelies.find(a => {
    const nameCanonical = canonical(a.name);
    return nameCanonical.includes(targetCanonical) || targetCanonical.includes(nameCanonical);
  });
  if (partialMatch) return partialMatch;

  // Handle "atelie-" prefix stripping for comparison (e.g., "atelie-atelie-02" -> "atelie-02" -> "atelie02")
  const cleanTarget = trimmed.replace(/^atelie-/, '').replace(/-/g, '');
  const cleanTargetCanonical = canonical(cleanTarget);
  if (cleanTargetCanonical) {
    const prefixMatch = atelies.find(a => {
      const nameCanonical = canonical(a.name);
      return nameCanonical.includes(cleanTargetCanonical) || cleanTargetCanonical.includes(nameCanonical);
    });
    if (prefixMatch) return prefixMatch;
  }

  return undefined;
}
