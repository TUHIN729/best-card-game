// Emberfall engine: the pure rules of the duel. No DOM here — render.js draws
// whatever this module reports, so the same engine drives play and screenshots.
import { SUITS, buildDeck } from './cards.js';

export const START_LIFE = 20;
export const START_EMBER = 5;
export const MAX_EMBER = 10;
export const EMBER_PER_ROUND = 2;
export const HAND_SIZE = 5;

// Deterministic random source so a seed replays the same duel.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newGame(seed) {
  const random = mulberry32(seed);
  const deck = buildDeck(random);
  const state = {
    seed,
    phase: 'title', // title | playing | won | lost
    round: 1,
    random,
    deck,
    discard: [],
    player: freshDuelist('player', deck),
    rival: freshDuelist('rival', deck),
    selected: null, // index into the player's hand, or null
    lastPlayed: { player: null, rival: null },
    lastResult: null,
    roundsPlayed: 0,
    damageDealt: 0,
    damageTaken: 0,
    log: 'The winds gather. Choose your first spirit.',
  };
  return state;
}

function freshDuelist(side, deck) {
  const hand = [];
  for (let i = 0; i < HAND_SIZE; i += 1) hand.push(deck.pop());
  return {
    side,
    life: START_LIFE,
    ember: START_EMBER,
    hand,
    lastSuit: null,
    surges: 0,
  };
}

export function affordableCards(state) {
  return state.player.hand
    .map((card, i) => ({ card, i }))
    .filter(({ card }) => card.cost <= state.player.ember);
}

export function canAffordAny(state) {
  return state.player.hand.some((card) => card.cost <= state.player.ember);
}

// Draw a duelist back up to a full hand, reshuffling the discard when the deck runs dry.
export function drawUp(duelist, state) {
  while (duelist.hand.length < HAND_SIZE) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) return;
      state.deck = state.discard;
      state.discard = [];
      for (let i = state.deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(state.random() * (i + 1));
        [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
      }
    }
    duelist.hand.push(state.deck.pop());
  }
}

function suitBonus(attackerSuit, defenderSuit) {
  return SUITS[attackerSuit].beats === defenderSuit ? 2 : 0;
}

function effectivePower(card, duelist, rivalCard, prevSuit) {
  let power = card.power;
  let notes = [];
  const advantage = suitBonus(card.suit, rivalCard.suit);
  if (advantage > 0) {
    power += advantage;
    notes.push(`${SUITS[card.suit].name} beats ${SUITS[rivalCard.suit].name} (+${advantage})`);
  }
  if (prevSuit === card.suit) {
    power += 2;
    notes.push('Surge! Same suit twice in a row (+2)');
    duelist.surges += 1;
  }
  return { power, notes };
}

function applyAbility(winner, card, state) {
  const notes = [];
  if (card.ability === 'heal 2') {
    winner.life = Math.min(START_LIFE, winner.life + 2);
    notes.push(`${card.name} heals its duelist for 2`);
  }
  if (card.ability === 'draw') {
    drawUp(winner, state);
    if (state.deck.length > 0 || state.discard.length > 0) {
      const extra = state.deck.pop() ?? null;
      if (extra) winner.hand.push(extra);
    }
    notes.push(`${card.name} draws an extra spirit`);
  }
  return notes;
}

// Play one round: both sides commit a card, powers are compared, damage lands.
export function playRound(state, playerIndex, rivalIndex) {
  const playerCard = state.player.hand[playerIndex];
  const rivalCard = state.rival.hand[rivalIndex];
  if (!playerCard || !rivalCard) return null;
  if (playerCard.cost > state.player.ember || rivalCard.cost > state.rival.ember) return null;

  state.player.ember -= playerCard.cost;
  state.rival.ember -= rivalCard.cost;
  state.player.hand.splice(playerIndex, 1);
  state.rival.hand.splice(rivalIndex, 1);
  state.discard.push(playerCard, rivalCard);
  const prevPlayerSuit = state.player.lastSuit;
  const prevRivalSuit = state.rival.lastSuit;
  state.player.lastSuit = playerCard.suit;
  state.rival.lastSuit = rivalCard.suit;
  state.lastPlayed = { player: playerCard, rival: rivalCard };
  state.selected = null;

  const you = effectivePower(playerCard, state.player, rivalCard, prevPlayerSuit);
  const foe = effectivePower(rivalCard, state.rival, playerCard, prevRivalSuit);
  const notes = [...you.notes, ...foe.notes];
  let outcome;
  let damage = 0;

  if (you.power > foe.power) {
    damage = you.power - foe.power + (playerCard.ability === 'pierce' ? 2 : 0);
    state.rival.life -= damage;
    state.damageDealt += damage;
    if (playerCard.ability === 'pierce') notes.push(`${playerCard.name} pierces for +2 damage`);
    notes.push(...applyAbility(state.player, playerCard, state));
    outcome = 'win';
    state.log = `${playerCard.name} (${you.power}) overpowers ${rivalCard.name} (${foe.power}) — Zephyr takes ${damage} damage.`;
  } else if (foe.power > you.power) {
    damage = foe.power - you.power + (rivalCard.ability === 'pierce' ? 2 : 0);
    state.player.life -= damage;
    state.damageTaken += damage;
    if (rivalCard.ability === 'pierce') notes.push(`${rivalCard.name} pierces for +2 damage`);
    notes.push(...applyAbility(state.rival, rivalCard, state));
    outcome = 'lose';
    state.log = `${rivalCard.name} (${foe.power}) overpowers ${playerCard.name} (${you.power}) — you take ${damage} damage.`;
  } else {
    outcome = 'tie';
    state.log = `${playerCard.name} and ${rivalCard.name} clash evenly at ${you.power} — no damage, both draw.`;
    drawUp(state.player, state);
    drawUp(state.rival, state);
  }

  state.lastResult = { outcome, damage, youPower: you.power, foePower: foe.power, notes };
  state.roundsPlayed += 1;

  if (state.rival.life <= 0 && state.player.life <= 0) {
    state.phase = state.damageDealt >= state.damageTaken ? 'won' : 'lost';
  } else if (state.rival.life <= 0) {
    state.phase = 'won';
  } else if (state.player.life <= 0) {
    state.phase = 'lost';
  }

  if (state.phase === 'playing') {
    state.round += 1;
    state.player.ember = Math.min(MAX_EMBER, state.player.ember + EMBER_PER_ROUND);
    state.rival.ember = Math.min(MAX_EMBER, state.rival.ember + EMBER_PER_ROUND);
    drawUp(state.player, state);
    drawUp(state.rival, state);
  }
  return state.lastResult;
}

// Meditate: skip the round, gain 3 ember and heal 1.
export function meditate(state) {
  state.player.ember = Math.min(MAX_EMBER, state.player.ember + 3);
  state.player.life = Math.min(START_LIFE, state.player.life + 1);
  state.rival.ember = Math.min(MAX_EMBER, state.rival.ember + EMBER_PER_ROUND);
  state.round += 1;
  state.roundsPlayed += 1;
  state.lastPlayed = { player: null, rival: null };
  state.lastResult = { outcome: 'meditate', damage: 0, youPower: 0, foePower: 0, notes: [] };
  state.log = 'You close your eyes and breathe in the wind — +3 ember, +1 life.';
  drawUp(state.player, state);
  drawUp(state.rival, state);
  return state.lastResult;
}

export function startDuel(state) {
  state.phase = 'playing';
  state.log = 'The duel begins. Choose a spirit and press Reveal.';
}
