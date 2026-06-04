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
import { Btn } from './shell.js';

const h = webjsx.createElement;

// Auto-scroll behaviour is the shared chat helper; bind it to this thread's
// live message count. (`makeThreadAutoScroll` takes a getter so the observer
// always compares against current state, not a value captured at mount.)
const threadRef = (msgCount) => makeThreadAutoScroll(() => msgCount);

// The agent picker: agent-then-model, not a flat model list. Unavailable agents
// are disabled (unless installable via npx). Ordering is the host's concern.
function AgentControls({ agents, selectedAgent, models, selectedModel, busy, status, modelsLoading,
                         onSelectAgent, onSelectModel, onNewChat, onStop }) {
  const agentOptions = (agents || []).map((a) => ({
    value: a.id,
    label: a.name + (a.available === false ? (a.npxInstallable ? ' (via npx)' : ' (not installed)') : ''),
    disabled: a.available === false && !a.npxInstallable,
  }));
  const showModels = (models || []).length > 0;
  return h('div', { class: 'agentchat-controls' },
    Select({
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
    h('span', { key: 'st', class: 'agentchat-status', role: 'status', 'aria-live': 'polite' },
      h('span', { class: 'status-dot-disc ' + (busy ? 'status-dot-live' : ''), 'aria-hidden': 'true' }),
      h('span', {}, status || (busy ? 'streaming…' : 'ready'))),
  );
}

// A working-directory bar: shows where the agent will run, editable + clearable.
function CwdBar({ cwd, editing, draft, onEdit, onSave, onCancel, onClear, onDraft }) {
  if (editing) {
    return h('div', { class: 'agentchat-cwd agentchat-cwd-editing', role: 'group', 'aria-label': 'Set working directory' },
      h('input', { class: 'agentchat-cwd-input', type: 'text', value: draft ?? cwd ?? '',
        placeholder: 'absolute path (blank = server default)',
        oninput: (e) => onDraft && onDraft(e.target.value) }),
      Btn({ key: 'save', primary: true, onClick: () => onSave && onSave(), children: 'save' }),
      Btn({ key: 'cancel', onClick: () => onCancel && onCancel(), children: 'cancel' }));
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
    agents = [], selectedAgent = '', models = [], selectedModel = '', modelsLoading = false,
    messages = [], busy = false, draft = '', status, banners = [],
    cwd = '', cwdEditing = false, cwdDraft,
    agentName, placeholder,
    onSelectAgent, onSelectModel, onSend, onStop, onNewChat, onInput,
    onCwdEdit, onCwdSave, onCwdCancel, onCwdClear, onCwdDraft,
    canSend = true,
    suggestions = [], onSuggestionClick,
  } = props;

  const name = agentName || (agents.find((a) => a.id === selectedAgent)?.name) || selectedAgent || 'agent';
  const lastIdx = messages.length - 1;
  const lastMsg = messages[lastIdx];
  // True when streaming but the live assistant turn already shows content/parts,
  // so its inline typing dots have stopped — a long silent tool call would
  // otherwise read as frozen. We append a standalone "working" indicator below.
  const showWorkingTail = busy && lastMsg && lastMsg.role === 'assistant'
    && (lastMsg.content || (Array.isArray(lastMsg.parts) && lastMsg.parts.length));
  const rows = messages.map((m, i) => {
    const isAssistant = m.role === 'assistant';
    const isStreaming = busy && i === lastIdx && isAssistant;
    const hasParts = Array.isArray(m.parts) && m.parts.length > 0;
    const emptyStreaming = isStreaming && !m.content && !hasParts;
    // A finished assistant message with no content and no parts is an empty
    // shell (e.g. an aborted turn) — render nothing rather than a blank bubble.
    if (!isStreaming && isAssistant && !m.content && !hasParts) return null;
    const parts = [];
    if (m.content) parts.push({ kind: isAssistant ? 'md' : 'text', text: m.content });
    // A message's parts may be bare strings (legacy text lines) OR structured
    // part objects ({ kind:'tool'|'tool_result'|'code'|..., ... }). Pass the
    // structured objects straight through to ChatMessage's renderPart so the
    // host can surface real tool cards / code blocks; wrap only bare strings as
    // text. This is what lets an orchestration host (agentgui) render the kit's
    // collapsible ToolCallNode instead of flattening tools into plain text.
    if (hasParts) for (const p of m.parts) {
      parts.push((p && typeof p === 'object' && p.kind) ? p : { kind: 'text', text: String(p) });
    }
    return ChatMessage({
      key: m.id || String(i),
      who: isAssistant ? 'them' : 'you',
      aicat: isAssistant,
      name: isAssistant ? name : 'you',
      time: m.time || '',
      typing: emptyStreaming,
      parts: emptyStreaming ? undefined : (parts.length ? parts : [{ kind: 'text', text: '' }]),
    });
  });

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
  });

  // Empty state: a fresh thread is a void without this. Mirrors the kit's Chat
  // empty surface (title, sub, optional starter prompts) so AgentChat opens to
  // an invitation, not a blank panel.
  const emptyState = (messages.length === 0)
    ? h('div', { class: 'agentchat-empty', role: 'status' },
        h('p', { class: 'agentchat-empty-title' }, selectedAgent ? 'Start a conversation with ' + name : 'Choose an agent to begin'),
        h('p', { class: 'agentchat-empty-sub' },
          selectedAgent ? 'Type a message below. The agent can read files, run tools, and search.' : 'Pick an agent from the selector above, then send a message.'),
        (suggestions && suggestions.length)
          ? h('div', { class: 'agentchat-empty-suggestions' },
              ...suggestions.map((s, i) => h('button', {
                key: 'sug' + i, type: 'button', class: 'agentchat-empty-suggestion',
                onclick: () => { const t = typeof s === 'string' ? s : (s.prompt || s.text || ''); if (onSuggestionClick) onSuggestionClick(t); },
              }, typeof s === 'string' ? s : (s.label || s.text || s.prompt))))
          : null)
    : null;

  return h('div', { class: 'agentchat' },
    AgentControls({ agents, selectedAgent, models, selectedModel, busy, status, modelsLoading,
                    onSelectAgent, onSelectModel, onNewChat, onStop }),
    CwdBar({ cwd, editing: cwdEditing, draft: cwdDraft,
             onEdit: onCwdEdit, onSave: onCwdSave, onCancel: onCwdCancel, onClear: onCwdClear, onDraft: onCwdDraft }),
    ...(banners || []).filter(Boolean),
    h('div', { class: 'agentchat-head', role: 'banner' },
      h('h2', { class: 'agentchat-title' }, name + (selectedModel ? ' · ' + selectedModel : '')),
      h('span', { class: 'agentchat-sub', 'aria-live': 'polite' },
        busy ? 'streaming…' : (messages.length ? messages.length + (messages.length === 1 ? ' message' : ' messages') : ''))),
    h('div', { class: 'agentchat-thread', ref: threadRef(messages.length), role: 'log', 'aria-label': 'conversation' },
      emptyState,
      ...rows.filter(Boolean),
      showWorkingTail
        ? h('div', { key: '_working', class: 'agentchat-working', role: 'status', 'aria-live': 'polite' },
            h('span', { class: 'chat-thinking-dots', 'aria-hidden': 'true' }, h('span'), h('span'), h('span')),
            h('span', { class: 'agentchat-working-text' }, 'working…'))
        : null),
    composer,
  );
}
