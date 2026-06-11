// Community surface — matches upstream signatures.

import * as webjsx from '../../vendor/webjsx/index.js';
import { Icon } from './shell.js';
import { sanitizeHtml } from '../markdown.js';
const h = webjsx.createElement;

// Clamp a count to a compact badge string (matches the rail's 99+ convention),
// so a runaway number never blows out a fixed-width badge or item row.
const clampCount = (n) => { const v = Number(n) || 0; return v > 99 ? '99+' : String(v); };

export function ServerIcon({ id, name, icon, active, badge, onClick } = {}) {
    const initials = (name || '?').slice(0, 2).toUpperCase();
    return h('div', {
        class: 'cm-server-icon' + (active ? ' active' : ''),
        onclick: onClick,
        role: 'button',
        'aria-label': name,
        'aria-pressed': active ? 'true' : 'false',
        tabindex: '0',
        'data-id': id,
        onkeydown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick && onClick(e);
            }
        }
    },
        h('span', { class: 'cm-server-pill' }),
        icon ? h('img', { src: icon, alt: name }) : h('span', {}, initials),
        badge ? h('span', { class: 'cm-server-badge' }, badge > 99 ? '99+' : String(badge)) : null
    );
}

export function ServerRail({ servers = [], activeId, onSelect, onAdd } = {}) {
    return h('div', { class: 'cm-server-rail', role: 'navigation', 'aria-label': 'servers' },
        h('a', { class: 'cm-server-back', href: '../', title: 'Back', 'aria-label': 'back' }, Icon('chevron-left')),
        h('div', { class: 'cm-server-sep', 'aria-hidden': 'true' }),
        ...servers.map(s => ServerIcon({ ...s, active: s.id === activeId, onClick: () => onSelect && onSelect(s.id) })),
        onAdd ? h('button', { class: 'cm-server-add', type: 'button', onclick: onAdd, title: 'Add server', 'aria-label': 'add server' }, '+') : null
    );
}

export function ChannelItem({ id, name, type = 'text', active, voiceActive, voiceConnecting, badge, draggable, actions = [], participants = [], onClick, onContext } = {}) {
    const ICON_FOR = { voice: 'speaker', forum: 'forum', threaded: 'thread', announcement: 'megaphone', page: 'page', thread: 'thread', text: 'hash' };
    const icon = Icon(ICON_FOR[type] || 'hash', { size: 15 });
    const handleActionClick = (a, e) => { e.stopPropagation(); a.onClick && a.onClick(id, e); };
    return h('div', { class: 'cm-channel-item-wrap', 'data-channel-wrap': id },
        h('div', {
            class: 'cm-channel-item' + (active ? ' active' : '') + (voiceActive ? ' voice-active' : '') + (voiceConnecting ? ' voice-connecting' : ''),
            'data-id': id,
            'data-type': type,
            draggable: draggable ? 'true' : null,
            onclick: onClick,
            oncontextmenu: (e) => { e.preventDefault(); onContext && onContext(id, e.clientX, e.clientY); },
            onkeydown: (e) => {
                if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    onContext && onContext(id, rect.left, rect.top + rect.height);
                }
                if (draggable) {
                    if (e.ctrlKey && e.key === 'ArrowUp') {
                        e.preventDefault();
                        window.dispatchEvent(new CustomEvent('reorder', { detail: { id, direction: 'up' } }));
                    }
                    if (e.ctrlKey && e.key === 'ArrowDown') {
                        e.preventDefault();
                        window.dispatchEvent(new CustomEvent('reorder', { detail: { id, direction: 'down' } }));
                    }
                }
            },
            tabindex: '0',
            role: 'option'
        },
            h('span', { class: 'cm-ch-icon' + (voiceActive ? ' voice-active-badge' : ''), 'data-voice-active': voiceActive ? 'true' : null }, icon),
            voiceConnecting ? h('span', { class: 'cm-ch-spinner', title: 'Connecting…', 'aria-label': 'Connecting to voice channel…' }) : voiceActive ? h('span', { class: 'cm-ch-voice-badge', title: 'Voice active', 'aria-label': 'Voice channel active' }) : null,
            h('span', { class: 'cm-ch-name' }, name),
            badge ? h('span', { class: 'cm-ch-badge' }, badge > 99 ? '99+' : String(badge)) : null,
            actions.length ? h('div', { class: 'cm-ch-actions' },
                ...actions.map(a => h('button', {
                    class: 'cm-ch-action-btn',
                    title: a.title || '',
                    'data-action': a.id || '',
                    onclick: (e) => handleActionClick(a, e)
                }, a.icon || a.label || '⋯'))
            ) : null
        ),
        voiceActive && participants.length ? h('div', { class: 'cm-ch-voice-users' },
            ...participants.map(p => h('div', { class: 'cm-ch-voice-user' + (p.speaking ? ' speaking' : '') },
                h('div', { class: 'cm-ch-voice-user-avatar', style: p.color ? `--avatar-bg:${p.color}` : null }, (p.identity || '?').slice(0, 1).toUpperCase()),
                h('span', { class: 'cm-ch-voice-user-name' }, p.identity)
            ))
        ) : null
    );
}

export function ChannelCategory({ id, name, channels = [], collapsed, activeId, onToggle, onAddChannel, onChannelClick, onChannelContext, onContextMenu, extraButton, channelDraggable } = {}) {
    return h('div', { class: 'cm-channel-category', 'data-category': id },
        h('div', {
            class: 'cm-category-header' + (collapsed ? ' collapsed' : ''),
            onclick: () => onToggle && onToggle(id),
            oncontextmenu: onContextMenu ? (e) => { e.preventDefault(); onContextMenu(id, e.clientX, e.clientY); } : null
        },
            h('svg', { class: 'cm-cat-arrow', viewBox: '0 0 24 24' }, h('path', { d: 'M7 10l5 5 5-5z' })),
            h('span', { class: 'cm-cat-name' }, name),
            extraButton ? h('button', { class: 'cm-cat-extra', onclick: (e) => { e.stopPropagation(); extraButton.onClick && extraButton.onClick(id, e); }, 'aria-label': extraButton.title || 'Category action' }, extraButton.icon || extraButton.label || '+') : null,
            onAddChannel ? h('button', { class: 'cm-cat-add', onclick: (e) => { e.stopPropagation(); onAddChannel(id); }, 'aria-label': 'Add channel to ' + name }, '+') : null
        ),
        collapsed ? null : h('div', { class: 'cm-cat-channels' },
            ...channels.map(c => ChannelItem({
                ...c,
                draggable: channelDraggable,
                active: c.id === activeId,
                onClick: () => onChannelClick && onChannelClick(c),
                onContext: onChannelContext
            }))
        )
    );
}

export function VoiceUser({ identity, speaking, color } = {}) {
    const initial = (identity || '?').slice(0, 1).toUpperCase();
    return h('div', { class: 'cm-voice-user' + (speaking ? ' speaking' : '') },
        h('div', { class: 'cm-voice-user-avatar', style: color ? `--avatar-bg:${color}` : null }, initial),
        h('span', { class: 'cm-voice-user-name' }, identity)
    );
}

export function UserPanel({ name, tag, color, muted, deafened, onMute, onDeafen, onSettings } = {}) {
    const initial = (name || '?').slice(0, 1).toUpperCase();
    const handleSettings = (e) => {
        e.preventDefault();
        if (onSettings) {
            // onSettings callback should open a drawer/modal with quick toggles
            onSettings({
                audioDevice: null, // controlled by consumer
                micOn: !muted,
                speakerOn: !deafened,
            });
        }
    };
    return h('div', { class: 'cm-user-panel' },
        h('div', { class: 'cm-user-avatar', style: color ? `--avatar-bg:${color}` : null },
            h('span', { class: 'cm-user-status-dot' }),
            initial
        ),
        h('div', { class: 'cm-user-info' },
            h('div', { class: 'cm-user-name' }, name || 'You'),
            tag ? h('div', { class: 'cm-user-tag' }, tag) : null
        ),
        h('div', { class: 'cm-user-controls' },
            h('button', { class: 'cm-user-btn' + (muted ? ' muted' : ''), onclick: onMute, 'aria-label': muted ? 'Unmute microphone' : 'Mute microphone', 'aria-pressed': muted ? 'true' : 'false' }, Icon(muted ? 'mic-off' : 'mic')),
            h('button', { class: 'cm-user-btn' + (deafened ? ' deafened' : ''), onclick: onDeafen, 'aria-label': deafened ? 'Undeafen' : 'Deafen', 'aria-pressed': deafened ? 'true' : 'false' }, Icon(deafened ? 'speaker-off' : 'speaker')),
            h('button', { class: 'cm-user-btn', onclick: handleSettings, 'aria-label': 'Audio settings', title: 'Open audio settings' }, Icon('settings'))
        )
    );
}

export function ChannelSidebar({ serverName, channels = [], categories = [], activeId, collapsedCats, onChannelClick, onCategoryToggle, onAddChannel, onChannelContext, userPanelProps } = {}) {
    const collapsed = collapsedCats || new Set();
    const uncategorized = channels.filter(c => !c.categoryId || !categories.find(cat => cat.id === c.categoryId));
    const sorted = [...categories].sort((a, b) => (a.position || 0) - (b.position || 0));
    return h('div', { class: 'cm-channel-sidebar' },
        h('div', { class: 'cm-server-header' },
            h('span', { class: 'cm-server-header-name' }, serverName || 'Server'),
        ),
        h('div', { class: 'cm-channel-list' },
            (sorted.length === 0 && uncategorized.length === 0)
                ? h('div', { class: 'cm-channel-empty' }, 'no channels yet')
                : null,
            ...sorted.map(cat => ChannelCategory({
                id: cat.id,
                name: cat.name,
                channels: channels.filter(c => c.categoryId === cat.id).sort((a, b) => (a.position || 0) - (b.position || 0)),
                collapsed: collapsed.has && collapsed.has(cat.id),
                activeId,
                onToggle: onCategoryToggle,
                onAddChannel,
                onChannelClick,
                onChannelContext
            })),
            uncategorized.length ? ChannelCategory({
                id: 'uncategorized',
                name: 'CHANNELS',
                channels: uncategorized,
                activeId,
                onChannelClick,
                onChannelContext
            }) : null
        ),
        userPanelProps ? UserPanel(userPanelProps) : null
    );
}

export function MemberItem({ identity, name, color, status = 'online' } = {}) {
    const initial = (name || identity || '?').slice(0, 1).toUpperCase();
    return h('div', { class: 'cm-member-item' },
        h('div', { class: 'cm-member-avatar', style: color ? `--avatar-bg:${color}` : null },
            h('span', { class: 'cm-member-status' + (status === 'online' ? ' online' : '') }),
            initial
        ),
        h('span', { class: 'cm-member-name' }, name || identity)
    );
}

export function MemberList({ categories = [], open } = {}) {
    const total = categories.reduce((n, cat) => n + (cat.members ? cat.members.length : 0), 0);
    return h('div', { class: 'cm-member-list' + (open ? ' open' : '') },
        total === 0
            ? h('div', { key: '_empty', class: 'cm-member-empty' }, 'no members')
            : null,
        ...categories.flatMap(cat => [
            h('div', { class: 'cm-member-category', key: cat.label }, `${cat.label} — ${cat.members.length}`),
            ...cat.members.map((m, i) => MemberItem({ ...m, key: m.identity || i }))
        ])
    );
}

export function ChatHeader({ icon = '#', name, topic, toolbar = [] } = {}) {
    return h('div', { class: 'cm-chat-header' },
        h('span', { class: 'cm-chat-header-icon' }, icon),
        h('span', { class: 'cm-chat-header-name' }, name),
        topic ? h('span', { class: 'cm-chat-header-topic' }, topic) : null,
        h('div', { class: 'cm-chat-header-toolbar' }, ...toolbar)
    );
}

export function VoiceStrip({ channelName, status, muted, deafened, onMute, onDeafen, onLeave, open } = {}) {
    return h('div', { class: 'cm-voice-strip' + (open ? ' open' : ''), role: 'region', 'aria-label': 'voice controls' },
        h('div', { class: 'cm-vs-label' },
            h('span', { class: 'cm-vs-channel' }, Icon('speaker'), ' ' + (channelName || 'voice')),
            h('span', { class: 'cm-vs-status' }, status || 'connected')
        ),
        h('button', {
            class: 'cm-vs-btn', type: 'button', onclick: onMute,
            title: muted ? 'Unmute' : 'Mute',
            'aria-label': muted ? 'unmute microphone' : 'mute microphone',
            'aria-pressed': muted ? 'true' : 'false'
        }, Icon(muted ? 'mic-off' : 'mic')),
        h('button', {
            class: 'cm-vs-btn', type: 'button', onclick: onDeafen,
            title: deafened ? 'Undeafen' : 'Deafen',
            'aria-label': deafened ? 'undeafen' : 'deafen',
            'aria-pressed': deafened ? 'true' : 'false'
        }, Icon(deafened ? 'speaker-off' : 'speaker')),
        h('button', {
            class: 'cm-vs-btn danger', type: 'button', onclick: onLeave,
            title: 'Leave voice', 'aria-label': 'leave voice channel'
        }, Icon('x'))
    );
}

export function MobileHeader({ title, channelType, channelName, onMenu, onMembers } = {}) {
    const ICON_FOR = { voice: 'speaker', forum: 'forum', threaded: 'thread', announcement: 'megaphone', page: 'page', thread: 'thread', text: 'hash' };
    const titleNode = channelType
        ? [Icon(ICON_FOR[channelType] || 'hash', { size: 16 }), ' ' + (channelName || '')]
        : [title || ''];
    return h('div', { class: 'cm-mobile-header', role: 'banner' },
        h('button', {
            class: 'cm-mh-btn', type: 'button', onclick: onMenu,
            title: 'Menu', 'aria-label': 'open navigation menu'
        }, Icon('menu')),
        h('span', { class: 'cm-mh-title' }, ...titleNode),
        h('button', {
            class: 'cm-mh-btn', type: 'button', onclick: onMembers,
            title: 'Members', 'aria-label': 'show members'
        }, Icon('members'))
    );
}

export function ReplyBar({ quotedMessage, quotedAuthor, onCancel } = {}) {
    return h('div', { class: 'cm-reply-bar', role: 'status' },
        h('span', { class: 'cm-rb-label' }, 'Replying to ',
            h('strong', { class: 'cm-rb-author' }, quotedAuthor || 'unknown')
        ),
        h('span', { class: 'cm-rb-preview', title: quotedMessage || '' }, quotedMessage || ''),
        h('button', {
            class: 'cm-rb-cancel', type: 'button', onclick: onCancel,
            title: 'Cancel reply', 'aria-label': 'cancel reply'
        }, Icon('x'))
    );
}

export function Banner({ tone = 'info', message, visible, actionLabel, onAction, onClick } = {}) {
    if (!visible || !message) return null;
    return h('div', {
        class: 'cm-banner tone-' + tone + (onClick ? ' clickable' : ''),
        role: tone === 'error' || tone === 'warning' ? 'alert' : 'status',
        onclick: onClick || null
    },
        h('span', { class: 'cm-banner-msg' }, message),
        actionLabel ? h('button', {
            class: 'cm-banner-action', type: 'button',
            onclick: (e) => { e.stopPropagation(); onAction && onAction(e); }
        }, actionLabel) : null
    );
}

function fmtRelTime(ts) {
    const t = Number(ts) || 0;
    if (!t) return '';
    const ms = t > 1e12 ? t : t * 1000;
    const d = Math.max(0, Date.now() - ms);
    const m = Math.floor(d / 60000);
    if (m < 1) return 'now';
    if (m < 60) return m + 'm';
    const hr = Math.floor(m / 60);
    if (hr < 24) return hr + 'h';
    return Math.floor(hr / 24) + 'd';
}

export function ThreadPanel({ threads = [], activeId = null, title = 'Threads', onSelect, onCreate, onClose } = {}) {
    const list = Array.isArray(threads) ? threads : [];
    return h('div', { class: 'cm-thread-panel', role: 'complementary', 'aria-label': title },
        h('div', { class: 'cm-tp-head' },
            h('span', { class: 'cm-tp-title' }, title),
            h('div', { class: 'cm-tp-head-actions' },
                onCreate ? h('button', { type: 'button', class: 'cm-tp-new', 'aria-label': 'new thread', title: 'New thread', onclick: onCreate }, '+') : null,
                onClose ? h('button', { type: 'button', class: 'cm-tp-close', 'aria-label': 'close', title: 'Close', onclick: onClose }, Icon('x')) : null
            )
        ),
        h('div', { class: 'cm-tp-list' },
            list.length
                ? list.map(t => h('button', {
                    type: 'button', key: 'tp-' + t.id,
                    class: 'cm-tp-item' + (t.id === activeId ? ' is-active' : '') + (t.unread ? ' is-unread' : ''),
                    onclick: () => onSelect && onSelect(t.id)
                },
                    t.unread ? h('span', { class: 'cm-tp-dot', 'aria-hidden': 'true' }) : null,
                    h('span', { class: 'cm-tp-item-title' }, t.title || '(untitled)'),
                    t.lastMessage ? h('span', { class: 'cm-tp-item-snippet' }, t.lastMessage) : null,
                    h('span', { class: 'cm-tp-item-meta' },
                        t.author ? h('span', { class: 'cm-tp-item-author' }, t.author) : null,
                        t.time ? h('span', { class: 'cm-tp-item-time' }, fmtRelTime(t.time)) : null
                    )
                ))
                : h('div', { class: 'cm-tp-empty' }, 'No threads yet')
        )
    );
}

export function ForumView({ posts = [], onSearch, onSort, onSelect, onNewPost } = {}) {
    const list = Array.isArray(posts) ? posts : [];
    return h('div', { class: 'cm-forum', role: 'region', 'aria-label': 'forum' },
        h('div', { class: 'cm-forum-toolbar' },
            h('input', {
                type: 'search', class: 'cm-forum-search', placeholder: 'Search posts…',
                'aria-label': 'search posts',
                oninput: onSearch ? (e) => onSearch(e.target.value) : null
            }),
            h('select', {
                class: 'cm-forum-sort', 'aria-label': 'sort posts',
                onchange: onSort ? (e) => onSort(e.target.value) : null
            },
                h('option', { value: 'recent' }, 'Recent'),
                h('option', { value: 'replies' }, 'Most replies'),
                h('option', { value: 'oldest' }, 'Oldest')
            ),
            onNewPost ? h('button', { type: 'button', class: 'cm-forum-new', onclick: onNewPost }, 'New post') : null
        ),
        h('div', { class: 'cm-forum-list' },
            list.length
                ? list.map(p => h('button', {
                    type: 'button', key: 'fp-' + p.id, class: 'cm-forum-item',
                    onclick: () => onSelect && onSelect(p.id)
                },
                    h('div', { class: 'cm-forum-item-head' },
                        h('span', { class: 'cm-forum-item-title' }, p.title || '(untitled)'),
                        h('span', { class: 'cm-forum-item-replies' }, clampCount(p.replyCount), Icon('chevron-right', { size: 13 }))
                    ),
                    p.snippet ? h('div', { class: 'cm-forum-item-snippet' }, p.snippet) : null,
                    h('div', { class: 'cm-forum-item-meta' },
                        p.author ? h('span', { class: 'cm-forum-item-author' }, p.author) : null,
                        p.time ? h('span', { class: 'cm-forum-item-time' }, fmtRelTime(p.time)) : null,
                        Array.isArray(p.tags) && p.tags.length
                            ? h('span', { class: 'cm-forum-item-tags' }, ...p.tags.map((tag, i) =>
                                h('span', { class: 'cm-forum-tag', key: 'tg-' + i }, tag)))
                            : null
                    )
                ))
                : h('div', { class: 'cm-forum-empty' }, 'No posts yet')
        )
    );
}

export function PageView({ title = '', html = '', isAdmin = false, onEdit } = {}) {
    return h('div', { class: 'cm-page', role: 'document' },
        h('div', { class: 'cm-page-head' },
            h('h1', { class: 'cm-page-title' }, title || ''),
            isAdmin && onEdit ? h('button', { type: 'button', class: 'cm-page-edit', onclick: onEdit }, 'Edit') : null
        ),
        h('div', {
            class: 'cm-page-body',
            // Page bodies are host/user-authored HTML, so they pass through the
            // DOMPurify gate before innerHTML — never injected raw (stored-XSS gate).
            ref: (el) => {
                if (!el) return;
                if (!html) { el.innerHTML = '<p class="cm-page-empty">This page is empty.</p>'; return; }
                sanitizeHtml(html).then((clean) => { el.innerHTML = clean; });
            }
        })
    );
}

export function CommunityShell({ serverRailProps, sidebarProps, children, memberListProps, voiceStripProps } = {}) {
    return h('div', { class: 'cm-shell' },
        serverRailProps ? ServerRail(serverRailProps) : null,
        sidebarProps ? ChannelSidebar(sidebarProps) : null,
        h('div', { class: 'cm-main' }, ...(Array.isArray(children) ? children : [children])),
        memberListProps ? MemberList(memberListProps) : null,
        voiceStripProps ? VoiceStrip(voiceStripProps) : null
    );
}
