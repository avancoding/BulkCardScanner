// Synthetic catalog generation for performance testing
import { CardVariant } from '../domain/types';

const CARD_NAMES = [
  'Lightning Bolt', 'Black Lotus', 'Counterspell', 'Ancestral Recall', 'Sol Ring',
  'Mox Ruby', 'Mox Sapphire', 'Mox Pearl', 'Mox Emerald', 'Mox Jet',
  'Time Walk', 'Demonic Tutor', 'Dark Ritual', 'Giant Growth', 'Healing Salve',
  'Fireball', 'Disenchant', 'Terror', 'Shatter', 'Stone Rain',
  'Swords to Plowshares', 'Path to Exile', 'Brainstorm', 'Ponder', 'Preordain',
  'Birds of Paradise', 'Llanowar Elves', 'Elvish Mystic', 'Noble Hierarch', 'Deathrite Shaman'
];

const SET_CODES = [
  'LEA', 'LEB', 'UNL', 'REV', '4ED', '5ED', '6ED', '7ED', '8ED', '9ED',
  'ARN', 'ATQ', 'LEG', 'DRK', 'FEM', 'ICE', 'HML', 'ALL', 'MIR', 'VIS',
  'WTH', 'TMP', 'STH', 'EXO', 'USG', 'ULG', 'UDS', 'MMQ', 'NEM', 'PCY'
];

const RARITIES = [
  'Common', 'Uncommon', 'Rare', 'Rare Holo', 'Reverse', 'Promo'
];

const FINISHES = [
  'Nonfoil', 'Foil', 'Reverse', 'Holo'
];

// Rarity distribution weights (Common more frequent, Rare less frequent)
const RARITY_WEIGHTS = {
  'Common': 50,
  'Uncommon': 30,
  'Rare': 15,
  'Rare Holo': 3,
  'Reverse': 1,
  'Promo': 1
};

/**
 * Weighted random selection based on rarity distribution
 */
function selectWeightedRarity(): string {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      return rarity;
    }
  }
  
  return 'Common'; // Fallback
}

/**
 * Generates a synthetic catalog with distributed rarities for performance testing
 */
export function generateSyntheticCatalog(n: number): CardVariant[] {
  const catalog: CardVariant[] = [];
  const usedKeys = new Set<string>();
  
  for (let i = 0; i < n; i++) {
    let attempts = 0;
    let variant: CardVariant;
    let key: string;
    
    // Generate unique variants (avoid duplicates)
    do {
      const name = CARD_NAMES[Math.floor(Math.random() * CARD_NAMES.length)];
      const setCode = SET_CODES[Math.floor(Math.random() * SET_CODES.length)];
      const cardNumber = (Math.floor(Math.random() * 999) + 1).toString().padStart(3, '0');
      const rarity = selectWeightedRarity();
      const finish = FINISHES[Math.floor(Math.random() * FINISHES.length)];
      
      variant = {
        name,
        setCode,
        cardNumber,
        rarity,
        finish,
        promoId: rarity === 'Promo' ? `P${Math.floor(Math.random() * 999) + 1}` : undefined
      };
      
      // Create key for uniqueness check
      key = `${setCode}|${cardNumber}|${rarity}|${finish}|${name}`;
      attempts++;
      
      // Prevent infinite loop in case we run out of unique combinations
      if (attempts > 100) {
        // Add timestamp to ensure uniqueness
        variant.cardNumber = `${variant.cardNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        key = `${variant.setCode}|${variant.cardNumber}|${variant.rarity}|${variant.finish}|${variant.name}`;
        break;
      }
    } while (usedKeys.has(key));
    
    usedKeys.add(key);
    catalog.push(variant);
  }
  
  return catalog;
}