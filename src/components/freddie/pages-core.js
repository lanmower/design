import * as webjsx from '../../../vendor/webjsx/index.js';
import { Panel, Row, Hero, Receipt, Kpi, Table } from '../content.js';
import { EmptyState } from '../files.js';
import { skillLabel } from './helpers.js';
const h = webjsx.createElement;

export async function home(h0) {
    const sessions = await h0.pi.sessions.list();
    const health = h0.pi.health();
    return [
        Hero({ title: 'freddie', body: 'open js agent harness.', accent: h0.version || 'web' }),
        Kpi({ items: [[sessions.length,'sessions'],[h0.pi.tools.size,'tools'],[h0.pi.skills.size,'skills']] }),
        Panel({ title: 'quick start', children: Receipt({ rows: [
            ['open chat',"click 'chat' — set a working directory"],
            ['pick skill','software dev, research, planning'],
            ['set api key','keys tab → click chip'],
            ['add cron','cron tab → form']
        ] }) }),
        Panel({ title: 'host', children: Receipt({ rows: Object.entries(health).map(([k,v]) => [k, String(v)]) }) })
    ];
}

export async function sessions(h0) {
    const list = await h0.pi.sessions.list();
    const rows = list.map(s => {
        const cont = h('button', { class: 'btn-primary', onclick: async () => {
            const msgs = await h0.pi.sessions.getMessages(s.id);
            const cs = window.__fd_chatState = window.__fd_chatState || { messages: [], busy: false, sessionId: null, cwd: '', skill: '', provider: '', model: '' };
            cs.sessionId = s.id;
            cs.messages = msgs.map(m => ({ role: m.role, content: String(m.content || '') }));
            if (s.cwd) cs.cwd = s.cwd;
            if (s.skill) cs.skill = s.skill;
            if (typeof window.__fd_nav === 'function') window.__fd_nav('chat');
        } }, 'continue');
        return [(s.id||'').slice(0,8), s.title||'—', s.platform||'—', s.model||'—', s.cwd?s.cwd.slice(-30):'—', s.skill?skillLabel({name:s.skill}):'—', cont];
    });
    return [
        Kpi({ items: [[list.length,'sessions']] }),
        Panel({ title: 'sessions', count: list.length, children: list.length === 0 ? EmptyState({ text: 'no sessions yet', glyph: '✉' }) : Table({ headers: ['id','title','platform','model','cwd','skill',''], rows }) })
    ];
}

export async function projects(h0) {
    const list = h0.pi.projects.list();
    const active = h0.pi.projects.active();
    const rows = list.map(p => Row({
        key: p.name,
        code: p.name === active?.name ? '●' : '○',
        title: p.name + (p.name === active?.name ? '  (active)' : ''),
        meta: p.path,
        onClick: () => { if (p.name !== active?.name) h0.pi.projects.setActive(p.name); }
    }));
    return [
        Hero({ title: 'projects', body: 'each project is its own ~/.freddie home.', accent: active ? 'active · '+active.name : 'no active project' }),
        Kpi({ items: [[list.length,'projects'],[active?.name||'—','active']] }),
        Panel({ title: 'add project', children: h('form', { class: 'row-form', onsubmit: ev => { ev.preventDefault(); h0.pi.projects.create({ name: ev.target.elements.name.value, path: ev.target.elements.path.value }); } },
            h('input', { name: 'name', placeholder: 'name', required: 'true' }),
            h('input', { name: 'path', placeholder: '/abs/path' }),
            h('button', { type: 'submit', class: 'btn-primary' }, 'add')
        ) }),
        Panel({ title: 'all projects', count: list.length, children: rows.length ? rows : EmptyState({ text: 'no projects', glyph: '◆' }) })
    ];
}

export async function agents(h0) {
    const a = typeof h0.pi.agents === 'function' ? await h0.pi.agents() : { count: 0, turns: 0, active: null };
    const sList = await h0.pi.sessions.list();
    const recent = sList.slice(0, 10);
    return [
        Kpi({ items: [[a.count||0,'active'],[a.turns||0,'turns'],[sList.length,'total sessions']] }),
        Panel({ title: 'current agent', children: Receipt({ rows: [
            ['active session', a.active || '(none)'],
            ['total turns', String(a.turns || 0)],
            ['count', String(a.count || 0)]
        ] }) }),
        Panel({ title: 'recent sessions', count: recent.length, children: recent.length === 0
            ? EmptyState({ text: 'no recent sessions', glyph: '◈' })
            : Table({ headers: ['id','title','platform','turns'], rows: recent.map(s => [(s.id||'').slice(0,8), s.title||'—', s.platform||'—', String(s.turns ?? s.message_count ?? '—')]) })
        })
    ];
}

export async function analytics(h0) {
    const list = await h0.pi.sessions.list();
    const tools = [...h0.pi.tools.values()];
    const skills = [...h0.pi.skills.values()];
    const byPlat = list.reduce((a,s) => { const k = s.platform||'?'; a[k] = (a[k]||0)+1; return a; }, {});
    const byModel = list.reduce((a,s) => { const k = s.model||'?'; a[k] = (a[k]||0)+1; return a; }, {});
    const byToolset = tools.reduce((a,t) => { const k = t.toolset||'core'; a[k] = (a[k]||0)+1; return a; }, {});
    const bySkillCat = skills.reduce((a,s) => { const k = s.category||'other'; a[k] = (a[k]||0)+1; return a; }, {});
    const sortDesc = obj => Object.entries(obj).sort((a,b) => b[1]-a[1]).map(([k,v]) => [k, String(v)]);
    const mkPanel = (title, obj, glyph) => Panel({ title, count: Object.keys(obj).length, children: Object.keys(obj).length === 0
        ? EmptyState({ text: 'no data', glyph })
        : Table({ headers: ['name','count'], rows: sortDesc(obj) })
    });
    return [
        Kpi({ items: [[list.length,'sessions'],[tools.length,'tools'],[skills.length,'skills']] }),
        mkPanel('by platform', byPlat, '◉'),
        mkPanel('by model', byModel, '◎'),
        mkPanel('by toolset', byToolset, '⚒'),
        mkPanel('by skill category', bySkillCat, '◈')
    ];
}
