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
const servers = [{ id: 'zellous', name: 'Zellous' }];

const state = {
    channels, categories: [], servers,
    currentChannel: channels[0], currentServerId: 'zellous', homeMode: false,
    messages: [], chatInputValue: '',
    currentUser: { username: 'you' }, userId: 'you',
    isConnected: true,
    voiceConnected: false, voiceChannelName: '', voiceConnectionState: 'connected',
    voiceParticipants: [], micMuted: false, voiceDeafened: false,
    memberCategories: [{ label: 'online — 1', members: [{ identity: 'you', name: 'you', status: 'online', color: color('you') }] }],
    memberListOpen: false,
};

const subs = new Set();
const notify = () => subs.forEach(cb => { try { cb(); } catch (_) {} });

const adapter = {
    get: () => state,
    subscribe: (cb) => { subs.add(cb); return () => subs.delete(cb); },
    helpers: { avatarColor: color, initial: (n) => String(n || '?').slice(0, 1).toUpperCase(), formatTime: (t) => new Date(t || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) },
    actions: {
        switchChannel: (ch) => { state.currentChannel = ch; notify(); },
        setInput: (v) => { state.chatInputValue = v; },
        send: (text) => {
            state.messages = [...state.messages, { id: 'm' + Date.now(), userId: 'you', username: 'you', content: text, timestamp: Date.now(), delivered: true }];
            state.chatInputValue = '';
            notify();
        },
        toggleMic: () => { state.micMuted = !state.micMuted; notify(); },
        toggleDeafen: () => { state.voiceDeafened = !state.voiceDeafened; notify(); },
        leaveVoice: () => { state.voiceConnected = false; state.voiceParticipants = []; notify(); },
        toggleMembers: () => { state.memberListOpen = !state.memberListOpen; notify(); },
        openMobileMenu: () => {}, openSettings: () => {}, openVoiceSettings: () => {},
        goHome: () => {}, openServers: () => {},
        switchServer: (id) => { state.currentServerId = id; notify(); },
        channelContext: () => {}, serverContext: () => {}, memberMenu: () => {},
        resolveProfile: (id) => (id === 'you' ? 'you' : id),
    },
};

const app = mountCommunityApp(document.getElementById('root'), adapter);
window.__communityApp = { state, adapter, app, notify };
