/**
 * Bulk ``MAIL_*``-style env key insertion for dotenv completion.
 */
export interface EnvBulkOffer {
  /** Lookup string used for prefix matching (e.g. ``MAIL_``). */
  lookupString: string;
  presentableText: string;
  keys: string[];
}

export const EnvBulkInsert = {
  /**
   * Keys that start with [prefix] (case-insensitive). Empty prefix → no bulk offer.
   */
  matchingKeys(allKeys: Iterable<string>, prefix: string): string[] {
    const p = prefix.trim();
    if (p.length === 0) return [];
    const lower = p.toLowerCase();
    const matches = [...allKeys].filter((k) => k.toLowerCase().startsWith(lower));
    return [...new Set(matches)].sort();
  },

  /**
   * When 2+ keys share [prefix], offer a bulk insert. Uses an uppercase stem
   * for the label (``MAIL`` → ``Insert all MAIL_*``).
   */
  offer(allKeys: Iterable<string>, prefix: string): EnvBulkOffer | null {
    const matches = EnvBulkInsert.matchingKeys(allKeys, prefix);
    if (matches.length <= 1) return null;
    const stem = prefix.trim().replace(/_+$/, "").toUpperCase();
    if (stem.length === 0) return null;
    const lookup = prefix.endsWith("_") ? prefix : `${prefix}_`;
    return {
      lookupString: lookup,
      presentableText: `Insert all ${stem}_* (${matches.length} keys)`,
      keys: matches,
    };
  },

  /** Dotenv body: one ``KEY=`` per line (values left blank for the author). */
  dotenvInsertion(keys: string[]): string {
    return keys.map((k) => `${k}=`).join("\n");
  },
};

export const AlmasixEnvBulkInsert = EnvBulkInsert;
