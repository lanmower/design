import * as webjsx from '../../../vendor/webjsx/index.js';
import { Panel, Hero, Receipt, Kpi } from '../content.js';
import { Chip } from '../shell.js';
import { EmptyState } from '../files.js';
import { skillLabel } from './helpers.js';
const h = webjsx.createElement;

export async function home(h0) {
    const sessions = await h0.pi.sessions.list();
    const health = h0.pi.health();
    const fmt = (k, v) => {
        if (k === 'ts' && typeof v === 'number') { const d = new Date(v); return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'; }
        if (typeof v === 'boolean') return v ? '✓' : '✗';
        return String(v);
    };
    return [
        Hero({ title: 'freddie', body: 'open js agent harness.', accent: h0.version || 'web' }),
        Kpi({ items: [[sessions.length,'sessions'],[h0.pi.tools.size,'tools'],[h0.pi.skills.size,'skills']] }),
        Panel({ title: 'quick start', children: Receipt({ rows: [
            ['open chat',"click 'chat' — set a working directory"],
            ['pick skill','software dev, research, planning'],
            ['set api key','keys tab → click chip'],
            ['add cron','cron tab → form']
        ] }) }),
        Panel({ title: 'system status', children: Receipt({ rows: Object.entries(health).map(([k,v]) => [k, fmt(k, v)]) }) })
    ];
}

function relTime(ts) {
    if (!ts) return '';
    const t = typeof ts === 'string' ? Date.parse(ts) : Number(ts);
    if (!Number.isFinite(t)) return '';
    const diff = (Date.now() - t) / 1000;
    if (diff < 60) return Math.floor(diff)+'s ago';
    if (diff < 3600) return Math.floor(diff/60)+'m ago';
    if (diff < 86400) return Math.floor(diff/3600)+'h ago';
    if (diff < 86400*30) return Math.floor(diff/86400)+'d ago';
    return new Date(t).toISOString().slice(0,10);
}

const PLATFORM_CAT = { web: 'kit', cli: 'doc', telegram: 'preview', slack: 'preview', discord: 'preview', api_server: 'external', webhook: 'external' };

export async function sessions(h0) {
    const list = await h0.pi.sessions.list();
    const f = window.__fd_sessFilter = window.__fd_sessFilter || { q: '' };
    const q = (f.q || '').toLowerCase();
    const filtered = q ? list.filter(s => (s.title||'').toLowerCase().includes(q) || (s.id||'').includes(q) || (s.platform||'').toLowerCase().includes(q) || (s.cwd||'').toLowerCase().includes(q)) : list;
    const openSession = async s => {
        const msgs = await h0.pi.sessions.getMessages(s.id);
        const cs = window.__fd_chatState = window.__fd_chatState || { messages: [], busy: false, sessionId: null, cwd: '', skill: '', provider: '', model: '' };
        cs.sessionId = s.id;
        cs.messages = msgs.map(m => ({ role: m.role, content: String(m.content || '') }));
        if (s.cwd) cs.cwd = s.cwd;
        if (s.skill) cs.skill = s.skill;
        if (typeof window.__fd_nav === 'function') window.__fd_nav('chat');
    };
    const items = filtered.map(s => {
        const cat = PLATFORM_CAT[s.platform] || 'doc';
        const subParts = [s.platform || '—', s.model || '—', s.skill ? skillLabel({name:s.skill}) : null].filter(Boolean);
        const cwdMeta = s.cwd ? '…'+s.cwd.slice(-28) : '';
        const tsMeta = relTime(s.updated_at || s.created_at || s.ts);
        return h('div', { key: s.id, class: 'fd-list-row', 'data-cat': cat, role: 'button', tabindex: '0', onclick: () => openSession(s), onkeydown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openSession(s); } } },
            h('span', { class: 'fd-list-code' }, (s.id||'').slice(0,8)),
            h('div', { class: 'fd-list-main' },
                h('div', { class: 'fd-list-title' }, s.title || '(untitled)'),
                h('div', { class: 'fd-list-sub' }, subParts.join(' · '))
            ),
            h('div', { class: 'fd-list-meta' },
                cwdMeta ? h('span', { class: 'fd-list-meta-mono' }, cwdMeta) : null,
                tsMeta ? h('span', { class: 'fd-list-meta-rel' }, tsMeta) : null
            )
        );
    });
    const search = h('input', { type: 'search', 'aria-label': 'filter sessions', placeholder: 'filter by title / id / platform / cwd…', value: f.q, oninput: ev => { f.q = ev.target.value; if (typeof window.__fd_nav === 'function') window.__fd_nav('sessions'); }, class: 'fd-search' });
    const body = list.length === 0
        ? EmptyState({ text: 'no sessions yet — start one in /chat', glyph: '✉' })
        : filtered.length === 0
            ? EmptyState({ text: 'no matches for "'+f.q+'"', glyph: '⌕' })
            : h('div', { class: 'fd-list' }, ...items);
    return [
        Hero({ title: 'sessions', body: 'every chat turn lives here. click a row to continue.', accent: list.length+' total' }),
        Kpi({ items: [[list.length,'sessions'],[filtered.length,'shown']] }),
        Panel({ title: 'sessions', count: filtered.length, right: search, children: body })
    ];
}

export async function projects(h0) {
    const list = h0.pi.projects.list();
    const active = h0.pi.projects.active();
    const rows = h('div', { class: 'fd-list' }, ...list.map(p => {
        const isActive = p.name === active?.name;
        return h('div', { key: p.name, class: 'fd-list-row', 'data-cat': isActive ? 'kit' : 'doc', role: 'button', tabindex: '0',
            onclick: () => { if (!isActive) h0.pi.projects.setActive(p.name); },
            onkeydown: ev => { if ((ev.key === 'Enter' || ev.key === ' ') && !isActive) { ev.preventDefault(); h0.pi.projects.setActive(p.name); } } },
            h('span', { class: 'fd-list-code' }, isActive ? '●' : '○'),
            h('div', { class: 'fd-list-main' },
                h('div', { class: 'fd-list-title' }, p.name + (isActive ? '  (active)' : '')),
                h('div', { class: 'fd-list-sub' }, p.path)
            ));
    }));
    return [
        Hero({ title: 'projects', body: 'each project is its own ~/.freddie home.', accent: active ? 'active · '+active.name : 'no active project' }),
        Kpi({ items: [[list.length,'projects'],[active?.name||'—','active']] }),
        Panel({ title: 'add project', children: h('form', { class: 'row-form', onsubmit: ev => { ev.preventDefault(); h0.pi.projects.create({ name: ev.target.elements.name.value, path: ev.target.elements.path.value }); } },
            h('input', { name: 'name', placeholder: 'name', required: 'true' }),
            h('input', { name: 'path', placeholder: '/abs/path' }),
            h('button', { type: 'submit', class: 'btn-primary' }, 'add')
        ) }),
        Panel({ title: 'all projects', count: list.length, children: list.length ? rows : EmptyState({ text: 'no projects', glyph: '◆' }) })
    ];
}

export async function agents(h0) {
    const a = typeof h0.pi.agents === 'function' ? await h0.pi.agents() : { count: 0, turns: 0, active: null };
    const sList = await h0.pi.sessions.list();
    const recent = sList.slice(0, 10);
    const idle = !a.count;
    return [
        Hero({ title: 'agents', body: 'agent state machine snapshot. one xstate per turn.', accent: idle ? 'idle' : (a.count+' active') }),
        Kpi({ items: [[a.count||0,'active'],[a.turns||0,'turns total'],[sList.length,'sessions in store']] }),
        idle
            ? Panel({ title: 'no agent running', children: EmptyState({ text: 'start an agent by sending a prompt in /chat', glyph: '◌' }) })
            : Panel({ title: 'current agent', children: Receipt({ rows: [
                ['active session', a.active || '(none)'],
                ['total turns', String(a.turns || 0)],
                ['last activity', a.last_activity ? new Date(a.last_activity).toISOString().replace('T',' ').slice(0,19)+' UTC' : '—']
            ] }) }),
        Panel({ title: 'recent sessions', count: recent.length, children: recent.length === 0
            ? EmptyState({ text: 'no recent sessions', glyph: '✉' })
            : h('div', { class: 'fd-list' }, ...recent.map(s => h('div', { key: s.id, class: 'fd-list-row', 'data-cat': PLATFORM_CAT[s.platform] || 'doc' },
                h('span', { class: 'fd-list-code' }, (s.id||'').slice(0,8)),
                h('div', { class: 'fd-list-main' },
                    h('div', { class: 'fd-list-title' }, s.title || '(untitled)'),
                    h('div', { class: 'fd-list-sub' }, [s.platform||'—', s.model||'—'].join(' · '))
                ),
                h('div', { class: 'fd-list-meta' },
                    h('span', { class: 'fd-list-meta-mono' }, String(s.turns ?? s.message_count ?? 0)+' turns')
                )
            )))
        })
    ];
}

export async function analytics(h0) {
    const list = await h0.pi.sessions.list();
    const tools = [...h0.pi.tools.values()];
    const skills = [...h0.pi.skills.values()];
    const byPlat = list.reduce((a,s) => { const k = s.platform||'(unset)'; a[k] = (a[k]||0)+1; return a; }, {});
    const byModel = list.reduce((a,s) => { const k = s.model||'(unset)'; a[k] = (a[k]||0)+1; return a; }, {});
    const byToolset = tools.reduce((a,t) => { const k = t.toolset||'core'; a[k] = (a[k]||0)+1; return a; }, {});
    const bySkillCat = skills.reduce((a,s) => { const k = s.category||'other'; a[k] = (a[k]||0)+1; return a; }, {});
    const sortDesc = obj => Object.entries(obj).sort((a,b) => b[1]-a[1]);
    const CAT_BY_TITLE = { 'by platform': 'kit', 'by model': 'preview', 'by toolset': 'doc', 'by skill category': 'external' };
    const mkPanel = (title, obj, glyph) => Panel({ title, count: Object.keys(obj).length, children: Object.keys(obj).length === 0
        ? EmptyState({ text: 'no data', glyph })
        : h('div', { class: 'fd-list fd-list-compact' }, ...sortDesc(obj).map(([k, n], i) => h('div', { key: k, class: 'fd-list-row', 'data-cat': CAT_BY_TITLE[title] || 'doc' },
            h('span', { class: 'fd-list-code' }, String(i+1).padStart(2,'0')),
            h('div', { class: 'fd-list-main' }, h('div', { class: 'fd-list-title' }, k)),
            h('div', { class: 'fd-list-meta' }, h('span', { class: 'fd-list-meta-mono' }, String(n)))
        )))
    });
    return [
        Hero({ title: 'analytics', body: 'shape of work — what platforms, what models, what tools.' }),
        Kpi({ items: [[list.length,'sessions'],[tools.length,'tools'],[skills.length,'skills']] }),
        mkPanel('by platform', byPlat, '◉'),
        mkPanel('by model', byModel, '◎'),
        mkPanel('by toolset', byToolset, '⚒'),
        mkPanel('by skill category', bySkillCat, '◈')
    ];
}
