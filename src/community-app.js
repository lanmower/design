// community-app — the full chat/community application GUI, owned by the design
// system. A consumer (e.g. zellous over Nostr) supplies an `adapter` that maps
// its own data + actions to the contract below; this module composes every
// surface (rail, chat, members, voice, user panel, overlays) and wires it to
// the adapter. The consumer never touches component internals — it only feeds
// data and receives action callbacks.
//
// Adapter contract (all fields optional; the app degrades when one is absent):
//   adapter.get() -> snapshot {
//     channels, categories, servers, currentChannel, currentServerId, homeMode,
//     messages, chatInputValue, currentUser, userId,
//     isConnected, voiceConnected, voiceChannelName, voiceConnectionState,
//     voiceParticipants, micMuted, voiceDeafened,
//     audioQueueItems, audioQueueCurrentId, audioQueuePaused,
//     showAuthModal, settingsOpen, voiceSettingsOpen, replyTarget
//   }
//   adapter.subscribe(cb) -> unsubscribe   // cb fires when any snapshot field changes
//   adapter.actions = {
//     switchChannel(ch), send(text, opts), toggleMic(), toggleDeafen(),
//     leaveVoice(), toggleMembers(), openMobileMenu(), openSettings(),
//     channelContext(id, x, y), serverContext(id, x, y), switchServer(id),
//     goHome(), openServers(), memberMenu(id, name, x, y),
//     replaySegment(id), skipSegment(), pauseQueue(), resumeQueue(),
//     setInput(v), cancelReply()
//   }
//   adapter.helpers = { avatarColor(id), initial(name), formatTime(ts) }
//
// Returns { render, destroy }.

import * as webjsx from '../vendor/webjsx/index.js';
import { Icon } from './components/shell.js';
import { Chat, ChatComposer } from './components/chat.js';
import {
    ServerRail, ChannelItem, MemberList, MobileHeader,
    UserPanel, VoiceStrip, VoiceUser, ThreadPanel, ForumView, PageView, Banner,
} from './components/community.js';
import { VoiceControls } from './components/voice.js';
import { ContextMenu } from './components/editor-primitives.js';
import { EmojiPicker, CommandPalette } from './components/overlay-primitives.js';

const h = webjsx.createElement;

const CHANNEL_ICON = { voice: 'speaker', forum: 'forum', threaded: 'thread', announcement: 'megaphone', page: 'page', text: 'hash' };

export function mountCommunityApp(root, adapter = {}) {
    if (!root) throw new Error('mountCommunityApp: root required');
    const get = typeof adapter.get === 'function' ? adapter.get : () => ({});
    const A = adapter.actions || {};
    const H = adapter.helpers || {};
    const avatarColor = H.avatarColor || (() => 'var(--accent)');
    const initial = H.initial || ((n) => String(n || '?').slice(0, 1).toUpperCase());
    const formatTime = H.formatTime || ((t) => new Date(t || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));

    // overlay state owned by the app module (imperative surfaces the consumer triggers)
    let ctx = { open: false, x: 0, y: 0, items: [] };
    let emoji = { open: false, x: 0, y: 0, onSelect: null };
    let palette = { open: false, items: [], onSelect: null };

    const railView = (s) => {
        const out = [];
        const channels = [...(s.channels || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
        const text = channels.filter(c => c.type !== 'voice' && c.type !== 'threaded');
        const voice = channels.filter(c => c.type === 'voice' || c.type === 'threaded');
        const cur = s.currentChannel || {};
        const servers = s.servers || [];
        if (text.length) {
            out.push(h('div', { class: 'group' }, 'rooms'));
            for (const c of text) out.push(railPill(c, cur, false, s));
        } else if (!servers.length) {
            out.push(h('div', { class: 'group' }, 'rooms'));
            out.push(h('div', { class: 'rail-empty' }, 'no channels yet'));
        }
        if (voice.length) {
            out.push(h('div', { class: 'group' }, 'voice'));
            for (const c of voice) out.push(railPill(c, cur, true, s));
        }
        if (servers.length) {
            out.push(h('div', { class: 'group' }, 'servers'));
            out.push(railServerPill({ name: 'home', _home: true }, s));
            for (const sv of servers) out.push(railServerPill(sv, s));
        }
        return h('div', {}, ...out);
    };

    const railPill = (c, cur, isVoice, s) => {
        const active = cur.id === c.id;
        const inVoice = isVoice && s.voiceConnected && s.voiceChannelName === c.name;
        const glyph = inVoice ? h('span', { class: 'glyph' }, '●')
            : (c.type === 'threaded' ? h('span', { class: 'glyph' }, '◉')
                : h('span', { class: 'glyph' }, Icon(CHANNEL_ICON[c.type] || 'hash', { size: 15 })));
        return h('a', {
            href: '#', class: active ? 'active' : '',
            onclick: (e) => { e.preventDefault(); A.switchChannel && A.switchChannel(c); },
            oncontextmenu: (e) => { e.preventDefault(); A.channelContext && A.channelContext(c.id, e.clientX, e.clientY); },
        }, glyph, h('span', {}, c.name || c.id),
            c.unreadCount ? h('span', { class: 'count' }, c.unreadCount > 99 ? '99+' : String(c.unreadCount)) : null);
    };

    const railServerPill = (sv, s) => {
        const active = sv._home ? s.homeMode : (!s.homeMode && s.currentServerId === sv.id);
        return h('a', {
            href: '#', class: active ? 'active' : '',
            onclick: (e) => { e.preventDefault(); sv._home ? (A.goHome && A.goHome()) : (A.switchServer && A.switchServer(sv.id)); },
            oncontextmenu: sv._home ? null : (e) => { e.preventDefault(); A.serverContext && A.serverContext(sv.id, e.clientX, e.clientY); },
        }, h('span', { class: 'glyph' }, sv._home ? '◆' : (sv.name || '?').slice(0, 1).toUpperCase()),
            h('span', {}, sv.name || sv.id),
            sv.unreadCount ? h('span', { class: 'count' }, sv.unreadCount > 99 ? '99+' : String(sv.unreadCount)) : null);
    };

    const CODE_FENCE_RE = /^```([a-zA-Z0-9_+-]*)\n([\s\S]*?)\n?```\s*$/;
    const partsFromMessage = (m) => {
        const parts = [];
        if (m.replyTo) {
            const who = m.replyTo.username || 'User';
            const quoted = (m.replyTo.content || '').replace(/\n/g, ' ').slice(0, 120);
            parts.push({ kind: 'md', text: '> **@' + who + ':** ' + quoted });
        }
        const content = m.content || '';
        const fence = content.match(CODE_FENCE_RE);
        if (m.type === 'code' || fence) parts.push({ kind: 'code', code: fence ? fence[2] : content, lang: fence ? fence[1] : (m.lang || '') });
        else if (m.type === 'image') { const src = m.url || m.imageUrl || m.src; if (src) parts.push({ kind: 'image', src, alt: m.alt || '', caption: m.caption }); else if (content) parts.push({ kind: 'md', text: content }); }
        else if (m.type === 'file') parts.push({ kind: 'file', src: m.url || m.fileUrl || m.src, name: m.name || m.filename || 'attachment', size: m.size });
        else if (content) parts.push({ kind: 'md', text: content });
        if (Array.isArray(m.attachments)) for (const a of m.attachments) {
            if (!a) continue;
            if (a.type === 'image' && (a.src || a.url)) parts.push({ kind: 'image', src: a.src || a.url, alt: a.alt || '', caption: a.caption });
            else if ((a.src || a.url) && (a.name || a.filename)) parts.push({ kind: 'file', src: a.src || a.url, name: a.name || a.filename, size: a.size });
        }
        return parts;
    };

    const mapMessages = (s) => {
        const chatMsgs = s.messages || [];
        const selfId = s.userId;
        return chatMsgs.map((m, i) => {
            if (m.type === 'system') return { key: m.id || ('sys' + i), who: 'them', name: '', parts: [{ kind: 'md', text: '_' + (m.text || '') + '_' }] };
            const username = (A.resolveProfile && A.resolveProfile(m.userId)) || m.username || 'User';
            const isYou = selfId && String(m.userId) === String(selfId);
            const reactions = Array.isArray(m.reactions) ? m.reactions.map(r => ({ emoji: r.emoji, count: r.count != null ? r.count : (r.users ? r.users.length : 1), you: !!(r.you || (r.users && selfId && r.users.includes(selfId))) })) : null;
            return { key: m.id || ('m' + i), who: isYou ? 'you' : 'them', name: isYou ? null : username, avatar: initial(username), time: formatTime(m.timestamp), parts: partsFromMessage(m), reactions, receipt: isYou && m.read ? 'read' : (isYou && m.delivered ? 'delivered' : null) };
        });
    };

    const chatView = (s) => {
        const ch = s.currentChannel || {};
        const sub = ch.type === 'voice' ? 'voice' : ch.type === 'forum' ? 'forum' : ch.type === 'page' ? 'page' : ch.type === 'announcement' ? 'announcement' : 'public';
        return Chat({
            title: ch.name || 'general', sub, messages: mapMessages(s), header: null,
            composer: ChatComposer({
                value: s.chatInputValue || '',
                placeholder: 'message #' + (ch.name || 'general') + '…',
                onInput: (v) => A.setInput && A.setInput(v),
                onSend: (v) => { const t = (v || '').trim(); if (t) A.send && A.send(t); },
            }),
        });
    };

    const voiceView = (s) => h('div', { class: 'vx-view' },
        h('div', { class: 'vx-grid' }, ...(s.voiceParticipants || []).map((p, i) => VoiceUser({ ...p, key: p.identity || p.id || i }))),
        VoiceControls({
            muted: !!s.micMuted, deafened: !!s.voiceDeafened,
            onMic: () => A.toggleMic && A.toggleMic(),
            onDeafen: () => A.toggleDeafen && A.toggleDeafen(),
            onSettings: () => A.openVoiceSettings && A.openVoiceSettings(),
            onLeave: () => A.leaveVoice && A.leaveVoice(),
        }),
    );

    const view = () => {
        const s = get();
        const ch = s.currentChannel || {};
        const inVoiceChannel = ch.type === 'voice';
        const bodyMain = inVoiceChannel ? voiceView(s) : chatView(s);
        const showVoiceBanner = s.voiceConnected && s.voiceChannelName && !(inVoiceChannel && s.voiceChannelName === ch.name);
        return h('div', { class: 'ca-app' },
            // top bar (sole app chrome above the chat-head)
            h('header', { class: 'app-topbar' },
                h('span', { class: 'brand' }, 'zellous', h('span', { class: 'slash' }, ' / '), h('span', {}, ch.name || 'general')),
                h('span', {}),
                h('nav', {},
                    h('a', { href: '../', title: 'Home', onclick: (e) => { if (A.goHome) { e.preventDefault(); A.goHome(); } } }, 'home'),
                    h('a', { href: '#', title: 'Servers', onclick: (e) => { e.preventDefault(); A.openServers && A.openServers(); } }, 'servers'),
                    h('a', { href: 'https://github.com/AnEntrypoint/zellous', target: '_blank', rel: 'noopener' }, 'source ↗'),
                ),
            ),
            MobileHeader({ channelType: ch.type || 'text', channelName: ch.name || '', onMenu: () => A.openMobileMenu && A.openMobileMenu(), onMembers: () => A.toggleMembers && A.toggleMembers() }),
            Banner({ tone: 'warning', message: 'No relay connected. Reconnecting…', visible: s.isConnected === false }),
            Banner({ tone: 'success', visible: !!showVoiceBanner, message: showVoiceBanner ? ('In voice: ' + (s.voiceChannelName || '') + ' — click to return') : '', actionLabel: 'Leave', onAction: (e) => { if (e && e.stopPropagation) e.stopPropagation(); A.leaveVoice && A.leaveVoice(); }, onClick: () => A.returnToVoice && A.returnToVoice() }),
            h('div', { class: 'app-body' },
                h('aside', { class: 'app-side ca-rail' }, railView(s)),
                h('main', { class: 'app-main' },
                    !inVoiceChannel && s.voiceConnected ? VoiceStrip({ channelName: s.voiceChannelName, status: s.voiceConnectionState || 'connected', muted: !!s.micMuted, deafened: !!s.voiceDeafened, onMute: () => A.toggleMic && A.toggleMic(), onDeafen: () => A.toggleDeafen && A.toggleDeafen(), onLeave: () => A.leaveVoice && A.leaveVoice(), open: true }) : null,
                    UserPanel({ name: (s.currentUser && (s.currentUser.displayName || s.currentUser.username || s.currentUser.name)) || 'You', tag: s.currentUser && s.currentUser.tag, color: avatarColor(s.userId), muted: !!s.micMuted, deafened: !!s.voiceDeafened, onMute: () => A.toggleMic && A.toggleMic(), onDeafen: () => A.toggleDeafen && A.toggleDeafen(), onSettings: () => A.openSettings && A.openSettings() }),
                    bodyMain,
                ),
                MemberList({ categories: s.memberCategories || [], open: !!s.memberListOpen }),
            ),
            // overlays
            ctx.open ? ContextMenu({ items: ctx.items, anchor: { x: ctx.x, y: ctx.y }, onClose: () => { ctx = { ...ctx, open: false }; render(); } }) : null,
            emoji.open ? EmojiPicker({ open: true, anchorX: emoji.x, anchorY: emoji.y, onSelect: (em) => { try { emoji.onSelect && emoji.onSelect(em); } catch (_) {} emoji = { ...emoji, open: false }; render(); }, onClose: () => { emoji = { ...emoji, open: false }; render(); } }) : null,
            palette.open ? CommandPalette({ open: true, items: palette.items, onSelect: (it) => { try { palette.onSelect && palette.onSelect(it); } catch (_) {} palette = { ...palette, open: false }; render(); }, onClose: () => { palette = { ...palette, open: false }; render(); } }) : null,
        );
    };

    const render = () => { webjsx.applyDiff(root, view()); };

    // imperative overlay API the consumer (and its modules) can call
    const api = {
        contextMenu: { show: (items, x, y) => { ctx = { open: true, x: x | 0, y: y | 0, items: Array.isArray(items) ? items : [] }; render(); }, close: () => { ctx = { ...ctx, open: false }; render(); } },
        emojiPicker: { show: (x, y, onSelect) => { emoji = { open: true, x: x || 200, y: y || 200, onSelect }; render(); }, close: () => { emoji = { ...emoji, open: false }; render(); } },
        commandPalette: { show: (items, onSelect) => { palette = { open: true, items: items || [], onSelect }; render(); }, close: () => { palette = { ...palette, open: false }; render(); } },
        render,
    };

    let unsub = null;
    if (typeof adapter.subscribe === 'function') unsub = adapter.subscribe(render);
    render();
    return { render, api, destroy: () => { if (unsub) try { unsub(); } catch (_) {} } };
}
