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

const state = {
    tab: 'chat',
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
    return SessionDashboard({
        sessions: liveSessions,
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
                { label: 'chat', key: 'chat', active: state.tab === 'chat', count: sessions.length },
                { label: 'live', key: 'live', active: state.tab === 'live', count: liveSessions.length, rail: liveSessions.some((s) => s.status === 'error') ? 'flame' : null },
            ],
        }),
        sessions: ConversationList({
            sessions,
            selected: state.selectedSid,
            onSelect: (s) => { state.selectedSid = s.sid; render(); },
            onNew: () => { state.messages = []; render(); },
        }),
        main: state.tab === 'chat' ? ChatTab() : LiveTab(),
        status: Status({
            left: ['workspace', '- ' + sessions.length + ' conversations', '- ' + liveSessions.length + ' live'],
            right: ['247420 / mmxxvi', '- demo'],
        }),
        stableFrame: true,
    });
}

const kit = mountKit({ root, view: App, screen: 'workspace' });
const render = kit.render;
