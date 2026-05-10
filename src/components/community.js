import * as webjsx from '../../vendor/webjsx/index.js';
const h = webjsx.createElement;

export function ServerIcon({ id, name, icon, active, badge, onClick } = {}) {
    const initials = (name || '?').slice(0, 2).toUpperCase();
    return h('div', { class: 'cm-server-icon' + (active ? ' active' : ''), onclick: onClick, title: name, 'data-id': id },
        h('span', { class: 'cm-server-pill' }),
        icon ? h('img', { src: icon, alt: name }) : h('span', {}, initials),
        badge ? h('span', { class: 'cm-server-badge' }, badge > 99 ? '99+' : String(badge)) : null
    );
}

export function ServerRail({ servers = [], activeId, onSelect, onAdd } = {}) {
    return h('div', { class: 'cm-server-rail' },
        h('a', { class: 'cm-server-back', href: '../', title: 'Back' }, '◰'),
        h('div', { class: 'cm-server-sep' }),
        ...servers.map(s => ServerIcon({ ...s, active: s.id === activeId, onClick: () => onSelect?.(s.id) })),
        onAdd ? h('button', { class: 'cm-server-add', onclick: onAdd, title: 'Add server' }, '+') : null
    );
}

export function ChannelItem({ id, name, type = 'text', active, voiceActive, onClick, onContext } = {}) {
    const icon = type === 'voice' ? '🔊' : type === 'forum' ? '◻' : '#';
    return h('div', {
        class: 'cm-channel-item' + (active ? ' active' : '') + (voiceActive ? ' voice-active' : ''),
        'data-id': id,
        onclick: onClick,
        oncontextmenu: (e) => { e.preventDefault(); onContext?.(id, e.clientX, e.clientY); }
    },
        h('span', { class: 'cm-ch-icon' }, icon),
        h('span', { class: 'cm-ch-name' }, name)
    );
}

export function ChannelCategory({ id, name, channels = [], collapsed, activeId, onToggle, onAddChannel, onChannelClick, onChannelContext } = {}) {
    return h('div', { class: 'cm-channel-category' },
        h('div', {
            class: 'cm-category-header' + (collapsed ? ' collapsed' : ''),
            onclick: () => onToggle?.(id)
        },
            h('svg', { class: 'cm-cat-arrow', viewBox: '0 0 24 24' }, h('path', { d: 'M7 10l5 5 5-5z' })),
            h('span', { class: 'cm-cat-name' }, name),
            onAddChannel ? h('button', { class: 'cm-cat-add', onclick: (e) => { e.stopPropagation(); onAddChannel(id); }, title: 'Add channel' }, '+') : null
        ),
        collapsed ? null : h('div', { class: 'cm-cat-channels' },
            ...channels.map(c => ChannelItem({
                ...c,
                active: c.id === activeId,
                onClick: () => onChannelClick?.(c),
                onContext: onChannelContext
            }))
        )
    );
}

export function VoiceUser({ identity, speaking, color } = {}) {
    const initial = (identity || '?').slice(0, 1).toUpperCase();
    return h('div', { class: 'cm-voice-user' + (speaking ? ' speaking' : '') },
        h('div', { class: 'cm-voice-user-avatar', style: color ? `background:${color}` : '' }, initial),
        h('span', { class: 'cm-voice-user-name' }, identity)
    );
}

export function UserPanel({ name, tag, color, muted, deafened, onMute, onDeafen, onSettings } = {}) {
    const initial = (name || '?').slice(0, 1).toUpperCase();
    return h('div', { class: 'cm-user-panel' },
        h('div', { class: 'cm-user-avatar', style: color ? `background:${color}` : '' },
            h('span', { class: 'cm-user-status-dot' }),
            initial
        ),
        h('div', { class: 'cm-user-info' },
            h('div', { class: 'cm-user-name' }, name || 'You'),
            tag ? h('div', { class: 'cm-user-tag' }, tag) : null
        ),
        h('div', { class: 'cm-user-controls' },
            h('button', { class: 'cm-user-btn' + (muted ? ' muted' : ''), onclick: onMute, title: muted ? 'Unmute' : 'Mute' }, muted ? '🔇' : '🎤'),
            h('button', { class: 'cm-user-btn' + (deafened ? ' deafened' : ''), onclick: onDeafen, title: deafened ? 'Undeafen' : 'Deafen' }, deafened ? '🔕' : '🎧'),
            h('button', { class: 'cm-user-btn', onclick: onSettings, title: 'Settings' }, '⚙')
        )
    );
}

export function ChannelSidebar({ serverName, channels = [], categories = [], activeId, collapsedCats = new Set(), onChannelClick, onCategoryToggle, onAddChannel, onChannelContext, userPanelProps } = {}) {
    const uncategorized = channels.filter(c => !c.categoryId || !categories.find(cat => cat.id === c.categoryId));
    const sorted = [...categories].sort((a, b) => (a.position || 0) - (b.position || 0));

    return h('div', { class: 'cm-channel-sidebar' },
        h('div', { class: 'cm-server-header' },
            h('span', { class: 'cm-server-header-name' }, serverName || 'Server'),
        ),
        h('div', { class: 'cm-channel-list' },
            ...sorted.map(cat => ChannelCategory({
                id: cat.id,
                name: cat.name,
                channels: channels.filter(c => c.categoryId === cat.id).sort((a, b) => (a.position || 0) - (b.position || 0)),
                collapsed: collapsedCats.has(cat.id),
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
        h('div', { class: 'cm-member-avatar', style: color ? `background:${color}` : '' },
            h('span', { class: 'cm-member-status' + (status === 'online' ? ' online' : '') }),
            initial
        ),
        h('span', { class: 'cm-member-name' }, name || identity)
    );
}

export function MemberList({ categories = [], open } = {}) {
    return h('div', { class: 'cm-member-list' + (open ? ' open' : '') },
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
    return h('div', { class: 'cm-voice-strip' + (open ? ' open' : '') },
        h('div', { class: 'cm-vs-label' },
            h('span', { class: 'cm-vs-channel' }, '🔊 ' + (channelName || 'voice')),
            h('span', { class: 'cm-vs-status' }, status || 'connected')
        ),
        h('button', { class: 'cm-vs-btn', onclick: onMute, title: 'Mute' }, muted ? '🔇' : '🎤'),
        h('button', { class: 'cm-vs-btn', onclick: onDeafen, title: 'Deafen' }, deafened ? '🔕' : '🎧'),
        h('button', { class: 'cm-vs-btn danger', onclick: onLeave, title: 'Leave' }, '✕')
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
