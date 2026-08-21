import * as webjsx from '../../../vendor/webjsx/index.js'
import { Icon } from '../../components.js'
const h = webjsx.createElement
import { getSharedWM, Btn, Toolbar, SearchInput } from './ui-components.js'
import { showToast } from './utils.js'

// promptText fallback for modal interactions
function promptText(wm, opts = {}) {
  return new Promise((resolve) => {
    const value = prompt(opts.label || 'Enter value', opts.value || '')
    resolve(value)
  })
}

export function createAssetBrowser(opts = {}) {
  const onAssetSelect = opts.onAssetSelect || (() => {})
  const onAssetMove = opts.onAssetMove || (() => {})
  const onFolderCreate = opts.onFolderCreate || (() => {})
  const onFolderDelete = opts.onFolderDelete || (() => {})
  const onFolderRename = opts.onFolderRename || (() => {})

  let _assets = opts.initialAssets || []
  let _folders = opts.initialFolders || {}
  let _currentFolder = ''
  let _searchQuery = ''
  let _selectedTags = new Set()
  let _container = null
  let _renderStart = 0

  function norm(p) { return String(p || '').replace(/^\/+|\/+$/g, '') }
  function join(a, b) { a = norm(a); b = norm(b); return a ? (b ? a + '/' + b : a) : b }
  function parent(p) { p = norm(p); const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i) }

  function getFilteredAssets() {
    _renderStart = performance.now()
    let result = _assets

    if (_currentFolder) {
      result = result.filter(a => a.folder === _currentFolder)
    }

    if (_searchQuery) {
      const q = _searchQuery.toLowerCase()
      result = result.filter(a => a.name.toLowerCase().includes(q))
    }

    if (_selectedTags.size > 0) {
      result = result.filter(a => a.tags && a.tags.some(t => _selectedTags.has(t)))
    }

    return result.sort((a, b) => a.name.localeCompare(b.name))
  }

  function getAllTags() {
    const tags = new Set()
    for (const asset of _assets) {
      if (asset.tags) asset.tags.forEach(t => tags.add(t))
    }
    return Array.from(tags).sort()
  }

  function renderFolderTree() {
    const folders = norm(_currentFolder).split('/').filter(Boolean)
    const breadcrumbs = [h('span', { style: 'cursor:pointer;text-decoration:underline', onClick: () => { _currentFolder = ''; render() } }, 'Root')]

    let path = ''
    for (const folder of folders) {
      path = join(path, folder)
      const p = path
      breadcrumbs.push(' / ')
      breadcrumbs.push(h('span', { style: 'cursor:pointer;text-decoration:underline', onClick: () => { _currentFolder = p; render() } }, folder))
    }

    return h('div', { style: 'padding:8px;border-bottom:1px solid var(--panel-border,#ccc);font:11px var(--ff-mono,monospace);color:var(--panel-text-2);display:flex;gap:4px;flex-wrap:wrap;align-items:center' }, breadcrumbs)
  }

  function renderFolderPanel() {
    const currentFolders = Object.keys(_folders)
      .filter(f => parent(f) === _currentFolder)
      .sort()

    const folderItems = currentFolders.map(folderPath => {
      const folderName = folderPath.split('/').pop()
      return h('div', {
        style: 'padding:6px 8px;border-bottom:1px solid var(--panel-border,#eee);cursor:pointer;display:flex;gap:8px;justify-content:space-between;align-items:center'
      }, [
        h('div', { style: 'display:flex;gap:6px;align-items:center;flex:1;min-width:0', onClick: () => { _currentFolder = folderPath; render() } }, [
          h('span', { style: 'color:var(--panel-text-3,#666)' }, '📁'),
          h('span', { style: 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, folderName)
        ]),
        h('div', { style: 'display:flex;gap:4px' }, [
          h('button', {
            type: 'button',
            title: 'Rename',
            style: 'padding:2px 6px;font-size:11px;cursor:pointer;background:transparent;border:none;color:var(--panel-text-2)',
            onClick: async (e) => {
              e.stopPropagation()
              const wm = getSharedWM()
              const newName = wm ? await promptText(wm, { title: 'Rename folder', label: 'New name', value: folderName }) : prompt('New folder name', folderName)
              if (!newName || newName === folderName) return
              onFolderRename?.(folderPath, join(parent(folderPath), newName))
              render()
            }
          }, Icon('edit')),
          h('button', {
            type: 'button',
            title: 'Delete',
            style: 'padding:2px 6px;font-size:11px;cursor:pointer;background:transparent;border:none;color:var(--panel-text-2)',
            onClick: async (e) => {
              e.stopPropagation()
              if (confirm(`Delete folder "${folderName}"?`)) {
                onFolderDelete?.(folderPath)
                render()
              }
            }
          }, Icon('x'))
        ])
      ])
    })

    return folderItems.length > 0 ? h('div', { style: 'border-bottom:1px solid var(--panel-border,#ddd)' }, folderItems) : null
  }

  function renderAssetList() {
    const filtered = getFilteredAssets()

    if (filtered.length === 0) {
      return h('div', { style: 'padding:24px;text-align:center;color:var(--panel-text-2)' }, 'No assets')
    }

    const items = filtered.map(asset => {
      const menuId = `asset-menu-${asset.id}`
      return h('div', {
        style: 'padding:6px 8px;border-bottom:1px solid var(--panel-border,#eee);cursor:pointer;display:flex;gap:8px;align-items:center;transition:background 0.1s',
        onMouseEnter: (el) => el.target.style.background = 'var(--panel-hover,#f5f5f5)',
        onMouseLeave: (el) => el.target.style.background = 'transparent'
      }, [
        asset.thumbnail ? h('img', { src: asset.thumbnail, style: 'width:32px;height:32px;border-radius:2px;object-fit:contain', alt: asset.name }) : h('span', { style: 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:var(--panel-bg-2,#eee);border-radius:2px' }, '📦'),
        h('div', { style: 'flex:1;min-width:0', onClick: () => onAssetSelect?.(asset) }, [
          h('div', { style: 'font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, asset.name),
          asset.tags && asset.tags.length > 0 ? h('div', { style: 'font-size:10px;color:var(--panel-text-3,#999);margin-top:2px' }, asset.tags.join(', ')) : null
        ].filter(Boolean)),
        h('div', { style: 'display:flex;gap:4px' }, [
          h('button', {
            type: 'button',
            title: 'Menu',
            style: 'padding:2px 6px;font-size:11px;cursor:pointer;background:transparent;border:none;color:var(--panel-text-2)',
            onClick: (e) => {
              e.stopPropagation()
              showAssetMenu(asset, e.target)
            }
          }, "[...]")
        ])
      ])
    })

    const elapsed = performance.now() - _renderStart
    if (elapsed > 50) console.warn(`[AssetBrowser] render took ${elapsed.toFixed(1)}ms for ${filtered.length} assets`)

    return h('div', {}, items)
  }

  function showAssetMenu(asset, anchor) {
    const wm = getSharedWM()
    if (!wm) {
      showToast('Quick menu requires window manager', 'info')
      return
    }

    const folders = Object.keys(_folders).filter(f => f !== (asset.folder || '')).sort()
    const actions = [
      () => onAssetSelect?.(asset)
    ]

    if (folders.length > 0) {
      for (const f of folders) {
        actions.push(() => {
          asset.folder = f
          onAssetMove?.(asset.id, f)
          render()
        })
      }
    }

    actions.push(() => { navigator.clipboard.writeText(asset.path || asset.name) })

    showToast('Asset menu (right-click context)', 'info')
  }

  function render() {
    if (!_container) return

    const tags = getAllTags()
    const toolbar = h('div', { style: 'padding:8px;border-bottom:1px solid var(--panel-border,#ddd);display:flex;flex-direction:column;gap:8px' }, [
      h('div', { style: 'display:flex;gap:6px' }, [
        Btn({ dense: true, onClick: async () => {
          const wm = getSharedWM()
          const name = wm ? await promptText(wm, { title: 'New folder', label: 'Folder name', placeholder: 'name' }) : prompt('Folder name')
          if (!name) return
          const newPath = join(_currentFolder, name)
          _folders[newPath] = true
          onFolderCreate?.(newPath)
          render()
        }, children: ['+ Folder'] }),
        h('div', { style: 'flex:1' }),
        h('div', { style: 'display:flex;gap:4px;font-size:11px;color:var(--panel-text-2)' }, [
          h('span', {}, `${getFilteredAssets().length} asset${getFilteredAssets().length !== 1 ? 's' : ''}`)
        ])
      ]),
      SearchInput({ value: _searchQuery, placeholder: 'Search...', onInput: v => { _searchQuery = (v || '').toLowerCase(); render() } }),
      tags.length > 0 ? h('div', { style: 'display:flex;gap:4px;flex-wrap:wrap' }, tags.map(tag =>
        h('button', {
          type: 'button',
          style: `padding:2px 8px;font-size:10px;border-radius:4px;border:1px solid var(--panel-border,#ddd);background:${_selectedTags.has(tag) ? 'var(--primary,#0066cc)' : 'transparent'};color:${_selectedTags.has(tag) ? '#fff' : 'var(--panel-text-2)'};cursor:pointer`,
          onClick: () => {
            if (_selectedTags.has(tag)) _selectedTags.delete(tag)
            else _selectedTags.add(tag)
            render()
          }
        }, tag)
      )) : null
    ].filter(Boolean))

    const breadcrumbs = renderFolderTree()
    const folderPanel = renderFolderPanel()
    const assetList = renderAssetList()

    const content = h('div', { style: 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden' }, [
      toolbar,
      breadcrumbs,
      folderPanel,
      h('div', { style: 'flex:1;overflow-y:auto' }, [assetList])
    ])

    _container.innerHTML = ''
    _container.appendChild(content)
  }

  return {
    mount(container) {
      _container = container
      _container.classList.add('ds-ep-panel')
      _container.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0'
      render()
    },
    setAssets(assets) {
      _assets = assets
      render()
    },
    setFolders(folders) {
      _folders = folders
      render()
    },
    getCurrentFolder() {
      return _currentFolder
    },
    navigateToFolder(path) {
      _currentFolder = path
      render()
    },
    render
  }
}
