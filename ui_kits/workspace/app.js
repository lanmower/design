// Flagship demo: the desktop-class chat-agent product surface (README.md's
// "multi-agent chat shell" combo) — WorkspaceShell + WorkspaceRail +
// ConversationList + AgentChat + SessionDashboard, wired together with mock
// state so the combo has a runnable reference alongside the other kits.
import * as webjsx from 'webjsx';
import { WorkspaceShell, WorkspaceRail, ConversationList, AgentChat, SessionDashboard, Status } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
import 'ds/index.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const sessions = [
    { sid: 's1', title: 'refactor auth middleware', project: 'kit', time: '2m', rail: 'green' },
    { sid: 's2', title: 'debug flaky upload test', project: 'agentgui', time: '18m' },
    { sid: 's3', title: 'draft release notes', project: 'kit', time: '1h' },
    { sid: 's4', title: 'investigate CI timeout', project: 'agentgui', time: '3h', rail: 'flame' },
];

const liveSessions = [
    { sid: 's1', agentName: 'claude-code', model: 'sonnet', cwd: 'kit', status: 'running', startedAt: Date.now() - 120000 },
    { sid: 's4', agentName: 'opencode', model: 'gpt-5', cwd: 'agentgui', status: 'error', startedAt: Date.now() - 900000 },
];

// `railPhase` drives the conversation rail. ConversationList already owns
// loading (its .ds-session-row-skeleton shimmer), error and empty internally —
// this kit's job is to make all three reachable rather than leaving the rail
// permanently on the happy path.
const RAIL_PHASES = ['ready', 'loading', 'empty', 'error'];

const state = {
    tab: 'chat',
    railPhase: 'ready',
    selectedSid: 's1',
    draft: '',
    busy: false,
    messages: [
        { role: 'user', content: 'the auth middleware refactor — where should the session-token check live?' },
        { role: 'assistant', parts: [{ kind: 'md', text: 'Move it into a single `verifySession(req)` helper called from the route guard, not scattered per-route. Two call sites currently duplicate the check — that duplication is the actual bug risk.' }] },
    ],
};

function ChatTab() {
    return AgentChat({
        agents: [{ id: 'claude-code', name: 'claude-code' }],
        selectedAgent: 'claude-code',
        models: [{ id: 'sonnet', name: 'sonnet' }],
        selectedModel: 'sonnet',
        messages: state.messages,
        busy: state.busy,
        draft: state.draft,
        cwd: 'kit',
        onInput: (v) => { state.draft = v; },
        onSend: () => {
            if (!state.draft.trim()) return;
            state.messages.push({ role: 'user', content: state.draft });
            state.draft = '';
            render();
        },
        onNewChat: () => { state.messages = []; render(); },
        canSend: true,
    });
}

function LiveTab() {
    const p = state.railPhase;
    return SessionDashboard({
        sessions: p === 'ready' ? liveSessions : [],
        // `offline` is SessionDashboard's own error surface — it replaces the
        // whole dashboard, which is right: a dashboard that cannot reach the
        // backend has nothing truthful to draw.
        offline: p === 'error',
        streamState: p === 'loading' ? 'connecting' : (p === 'error' ? 'offline' : 'connected'),
        emptyText: 'nothing running right now — start an agent from the chat tab and it shows up here while it works.',
        onStop: () => {},
        onOpen: () => {},
        onView: () => {},
        onStopAll: () => {},
    });
}

function App() {
    return WorkspaceShell({
        rail: WorkspaceRail({
            brand: '247420',
            items: [
                { label: 'chat', key: 'chat', active: state.tab === 'chat', count: state.railPhase === 'ready' ? sessions.length : 0,
                  onClick: () => { state.tab = 'chat'; render(); } },
                { label: 'live', key: 'live', active: state.tab === 'live', count: state.railPhase === 'ready' ? liveSessions.length : 0,
                  rail: state.railPhase === 'ready' && liveSessions.some((s) => s.status === 'error') ? 'flame' : null,
                  onClick: () => { state.tab = 'live'; render(); } },
                // Reachable state switcher — cycles the rail and dashboard
                // through ready / loading / empty / error so each one is a
                // living surface in this kit rather than backend-only.
                { label: 'state: ' + state.railPhase, key: 'phase', onClick: () => {
                    state.railPhase = RAIL_PHASES[(RAIL_PHASES.indexOf(state.railPhase) + 1) % RAIL_PHASES.length];
                    render();
                } },
            ],
        }),
        sessions: ConversationList({
            sessions: state.railPhase === 'ready' ? sessions : [],
            loading: state.railPhase === 'loading',
            loadingText: 'reading conversation history…',
            error: state.railPhase === 'error'
                ? 'history db is locked by another workspace window. close the other window, or reopen this one read-only to keep browsing.'
                : null,
            emptyText: 'no conversations yet — hit new chat and the first one lands here.',
            selected: state.selectedSid,
            onSelect: (s) => { state.selectedSid = s.sid; render(); },
            onNew: () => { state.messages = []; render(); },
        }),
        main: state.tab === 'chat' ? ChatTab() : LiveTab(),
        status: Status({
            left: ['workspace', '- ' + (state.railPhase === 'ready' ? sessions.length : 0) + ' conversations', '- ' + (state.railPhase === 'ready' ? liveSessions.length : 0) + ' live', '- ' + state.railPhase],
            right: ['247420 / mmxxvi', '- demo'],
        }),
        stableFrame: true,
    });
}

const kit = mountKit({ root, view: App, screen: 'workspace' });
const render = kit.render;
