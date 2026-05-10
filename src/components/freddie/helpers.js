import * as webjsx from '../../../vendor/webjsx/index.js';
import { Receipt, Panel } from '../content.js';
import { Chip } from '../shell.js';
const h = webjsx.createElement;

export const skillLabel = s => (s.name||'').replace(/^gm:/,'').replace(/-/g,' ');
export const getRecentPaths = () => { try { return JSON.parse(localStorage.getItem('fd_recent_cwds')||'[]'); } catch { return []; } };
export const saveRecentPath = p => { if (!p) return; const a = getRecentPaths().filter(x=>x!==p); a.unshift(p); localStorage.setItem('fd_recent_cwds', JSON.stringify(a.slice(0,5))); };

export function tryParseJson(s) { if (typeof s !== 'string') return null; const t = s.trim(); if (!t || (t[0] !== '{' && t[0] !== '[')) return null; try { return JSON.parse(t); } catch { return null; } }

export function flattenKv(obj, prefix='') {
    const rows = [];
    for (const [k, v] of Object.entries(obj || {})) {
        const key = prefix ? prefix+'.'+k : k;
        if (v === null || v === undefined) rows.push([key, '—']);
        else if (typeof v === 'object' && !Array.isArray(v)) rows.push(...flattenKv(v, key));
        else if (Array.isArray(v)) rows.push([key, v.length === 0 ? '—' : v.map(x => typeof x === 'object' ? '{…}' : String(x)).join(', ')]);
        else rows.push([key, String(v)]);
    }
    return rows;
}

export function renderConfigSections(cfg) {
    const sections = [];
    for (const [k, v] of Object.entries(cfg || {})) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            sections.push(Panel({ title: k, children: Receipt({ rows: flattenKv(v) }) }));
        }
    }
    const scalars = Object.entries(cfg || {}).filter(([_, v]) => !(v && typeof v === 'object' && !Array.isArray(v))).map(([k, v]) => [k, Array.isArray(v) ? '['+v.length+']' : String(v ?? '—')]);
    if (scalars.length) sections.unshift(Panel({ title: 'top-level', children: Receipt({ rows: scalars }) }));
    return sections;
}

export function renderToolArgs(args) {
    if (!args || typeof args !== 'object') return h('span', { class: 'fd-muted' }, '(no args)');
    const rows = flattenKv(args);
    if (!rows.length) return h('span', { class: 'fd-muted' }, '(empty)');
    return h('table', { class: 'kv fd-tool-kv' }, h('tbody', {},
        ...rows.map(([k, v], i) => h('tr', { key: i },
            h('td', {}, k),
            h('td', {}, String(v).length > 200 ? String(v).slice(0,200)+'…' : String(v))
        ))
    ));
}

export function renderChatMessages(el, msgs) {
    if (!el) return; el.innerHTML = '';
    for (const m of msgs) {
        const div = document.createElement('div');
        div.className = 'fd-msg' + (m.role === 'assistant' ? ' fd-msg-assistant' : m.role === 'tool' ? ' fd-msg-tool' : '');
        if (m.role === 'tool') {
            const det = document.createElement('details');
            det.className = 'fd-tool-call';
            const sum = document.createElement('summary');
            sum.textContent = (m.name || 'tool') + (m.argsSummary ? ' · '+m.argsSummary : '');
            det.appendChild(sum);
            const body = document.createElement('div');
            body.className = 'fd-tool-body';
            const parsedArgs = tryParseJson(m.content);
            if (parsedArgs && typeof parsedArgs === 'object') {
                const tbl = document.createElement('table');
                tbl.className = 'kv fd-tool-kv';
                const tb = document.createElement('tbody');
                for (const [k, v] of flattenKv(parsedArgs)) {
                    const tr = document.createElement('tr');
                    const tdK = document.createElement('td'); tdK.textContent = k;
                    const tdV = document.createElement('td'); tdV.textContent = String(v).length > 240 ? String(v).slice(0,240)+'…' : String(v);
                    tr.appendChild(tdK); tr.appendChild(tdV); tb.appendChild(tr);
                }
                tbl.appendChild(tb); body.appendChild(tbl);
            } else {
                const pre = document.createElement('pre');
                pre.className = 'fd-pre';
                pre.textContent = m.content || '';
                body.appendChild(pre);
            }
            det.appendChild(body); div.appendChild(det);
        } else {
            const pre = document.createElement('pre');
            pre.className = 'fd-pre';
            pre.textContent = m.content || '';
            div.appendChild(pre);
        }
        el.appendChild(div);
    }
    el.scrollTop = el.scrollHeight;
}
