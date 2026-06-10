// Session surfaces — a persistent conversation list (left-rail "Chats") and a
// live multi-session dashboard. Pure factories: props in, webjsx vnode out, all
// interaction via host callbacks. Styling lives in chat.css (.ds-session*,
// .ds-dash*) using kit tokens; no transport, no decorative glyphs.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Btn, Icon } from './shell.js';
import { Select, SearchInput } from './content.js';
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
export function ConversationList({ sessions = [], selected, groups, search, caption,
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
    // Per-tab caption telling the user what selecting a row does on this surface
    // (chat = resume the conversation, history = browse its events) so visually
    // identical rows are disambiguated.
    caption ? h('div', { key: 'cap', class: 'ds-session-caption' }, caption) : null,
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
// `status` is one of: 'error' | 'stale' | 'running'. A 'stale' session is one
// the host has determined is alive but not making progress (no recent activity,
// no current tool) — it reads as `idle` with a NON-pulsing disc so a stuck agent
// is visually distinct from a busy one (a frozen elapsed alone reads identically
// for both, which is the high-severity oversight gap this closes).
const STATUS_WORD = { error: 'error', stale: 'idle', running: 'running' };
const STATUS_DISC = { error: 'status-dot-error', stale: 'status-dot-stale', running: 'status-dot-live' };

export function SessionCard({ session = {}, onStop, onOpen, onView, active = false,
                             selectable = false, selected = false, onToggleSelect } = {}) {
  const s = session;
  const st = s.status === 'error' ? 'error' : (s.status === 'stale' ? 'stale' : 'running');
  // The stat line composes elapsed + live counter; the activity line carries the
  // last-activity time and the current tool so a card shows MOTION, not just a
  // start offset. Both are middot-joined (kept product separator).
  const statBits = [s.elapsed != null ? s.elapsed : null, s.counter != null ? s.counter : null].filter((x) => x != null && x !== '');
  const activityBits = [
    s.currentTool ? 'running: ' + s.currentTool : null,
    s.lastActivity ? 'last ' + s.lastActivity : null,
  ].filter(Boolean);
  const cls = 'ds-dash-card is-' + st + (active ? ' is-active' : '') + (selected ? ' is-selected' : '');
  return h('div', { class: cls, role: 'group', 'aria-label': 'session ' + (s.agent || s.sid), 'aria-current': active ? 'true' : null },
    h('div', { class: 'ds-dash-card-head' },
      selectable ? h('button', {
        type: 'button', class: 'ds-dash-select', role: 'checkbox',
        'aria-checked': selected ? 'true' : 'false',
        'aria-label': (selected ? 'deselect' : 'select') + ' session ' + (s.agent || s.sid),
        onclick: () => onToggleSelect && onToggleSelect(s),
      }, selected ? '[x]' : '[ ]') : null,
      h('span', { class: 'status-dot-disc ' + STATUS_DISC[st], 'aria-hidden': 'true' }),
      // Status is words + the disc, never colour alone (WCAG 1.4.1): the disc is
      // aria-hidden, so the visible/AT status word carries the state.
      h('span', { class: 'ds-dash-status is-' + st }, STATUS_WORD[st]),
      h('span', { class: 'ds-dash-agent' }, s.agent || 'agent'),
      s.model ? h('span', { class: 'ds-dash-model' }, s.model) : null),
    h('div', { class: 'ds-dash-meta' },
      s.cwd ? h('span', { class: 'ds-dash-cwd', title: s.cwd }, s.cwd) : null,
      statBits.length ? h('span', { class: 'ds-dash-stat' }, statBits.join(' · ')) : null,
      activityBits.length ? h('span', { class: 'ds-dash-activity' }, activityBits.join(' · ')) : null),
    h('div', { class: 'ds-dash-actions', role: 'group', 'aria-label': 'session actions' },
      // open and resume collapsed into one 'open' action (they both just reopen
      // the session in chat); 'events' kept for the read-only event view.
      onOpen ? Btn({ key: 'open', onClick: () => onOpen(s), children: 'open' }) : null,
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
// Streamstate words: the live-stream health signal so "connected, zero running"
// still tells the user the dashboard is listening (vs a dropped stream).
const STREAM_WORD = { connected: 'listening for activity', connecting: 'connecting to live stream…', lost: 'live stream lost — retrying…' };

export function SessionDashboard({ sessions = [], onStop, onOpen, onView, onStopAll, onStopSelected,
                                   sort, filter, errorsOnly = false, onErrorsOnly,
                                   selectable = false, selected, onToggleSelect,
                                   activeSid, streamState,
                                   emptyText = 'No live sessions', offline = false } = {}) {
  if (offline) {
    return h('div', { class: 'ds-dash-state ds-dash-state-error', role: 'status' }, 'Backend offline — live sessions unavailable');
  }
  const selSet = selected instanceof Set ? selected : new Set(selected || []);
  const selCount = selSet.size;
  // The stream-state line always renders (even with zero sessions) so a
  // connected-but-idle dashboard reads differently from an offline one.
  const streamLine = streamState
    ? h('span', { class: 'ds-dash-stream is-' + streamState, role: 'status', 'aria-live': 'polite' }, STREAM_WORD[streamState] || streamState)
    : null;
  const toolbar = (sort || filter || onErrorsOnly)
    ? h('div', { class: 'ds-dash-toolbar', role: 'group', 'aria-label': 'sort and filter sessions' },
        filter ? SearchInput({ key: 'filt', value: filter.value || '', label: filter.placeholder || 'Filter sessions', placeholder: filter.placeholder || 'Filter sessions', onInput: (v) => filter.onInput && filter.onInput(v) }) : null,
        sort ? Select({ key: 'sort', value: sort.value || 'status', title: 'Sort sessions',
          options: [
            { value: 'status', label: 'sort: status' },
            { value: 'elapsed', label: 'sort: elapsed' },
            { value: 'activity', label: 'sort: last activity' },
            { value: 'errors', label: 'sort: errors first' },
          ], onChange: (v) => sort.onChange && sort.onChange(v) }) : null,
        onErrorsOnly ? h('button', { key: 'eo', type: 'button', class: 'ds-dash-errors-toggle' + (errorsOnly ? ' active' : ''),
          'aria-pressed': errorsOnly ? 'true' : 'false', onclick: () => onErrorsOnly(!errorsOnly) }, 'errors only') : null)
    : null;
  if (!sessions.length) {
    return h('div', { class: 'ds-dash' },
      h('div', { class: 'ds-dash-header', role: 'group', 'aria-label': 'live session controls' },
        h('span', { class: 'ds-dash-count', role: 'status', 'aria-live': 'polite' }, '0 running'), streamLine),
      h('div', { class: 'ds-dash-state', role: 'status' }, emptyText));
  }
  const header = h('div', { class: 'ds-dash-header', role: 'group', 'aria-label': 'live session controls' },
    h('span', { class: 'ds-dash-count', role: 'status', 'aria-live': 'polite' },
      selectable && selCount ? selCount + ' selected' : sessions.length + ' running'),
    streamLine,
    h('span', { class: 'spread' }),
    selectable && selCount && onStopSelected
      ? Btn({ key: 'stopsel', danger: true, onClick: () => onStopSelected([...selSet]), children: 'stop selected' })
      : (onStopAll ? Btn({ key: 'stopall', danger: true, onClick: () => onStopAll(sessions), children: 'stop all' }) : null),
    toolbar);
  const grid = h('div', { class: 'ds-dash-grid', role: 'list', 'aria-label': 'live sessions' },
    ...sessions.map((s) => h('div', { key: s.sid, role: 'listitem' },
      SessionCard({ session: s, onStop, onOpen, onView, active: s.sid === activeSid,
                    selectable, selected: selSet.has(s.sid), onToggleSelect }))));
  return h('div', { class: 'ds-dash' }, header, grid);
}
