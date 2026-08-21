import * as webjsx from '../../../vendor/webjsx/index.js'
const h = webjsx.createElement

export function createAssetPickerModal(opts = {}) {
  const onConfirm = opts.onConfirm || (() => {})
  const onCancel = opts.onCancel || (() => {})
  const getRecentAssets = opts.getRecentAssets || (() => [])

  let _container = null
  let _selectedAsset = null
  let _searchQuery = ''
  let _recentAssets = []
  let _sessionStorageKey = 'assetPicker_lastSearch'

  function loadSessionData() {
    try {
      const stored = sessionStorage.getItem(_sessionStorageKey)
      if (stored) _searchQuery = stored
    } catch (e) {
      console.warn('[AssetPickerModal] sessionStorage unavailable')
    }
  }

  function saveSessionData() {
    try {
      sessionStorage.setItem(_sessionStorageKey, _searchQuery)
    } catch (e) {
      console.warn('[AssetPickerModal] sessionStorage unavailable')
    }
  }

  function getFilteredAssets() {
    let filtered = _recentAssets

    if (_searchQuery) {
      const q = _searchQuery.toLowerCase()
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.path && a.path.toLowerCase().includes(q)) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
      )
    }

    return filtered.sort((a, b) => {
      const aTime = new Date(a.lastUsed || 0).getTime()
      const bTime = new Date(b.lastUsed || 0).getTime()
      return bTime - aTime
    })
  }

  function renderAssetGrid() {
    const filtered = getFilteredAssets()

    if (filtered.length === 0) {
      return h('div', { style: 'padding:40px;text-align:center;color:var(--fg-2)' }, _recentAssets.length === 0 ? 'No recent assets' : 'No matches')
    }

    const items = filtered.map(asset => {
      const isSelected = _selectedAsset && _selectedAsset.id === asset.id

      return h('div', {
        style: `padding:12px;border:2px solid ${isSelected ? 'var(--primary,#0066cc)' : 'var(--panel-border,#ddd)'};border-radius:6px;cursor:pointer;background:${isSelected ? 'var(--primary-bg,#f0f7ff)' : 'var(--panel-bg,#fff)'};transition:all 0.15s`,
        onClick: () => {
          _selectedAsset = asset
          render()
        },
        onMouseEnter: (el) => {
          if (!isSelected) el.target.style.borderColor = 'var(--fg-3,#aaa)'
        },
        onMouseLeave: (el) => {
          if (!isSelected) el.target.style.borderColor = 'var(--panel-border,#ddd)'
        }
      }, [
        asset.thumbnail ? h('div', {
          style: 'width:100%;aspect-ratio:1;background:var(--panel-bg-2,#eee);border-radius:4px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;overflow:hidden'
        }, [
          h('img', { src: asset.thumbnail, style: 'width:100%;height:100%;object-fit:contain' })
        ]) : h('div', {
          style: 'width:100%;aspect-ratio:1;background:var(--panel-bg-2,#eee);border-radius:4px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;font-size:24px'
        }, '📦'),

        h('div', { style: 'font-weight:500;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, asset.name),

        asset.tags && asset.tags.length > 0 ? h('div', { style: 'font-size:10px;color:var(--fg-2);margin-top:4px' }, asset.tags.join(', ')) : null,

        h('div', { style: 'font-size:10px;color:var(--fg-3,#999);margin-top:4px' }, asset.path || '')
      ].filter(Boolean))
    })

    return h('div', {
      style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px'
    }, items)
  }

  function renderModal() {
    const filtered = getFilteredAssets()

    return h('div', {
      style: 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000'
    }, [
      h('div', {
        style: 'background:var(--panel-bg,#fff);border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.2);width:90vw;max-width:800px;max-height:80vh;display:flex;flex-direction:column'
      }, [
        h('div', { style: 'padding:16px;border-bottom:1px solid var(--panel-border,#ddd)' }, [
          h('div', { style: 'font-weight:600;font-size:14px;margin-bottom:12px' }, 'Select Asset'),
          h('input', {
            type: 'text',
            placeholder: 'Search by name, path, or tag...',
            value: _searchQuery,
            style: 'width:100%;padding:8px 12px;border:1px solid var(--panel-border,#ddd);border-radius:4px;font-size:12px',
            onInput: (e) => {
              _searchQuery = e.target.value
              saveSessionData()
              render()
            }
          })
        ]),

        h('div', { style: 'flex:1;overflow-y:auto;padding:16px' }, [
          renderAssetGrid()
        ]),

        h('div', { style: 'padding:12px;border-top:1px solid var(--panel-border,#ddd);display:flex;justify-content:space-between;align-items:center' }, [
          h('div', { style: 'font-size:11px;color:var(--fg-2)' }, `${filtered.length} of ${_recentAssets.length} assets`),
          h('div', { style: 'display:flex;gap:8px' }, [
            h('button', {
              type: 'button',
              style: 'padding:6px 16px;border:1px solid var(--panel-border,#ddd);border-radius:4px;background:var(--panel-bg,#fff);cursor:pointer;font-size:12px',
              onClick: () => onCancel?.()
            }, 'Cancel'),
            h('button', {
              type: 'button',
              style: `padding:6px 16px;border-radius:4px;background:${_selectedAsset ? 'var(--primary,#0066cc)' : 'var(--fg-3,#ccc)'};color:#fff;border:none;cursor:pointer;font-size:12px`,
              disabled: !_selectedAsset,
              onClick: () => {
                if (_selectedAsset) {
                  saveSessionData()
                  onConfirm?.(_selectedAsset)
                }
              }
            }, 'Select')
          ])
        ])
      ])
    ])
  }

  function render() {
    if (!_container) return

    _recentAssets = getRecentAssets()
    loadSessionData()

    _container.innerHTML = ''
    _container.appendChild(renderModal())
  }

  function open() {
    if (!_container) {
      _container = document.createElement('div')
      document.body.appendChild(_container)
    }
    render()
  }

  function close() {
    if (_container && _container.parentNode) {
      _container.parentNode.removeChild(_container)
      _container = null
    }
  }

  return {
    open,
    close,
    render
  }
}
