// Mock catalog data source
import { CardIdentity } from '../domain/types';

export function getMockRawCatalog(): CardIdentity[] {
  return [
    {
      name: 'Lightning Bolt',
      setCode: 'LEA',
      cardNumber: '161',
      rarity: 'Common',
      finish: 'Nonfoil'
    },
    {
      name: 'Lightning Bolt',
      setCode: 'LEA',
      cardNumber: '161',
      rarity: 'Common',
      finish: 'Foil'
    },
    {
      name: 'Black Lotus',
      setCode: 'LEA',
      cardNumber: '232',
      rarity: 'Rare',
      finish: 'Nonfoil'
    },
    {
      name: 'Counterspell',
      setCode: 'LEA',
      cardNumber: '55',
      rarity: 'Common',
      finish: 'Nonfoil'
    },
    {
      name: 'Ancestral Recall',
      setCode: 'LEA',
      cardNumber: '48',
      rarity: 'Rare',
      finish: 'Nonfoil'
    },
    {
      name: 'Sol Ring',
      setCode: 'C21',
      cardNumber: '263',
      rarity: 'Uncommon',
      finish: 'Nonfoil'
    },
    {
      name: 'Sol Ring',
      setCode: 'C21',
      cardNumber: '263',
      rarity: 'Uncommon',
      finish: 'Reverse'
    },
    {
      name: 'Mox Ruby',
      setCode: 'LEA',
      cardNumber: '265',
      rarity: 'Rare',
      finish: 'Nonfoil',
      promoId: 'P001'
    }
  ];
}