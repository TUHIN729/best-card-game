// Zephyr, the Gale Warden — the rival duelist. His choices are readable and
// counterable: he answers your last suit, spends big when he is behind, and
// hoards his heavy spirits while he is ahead.
import { SUITS } from './cards.js';

// Pick an index into the rival's hand. Returns -1 when no card is affordable.
export function chooseRivalCard(state) {
  const hand = state.rival.hand;
  const affordable = hand
    .map((card, i) => ({ card, i }))
    .filter(({ card }) => card.cost <= state.rival.ember);
  if (affordable.length === 0) return -1;

  const yourLastSuit = state.player.lastSuit;
  const behind = state.rival.life < state.player.life;
  const ahead = state.rival.life > state.player.life;
  const random = state.random;

  // 1) Answer the suit you just played: a card whose suit beats it.
  if (yourLastSuit) {
    const answers = affordable.filter(({ card }) => SUITS[card.suit].beats === yourLastSuit);
    if (answers.length > 0 && random() < 0.75) {
      answers.sort((a, b) => a.card.cost - b.card.cost);
      return answers[0].i;
    }
  }

  // 2) Behind on life: swing with the hardest affordable spirit.
  if (behind) {
    const sorted = [...affordable].sort((a, b) => b.card.power - a.card.power);
    return sorted[0].i;
  }

  // 3) Ahead on life: hoard the heavy spirits, play the cheapest hand.
  if (ahead) {
    const cheap = affordable.filter(({ card }) => card.cost <= 2);
    if (cheap.length > 0) {
      cheap.sort((a, b) => a.card.power - b.card.power);
      return cheap[0].i;
    }
  }

  // 4) Otherwise: a mid-weight spirit, with a little whimsy.
  const mid = affordable.filter(({ card }) => card.cost >= 2 && card.cost <= 3);
  const pool = mid.length > 0 ? mid : affordable;
  return pool[Math.floor(random() * pool.length)].i;
}

// The rival meditates (gains ember, skips the round) when he cannot afford a card.
export function rivalMeditate(state) {
  state.rival.ember = Math.min(10, state.rival.ember + 3);
  state.rival.life = Math.min(20, state.rival.life + 1);
  state.log = 'Zephyr closes his eyes and breathes in the wind — +3 ember, +1 life.';
}
