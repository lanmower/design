import * as webjsx from '../../../vendor/webjsx/index.js'
const h = webjsx.createElement
import { EmptyState } from './ui-components.js'

export function UndoHistoryPanel(opts = {}) {
  const {
    editHistory,
    onJumpTo,
    onError
  } = opts

  if (!editHistory) {
    return h('div', {
      style: `
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--fg-3,#888);
        font-size: 12px;
      `
    }, 'Edit history not available')
  }

  let entries = []
  try {
    entries = editHistory.list?.() || []
  } catch (err) {
    onError?.(err.message || 'Failed to fetch history')
  }

  if (entries.length === 0) {
    return EmptyState({ text: 'No edit history' })
  }

  const handleEntryClick = (entryId) => {
    try {
      onJumpTo?.(entryId)
    } catch (err) {
      onError?.(err.message || 'Jump failed')
    }
  }

  return h('div', {
    style: `
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    `
  },
    h('div', {
      style: `
        flex: 1;
        overflow-y: auto;
        font-size: 11px;
      `
    },
      ...entries.map((entry, idx) =>
        h('div', {
          key: entry.id || idx,
          onclick: () => handleEntryClick(entry.id),
          style: `
            padding: 8px 6px;
            border-bottom: 1px solid var(--rule,#444);
            cursor: pointer;
            transition: background 150ms;
          `,
          onmouseenter: (e) => {
            e.currentTarget.style.background = 'var(--bg-3,#333)'
          },
          onmouseleave: (e) => {
            e.currentTarget.style.background = 'transparent'
          }
        },
          h('div', {
            style: `
              color: var(--fg,#ccc);
              font-weight: 500;
              margin-bottom: 2px;
            `
          }, entry.name || `Entry ${idx + 1}`),
          h('div', {
            style: `
              color: var(--fg-3,#888);
              font-size: 10px;
            `
          },
            entry.count ? `${entry.count} changes` : '',
            entry.timestamp ? ` · ${new Date(entry.timestamp).toLocaleTimeString()}` : ''
          )
        )
      )
    )
  )
}
