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
import { ChatComposer, ChatMessage } from './chat.js';
import { Select } from './content.js';
import { Btn } from './shell.js';

const h = webjsx.createElement;

// Auto-scroll a thread to the bottom while the user is already near the bottom,
// via an IntersectionObserver on a sentinel — the AICat scroll behaviour, lifted
// so it works for any message list without a per-frame scrollTop write.
function threadRef(msgCount) {
  return (el) => {
    if (!el) return;
    let sentinel = el.querySelector('[data-scroll-sentinel]');
    if (!sentinel) {
      sentinel = document.createElement('div');
      sentinel.setAttribute('data-scroll-sentinel', '');
      sentinel.style.height = '1px';
      el.appendChild(sentinel);
    }
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && el.dataset.msgCount !== String(msgCount)) {
        el.scrollTop = el.scrollHeight - el.clientHeight;
        el.dataset.msgCount = String(msgCount);
      }
    }, { root: el, threshold: 0 });
    obs.observe(sentinel);
    el.dataset.msgCount = String(msgCount);
    return () => obs.disconnect();
  };
}

// The agent picker: agent-then-model, not a flat model list. Unavailable agents
// are disabled (unless installable via npx). Ordering is the host's concern.
function AgentControls({ agents, selectedAgent, models, selectedModel, busy, status,
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
    showModels
      ? Select({
          key: 'modelsel', value: selectedModel, placeholder: '— model —',
          title: 'Select model', options: (models || []).map((m) => ({ value: m.id, label: m.name || m.id })),
          onChange: (v) => onSelectModel && onSelectModel(v),
        })
      : null,
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
    agents = [], selectedAgent = '', models = [], selectedModel = '',
    messages = [], busy = false, draft = '', status, banners = [],
    cwd = '', cwdEditing = false, cwdDraft,
    agentName, placeholder,
    onSelectAgent, onSelectModel, onSend, onStop, onNewChat, onInput,
    onCwdEdit, onCwdSave, onCwdCancel, onCwdClear, onCwdDraft,
    canSend = true,
  } = props;

  const name = agentName || (agents.find((a) => a.id === selectedAgent)?.name) || selectedAgent || 'agent';
  const lastIdx = messages.length - 1;
  const rows = messages.map((m, i) => {
    const isAssistant = m.role === 'assistant';
    const isStreaming = busy && i === lastIdx && isAssistant;
    const hasParts = Array.isArray(m.parts) && m.parts.length > 0;
    const emptyStreaming = isStreaming && !m.content && !hasParts;
    const parts = [];
    if (m.content) parts.push({ kind: isAssistant ? 'md' : 'text', text: m.content });
    if (hasParts) for (const p of m.parts) parts.push({ kind: 'text', text: p });
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

  const composer = ChatComposer({
    value: draft,
    disabled: !canSend,
    placeholder: placeholder || (selectedAgent ? 'message…' : 'choose an agent first'),
    onInput: (v) => onInput && onInput(v),
    onSend: (v) => onSend && onSend(v),
  });

  return h('div', { class: 'agentchat' },
    AgentControls({ agents, selectedAgent, models, selectedModel, busy, status,
                    onSelectAgent, onSelectModel, onNewChat, onStop }),
    CwdBar({ cwd, editing: cwdEditing, draft: cwdDraft,
             onEdit: onCwdEdit, onSave: onCwdSave, onCancel: onCwdCancel, onClear: onCwdClear, onDraft: onCwdDraft }),
    ...(banners || []).filter(Boolean),
    h('div', { class: 'agentchat-head', role: 'banner' },
      h('h2', { class: 'agentchat-title' }, name + (selectedModel ? ' · ' + selectedModel : '')),
      h('span', { class: 'agentchat-sub', 'aria-live': 'polite' },
        busy ? 'streaming…' : (messages.length ? messages.length + (messages.length === 1 ? ' message' : ' messages') : ''))),
    h('div', { class: 'agentchat-thread', ref: threadRef(messages.length), role: 'log', 'aria-label': 'conversation' },
      ...rows),
    composer,
  );
}
