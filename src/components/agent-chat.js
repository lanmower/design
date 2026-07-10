// AgentChat — a reusable multi-agent orchestration chat surface.
//
// This kit takes the best of two surfaces: agentgui's orchestration chat
// (agent-then-model picker, streamed tool_use/tool_result parts, resume + cwd
// controls, error alerts) and the AICat chat thread (IntersectionObserver
// auto-scroll, a thinking indicator, polished head). It is a PURE component:
// props in, vnode out. It holds NO transport — every server interaction is a
// callback the host wires (WebSocket, fetch, SSE, whatever). That keeps the kit
// reusable by any app, not just agentgui.
//
// The host owns state; AgentChat renders it and calls back on intent.

import * as webjsx from '../../vendor/webjsx/index.js';
import { ChatComposer, ChatMessage, makeThreadAutoScroll } from './chat.js';
import { Select } from './content.js';
import { Btn, Icon } from './shell.js';
import { initializeCachesEagerly } from '../markdown-cache.js';

const h = webjsx.createElement;

// Auto-scroll behaviour is the shared chat helper; bind it to this thread's
// live message count. (`makeThreadAutoScroll` takes a getter so the observer
// always compares against current state, not a value captured at mount.)
const baseAutoScroll = (msgCount) => makeThreadAutoScroll(() => msgCount);

// Compose the auto-scroll ref with a scroll listener that reveals the
// jump-to-latest button when the user has scrolled away from the bottom. This
// is the scroll-anchoring fix: auto-scroll only pins when the user is already at
// the bottom (the IntersectionObserver gate), so reading back-history is no
// longer fought; the button is the explicit way back to the live edge.
const NEAR_BOTTOM_PX = 80;

// Thread window: how many trailing turns render by default (hosts override via
// shownMessages; grow with onShowEarlier).
export const MESSAGE_CAP = 100;
// A single streaming message beyond this many chars renders only a tail window
// per frame (O(tail), not O(turn)); the settled turn renders full markdown once.
const STREAM_TAIL_THRESHOLD = 20000;
const STREAM_TAIL_WINDOW = 4000;
const threadRef = (msgCount) => {
  const auto = baseAutoScroll(msgCount);
  return (el) => {
    if (!el) return;
    const disposeAuto = auto(el);
    const jumpBtn = () => el.parentElement && el.parentElement.querySelector('.agentchat-jump');
    const update = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      const btn = jumpBtn();
      if (btn) btn.classList.toggle('show', !atBottom);
    };
    el.addEventListener('scroll', update, { passive: true });
    requestAnimationFrame(update);
    return () => { el.removeEventListener('scroll', update); if (typeof disposeAuto === 'function') disposeAuto(); };
  };
};

// Scroll a thread to its live edge — used by the jump-to-latest button.
function scrollThreadToBottom(btn) {
  const wrap = btn.closest('.agentchat-thread-wrap');
  const thread = wrap && wrap.querySelector('.agentchat-thread');
  if (thread) thread.scrollTop = thread.scrollHeight;
}

// The agent picker: agent-then-model, not a flat model list. Unavailable agents
// are disabled (unless installable via npx). Ordering is the host's concern.
function AgentControls({ agents, selectedAgent, models, selectedModel, busy, status, modelsLoading, agentsLoading,
                         onSelectAgent, onSelectModel, onNewChat, onStop, exportActions }) {
  const agentOptions = (agents || []).map((a) => ({
    value: a.id,
    label: a.name + (a.available === false ? (a.npxInstallable ? ' (via npx)' : ' (not installed)') : ''),
    disabled: a.available === false && !a.npxInstallable,
  }));
  const showModels = (models || []).length > 0;
  return h('div', { class: 'agentchat-controls' },
    // While agents load on first boot, show a disabled "loading…" placeholder
    // instead of an empty options list, which is indistinguishable from "this
    // app has no agents configured" (mirrors the models-loading branch below).
    (agentsLoading && !agentOptions.length)
      ? Select({ key: 'agentsel', value: '', placeholder: 'loading agents…', title: 'Loading agents', disabled: true, options: [] })
      : Select({
          key: 'agentsel', value: selectedAgent, placeholder: '— agent —',
          title: 'Select agent', options: agentOptions,
          onChange: (v) => onSelectAgent && onSelectAgent(v),
        }),
    // While models load for a freshly-picked agent, show a disabled "loading…"
    // placeholder so the picker doesn't vanish then reappear (a layout flash).
    showModels
      ? Select({
          key: 'modelsel', value: selectedModel, placeholder: '— model —',
          title: 'Select model', options: (models || []).map((m) => ({ value: m.id, label: m.name || m.id })),
          onChange: (v) => onSelectModel && onSelectModel(v),
        })
      : (modelsLoading
          ? Select({ key: 'modelsel', value: '', placeholder: 'loading models…', title: 'Loading models', disabled: true, options: [] })
          : null),
    busy
      ? Btn({ key: 'stop', onClick: () => onStop && onStop(), children: 'stop', title: 'Stop streaming' })
      : Btn({ key: 'new', onClick: () => onNewChat && onNewChat(), children: 'new', title: 'New chat' }),
    h('span', { key: 'st', class: 'agentchat-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
      h('span', { class: 'status-dot-disc ' + (busy ? 'status-dot-live' : ''), 'aria-hidden': 'true' }),
      h('span', {}, status || (busy ? 'streaming…' : 'ready'))),
    // Host-supplied transcript actions (copy-all / export-md / export-json):
    // small text-labeled buttons riding the same controls row. All siblings in
    // this h(...) call are keyed VElements or null — never bare strings.
    ...(exportActions && exportActions.length
      ? exportActions.map((a, i) => h('button', {
          key: 'exp' + i, type: 'button', class: 'agentchat-export-act',
          title: a.title || a.label,
          onclick: () => a.onClick && a.onClick(),
        }, a.label))
      : []),
  );
}

// A working-directory bar: shows where the agent will run, editable + clearable.
// `error`/`checking` give inline validation feedback while typing/blur (the host
// debounces its /api/stat probe and sets these): a plain-language line renders
// under the input (aria-describedby) and save stays disabled while either is set.
function CwdBar({ cwd, editing, draft, onEdit, onSave, onCancel, onClear, onDraft, error, checking }) {
  if (editing) {
    const hint = checking ? 'checking…' : (error || null);
    return h('div', { class: 'agentchat-cwd agentchat-cwd-editing', role: 'group', 'aria-label': 'Set working directory' },
      h('input', { class: 'agentchat-cwd-input', type: 'text', value: draft ?? cwd ?? '',
        placeholder: 'absolute path (blank = server default)',
        'aria-describedby': hint ? 'agentchat-cwd-hint' : null,
        'aria-invalid': error ? 'true' : null,
        'aria-busy': checking ? 'true' : null,
        oninput: (e) => onDraft && onDraft(e.target.value) }),
      Btn({ key: 'cancel', onClick: () => onCancel && onCancel(), children: 'cancel' }),
      Btn({ key: 'save', variant: 'primary', disabled: !!(error || checking), onClick: () => onSave && onSave(), children: 'save' }),
      hint ? h('span', { key: 'hint', id: 'agentchat-cwd-hint', role: 'status', 'aria-live': 'polite',
        class: 'agentchat-cwd-hint' + (error ? ' is-error' : ' is-checking') }, hint) : null);
  }
  return h('div', { class: 'agentchat-cwd', role: 'group', 'aria-label': 'Working directory' },
    h('span', { class: 'agentchat-cwd-text', title: cwd || 'server default working directory' },
      'cwd: ' + (cwd || 'server default')),
    h('button', { type: 'button', class: 'agentchat-cwd-btn', onclick: () => onEdit && onEdit() }, cwd ? 'change' : 'set'),
    cwd ? h('button', { type: 'button', class: 'agentchat-cwd-btn', onclick: () => onClear && onClear() }, 'use default') : null);
}

// AgentChat — the composed surface.
//   agents, selectedAgent, models, selectedModel : picker state
//   messages : [{ id, role:'user'|'assistant', content, time, parts:[string] }]
//   busy, draft, status                          : stream + composer state
//   cwd, cwdEditing, cwdDraft                    : working-directory bar
//   banners                                      : array of pre-built Alert vnodes (errors, resume, unavailable)
//   onSelectAgent/onSelectModel/onSend/onStop/onNewChat/onInput
//   onCwdEdit/onCwdSave/onCwdCancel/onCwdClear/onCwdDraft
export function AgentChat(props = {}) {
  const {
    agents = [], selectedAgent = '', models = [], selectedModel = '', modelsLoading = false, agentsLoading = false,
    messages = [], busy = false, draft = '', status, banners = [],
    cwd = '', cwdEditing = false, cwdDraft, cwdError, cwdChecking = false,
    agentName, placeholder,
    onSelectAgent, onSelectModel, onSend, onStop, onNewChat, onInput,
    onCwdEdit, onCwdSave, onCwdCancel, onCwdClear, onCwdDraft,
    canSend = true,
    suggestions = [], onSuggestionClick,
    onCopyMessage, onRetryMessage, onEditMessage,
    confirmEdit = false, onArmEdit,
    avatar, composerContext,
    followups = [], onFollowupClick,
    installHint, exportActions = [],
    onPasteFiles, onDropFiles,
    shownMessages, onShowEarlier,
  } = props;

  // Warm the markdown/Prism stack the moment the surface mounts so the CDN
  // round-trip never starts mid-first-response. Self-idempotent (internal
  // _initPromise), so the per-render call is free after the first.
  initializeCachesEagerly().catch((err) => console.warn('[247420] cache init error:', err));

  const name = agentName || (agents.find((a) => a.id === selectedAgent)?.name) || selectedAgent || 'agent';
  const lastIdx = messages.length - 1;
  const lastMsg = messages[lastIdx];
  // Windowed thread render (mirrors FileGrid's cap): only the last `limit`
  // turns build vnodes each frame; a keyed 'show N earlier turns' row at the
  // top grows the window via onShowEarlier (host keeps state.chat.shownMessages
  // and resets it on newChat/loadSession). A 500-turn conversation no longer
  // rebuilds 500 ChatMessage vnodes per streaming rAF tick.
  const msgLimit = shownMessages != null ? shownMessages : MESSAGE_CAP;
  const msgStart = Math.max(0, messages.length - msgLimit);
  // True when streaming but the live assistant turn already shows content/parts,
  // so its inline typing dots have stopped — a long silent tool call would
  // otherwise read as frozen. We append a standalone "working" indicator below.
  // A message carries content (text/parts) when it has a non-empty content
  // string OR at least one part. Used for the empty-shell skip + working tail
  // so an interleaved turn (parts-only, no m.content) is not treated as empty.
  const msgHasBody = (m) => !!(m.content || (Array.isArray(m.parts) && m.parts.length));
  const lastMsgLastPart = lastMsg && Array.isArray(lastMsg.parts) && lastMsg.parts.length ? lastMsg.parts[lastMsg.parts.length - 1] : null;
  const showWorkingTail = busy && lastMsg && lastMsg.role === 'assistant' && msgHasBody(lastMsg)
    && lastMsgLastPart && lastMsgLastPart.kind === 'tool' && lastMsgLastPart.status === 'running';
  const rows = messages.slice(msgStart).map((m, wi) => {
    const i = wi + msgStart; // absolute index — streaming/caret/actions logic keys off the real lastIdx
    const isAssistant = m.role === 'assistant';
    const isStreaming = busy && i === lastIdx && isAssistant;
    const hasParts = Array.isArray(m.parts) && m.parts.length > 0;
    const emptyStreaming = isStreaming && !msgHasBody(m);
    // A finished assistant message with no content and no parts is an empty
    // shell (e.g. an aborted turn) — render nothing rather than a blank bubble.
    if (!isStreaming && isAssistant && !msgHasBody(m)) return null;
    // Render order follows m.parts so text and tool cards INTERLEAVE in arrival
    // order (text -> tool -> text -> tool). A message's parts may be bare
    // strings (legacy) OR structured {kind,...} objects (md/tool/tool_result/
    // code/...) passed straight through to ChatMessage.renderPart — this is what
    // lets an orchestration host render the kit's collapsible ToolCallNode
    // inline instead of flattening tools to the end of the turn.
    const parts = [];
    if (hasParts) {
      for (const p of m.parts) {
        const part = (p && typeof p === 'object' && p.kind) ? p : { kind: 'text', text: String(p) };
        // While a turn is still streaming, render its prose as cheap inline text
        // rather than full markdown: MdNode re-parses + re-sanitizes the WHOLE
        // accumulated source and swaps the entire bubble innerHTML on every frame
        // (O(n^2) over the turn, with a visible reflow). Downgrade md -> text
        // mid-stream; the settled turn below renders real markdown once.
        // Carry a `mdShell` flag so the streaming-text bubble uses the same
        // container shape (.chat-md padding/spacing) the settled markdown will
        // use — only the inner content swaps on settle, so the bubble box does
        // not reflow/jump when the turn finishes and renders real markdown.
        if (isStreaming && part.kind === 'md') {
          const txt = part.text || '';
          // Giant streamed block: re-rendering the whole accumulated string per
          // rAF is O(n^2) across the turn. Past the threshold, render a preShell
          // bubble with a 'streaming · N KB so far' head plus only the last
          // STREAM_TAIL_WINDOW chars; full markdown renders once on settle.
          if (txt.length > STREAM_TAIL_THRESHOLD) {
            parts.push({ kind: 'text', mdShell: true, preShell: true,
              text: txt.slice(-STREAM_TAIL_WINDOW),
              streamHead: 'streaming · ' + Math.round(txt.length / 1024) + ' KB so far' });
            continue;
          }
          // If the streaming prose contains a code fence, the inline renderer
          // (which has no triple-backtick handling) would show it as run-on text
          // with literal ``` and no monospace, then snap into a styled <pre> on
          // settle (a visible reflow during the most-watched moment). Detect a
          // fence and render the bubble as a cheap monospaced <pre> shell instead
          // (no Prism mid-stream, so no O(n^2)) so it does not reflow on settle.
          if (part.text && part.text.indexOf('```') !== -1) parts.push({ kind: 'text', text: part.text, mdShell: true, preShell: true });
          else parts.push({ kind: 'text', text: part.text, mdShell: true });
        }
        else if (!isStreaming && part.kind === 'thinking') parts.push({ kind: 'thinking', settled: true, text: part.text });
        else parts.push(part);
      }
    }
    // m.content is the legacy/simple path (user messages, hosts that don't build
    // interleaved parts). Only prepend it when the parts array doesn't already
    // carry prose, so a parts-driven turn isn't double-rendered.
    const partsHaveProse = parts.some(p => p.kind === 'md' || p.kind === 'text');
    if (m.content && !partsHaveProse) parts.unshift({ kind: isAssistant ? 'md' : 'text', text: m.content });
    // The streaming caret rides the live assistant turn once it has body (the
    // empty-shell turn already shows the inline typing dots).
    const streaming = isStreaming && msgHasBody(m);
    // Place the caret inline inside the last text/md part rather than as a
    // sibling span (which renders as a block below the last bubble). Tag the
    // last text part so PART_RENDERERS.text can append it as an inline child.
    if (streaming && parts.length) {
      const lastPart = parts[parts.length - 1];
      if (lastPart && (lastPart.kind === 'text' || lastPart.kind === 'md')) {
        parts[parts.length - 1] = { ...lastPart, streamingCaret: true };
      }
    }
    // Per-message actions: the host supplies onCopyMessage / onRetryMessage; we
    // build the action row only for SETTLED messages (no actions mid-stream).
    let actions;
    if (!isStreaming && msgHasBody(m)) {
      const built = [];
      if (onCopyMessage) built.push({ label: 'copy', icon: 'copy', title: 'copy message', onClick: () => onCopyMessage(m) });
      // Mid-thread retry: EVERY settled assistant turn gets a retry action,
      // not only the trailing one - the host truncates from that turn's
      // position and resends (the same mechanism edit-and-resend uses for
      // user messages), so any assistant reply the user was unhappy with can
      // be redone without discarding turns that came after a LATER one.
      if (isAssistant && onRetryMessage) built.push({ label: 'retry', icon: 'refresh', title: 'retry this turn', onClick: () => onRetryMessage(m) });
      // A dangling user message (send failed / no reply arrived) can only be
      // the LAST message when it has no assistant reply - retry here means
      // "resend as-is", not "redo a specific turn", so stays lastIdx-gated.
      if (!isAssistant && onRetryMessage && i === lastIdx) built.push({ label: 'retry', icon: 'refresh', title: 'retry', onClick: () => onRetryMessage(m) });
      // With confirmEdit the host arms its own confirm affordance (onArmEdit)
      // instead of resending immediately; the kit stays stateless either way.
      if (!isAssistant && onEditMessage) built.push({ label: 'edit', icon: 'pencil', title: 'edit and resend',
        onClick: () => (confirmEdit && onArmEdit) ? onArmEdit(m) : onEditMessage(m) });
      if (built.length) actions = built;
    }
    return ChatMessage({
      key: m.id || String(i),
      role: isAssistant ? 'assistant' : 'user',
      // Claude-Code-web layout: flat full-width turns (no avatar disc, no colored
      // bubble), distinguished by a role label + a faint assistant background.
      // aicat is left OFF so the mascot tint never reaches the agent surface.
      flat: true,
      aicat: false,
      // A stable per-agent product mark (host passes a small line-SVG via
      // `avatar`) instead of a per-agent letter initial that shifts identity.
      avatar: isAssistant ? (m.avatar != null ? m.avatar : avatar) : undefined,
      name: isAssistant ? name : 'you',
      time: m.time || '',
      typing: emptyStreaming,
      streaming,
      actions,
      // Out-of-band notices (plain copy, neutral tone): m.stopped marks a
      // cancelled turn; m.incomplete marks a turn whose stream dropped without
      // replay. Retry rides the existing actions row.
      stopped: m.stopped,
      incomplete: m.incomplete,
      parts: emptyStreaming ? undefined : (parts.length ? parts : [{ kind: 'text', text: '' }]),
    });
  });
  // Keyed 'show N earlier turns' control at the top of the window. A keyed
  // VElement like every row sibling (webjsx keying discipline).
  const earlierRow = msgStart > 0
    ? h('div', { key: '_earlier', class: 'agentchat-earlier' },
        h('span', { class: 'agentchat-earlier-count', role: 'status', 'aria-live': 'polite' },
          'showing ' + (messages.length - msgStart) + ' of ' + messages.length + ' turns'),
        onShowEarlier ? h('button', { type: 'button', class: 'agentchat-earlier-btn',
          onclick: () => onShowEarlier(Math.min(messages.length, msgLimit + MESSAGE_CAP)) },
          'show ' + Math.min(MESSAGE_CAP, msgStart) + ' earlier turns') : null)
    : null;

  // While streaming, the composer's send button becomes an inline stop button
  // (busy + onCancel) so the user can halt the turn from where their hands
  // already are, not only from the controls cluster up top.
  const composer = ChatComposer({
    value: draft,
    disabled: !canSend,
    busy,
    placeholder: placeholder || (selectedAgent ? 'message…' : 'choose an agent first'),
    onInput: (v) => onInput && onInput(v),
    onSend: (v) => onSend && onSend(v),
    onCancel: busy && onStop ? () => onStop() : undefined,
    // The active target (agent / model / cwd-basename) at the point of typing.
    context: composerContext,
    // Paste/drop file intents (image paste, file drop) — host-wired; the
    // composer itself always preventDefaults the drop so the browser never
    // navigates away from a live session.
    onPasteFiles,
    onDropFiles,
  });

  // Contextual follow-up chips below the last SETTLED assistant turn (claude.ai/
  // code / cowork surface these after a turn, not only on an empty thread). Shown
  // only when not busy and the last message is an assistant turn with body.
  const followupRow = (!busy && followups && followups.length && lastMsg && lastMsg.role === 'assistant' && msgHasBody(lastMsg))
    ? h('div', { class: 'agentchat-followups', role: 'group', 'aria-label': 'suggested follow-ups', 'aria-hidden': 'true' },
        ...followups.map((s, i) => h('button', {
          key: 'fu' + i, type: 'button', class: 'agentchat-empty-suggestion agentchat-followup',
          onclick: () => { const t = typeof s === 'string' ? s : (s.prompt || s.text || ''); if (onFollowupClick) onFollowupClick(t); else if (onSuggestionClick) onSuggestionClick(t); },
        }, typeof s === 'string' ? s : (s.label || s.text || s.prompt))))
    : null;

  // Empty state: a fresh thread is a void without this. Mirrors the kit's Chat
  // empty surface (title, sub, optional starter prompts) with calm, factual
  // copy rather than blank panel or invitational framing.
  const emptyState = (messages.length === 0)
    ? h('div', { class: 'agentchat-empty', role: 'status' },
        h('p', { class: 'agentchat-empty-title' }, selectedAgent ? name + ' is ready.' : 'Select an agent to start.'),
        h('p', { class: 'agentchat-empty-sub' },
          selectedAgent ? 'Type a message below.' : 'Pick an agent from the selector above, then send a message.'),
        (suggestions && suggestions.length)
          ? h('div', { class: 'agentchat-empty-suggestions' },
              ...suggestions.map((s, i) => h('button', {
                key: 'sug' + i, type: 'button', class: 'agentchat-empty-suggestion',
                onclick: () => { const t = typeof s === 'string' ? s : (s.prompt || s.text || ''); if (onSuggestionClick) onSuggestionClick(t); },
              }, typeof s === 'string' ? s : (s.label || s.text || s.prompt))))
          : null,
        // Guided install path for a brand-new user with zero installed agents:
        // a plain copy line, a monospaced command per row (each with its own
        // copy button, pure-DOM label flip like the code-block copy), and a
        // recheck button so the user needn't reload after installing.
        installHint
          ? h('div', { class: 'agentchat-install', role: 'group', 'aria-label': 'install an agent' },
              installHint.text ? h('p', { class: 'agentchat-install-text' }, installHint.text) : null,
              (installHint.commands && installHint.commands.length)
                ? h('ul', { class: 'agentchat-install-list' },
                    ...installHint.commands.map((c, i) => h('li', { key: 'inst' + i, class: 'agentchat-install-row' },
                      h('span', { class: 'agentchat-install-agent' }, c.agent),
                      h('code', { class: 'agentchat-install-cmd' }, c.command),
                      h('button', {
                        type: 'button', class: 'agentchat-install-copy',
                        'aria-label': 'copy install command for ' + c.agent, title: 'copy command',
                        onclick: (e) => {
                          const btn = e.currentTarget;
                          navigator.clipboard && navigator.clipboard.writeText(c.command);
                          btn.textContent = 'copied';
                          setTimeout(() => { btn.textContent = 'copy'; }, 1200);
                        },
                      }, 'copy'))))
                : null,
              installHint.onRecheck
                ? h('div', { class: 'agentchat-install-actions' },
                    Btn({ onClick: () => installHint.onRecheck(), children: 'recheck agents', title: 'Re-check installed agents' }))
                : null)
          : null)
    : null;

  return h('div', { class: 'agentchat' },
    AgentControls({ agents, selectedAgent, models, selectedModel, busy, status, modelsLoading, agentsLoading,
                    onSelectAgent, onSelectModel, onNewChat, onStop, exportActions }),
    CwdBar({ cwd, editing: cwdEditing, draft: cwdDraft, error: cwdError, checking: cwdChecking,
             onEdit: onCwdEdit, onSave: onCwdSave, onCancel: onCwdCancel, onClear: onCwdClear, onDraft: onCwdDraft }),
    ...(banners || []).filter(Boolean),
    h('div', { class: 'agentchat-head' },
      h('h1', { class: 'agentchat-title' }, name + (selectedModel ? ' · ' + selectedModel : '')),
      h('span', { class: 'agentchat-sub', 'aria-hidden': busy ? 'true' : null },
        // Derive the busy label from the same status prop the controls use, so a
        // reconnecting-while-streaming state reads one word everywhere instead of
        // the head saying "streaming…" while the controls say "reconnecting…".
        busy ? (status || 'streaming…') : (messages.length ? messages.length + (messages.length === 1 ? ' message' : ' messages') : ''))),
    h('div', { class: 'agentchat-thread-wrap' },
      h('div', { class: 'agentchat-thread', ref: threadRef(messages.length), role: 'log', 'aria-label': 'conversation' },
        emptyState,
        earlierRow,
        ...rows.filter(Boolean),
        showWorkingTail
          ? h('div', { key: '_working', class: 'agentchat-working', role: 'status', 'aria-live': 'polite' },
              h('span', { class: 'chat-thinking-dots', 'aria-hidden': 'true' }, h('span'), h('span'), h('span')),
              h('span', { class: 'agentchat-working-text' }, 'working…'))
          : null,
        followupRow),
      // Jump-to-latest: hidden until the scroll listener adds .show (user scrolled
      // up). Clicking returns to the live edge. Pure-DOM, like the kit's other
      // stateless chrome, so the host needn't thread scroll state through state.
      h('button', { class: 'agentchat-jump', type: 'button', 'aria-label': 'jump to latest', title: 'jump to latest',
        onclick: (e) => scrollThreadToBottom(e.currentTarget) },
        Icon('arrow-down', { size: 16 }), h('span', { class: 'agentchat-jump-label' }, 'latest'))),
    composer,
  );
}
