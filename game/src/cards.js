// Emberfall deck: 24 original spirit cards in three suits.
// The cycle: Flame beats Gale, Gale beats Tide, Tide beats Flame.
// A card that beats the rival's suit gains +2 power on the reveal.
// Abilities: "heal 2" restores 2 life to its owner when its round is won,
// "draw" draws an extra card when its round is won, "pierce" adds +2 damage.
export const SUITS = {
  flame: { name: 'Flame', mark: '\u{1F525}', beats: 'gale', color: '#e4572e' },
  tide: { name: 'Tide', mark: '\u{1F30A}', beats: 'flame', color: '#2e86de' },
  gale: { name: 'Gale', mark: '\u{1F32A}', beats: 'tide', color: '#2fa866' },
};

export const CARDS = [
  // Flame — 8 cards
  { id: 'cinder-fox', name: 'Cinder Fox', suit: 'flame', cost: 1, power: 3, art: '\u{1F98A}', ability: '' },
  { id: 'spark-wisp', name: 'Spark Wisp', suit: 'flame', cost: 1, power: 2, art: '\u2728', ability: 'draw' },
  { id: 'ember-imp', name: 'Ember Imp', suit: 'flame', cost: 1, power: 4, art: '\u{1F47A}', ability: '' },
  { id: 'ash-phoenix', name: 'Ash Phoenix', suit: 'flame', cost: 2, power: 5, art: '\u{1F426}', ability: 'heal 2' },
  { id: 'wildfire-sprite', name: 'Wildfire Sprite', suit: 'flame', cost: 2, power: 6, art: '\u{1F9DA}', ability: '' },
  { id: 'coal-serpent', name: 'Coal Serpent', suit: 'flame', cost: 3, power: 6, art: '\u{1F40D}', ability: '' },
  { id: 'forge-drake', name: 'Forge Drake', suit: 'flame', cost: 3, power: 7, art: '\u{1F409}', ability: '' },
  { id: 'magma-wyrm', name: 'Magma Wyrm', suit: 'flame', cost: 4, power: 9, art: '\u{1F32B}', ability: 'pierce' },
  // Tide — 8 cards
  { id: 'dew-nymph', name: 'Dew Nymph', suit: 'tide', cost: 1, power: 3, art: '\u{1F9DC}', ability: '' },
  { id: 'moon-jelly', name: 'Moon Jelly', suit: 'tide', cost: 1, power: 2, art: '\u{1FABC}', ability: 'draw' },
  { id: 'rain-heron', name: 'Rain Heron', suit: 'tide', cost: 2, power: 6, art: '\u{1F426}', ability: '' },
  { id: 'pearl-turtle', name: 'Pearl Turtle', suit: 'tide', cost: 2, power: 4, art: '\u{1F422}', ability: 'heal 2' },
  { id: 'coral-knight', name: 'Coral Knight', suit: 'tide', cost: 2, power: 5, art: '\u{1FAF8}', ability: '' },
  { id: 'frost-current', name: 'Frost Current', suit: 'tide', cost: 3, power: 6, art: '\u2744', ability: '' },
  { id: 'tide-serpent', name: 'Tide Serpent', suit: 'tide', cost: 3, power: 7, art: '\u{1F433}', ability: '' },
  { id: 'deep-leviathan', name: 'Deep Leviathan', suit: 'tide', cost: 4, power: 9, art: '\u{1F419}', ability: 'pierce' },
  // Gale — 8 cards
  { id: 'gale-hawk', name: 'Gale Hawk', suit: 'gale', cost: 1, power: 3, art: '\u{1F985}', ability: '' },
  { id: 'breeze-sprite', name: 'Breeze Sprite', suit: 'gale', cost: 1, power: 2, art: '\u{1F32C}', ability: 'draw' },
  { id: 'gale-runner', name: 'Gale Runner', suit: 'gale', cost: 1, power: 4, art: '\u{1F3C3}', ability: 'heal 2' },
  { id: 'sky-dancer', name: 'Sky Dancer', suit: 'gale', cost: 2, power: 6, art: '\u{1F483}', ability: '' },
  { id: 'storm-crow', name: 'Storm Crow', suit: 'gale', cost: 2, power: 5, art: '\u{1F40F}', ability: '' },
  { id: 'thunder-moth', name: 'Thunder Moth', suit: 'gale', cost: 3, power: 6, art: '\u{1F98B}', ability: '' },
  { id: 'cloud-shepherd', name: 'Cloud Shepherd', suit: 'gale', cost: 3, power: 7, art: '\u2601', ability: '' },
  { id: 'tempest-roc', name: 'Tempest Roc', suit: 'gale', cost: 4, power: 9, art: '\u26A1', ability: 'pierce' },
];

// A fresh shuffled deck (Fisher-Yates over a seeded random source).
export function buildDeck(random) {
  const deck = CARDS.map((c) => ({ ...c }));
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function abilityText(ability) {
  if (ability === 'heal 2') return 'Heal 2 on a won round';
  if (ability === 'draw') return 'Draw 1 on a won round';
  if (ability === 'pierce') return 'Pierce: +2 damage';
  return '';
}
