// Agent-turn bubbles: the collapsible tool-call card (with per-section copy,
// stringify caching, and unified-diff detection that routes a patch-shaped
// result through GitDiffView) and the transient/settled thinking indicator.

import * as webjsx from '../../../vendor/webjsx/index.js';
import { Icon } from '../shell.js';
import { t } from '../../i18n.js';
import { GitDiffView } from '../git-status.js';
import { copyToClipboardWithFeedback } from './inline.js';

const h = webjsx.createElement;

// A result/args body at or past this length gets its own nested fold instead
// of rendering straight into the (already scrollable, CSS max-height:320px)
// <pre> -- long output stays out of the DOM's paint path until the user opts
// in, rather than relying on the outer card's collapse alone (which a
// default-open running/error card, or an already-expanded done card, does
// nothing to bound).
const LONG_BODY_THRESHOLD = 2000;

// A tool result reads as a unified diff when it has at least one `@@ ... @@`
// hunk header and a +/- line — cheap enough to check on every render (no
// caching) since it only runs once per settled tool card, not per rAF tick.
function looksLikeUnifiedDiff(text) {
    if (!text || text.indexOf('@@') === -1) return false;
    return /^@@ .* @@/m.test(text) && /^[+-]/m.test(text);
}

// Wrap a <pre> body in its own <details> once it passes LONG_BODY_THRESHOLD;
// a short body renders exactly as before (no wrapper). `part` is the same
// part object ToolCallNode already caches args/result text on -- a plain
// own-property flag (part[cacheKey + 'Open']) survives across the part's
// re-renders (webjsx re-runs this factory every frame) the same way
// `_argsCache`/`_resultCache` already do, so the fold's open/closed state
// isn't reset by the next streaming tick. `defaultOpen` is the OUTER card's
// own open-by-default policy (running/error) -- SEEDED into part[openFlag]
// the first time this body is long enough to fold at all, rather than read
// fresh from `defaultOpen` on every render: `defaultOpen` is recomputed from
// `status` on every call and flips true->false the instant a running tool
// completes, so reading it live here would silently close an already-open
// fold out from under a user watching that exact result stream in. Seeding
// once locks in the state the user actually saw; only their own toggle
// changes it after that.
function foldableBody(part, cacheKey, text, preProps, defaultOpen) {
    const preNode = h('pre', preProps, h('code', {}, text));
    if (text.length < LONG_BODY_THRESHOLD) return preNode;
    const openFlag = cacheKey + 'Open';
    if (part[openFlag] === undefined) part[openFlag] = !!defaultOpen;
    const isOpen = part[openFlag];
    const lines = text.split('\n').length;
    return h('details', {
        class: 'chat-tool-longbody',
        open: isOpen,
        ontoggle: (e) => { part[openFlag] = e.currentTarget.open; },
    },
        h('summary', { class: 'chat-tool-longbody-summary' },
            `${lines.toLocaleString()} lines, ${text.length.toLocaleString()} chars -- click to expand`),
        preNode);
}

// Pull a filename out of a unified diff's `+++ b/path` (or `--- a/path`)
// header line, for the GitDiffView head label — best-effort, no filename is
// fine (GitDiffView renders headerless).
function filenameFromDiff(text) {
    const m = /^\+\+\+ b?\/?(.+)$/m.exec(text) || /^--- a?\/?(.+)$/m.exec(text);
    return m ? m[1].trim() : undefined;
}

// Freddie-flavored agent parts: collapsible tool-call card, tool-result, and
// transient thinking indicator. Each renders as a `chat-bubble` variant so the
// surrounding ChatMessage chrome (avatar/meta/reactions) stays consistent.
export function ToolCallNode(p) {
    const status = p.status || (p.error ? 'error' : (p.result != null ? 'done' : 'running'));
    // Args/result are re-stringified on every rAF re-render while any part of
    // the turn is streaming, even for collapsed cards whose own args/result
    // haven't changed since the last frame. Cache by identity on the part
    // object itself so an unchanged args/result skips the stringify.
    if (p._argsCache !== p.args) {
        p._argsTextCache = typeof p.args === 'string' ? p.args : JSON.stringify(p.args || {}, null, 2);
        p._argsCache = p.args;
    }
    const argsText = p._argsTextCache;
    if (p._resultCache !== p.result) {
        p._resultTextCache = p.result == null ? '' : (typeof p.result === 'string' ? p.result : JSON.stringify(p.result, null, 2));
        p._resultCache = p.result;
    }
    const resultText = p._resultTextCache;
    const hasArgs = p.args != null && argsText !== '{}' && argsText.trim() !== '';
    // Default-open while running or on error so the user sees live progress / failure detail;
    // collapse on success unless the caller explicitly overrides with open:true.
    const defaultOpen = p.open != null ? !!p.open : (status === 'running' || status === 'error');
    const iconName = status === 'running' ? 'refresh' : (status === 'error' ? 'warn' : 'check');
    const copyText = (txt) => (e) => copyToClipboardWithFeedback(txt, e.currentTarget);
    const sectionLabel = (text, txt) => h('div', { class: 'chat-tool-section-label' },
        h('span', {}, text),
        h('button', { type: 'button', class: 'chat-code-copy chat-tool-copy', 'aria-label': 'copy ' + text, onclick: copyText(txt) }, 'copy'));
    return h('details', { class: 'chat-bubble chat-tool tool-' + status, open: defaultOpen },
        h('summary', { class: 'chat-tool-head' },
            h('span', { class: 'chat-tool-icon', 'aria-hidden': 'true' }, Icon(iconName, { size: 14 })),
            h('span', { class: 'chat-tool-name' }, p.name || 'tool'),
            p.label ? h('span', { class: 'chat-tool-label' }, p.label) : null,
            h('span', { class: 'chat-tool-status' }, status)
        ),
        h('div', { class: 'chat-tool-body' },
            ...[
                hasArgs ? h('div', { class: 'chat-tool-section' },
                    sectionLabel('args', argsText),
                    foldableBody(p, '_args', argsText, { class: 'chat-tool-pre' }, defaultOpen)) : null,
                resultText
                    ? (!p.error && looksLikeUnifiedDiff(resultText)
                        // A patch-shaped tool result (edit/write/diff tools) renders
                        // through the same split unified-diff view git-status.js's
                        // GitDiffView already owns, instead of a raw JSON/text dump —
                        // colored +/- hunks read far better than escaped plaintext.
                        ? h('div', { class: 'chat-tool-section' },
                            sectionLabel('result', resultText),
                            GitDiffView({ diff: resultText, filename: filenameFromDiff(resultText) }))
                        : h('div', { class: 'chat-tool-section' },
                            sectionLabel(p.error ? 'error' : 'result', resultText),
                            foldableBody(p, '_result', resultText, { class: 'chat-tool-pre' + (p.error ? ' is-error' : '') }, defaultOpen)))
                    // A finished tool with no output would otherwise render no result
                    // section, reading identically to a still-running tool. Show an
                    // explicit placeholder so "done, empty" is distinguishable.
                    : (status === 'done' ? h('div', { class: 'chat-tool-section' },
                        h('div', { class: 'chat-tool-section-label' }, 'result'),
                        h('pre', { class: 'chat-tool-pre chat-tool-empty' }, h('code', {}, '(no output)'))) : null)
            ].filter(Boolean)
        )
    );
}

// Approval-request card for the freddie wire protocol's approval.request event
// (plugins/gui/gui-agent): a gated tool call pauses mid-turn until the user
// resolves it here. p.onResolve({approved, always?}) sends the decision back
// over the same channel; once resolved the card renders the settled state.
export function ApprovalNode(p) {
    const status = p.status || 'pending';
    const argsText = typeof p.args === 'string' ? p.args : JSON.stringify(p.args || {}, null, 2);
    const iconName = status === 'pending' ? 'warn' : (status === 'approved' ? 'check' : 'warn');
    // Clear onResolve immediately on click, before the round trip to the
    // server settles the card's status -- otherwise the buttons stay live
    // (they only hide once status stops being 'pending') and a fast double
    // click, or clicking two different decisions in a row, sends two
    // decision frames for the same approval id.
    const decide = (decision) => (e) => { e.preventDefault(); const fn = p.onResolve; if (fn) { p.onResolve = null; fn(decision); } };
    return h('div', { class: 'chat-bubble chat-tool chat-approval tool-' + (status === 'pending' ? 'running' : status) },
        h('div', { class: 'chat-tool-head' },
            h('span', { class: 'chat-tool-icon', 'aria-hidden': 'true' }, Icon(iconName, { size: 14 })),
            h('span', { class: 'chat-tool-name' }, 'approval: ' + (p.name || 'tool')),
            h('span', { class: 'chat-tool-status' }, status)
        ),
        h('div', { class: 'chat-tool-body' },
            h('div', { class: 'chat-tool-section' },
                h('div', { class: 'chat-tool-section-label' }, h('span', {}, 'args')),
                h('pre', { class: 'chat-tool-pre' }, h('code', {}, argsText))),
            status === 'pending'
                ? h('div', { class: 'chat-approval-actions' },
                    h('button', { type: 'button', class: 'chat-code-copy chat-approval-btn', onclick: decide({ approved: true }) }, 'approve'),
                    h('button', { type: 'button', class: 'chat-code-copy chat-approval-btn', onclick: decide({ approved: true, always: true }) }, 'always'),
                    h('button', { type: 'button', class: 'chat-code-copy chat-approval-btn', onclick: decide({ approved: false }) }, 'reject'))
                : h('div', { class: 'chat-approval-note' }, status === 'approved' ? (p.always ? 'approved (always, this turn)' : 'approved') : 'rejected')
        )
    );
}

export function QuestionNode(p) {
    const status = p.status || 'pending'
    const questions = Array.isArray(p.questions) ? p.questions : []
    if (!p._sel) p._sel = {}
    const submit = (e) => {
        e.preventDefault()
        const fn = p.onResolve
        if (!fn) return
        p.onResolve = null
        const answers = {}
        for (const q of questions) {
            const v = p._sel[q.question]
            answers[q.question] = Array.isArray(v) ? v.join(', ') : (v || '')
        }
        fn({ answers })
    }
    const skip = (e) => { e.preventDefault(); const fn = p.onResolve; if (fn) { p.onResolve = null; fn({ rejected: true }) } }
    const blocks = questions.map((q, qi) => {
        const qtext = q.question || ''
        const opts = Array.isArray(q.options) ? q.options : []
        const multi = !!q.multi_select
        const kids = []
        if (q.header) kids.push(h('div', { key: 'h' + qi, class: 'chat-question-header' }, q.header))
        kids.push(h('div', { key: 't' + qi, class: 'chat-question-text' }, qtext))
        if (opts.length) {
            kids.push(h('div', { key: 'o' + qi, class: 'chat-question-opts' },
                ...opts.map((o, oi) => h('button', {
                    key: 'ob' + qi + '-' + oi, type: 'button',
                    class: 'chat-code-copy chat-approval-btn',
                    onclick: (e) => {
                        e.preventDefault()
                        if (multi) {
                            const cur = new Set(p._sel[qtext] || [])
                            if (cur.has(o.label)) cur.delete(o.label); else cur.add(o.label)
                            p._sel[qtext] = [...cur]
                            e.currentTarget.classList.toggle('is-on')
                        } else {
                            p._sel[qtext] = o.label
                            e.currentTarget.parentNode.querySelectorAll('.chat-approval-btn').forEach((b) => b.classList.remove('is-on'))
                            e.currentTarget.classList.add('is-on')
                        }
                    },
                }, o.label))))
        }
        kids.push(h('input', {
            key: 'i' + qi, type: 'text', class: 'chat-question-other', placeholder: 'other…',
            onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); p._sel[qtext] = e.currentTarget.value; submit(e) } },
        }))
        return h('div', { key: 'q' + qi, class: 'chat-question-block' }, ...kids)
    })
    return h('div', { class: 'chat-bubble chat-tool chat-question tool-' + (status === 'pending' ? 'running' : 'done') },
        h('div', { class: 'chat-tool-head' },
            h('span', { class: 'chat-tool-icon', 'aria-hidden': 'true' }, Icon(status === 'pending' ? 'warn' : 'check', { size: 14 })),
            h('span', { class: 'chat-tool-name' }, 'question'),
            h('span', { class: 'chat-tool-status' }, status)),
        h('div', { class: 'chat-tool-body' },
            status === 'pending'
                ? [...blocks, h('div', { key: 'act', class: 'chat-approval-actions' },
                    h('button', { type: 'button', class: 'chat-code-copy chat-approval-btn', onclick: submit }, 'submit'),
                    h('button', { type: 'button', class: 'chat-code-copy chat-approval-btn', onclick: skip }, 'skip'))]
                : h('pre', { class: 'chat-tool-pre' }, h('code', {}, JSON.stringify(p.answers || {}, null, 2)))))
}

export function ThinkingNode(p) {
    if (p.settled) {
        return h('details', { class: 'chat-bubble chat-thinking-settled' },
            h('summary', {}, t('chat.viewThinking', 'View thinking')),
            h('div', { class: 'chat-thinking-body' }, p.text)
        );
    }
    return h('div', { class: 'chat-bubble chat-thinking', role: 'status', 'aria-live': 'polite' },
        h('span', { class: 'chat-thinking-dots', 'aria-hidden': 'true' }, h('span'), h('span'), h('span')),
        h('span', { class: 'chat-thinking-text' }, p.text || t('chat.thinking', 'thinking…'))
    );
}
