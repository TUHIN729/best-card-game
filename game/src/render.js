// Emberfall renderer: turns engine state into the table the player sees.
// Every card is a DOM element, so values and suits stay legible at any size.
import { SUITS, abilityText } from './cards.js';

const $ = (id) => document.getElementById(id);

export function cardElement(card, opts = {}) {
  const el = document.createElement('div');
  el.className = `card suit-${card.suit}${opts.selected ? ' selected' : ''}${opts.played ? ' played' : ''}${opts.unaffordable ? ' unaffordable' : ''}`;
  el.dataset.cardId = card.id;
  el.innerHTML = `
    <div class="card-back">~</div>
    <div class="card-face">
      <div class="card-top">
        <div class="cost" title="Ember cost">${card.cost}</div>
        <div class="suit-mark">${SUITS[card.suit].mark}</div>
      </div>
      <div class="card-name">${card.name}</div>
      <div class="card-art">${card.art}</div>
      <div class="ability">${abilityText(card.ability)}</div>
      <div class="card-bottom">
        <div class="power"><small>POWER</small>${card.power}</div>
        <div class="suit-name">${SUITS[card.suit].name}</div>
      </div>
    </div>`;
  return el;
}

export function cardBackElement() {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = '<div class="card-back" style="display:flex">~</div>';
  return el;
}

export function render(state, ui) {
  $('round-label').textContent = `Round ${state.round}`;
  $('player-life-num').textContent = Math.max(0, state.player.life);
  $('player-life-fill').style.width = `${Math.max(0, state.player.life) / 20 * 100}%`;
  $('player-ember-num').textContent = state.player.ember;
  $('player-ember-fill').style.width = `${state.player.ember / 10 * 100}%`;
  $('rival-life-num').textContent = Math.max(0, state.rival.life);
  $('rival-life-fill').style.width = `${Math.max(0, state.rival.life) / 20 * 100}%`;
  $('rival-ember-num').textContent = state.rival.ember;
  $('rival-ember-fill').style.width = `${state.rival.ember / 10 * 100}%`;

  // Opponent hand: face-down backs, one per card.
  const rivalHand = $('rival-hand');
  rivalHand.replaceChildren();
  state.rival.hand.forEach(() => rivalHand.appendChild(cardBackElement()));

  // Player hand: face-up, clickable while the duel runs.
  const playerHand = $('player-hand');
  playerHand.replaceChildren();
  state.player.hand.forEach((card, i) => {
    const el = cardElement(card, {
      selected: state.selected === i,
      unaffordable: card.cost > state.player.ember,
    });
    el.title = `${card.name} — ${SUITS[card.suit].name}, cost ${card.cost}, power ${card.power}${card.ability ? `, ${abilityText(card.ability)}` : ''} (key ${i + 1})`;
    if (state.phase === 'playing') {
      el.addEventListener('click', () => ui.onPick(i));
    }
    playerHand.appendChild(el);
  });

  // Arena: the two spirits just revealed, or empty slots.
  const playerSlot = $('player-played');
  const rivalSlot = $('rival-played');
  playerSlot.replaceChildren();
  rivalSlot.replaceChildren();
  if (state.lastPlayed.player) {
    playerSlot.appendChild(cardElement(state.lastPlayed.player, { played: true }));
  } else {
    playerSlot.textContent = '—';
  }
  if (state.lastPlayed.rival) {
    rivalSlot.appendChild(cardElement(state.lastPlayed.rival, { played: true }));
  } else {
    rivalSlot.textContent = '—';
  }

  // Banner: the round's result, coloured by who won it.
  const banner = $('banner');
  banner.textContent = state.log;
  banner.className = '';
  if (state.lastResult) {
    if (state.lastResult.outcome === 'win') banner.classList.add('good');
    if (state.lastResult.outcome === 'lose') banner.classList.add('bad');
  }
  const notes = state.lastResult?.notes ?? [];
  $('log-line').textContent = notes.length > 0
    ? notes.join(' · ')
    : 'Flame beats Gale · Gale beats Tide · Tide beats Flame. Same suit twice in a row: Surge +2.';
  $('status').textContent = state.log;

  // Controls.
  const playing = state.phase === 'playing';
  $('reveal-btn').disabled = !playing || state.selected === null
    || state.player.hand[state.selected]?.cost > state.player.ember;
  $('reveal-btn').classList.toggle('selected-glow', playing && state.selected !== null);
  $('meditate-btn').disabled = !playing;
  $('sound-btn').textContent = ui.muted ? 'Sound: off' : 'Sound: on';
}

export function showOverlay(kind, state) {
  const overlay = $('overlay');
  const title = $('overlay-title');
  const kicker = $('overlay-kicker');
  const text = $('overlay-text');
  const stats = $('overlay-stats');
  const btn = $('overlay-btn');
  const foot = $('overlay-foot');
  overlay.classList.remove('hidden');

  if (kind === 'title') {
    kicker.textContent = 'A duel of flame, tide & gale';
    title.textContent = 'EMBERFALL';
    text.innerHTML = 'You and <b>Zephyr, the Gale Warden</b>, each hold <b>20 life</b> and a hand of five spirit cards. '
      + 'Every round you both reveal one spirit: the stronger power wins the round and deals the difference as damage. '
      + '<b>Flame beats Gale, Gale beats Tide, Tide beats Flame</b> (+2 power). Play the same suit twice in a row for a <b>Surge +2</b>. '
      + 'Cards cost ember — spend it well, meditate when you must, and bring Zephyr to zero.';
    stats.innerHTML = '24 original spirits &middot; 3 suits &middot; 1 warden to defeat<br>Click a card or press 1&ndash;5, then Reveal (Enter).';
    btn.textContent = 'Begin the duel';
    foot.textContent = 'An original card game — no network, no account, just the table.';
  } else if (kind === 'won') {
    kicker.textContent = 'The winds bow to you';
    title.textContent = 'VICTORY';
    text.innerHTML = 'Zephyr lowers his hand. The last ember fades, the gale stills, and the table is yours.';
    stats.innerHTML = `Rounds played: <b>${state.roundsPlayed}</b> &middot; Damage dealt: <b>${state.damageDealt}</b> &middot; Damage taken: <b>${state.damageTaken}</b> &middot; Surges: <b>${state.player.surges}</b>`;
    btn.textContent = 'Duel again';
    foot.textContent = 'Press R or click Duel again for a fresh shuffle.';
  } else if (kind === 'lost') {
    kicker.textContent = 'The gale claims the table';
    title.textContent = 'DEFEAT';
    text.innerHTML = 'Zephyr gathers the wind into one last gust and your embers scatter. The warden keeps his table — for now.';
    stats.innerHTML = `Rounds played: <b>${state.roundsPlayed}</b> &middot; Damage dealt: <b>${state.damageDealt}</b> &middot; Damage taken: <b>${state.damageTaken}</b> &middot; Surges: <b>${state.player.surges}</b>`;
    btn.textContent = 'Demand a rematch';
    foot.textContent = 'Press R or click Demand a rematch for a fresh shuffle.';
  }
}

export function hideOverlay() {
  $('overlay').classList.add('hidden');
}
