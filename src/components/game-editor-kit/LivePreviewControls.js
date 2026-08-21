import * as webjsx from '../../../vendor/webjsx/index.js'
const h = webjsx.createElement

export function LivePreviewControls(opts = {}) {
  const {
    livePreview,
    onToggle,
    onError
  } = opts

  if (!livePreview) {
    return h('div', {
      style: `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px;
        color: var(--fg-3,#888);
        font-size: 11px;
      `
    }, 'Live preview not available')
  }

  const isEnabled = livePreview.enabled ?? false

  const handleToggle = (e) => {
    try {
      const newState = e.target.checked
      livePreview.setEnabled?.(newState)
      onToggle?.(newState)
    } catch (err) {
      onError?.(err.message || 'Toggle failed')
    }
  }

  return h('div', {
    style: `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px;
      background: var(--bg-2,#222);
      border-bottom: 1px solid var(--rule,#444);
    `
  },
    h('input', {
      type: 'checkbox',
      checked: isEnabled,
      onchange: handleToggle,
      style: `
        cursor: pointer;
        width: 16px;
        height: 16px;
      `
    }),
    h('label', {
      style: `
        cursor: pointer;
        user-select: none;
        font-size: 11px;
        color: var(--fg,#ccc);
        display: flex;
        align-items: center;
        gap: 4px;
      `
    },
      'Live Preview',
      h('span', {
        style: `
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${isEnabled ? '#22aa22' : '#888'};
        `
      })
    )
  )
}
