import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status } from 'ds/components.js';
import {
    CommunityShell, ServerRail, ChannelSidebar,
    MemberList, ChatHeader, VoiceStrip
} from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
import 'ds/index.js';
const h = webjsx.createElement;

const servers = [
    { id: 's1', name: '247420', active: true },
    { id: 's2', name: 'design lab' },
    { id: 's3', name: 'zellous' },
];

const categories = [
    { id: 'cat-general', name: 'GENERAL', position: 0 },
    { id: 'cat-design', name: 'DESIGN', position: 1 },
    { id: 'cat-voice', name: 'VOICE CHANNELS', position: 2 },
];

const channels = [
    { id: 'ch1', name: 'welcome', categoryId: 'cat-general', type: 'text', position: 0 },
    { id: 'ch2', name: 'announcements', categoryId: 'cat-general', type: 'text', position: 1 },
    { id: 'ch3', name: 'general', categoryId: 'cat-general', type: 'text', position: 2 },
    { id: 'ch4', name: 'tokens', categoryId: 'cat-design', type: 'text', position: 0 },
    { id: 'ch5', name: 'components', categoryId: 'cat-design', type: 'text', position: 1 },
    { id: 'ch6', name: 'lounge', categoryId: 'cat-voice', type: 'voice', position: 0 },
    { id: 'ch7', name: 'standup', categoryId: 'cat-voice', type: 'voice', position: 1 },
];

const members = [
    { label: 'online — 3', members: [
        { identity: 'jordan', name: 'jordan', status: 'online', color: 'var(--cat-green)' },
        { identity: 'mai', name: 'mai', status: 'online', color: 'var(--cat-purple)' },
        { identity: 'aicat', name: 'aicat', status: 'online', color: 'var(--cat-mascot)' },
    ]},
    { label: 'offline — 2', members: [
        { identity: 'river', name: 'river', status: 'offline' },
        { identity: 'sage', name: 'sage', status: 'offline' },
    ]},
];

const state = {
    activeServer: 's1',
    activeChannel: channels[2],
    collapsedCats: new Set(),
    memberListOpen: false,
    // Which state the message list renders in; cycled from the channel header.
    phase: 'ready',
    voiceOpen: false,
    muted: false,
    deafened: false,
    messages: [
        // `color` is the FILL (avatar disc, ink text on top); `ink` is the
        // readable TEXT tone for the author name. Same --accent/--accent-ink
        // split the lead accent draws — the bare hue as `color:` on paper is
        // ~3.1:1 and fails AA.
        { id: 1, author: 'jordan', color: 'var(--cat-green)', ink: 'var(--cat-green-ink)', time: '14:02', text: 'shipped the community shell component. check it out.' },
        { id: 2, author: 'mai', color: 'var(--cat-purple)', ink: 'var(--cat-purple-ink)', time: '14:03', text: 'looks clean. does it handle collapsed cats?' },
        { id: 3, author: 'aicat', color: 'var(--cat-mascot)', ink: 'var(--cat-mascot-ink)', time: '14:04', text: 'yes — click any category header.' },
    ]
};

const root = document.getElementById('root');

const PHASES = ['ready', 'loading', 'empty', 'error'];

// Message-shaped shimmer. Reuses .ds-event-row-skeleton + .ds-skel*
// (app-shell/files.css) — avatar / body / timestamp is the same rhythm.
function MessagesSkeleton() {
    return h('div', { class: 'ds-community-messages' },
        ...Array.from({ length: 6 }, (_, i) => h('div', { key: 'sk' + i, class: 'ds-event-row-skeleton' },
            h('span', { class: 'ds-skel ds-skel-icon' }),
            h('span', { class: 'ds-skel ds-skel-title' }),
            h('span', { class: 'ds-skel ds-skel-meta' })
        ))
    );
}

function MessagesEmpty(name) {
    return h('div', { class: 'ds-community-messages' },
        h('div', { class: 'ds-empty-state' },
            h('div', { class: 'ds-empty-state-glyph' }, '[ ]'),
            h('p', { class: 'ds-empty-state-msg' }, 'nothing posted in #' + name + ' yet'),
            h('p', { class: 'ds-empty-state-hint' }, 'this is the start of the channel. the first message here is what everyone sees when they join it.')
        )
    );
}

function MessagesError(name, onRetry) {
    return h('div', { class: 'ds-community-messages' },
        h('div', { class: 'ds-alert ds-alert-error' },
            h('span', { class: 'ds-alert-icon' }, '!'),
            h('div', { class: 'ds-alert-content' },
                h('div', { class: 'ds-alert-title' }, 'cannot load #' + name),
                h('div', { class: 'ds-alert-message' }, 'the gateway accepted the join but never sent history, so this channel is connected and blank rather than actually empty. rejoining requests the backlog again.'),
                h('div', { class: 'ds-alert-retry' },
                    h('button', { class: 'btn', onclick: onRetry }, 'rejoin channel')
                )
            )
        )
    );
}

function MessagesBody(name) {
    if (state.phase === 'loading') return MessagesSkeleton();
    if (state.phase === 'error') return MessagesError(name, () => { state.phase = 'ready'; kit.render(); });
    if (state.phase === 'empty') return MessagesEmpty(name);
    return h('div', { class: 'ds-community-messages' },
        ...state.messages.map(m => h('div', { class: 'ds-community-msg', key: String(m.id) },
            h('div', { class: 'ds-community-avatar', style: `background:${m.color || 'var(--panel-3)'}` }, m.author[0].toUpperCase()),
            h('div', { class: 'ds-community-msg-body' },
                h('span', { class: 'ds-community-msg-name', style: `color:${m.ink || m.color || 'var(--fg)'}` }, m.author),
                h('span', { class: 'ds-community-msg-time' }, m.time),
                h('p', { class: 'ds-community-msg-text' }, m.text)
            )
        ))
    );
}

function App() {
    const ch = state.activeChannel;
    const chatContent = h('div', { class: 'ds-community-main' },
        ChatHeader({
            icon: ch.type === 'voice' ? '((' : '#',
            name: ch.name,
            topic: ch.type === 'text' ? 'community shell demo — click channels to switch' : null,
            toolbar: [
                // Reachable state switcher for the message list.
                h('button', { key: 'phase', class: 'btn btn-ghost', onclick: () => {
                    state.phase = PHASES[(PHASES.indexOf(state.phase) + 1) % PHASES.length];
                    kit.render();
                } }, 'state: ' + state.phase),
                h('button', { key: 'members', class: 'btn btn-ghost', onclick: () => { state.memberListOpen = !state.memberListOpen; kit.render(); } },
                    state.memberListOpen ? 'hide members' : 'show members')
            ]
        }),
        MessagesBody(ch.name)
    );

    return h('div', { class: 'ds-community-page' },
        Topbar({ brand: '247420', leaf: 'community', items: [['index', '../../'], ['chat', '../chat/'], ['source ->', 'https://github.com/AnEntrypoint/design']] }),
        CommunityShell({
            serverRailProps: {
                servers,
                activeId: state.activeServer,
                onSelect: (id) => { state.activeServer = id; kit.render(); }
            },
            sidebarProps: {
                serverName: servers.find(s => s.id === state.activeServer)?.name || '247420',
                channels,
                categories,
                activeId: state.activeChannel.id,
                collapsedCats: state.collapsedCats,
                onChannelClick: (ch) => { state.activeChannel = ch; kit.render(); },
                onCategoryToggle: (id) => {
                    state.collapsedCats.has(id) ? state.collapsedCats.delete(id) : state.collapsedCats.add(id);
                    kit.render();
                },
                userPanelProps: {
                    name: 'you',
                    tag: '@',
                    color: 'var(--accent)',
                    muted: state.muted,
                    deafened: state.deafened,
                    onMute: () => { state.muted = !state.muted; kit.render(); },
                    onDeafen: () => { state.deafened = !state.deafened; kit.render(); },
                    onSettings: () => {}
                }
            },
            children: chatContent,
            memberListProps: { categories: members, open: state.memberListOpen },
            voiceStripProps: state.voiceOpen ? {
                channelName: 'lounge',
                status: 'connected',
                muted: state.muted,
                deafened: state.deafened,
                onMute: () => { state.muted = !state.muted; kit.render(); },
                onDeafen: () => { state.deafened = !state.deafened; kit.render(); },
                onLeave: () => { state.voiceOpen = false; kit.render(); },
                open: true
            } : null
        }),
        Status({ left: ['community', '- ' + channels.length + ' channels', '- ' + servers.length + ' servers', '- ' + state.phase], right: ['247420 / mmxxvi'] })
    );
}

const kit = mountKit({ root, view: App, screen: '07 Community' });
window.__community = { state, render: kit.render };
