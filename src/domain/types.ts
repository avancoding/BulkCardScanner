// Domain type definitions
export interface CardIdentity {
  name: string;
  setCode: string;
  cardNumber: string;
  rarity: string;
  finish: string;
  promoId?: string | null;
}

export interface CardVariant extends CardIdentity {
  // No additional properties yet
}

export interface CardSnapshotRecord extends CardIdentity {
  price: number | null;
  firstSeen?: string;
  tcgplayerUrl: string;
}

export interface ComparisonRow {
  key: string;
  name: string;
  setCode: string;
  cardNumber: string;
  rarity: string;
  finish: string;
  baselinePrice: number;
  currentPrice: number;
  percentGain: number;
  isCrosser?: boolean;
}

/**
 * Builds a stable, normalized key for a card identity
 * Format: <setCode>|<cardNumber>|<rarity>|<finish>|<name>
 * All fields are trimmed, whitespace collapsed, and lowercased
 */
export function buildCardKey(identity: CardIdentity): string {
  const normalize = (str: string): string => {
    return str.trim().replace(/\s+/g, ' ').toLowerCase();
  };

  return [
    normalize(identity.setCode),
    normalize(identity.cardNumber),
    normalize(identity.rarity),
    normalize(identity.finish),
    normalize(identity.name)
  ].join('|');
}