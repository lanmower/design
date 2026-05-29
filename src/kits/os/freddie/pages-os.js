// OS-overlay freddie pages, only mounted when osSurfaces is provided.
import * as components from '../../../components.js';
import { pre } from './helpers.js';

const { Panel, Kpi, Table, EmptyState } = components;

export function makeOsPages(ctx) {
    const { osSurfaces, instance } = ctx;
    return {
        async ['os-instances']() {
            const list = (osSurfaces && osSurfaces.instances && osSurfaces.instances()) || [];
            const activeId = osSurfaces && osSurfaces.activeInstanceId && osSurfaces.activeInstanceId();
            return [
                Kpi({ items: [[list.length, 'instances'], [activeId || '—', 'active']] }),
                Panel({ title: 'instances', count: list.length, children: list.length === 0
                    ? EmptyState({ text: 'no instances', glyph: '◫' })
                    : Table({ headers: ['id', 'active', 'shells', 'windows'],
                        rows: list.map(i => [i.id, i.id === activeId ? '●' : '', String((i.shells || []).length), String((i.windows || []).length)]) }) }),
            ];
        },
        async ['os-windows']() {
            const wins = (osSurfaces && osSurfaces.wm && osSurfaces.wm.list && osSurfaces.wm.list()) || [];
            const focused = osSurfaces && osSurfaces.wm && osSurfaces.wm.focused;
            return [
                Kpi({ items: [[wins.length, 'windows'], [focused ? (focused.id || focused.title || '?') : '—', 'focused']] }),
                Panel({ title: 'windows', count: wins.length, children: wins.length === 0
                    ? EmptyState({ text: 'no windows open', glyph: '▭' })
                    : Table({ headers: ['id', 'title', 'min', 'max', 'pos'],
                        rows: wins.map(w => [w.id || '?', w.title || '', w.min ? '●' : '', w.max ? '●' : '',
                            (w.el ? `${w.el.offsetLeft},${w.el.offsetTop} ${w.el.offsetWidth}×${w.el.offsetHeight}` : '')]) }) }),
            ];
        },
        async ['os-x']() {
            const x = osSurfaces && osSurfaces.xServer && osSurfaces.xServer();
            if (!x) return [Panel({ title: 'x-server', children: EmptyState({ text: 'x-server not running in this instance', glyph: '✕' }) })];
            return [
                Kpi({ items: [[x.windows, 'windows'], [x.pixmaps, 'pixmaps'], [x.gcs, 'gcs'], [x.atoms, 'atoms'], [x.cursors, 'cursors']] }),
                Panel({ title: 'display', children: pre(x) }),
            ];
        },
        async ['os-fs']() {
            const list = await instance.fs.list('/');
            return [
                Kpi({ items: [[list.length, 'paths'], [instance.id, 'instance']] }),
                Panel({ title: 'paths', count: list.length, children: list.length === 0
                    ? EmptyState({ text: 'empty fs', glyph: '◫' })
                    : pre(list.join('\n')) }),
            ];
        },
    };
}
