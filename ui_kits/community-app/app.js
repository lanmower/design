// Reference kit for mountCommunityApp — a self-contained mock adapter (no
// backend) demonstrating the full community/chat application GUI. The mock data
// lives only here, in the reference kit; real consumers (e.g. zellous) supply a
// live adapter instead. Switching channels, sending a message, and toggling
// mic/deafen all drive the same render path a real adapter would.

import { mountCommunityApp } from 'ds/community-app.js';

const CAT = ['var(--cat-green)', 'var(--cat-purple)', 'var(--cat-mascot)', 'var(--cat-sun)', 'var(--cat-flame)', 'var(--cat-sky)'];
const color = (id) => CAT[Math.abs([...String(id || '')].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7)) % CAT.length];

const channels = [
    { id: 'general', name: 'general', type: 'text', position: 0 },
    { id: 'announcements', name: 'announcements', type: 'announcement', position: 1 },
    { id: 'lounge', name: 'Lounge', type: 'voice', position: 2 },
];
// The rail's server pills are the only always-visible clickable chrome this
// kit exposes, so the phase switcher rides on them: `switchServer` below
// routes a `phase:` id to applyPhase instead of changing server.
const servers = [
    { id: 'zellous', name: 'Zellous' },
    { id: 'phase:empty', name: 'state: empty' },
    { id: 'phase:loading', name: 'state: loading' },
    { id: 'phase:ready', name: 'state: ready' },
    { id: 'phase:error', name: 'state: error' },
];

const state = {
    channels, categories: [], servers,
    currentChannel: channels[0], currentServerId: 'zellous', homeMode: false,
    // Starts empty on purpose: the empty state is what a brand-new channel
    // actually looks like, so it is the kit's default view rather than a
    // branch a reader has to go hunting for.
    messages: [], chatInputValue: '', phase: 'empty', replyTarget: null,
    currentUser: { username: 'you' }, userId: 'you',
    isConnected: true,
    voiceConnected: false, voiceChannelName: '', voiceConnectionState: 'connected',
    // Kit-mock-local, not part of the adapter contract: whether the Lounge's
    // participant grid should show occupants. Deliberately separate from
    // voiceConnected (which drives the cross-channel "in voice, click to
    // return" VoiceStrip banner elsewhere in the app) -- flipping
    // voiceConnected on every channel switch was found to surface an
    // unrelated, pre-existing rendering bug in that banner's own controls
    // (.cm-voice-strip renders its mic/deafen/leave buttons full-width
    // instead of as compact icons) that nothing in this kit had ever
    // exercised before, since no prior code path ever set voiceConnected
    // true. Gating the grid on its own flag keeps the Lounge fix from
    // dragging in a separate, unrelated bug.
    loungeConnected: true,
    voiceParticipants: [], micMuted: false, voiceDeafened: false,
    memberCategories: [{ label: 'online — 1', members: [{ identity: 'you', name: 'you', status: 'online', color: color('you') }] }],
    memberListOpen: false,
    mobileMenuOpen: false,
};

// The reference kit ships in the `empty` state by default (zero messages), so
// mountCommunityApp's own Chat() empty block is already on screen at load. The
// other three readings a real adapter has to produce -- history rehydrating,
// a populated channel, and a failed load -- are cycled through here so each is
// a reachable surface in this kit rather than something only a live backend
// (zellous) would ever render.
//
// mountCommunityApp renders system messages as italic md, which is the shape a
// real adapter uses for gateway notices, so loading/error are expressed the
// same way a live consumer would express them rather than via a bespoke prop.
const PHASES = ['empty', 'loading', 'ready', 'error'];

// Mock voice-channel occupants for the Lounge -- reuses the same jordan/mai
// identities + avatarColor() helper the text-channel messages already use,
// so the Lounge doesn't read as a disconnected demo persona set. jordan is
// mid-sentence (speaking outline) and mai has muted her mic, giving the
// participant grid two distinct visual states to show off rather than three
// identical idle tiles. 'you' is appended live in adapter.get() below (not
// stored here) so the self-tile's mic icon tracks state.micMuted instead of
// freezing at whatever it was when the channel was joined.
const VOICE_PEERS = [
    { identity: 'jordan', color: color('jordan'), speaking: true },
    { identity: 'mai', color: color('mai'), muted: true },
];

const SAMPLE_MESSAGES = [
    { id: 'm1', userId: 'jordan', username: 'jordan', content: 'shipped the community adapter contract. mock lives in the kit, real one lives in the consumer.', timestamp: Date.now() - 600000, delivered: true },
    { id: 'm1b', userId: 'jordan', username: 'jordan', content: 'no backend anywhere in this kit -- state.js + a Set of subscribers is the whole store.', timestamp: Date.now() - 590000, delivered: true },
    { id: 'm2', userId: 'mai', username: 'mai', content: 'so the kit never talks to a backend at all?', timestamp: Date.now() - 480000, delivered: true },
    { id: 'm3', userId: 'you', username: 'you', content: 'right -- it only has to satisfy get/subscribe/actions.', timestamp: Date.now() - 300000, delivered: true },
];

function applyPhase(p) {
    state.phase = p;
    if (p === 'ready') {
        state.messages = SAMPLE_MESSAGES.slice();
        state.isConnected = true;
    } else if (p === 'loading') {
        state.messages = [{ id: 'sys-loading', type: 'system', text: 'reading the last 50 messages in this channel...' }];
        state.isConnected = true;
    } else if (p === 'error') {
        // Names the problem AND the recovery, per the craft rule -- a bare
        // "something went wrong" gives the reader nothing to act on.
        state.messages = [{ id: 'sys-error', type: 'system', text: 'lost the gateway while loading #' + (state.currentChannel?.name || 'general') + '. the socket closed before history arrived, so this channel is blank rather than actually empty -- switch channels and back to request the backlog again.' }];
        state.isConnected = false;
    } else {
        state.messages = [];
        state.isConnected = true;
    }
    notify();
}

const subs = new Set();
const notify = () => subs.forEach(cb => { try { cb(); } catch (_) { /* swallow: a subscriber's error must not block notifying the rest */ } });

const adapter = {
    // Voice participants are computed here rather than stored on `state`:
    // the Lounge's tile grid needs jordan+mai (VOICE_PEERS, static) plus a
    // live 'you' tile whose muted icon must track state.micMuted on every
    // toggle -- storing a snapshot in state.voiceParticipants would freeze
    // that icon at whatever it was when the channel was joined.
    get: () => {
        const inVoice = !!(state.currentChannel && state.currentChannel.type === 'voice' && state.loungeConnected);
        if (!inVoice) return state;
        return { ...state, voiceParticipants: [...VOICE_PEERS, { identity: 'you', color: color('you'), muted: state.micMuted }] };
    },
    subscribe: (cb) => { subs.add(cb); return () => subs.delete(cb); },
    helpers: { avatarColor: color, initial: (n) => String(n || '?').slice(0, 1).toUpperCase(), formatTime: (t) => new Date(t || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) },
    actions: {
        switchChannel: (ch) => {
            state.currentChannel = ch; state.mobileMenuOpen = false;
            // Re-entering the Lounge after a prior "leave voice" click
            // reconnects (mirrors the real product: picking the voice
            // channel again is how you rejoin).
            if (ch && ch.type === 'voice') state.loungeConnected = true;
            notify();
        },
        setInput: (v) => { state.chatInputValue = v; },
        send: (text) => {
            state.messages = [...state.messages, { id: 'm' + Date.now(), userId: 'you', username: 'you', content: text, timestamp: Date.now(), delivered: true }];
            state.chatInputValue = '';
            notify();
        },
        toggleMic: () => { state.micMuted = !state.micMuted; notify(); },
        toggleDeafen: () => { state.voiceDeafened = !state.voiceDeafened; notify(); },
        leaveVoice: () => { state.loungeConnected = false; state.voiceParticipants = []; notify(); },
        toggleMembers: () => { state.memberListOpen = !state.memberListOpen; notify(); },
        openMobileMenu: () => { state.mobileMenuOpen = true; notify(); },
        closeMobileMenu: () => { state.mobileMenuOpen = false; notify(); },
        openSettings: () => {}, openVoiceSettings: () => {},
        goHome: () => {}, openServers: () => {},
        switchServer: (id) => {
            if (typeof id === 'string' && id.startsWith('phase:')) { applyPhase(id.slice(6)); return; }
            state.currentServerId = id; notify();
        },
        channelContext: () => {}, serverContext: () => {}, memberMenu: () => {},
        resolveProfile: (id) => (id === 'you' ? 'you' : id),
        startReply: (msg) => { state.replyTarget = msg; notify(); },
        cancelReply: () => { state.replyTarget = null; notify(); },
    },
};

const app = mountCommunityApp(document.getElementById('root'), adapter);
window.__communityApp = { state, adapter, app, notify, applyPhase, PHASES };
