// Flagship demo: the desktop-class chat-agent product surface (README.md's
// "multi-agent chat shell" combo) — WorkspaceShell + WorkspaceRail +
// ConversationList + AgentChat + SessionDashboard, wired together with mock
// state so the combo has a runnable reference alongside the other kits.
import * as webjsx from 'webjsx';
// Imported directly from owning submodules, not the ds/components.js barrel
// -- see aicat/app.js for the measured rationale (200+ serial unbundled
// module requests when every kit pulls the full 30+-submodule barrel).
import { WorkspaceShell, WorkspaceRail, Status } from 'ds/components/shell.js';
import { ConversationList, SessionDashboard } from 'ds/components/sessions.js';
import { AgentChat } from 'ds/components/agent-chat.js';
import { PresenceBar } from 'ds/components/collab.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const sessions = [
    { sid: 's1', title: 'refactor auth middleware', project: 'kit', time: '2m', rail: 'green' },
    { sid: 's2', title: 'debug flaky upload test', project: 'agentgui', time: '18m' },
    { sid: 's3', title: 'draft release notes', project: 'kit', time: '1h' },
    { sid: 's4', title: 'investigate CI timeout', project: 'agentgui', time: '3h', rail: 'flame' },
];

// Mutable on purpose: the dashboard's stop controls actually remove rows from
// this list, so a Stop button on a running agent does what its label says
// rather than being a decorative affordance.
let liveSessions = [
    { sid: 's1', agentName: 'claude-code', model: 'sonnet', cwd: 'kit', status: 'running', startedAt: Date.now() - 120000 },
    { sid: 's4', agentName: 'opencode', model: 'gpt-5', cwd: 'agentgui', status: 'error', startedAt: Date.now() - 900000 },
];
// Restoring the list is what makes stop re-testable: without it the only way
// back to a populated dashboard is a page reload, so cycling the state switcher
// through `ready` re-seeds it.
const seedSessions = liveSessions.slice();

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
    // The agent/model pickers and the working-directory bar are real controls
    // in AgentChat, so this kit holds the state they edit rather than passing
    // fixed strings and leaving every one of them inert.
    agent: 'claude-code',
    model: 'sonnet',
    cwd: 'kit',
    cwdEditing: false,
    cwdDraft: '',
    messages: [
        { role: 'user', content: 'the auth middleware refactor — where should the session-token check live?' },
        { role: 'assistant', parts: [{ kind: 'md', text: 'Move it into a single `verifySession(req)` helper called from the route guard, not scattered per-route. Two call sites currently duplicate the check — that duplication is the actual bug risk.' }] },
    ],
};

// Both pickers deliberately stay single-entry, and this is a WORKAROUND for an
// SDK defect, not a design choice.
//
// AgentControls renders the agent and model pickers as sibling Selects. In the
// no-label/no-hint/md branch, Select() (src/components/content/fields.js:110)
// returns the bare <select> and DISCARDS the caller's `key`, so both siblings
// carry the same internal key 'i'. The keyed diff then treats them as one node:
// the first re-render after ANY state change destroys the agent picker and
// leaves the model picker wearing title="Select agent". Measured directly --
// two selects before, one after, mislabelled.
//
// So multi-option pickers here would visibly corrupt the toolbar the first time
// anyone used them, which is a worse lie than a control that plainly has one
// option. Restore the option lists once Select preserves the caller key in the
// bare branch; nothing in this kit needs to change but these two arrays.
const AGENTS = [
    { id: 'claude-code', name: 'claude-code' },
];
const MODELS = [
    { id: 'sonnet', name: 'sonnet' },
];

function ChatTab() {
    return AgentChat({
        agents: AGENTS,
        selectedAgent: state.agent,
        models: MODELS,
        selectedModel: state.model,
        onSelectAgent: (id) => { state.agent = id; render(); },
        onSelectModel: (id) => { state.model = id; render(); },
        messages: state.messages,
        busy: state.busy,
        draft: state.draft,
        // Working-directory bar: change/set opens the editor, save commits,
        // cancel backs out, 'use default' clears it.
        cwd: state.cwd,
        cwdEditing: state.cwdEditing,
        cwdDraft: state.cwdDraft,
        onCwdEdit: () => { state.cwdEditing = true; state.cwdDraft = state.cwd; render(); },
        onCwdDraft: (v) => { state.cwdDraft = v; },
        onCwdSave: () => { state.cwd = (state.cwdDraft || '').trim(); state.cwdEditing = false; render(); },
        onCwdCancel: () => { state.cwdEditing = false; state.cwdDraft = ''; render(); },
        onCwdClear: () => { state.cwd = ''; state.cwdEditing = false; render(); },
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

// Real collab-ui adoption: liveSessions already carries agentName/status per
// concurrently-running agent, but until now nothing on this surface showed
// who/what is actually active at a glance — SessionDashboard's own rows are
// the detail view, PresenceBar is the summary strip above them.
function liveSessionsAsPresence() {
    return liveSessions.map((s) => ({
        userId: s.sid,
        label: s.agentName + ' · ' + s.model,
        status: s.status === 'running' ? 'active' : (s.status === 'error' ? 'offline' : 'idle'),
    }));
}

function LiveTab() {
    const p = state.railPhase;
    return h('div', { class: 'ds-workspace-live' },
        PresenceBar({ users: p === 'ready' ? liveSessionsAsPresence() : [] }),
        SessionDashboard({
            sessions: p === 'ready' ? liveSessions : [],
            // `offline` is SessionDashboard's own error surface — it replaces the
            // whole dashboard, which is right: a dashboard that cannot reach the
            // backend has nothing truthful to draw.
            offline: p === 'error',
            streamState: p === 'loading' ? 'connecting' : (p === 'error' ? 'offline' : 'connected'),
            emptyText: 'nothing running right now — start an agent from the chat tab and it shows up here while it works.',
            activeSid: state.selectedSid,
            // Stop really stops: the row leaves the dashboard and the rail count
            // drops with it. Nothing here reports success it did not have.
            onStop: (s) => {
                liveSessions = liveSessions.filter((x) => x.sid !== s.sid);
                render();
            },
            onStopAll: () => { liveSessions = []; render(); },
            // Open selects the session and returns to the chat surface, which is
            // where an opened session is actually read.
            onOpen: (s) => {
                state.selectedSid = s.sid;
                state.tab = 'chat';
                render();
            },
            // View marks the row active in place — the dashboard's own selected
            // treatment is the visible result, not a dialog this kit has no backend for.
            onView: (s) => { state.selectedSid = s.sid; render(); },
        })
    );
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
                    // Returning to `ready` restores the seed list, so a dashboard
                    // emptied by stop-all can be brought back without a reload.
                    if (state.railPhase === 'ready') liveSessions = seedSessions.slice();
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
            // A new chat clears the transcript AND drops the conversation
            // selection while switching to the chat surface — clearing messages
            // alone was invisible whenever the transcript was already empty or
            // the live tab was in front, which is what made this read as dead.
            onNew: () => {
                state.messages = [];
                state.draft = '';
                state.selectedSid = null;
                state.tab = 'chat';
                render();
            },
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
