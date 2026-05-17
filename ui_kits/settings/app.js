import * as webjsx from 'webjsx';
import { Topbar, Crumb, Status, Side, AppShell, Panel, Heading, Lede, Chip, Btn, Row } from 'ds/components.js';
import { mountKit } from 'ds/bootstrap.js';
const h = webjsx.createElement;

const root = document.getElementById('root');

const state = {
    section: 'profile',
    name: 'lanmower',
    email: 'almagestfraternite@gmail.com',
    handle: '@247420',
    bio: 'creative department of the internet. always open. always a little high.',
    theme: 'auto',
    motion: true,
    notify: { mentions: true, releases: true, marketing: false },
    api_key: 'sk-247420-•••••••-c2a',
    dirty: false
};

const sections = [
    { id: 'profile',   label: 'profile',      glyph: '◆' },
    { id: 'theme',     label: 'theme',        glyph: '◐' },
    { id: 'notify',    label: 'notifications',glyph: '◇' },
    { id: 'api',       label: 'api keys',     glyph: '⌘' },
    { id: 'danger',    label: 'danger zone',  glyph: '!' }
];

function Field({ label, hint, children }) {
    return h('label', { class: 'ds-field', style: 'display:flex;flex-direction:column;gap:6px;margin:10px 0' },
        h('span', { style: 'font-family:var(--ff-mono);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--panel-text-3)' }, label),
        children,
        hint ? h('span', { style: 'font-size:12px;color:var(--panel-text-2)' }, hint) : null
    );
}

function Toggle({ on, onChange, label }) {
    return h('button', {
        class: on ? 'btn btn-primary' : 'btn',
        style: 'min-width:78px',
        onclick: () => { onChange(!on); state.dirty = true; kit.render(); }
    }, on ? '● on' : '○ off', label ? h('span', { style: 'margin-left:8px;color:inherit;opacity:0.7' }, label) : null);
}

function Profile() {
    return Panel({ title: 'profile', style: 'margin:8px 0', children: h('div', { style: 'padding:14px 18px' },
        Field({ label: 'name', hint: 'shown on commits and PRs.', children:
            h('input', { class: 'input', value: state.name, oninput: (e) => { state.name = e.target.value; state.dirty = true; } }) }),
        Field({ label: 'email', hint: 'used for git identity. never mailed.', children:
            h('input', { class: 'input', type: 'email', value: state.email, oninput: (e) => { state.email = e.target.value; state.dirty = true; } }) }),
        Field({ label: 'handle', children:
            h('input', { class: 'input', value: state.handle, oninput: (e) => { state.handle = e.target.value; state.dirty = true; } }) }),
        Field({ label: 'bio', hint: 'one sentence. plain text.', children:
            h('textarea', { class: 'input', rows: 3, oninput: (e) => { state.bio = e.target.value; state.dirty = true; } }, state.bio) })
    ) });
}

function Theme() {
    const opts = [['auto', '◐ auto'], ['light', '○ light'], ['dark', '● dark']];
    return Panel({ title: 'theme', style: 'margin:8px 0', children: h('div', { style: 'padding:14px 18px' },
        Field({ label: 'mode', children: h('div', { style: 'display:flex;gap:6px' },
            ...opts.map(([k, l]) => h('button', { key: k,
                class: state.theme === k ? 'btn btn-primary' : 'btn',
                onclick: () => { state.theme = k; state.dirty = true; kit.render(); } }, l))
        ) }),
        Field({ label: 'motion', hint: 'honour prefers-reduced-motion regardless.', children:
            Toggle({ on: state.motion, onChange: (v) => state.motion = v, label: state.motion ? 'animations on' : 'animations off' }) })
    ) });
}

function Notify() {
    return Panel({ title: 'notifications', style: 'margin:8px 0', children: [
        Row({ key: 'n1', code: '◆', title: 'mentions',  sub: 'when someone @s you',          meta: h('span', {}, Toggle({ on: state.notify.mentions, onChange: (v) => state.notify.mentions = v })) }),
        Row({ key: 'n2', code: '◇', title: 'releases',  sub: 'on every tagged build',        meta: h('span', {}, Toggle({ on: state.notify.releases, onChange: (v) => state.notify.releases = v })) }),
        Row({ key: 'n3', code: '◇', title: 'marketing', sub: 'occasional product updates',   meta: h('span', {}, Toggle({ on: state.notify.marketing, onChange: (v) => state.notify.marketing = v })) })
    ] });
}

function ApiKeys() {
    return Panel({ title: 'api keys', count: 1, style: 'margin:8px 0', children: h('div', { style: 'padding:14px 18px' },
        Field({ label: 'production key', hint: 'rotate quarterly.', children:
            h('div', { style: 'display:flex;gap:8px' },
                h('input', { class: 'input', value: state.api_key, readonly: true, style: 'flex:1;font-family:var(--ff-mono)' }),
                h('button', { class: 'btn', onclick: () => { navigator.clipboard?.writeText(state.api_key); } }, 'copy'),
                h('button', { class: 'btn', onclick: () => { state.api_key = 'sk-247420-' + Math.random().toString(36).slice(2, 10) + '-' + Math.random().toString(36).slice(2, 5); state.dirty = true; kit.render(); } }, 'rotate')
            ) })
    ) });
}

function Danger() {
    return Panel({ title: 'danger zone', kind: 'danger', style: 'margin:8px 0', children: h('div', { style: 'padding:14px 18px;display:flex;flex-direction:column;gap:10px' },
        h('p', { style: 'margin:0;color:var(--panel-text-2)' }, 'these actions are permanent.'),
        h('div', { style: 'display:flex;gap:8px' },
            h('button', { class: 'btn', style: 'color:var(--mascot,#e0a200)' }, 'export account'),
            h('button', { class: 'btn', style: 'color:var(--warn)' }, 'delete account')
        )
    ) });
}

function App() {
    const view = { profile: Profile, theme: Theme, notify: Notify, api: ApiKeys, danger: Danger }[state.section]();
    return AppShell({
        topbar: Topbar({ brand: '247420', leaf: 'settings', items: [['index', '../../'], ['source ↗', 'https://github.com/AnEntrypoint/design']] }),
        crumb: Crumb({ trail: ['247420', 'kits'], leaf: 'settings · ' + state.section }),
        side: Side({
            sections: [
                { group: 'sections', items: sections.map((s) => ({
                    glyph: s.glyph, label: s.label,
                    href: '#' + s.id, active: state.section === s.id, key: s.id,
                    onClick: (e) => { e.preventDefault(); state.section = s.id; kit.render(); }
                })) }
            ]
        }),
        main: [
            h('div', { class: 'ds-section', style: 'padding:8px' },
                Heading({ level: 1, children: 'settings' }),
                Lede({ children: 'every input primitive in one surface — fields, toggles, segmented buttons, danger panel, save bar.' }),
                view,
                state.dirty ? h('div', { style: 'position:sticky;bottom:8px;display:flex;justify-content:flex-end;gap:8px;padding:10px;background:var(--panel-2);border-radius:10px;margin:8px 0' },
                    h('span', { style: 'flex:1;color:var(--panel-text-2)' }, 'unsaved changes'),
                    h('button', { class: 'btn', onclick: () => { state.dirty = false; kit.render(); } }, 'discard'),
                    h('button', { class: 'btn btn-primary', onclick: () => { state.dirty = false; kit.render(); } }, 'save')
                ) : null
            )
        ],
        status: Status({
            left: ['settings', '• ' + state.section, state.dirty ? '• dirty' : '• saved'],
            right: ['247420 / mmxxvi']
        })
    });
}

const kit = mountKit({ root, view: App, screen: '10 Settings' });
