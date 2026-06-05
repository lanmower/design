// Session surfaces — a persistent conversation list (left-rail "Chats") and a
// live multi-session dashboard. Pure factories: props in, webjsx vnode out, all
// interaction via host callbacks. Styling lives in chat.css (.ds-session*,
// .ds-dash*) using kit tokens; no transport, no decorative glyphs.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Btn, Icon } from './shell.js';
const h = webjsx.createElement;

// ConversationList — the Claude-Desktop "Chats" column. Sessions grouped by a
// caller-supplied group label, each row showing title/project, relative time,
// agent badge, and a running/new-event indicator. Selecting a row switches the
// active conversation.
//
//   sessions : [{ sid, title, project, agent, time, running, unread, rail }]
//   selected : the active sid
//   groups   : OPTIONAL [{ label, sids:[...] }] to bucket rows; else one flat list
//   search   : { value, onInput, placeholder } inline filter (optional)
//   onSelect(session), onNew() : intents
//   emptyText, loading, error  : explicit states
export function ConversationList({ sessions = [], selected, groups, search,
                                   onSelect, onNew, newLabel = 'New chat',
                                   emptyText = 'No conversations yet', loading = false, error = null } = {}) {
  const rowFor = (s, i) => h('button', {
    // Stable key: prefer sid, else position - a missing/duplicate sid would make
    // key undefined and crash webjsx applyDiff ("reading 'key'" of undefined).
    key: 'cs-' + (s.sid != null ? s.sid : 'i' + i),
    type: 'button',
    class: 'ds-session-row' + (s.sid === selected ? ' active' : '') + (s.rail ? ' rail-' + s.rail : ''),
    'aria-current': s.sid === selected ? 'true' : null,
    onclick: () => onSelect && onSelect(s),
  },
    // Positional children must NOT mix keyed VElements with null/strings (webjsx
    // applyDiff crashes "reading 'key'"). Keep these unkeyed and filter nulls so
    // each h() call gets a clean, consistent child list.
    h('span', { class: 'ds-session-main' }, [
      h('span', { class: 'ds-session-title' }, s.title || s.project || s.sid || ''),
      (s.project || s.time) ? h('span', { class: 'ds-session-sub' },
        [s.project, s.time].filter(Boolean).join(' · ')) : null,
    ].filter(Boolean)),
    h('span', { class: 'ds-session-meta' }, [
      s.agent ? h('span', { class: 'ds-session-agent' }, s.agent) : null,
      s.running
        ? h('span', { class: 'status-dot-disc status-dot-live', 'aria-label': 'running', role: 'img' })
        : (s.unread ? h('span', { class: 'ds-session-unread', 'aria-label': 'new activity', role: 'img' }) : null),
    ].filter(Boolean)));

  // The body is ALWAYS a single keyed wrapper element of the same tag, so webjsx
  // diffs its children across state transitions (loading -> empty -> populated)
  // instead of swapping the container type - the swap is what triggered the
  // applyDiff "reading 'key'" crash on the first populated mount. Row children
  // are uniformly keyed; non-row states render a single unkeyed status line.
  let inner;
  if (loading) {
    inner = [h('div', { key: 'st', class: 'ds-session-state', role: 'status', 'aria-live': 'polite' }, 'Loading conversations…')];
  } else if (error) {
    inner = [h('div', { key: 'st', class: 'ds-session-state ds-session-state-error', role: 'status' }, String(error))];
  } else if (!sessions.length) {
    inner = [h('div', { key: 'st', class: 'ds-session-state', role: 'status' }, emptyText)];
  } else if (groups && groups.length) {
    const bySid = new Map(sessions.map((s) => [s.sid, s]));
    inner = groups.map((g) => h('div', { key: 'g-' + g.label, class: 'ds-session-group', role: 'group', 'aria-label': g.label },
      h('div', { key: 'gl', class: 'ds-session-group-label' }, g.label),
      h('div', { key: 'gr', class: 'ds-session-group-rows', role: 'list' }, ...g.sids.map((sid) => bySid.get(sid)).filter(Boolean).map(rowFor))));
  } else {
    inner = sessions.map(rowFor);
  }
  const body = h('div', { key: 'body', class: 'ds-session-list', role: 'list' }, ...inner);

  return h('div', { class: 'ds-sessions' },
    h('div', { key: 'head', class: 'ds-session-head' },
      onNew ? h('button', { key: 'new', type: 'button', class: 'ds-session-new', onclick: onNew, 'aria-label': newLabel },
        Icon('pencil'), h('span', { key: 'l' }, newLabel)) : null,
      search ? h('input', {
        key: 'search', type: 'search', class: 'ds-session-search',
        value: search.value || '', placeholder: search.placeholder || 'Search conversations',
        'aria-label': search.placeholder || 'Search conversations',
        oninput: (e) => search.onInput && search.onInput(e.target.value),
      }) : null),
    body);
}

// SessionCard — one running session in the live dashboard. Status dot, agent /
// model / cwd, elapsed, live counter, last activity, and per-session controls
// that each act on this session's id independently.
//
//   session : { sid, agent, model, cwd, elapsed, counter, lastActivity, currentTool, status }
//   actions : { onStop, onOpen, onResume, onView } (any subset)
// `counter` carries the live activity tally (e.g. "12 ev · 3 tools"); `lastActivity`
// the relative time of the most-recent event ("4s ago"); `currentTool` the tool
// name a still-running turn is executing - together they distinguish a busy
// session from a stuck one (a frozen elapsed alone reads identically for both).
export function SessionCard({ session = {}, onStop, onOpen, onResume, onView } = {}) {
  const s = session;
  const statusTone = s.status === 'error' ? 'flame' : 'live';
  // The stat line composes elapsed + live counter; the activity line carries the
  // last-activity time and the current tool so a card shows MOTION, not just a
  // start offset. Both are middot-joined (kept product separator).
  const statBits = [s.elapsed != null ? s.elapsed : null, s.counter != null ? s.counter : null].filter((x) => x != null && x !== '');
  const activityBits = [
    s.currentTool ? 'running: ' + s.currentTool : null,
    s.lastActivity ? 'last ' + s.lastActivity : null,
  ].filter(Boolean);
  return h('div', { class: 'ds-dash-card' + (s.status === 'error' ? ' is-error' : ''), role: 'group', 'aria-label': 'session ' + (s.agent || s.sid) },
    h('div', { class: 'ds-dash-card-head' },
      h('span', { class: 'status-dot-disc ' + (statusTone === 'live' ? 'status-dot-live' : 'status-dot-error'), 'aria-hidden': 'true' }),
      // Status is words + the disc, never colour alone (WCAG 1.4.1): the disc is
      // aria-hidden, so the visible/AT status word carries the state.
      h('span', { class: 'ds-dash-status ' + (s.status === 'error' ? 'is-error' : 'is-running') }, s.status === 'error' ? 'error' : 'running'),
      h('span', { class: 'ds-dash-agent' }, s.agent || 'agent'),
      s.model ? h('span', { class: 'ds-dash-model' }, s.model) : null),
    h('div', { class: 'ds-dash-meta' },
      s.cwd ? h('span', { class: 'ds-dash-cwd', title: s.cwd }, s.cwd) : null,
      statBits.length ? h('span', { class: 'ds-dash-stat' }, statBits.join(' · ')) : null,
      activityBits.length ? h('span', { class: 'ds-dash-activity' }, activityBits.join(' · ')) : null),
    h('div', { class: 'ds-dash-actions', role: 'group', 'aria-label': 'session actions' },
      onOpen ? Btn({ key: 'open', onClick: () => onOpen(s), children: 'open' }) : null,
      onResume ? Btn({ key: 'resume', onClick: () => onResume(s), children: 'resume' }) : null,
      onView ? Btn({ key: 'view', onClick: () => onView(s), children: 'events' }) : null,
      onStop ? Btn({ key: 'stop', danger: true, onClick: () => onStop(s), children: 'stop' }) : null));
}

// SessionDashboard — grid of SessionCards for ALL live sessions, managed at once.
//   sessions : [{ sid, agent, model, cwd, elapsed, counter, lastActivity, currentTool, status }]
//   actions  : { onStop, onOpen, onResume, onView } passed to each card
//   onStopAll : OPTIONAL bulk control - stop every running session at once
//   emptyText, offline : explicit states
// The bulk header is the "manage many at once" affordance: a live count plus a
// stop-all button, so a user running several agents does not have to hunt each
// card's stop. Rendered only when there are sessions AND onStopAll is wired.
export function SessionDashboard({ sessions = [], onStop, onOpen, onResume, onView, onStopAll,
                                   emptyText = 'No live sessions', offline = false } = {}) {
  if (offline) {
    return h('div', { class: 'ds-dash-state ds-dash-state-error', role: 'status' }, 'Backend offline — live sessions unavailable');
  }
  if (!sessions.length) {
    return h('div', { class: 'ds-dash-state', role: 'status' }, emptyText);
  }
  const header = h('div', { class: 'ds-dash-header', role: 'group', 'aria-label': 'live session controls' },
    h('span', { class: 'ds-dash-count', role: 'status', 'aria-live': 'polite' },
      sessions.length + ' running'),
    onStopAll ? Btn({ key: 'stopall', danger: true, onClick: () => onStopAll(sessions), children: 'stop all' }) : null);
  const grid = h('div', { class: 'ds-dash-grid', role: 'list', 'aria-label': 'live sessions' },
    ...sessions.map((s) => h('div', { key: s.sid, role: 'listitem' },
      SessionCard({ session: s, onStop, onOpen, onResume, onView }))));
  return h('div', { class: 'ds-dash' }, header, grid);
}
