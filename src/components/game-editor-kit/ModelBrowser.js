import * as webjsx from '../../../vendor/webjsx/index.js'
import { Icon } from '../../components.js'
const h = webjsx.createElement
const { applyDiff } = webjsx
import { showToast } from './utils.js'
import { getSharedWM, Btn, Toolbar, SearchInput, EmptyState } from './ui-components.js'

export function createModelBrowser(container, opts = {}) {
  const {
    onPreview,
    onPlaceModel,
    getAvailableModels,
    getThumbnail,
    getThumbnailUrl
  } = opts

  let _models = []
  let _search = ''
  let _viewMode = 'grid'
  let _sortBy = 'name'
  let _filterCategory = 'all'
  let _filterMaterial = 'all'
  let _filterScale = 'all'
  let _selectedModel = null
  let _loading = false
  let _error = null
  let _toolbarHost = null
  let _viewHost = null
  let _previewMode = false

  container.classList.add('ds-ep-panel', 'model-browser')
  container.style.cssText = 'display:flex;flex-direction:column;height:100%;background:var(--bg-1,#1a1a1a)'

  function _ensureHosts() {
    if (_toolbarHost && _toolbarHost.isConnected) return
    container.innerHTML = ''
    _toolbarHost = document.createElement('div')
    _toolbarHost.style.cssText = 'flex-shrink:0;border-bottom:1px solid var(--rule);background:var(--bg-2,#222)'
    _viewHost = document.createElement('div')
    _viewHost.style.cssText = 'flex:1;min-height:0;overflow-y:auto'
    container.append(_toolbarHost, _viewHost)
    renderToolbar()
  }

  function loadModels() {
    _loading = true
    _error = null
    _models = []
    render()
    try {
      const models = getAvailableModels?.() || []
      _models = Array.isArray(models) ? models : Object.values(models)
      if (!Array.isArray(_models)) _models = []
    } catch (err) {
      _error = err.message
      showToast(`Failed to load models: ${err.message}`, 'error')
    } finally {
      _loading = false
      render()
    }
  }

  function filteredAndSorted() {
    let list = _models.slice()
    const q = (_search || '').toLowerCase()
    if (q) {
      list = list.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.path || '').toLowerCase().includes(q) ||
        (m.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }
    if (_filterCategory !== 'all' && _filterCategory) {
      list = list.filter(m => (m.category || '').toLowerCase() === _filterCategory.toLowerCase())
    }
    if (_filterMaterial !== 'all' && _filterMaterial) {
      list = list.filter(m => (m.materialType || '').toLowerCase() === _filterMaterial.toLowerCase())
    }
    if (_filterScale !== 'all' && _filterScale) {
      list = list.filter(m => (m.scale || '').toLowerCase() === _filterScale.toLowerCase())
    }
    const sortFn = {
      'name': (a, b) => (a.name || '').localeCompare(b.name || ''),
      'size': (a, b) => (b.fileSize || 0) - (a.fileSize || 0),
      'date': (a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0),
      'usage': (a, b) => (b.usageCount || 0) - (a.usageCount || 0)
    }[_sortBy] || ((a, b) => (a.name || '').localeCompare(b.name || ''))
    return list.sort(sortFn)
  }

  function renderToolbar() {
    const controls = h('div', { style: 'display:flex;align-items:center;gap:6px;padding:6px;flex-wrap:wrap;min-height:40px' },
      SearchInput({
        value: _search,
        placeholder: 'Search models...',
        onInput: v => { _search = (v || '').toLowerCase(); render() }
      }),
      h('select', {
        style: 'padding:4px 6px;border-radius:4px;border:1px solid var(--rule);background:var(--bg-1);color:var(--fg);font:11px monospace',
        onchange: (e) => { _sortBy = e.target.value; render() },
        value: _sortBy
      },
        h('option', { value: 'name' }, 'Sort: Name'),
        h('option', { value: 'size' }, 'Sort: Size'),
        h('option', { value: 'date' }, 'Sort: Date'),
        h('option', { value: 'usage' }, 'Sort: Usage')
      ),
      h('select', {
        style: 'padding:4px 6px;border-radius:4px;border:1px solid var(--rule);background:var(--bg-1);color:var(--fg);font:11px monospace',
        onchange: (e) => { _filterCategory = e.target.value; render() },
        value: _filterCategory
      },
        h('option', { value: 'all' }, 'Category: All'),
        h('option', { value: 'prop' }, 'Category: Prop'),
        h('option', { value: 'building' }, 'Category: Building'),
        h('option', { value: 'vehicle' }, 'Category: Vehicle'),
        h('option', { value: 'character' }, 'Category: Character')
      ),
      Btn({
        dense: true,
        ghost: _viewMode !== 'grid',
        onClick: () => { _viewMode = 'grid'; render() },
        title: 'Grid View',
        children: [Icon('grid')]
      }),
      Btn({
        dense: true,
        ghost: _viewMode !== 'list',
        onClick: () => { _viewMode = 'list'; render() },
        title: 'List View',
        children: [Icon('rows')]
      }),
      Btn({
        dense: true,
        ghost: true,
        onClick: loadModels,
        title: 'Refresh',
        children: [Icon('refresh')]
      })
    )
    applyDiff(_toolbarHost, [controls])
  }

  function renderGridView() {
    const filtered = filteredAndSorted()
    if (filtered.length === 0) {
      return EmptyState({ text: _search ? 'No models match your search' : 'No models available' })
    }
    const grid = h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;padding:8px;align-content:start' },
      ...filtered.map(m => renderThumbnailCard(m))
    )
    return grid
  }

  function renderThumbnailCard(model) {
    const thumbUrl = getThumbnailUrl?.(model) || `/api/thumbnail/${encodeURIComponent(model.path)}`
    const card = h('div', {
      style: 'display:flex;flex-direction:column;gap:4px;padding:6px;border-radius:6px;background:var(--bg-2);cursor:pointer;border:2px solid transparent;transition:all 200ms',
      onmouseenter: (e) => e.currentTarget.style.borderColor = 'var(--accent)',
      onmouseleave: (e) => e.currentTarget.style.borderColor = 'transparent',
      onclick: () => { _selectedModel = model; _previewMode = true; renderPreview() }
    },
      h('div', { style: 'width:100%;aspect-ratio:1;background:var(--bg-1);border-radius:4px;overflow:hidden;border:1px solid var(--rule);display:flex;align-items:center;justify-content:center' },
        h('img', {
          src: thumbUrl,
          style: 'width:100%;height:100%;object-fit:cover;background:var(--bg-1)',
          onerror: (e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span style="color:var(--fg-3);font:10px monospace">No thumbnail</span>' }
        })
      ),
      h('div', { style: 'font:11px monospace;color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%' }, model.name || 'Untitled'),
      h('div', { style: 'font:9px monospace;color:var(--fg-3);display:flex;gap:4px' },
        model.polyCount ? h('span', {}, `${Math.round(model.polyCount / 1000)}k▲`) : null,
        model.fileSize ? h('span', {}, `${Math.round(model.fileSize / 1024 / 1024 * 10) / 10}MB`) : null
      )
    )
    return card
  }

  function renderListView() {
    const filtered = filteredAndSorted()
    if (filtered.length === 0) {
      return EmptyState({ text: _search ? 'No models match your search' : 'No models available' })
    }
    const list = h('div', { style: 'display:flex;flex-direction:column;gap:0' },
      ...filtered.map(m => renderListRow(m))
    )
    return list
  }

  function renderListRow(model) {
    const row = h('div', {
      style: 'display:grid;grid-template-columns:80px 1fr auto auto;gap:8px;padding:6px;align-items:center;border-bottom:1px solid var(--rule);cursor:pointer;transition:background 100ms',
      onmouseenter: (e) => e.currentTarget.style.background = 'var(--bg-2)',
      onmouseleave: (e) => e.currentTarget.style.background = 'transparent',
      onclick: () => { _selectedModel = model; _previewMode = true; renderPreview() }
    },
      h('div', { style: 'width:80px;aspect-ratio:1;background:var(--bg-2);border-radius:3px;overflow:hidden;border:1px solid var(--rule)' },
        h('img', {
          src: getThumbnailUrl?.(model) || `/api/thumbnail/${encodeURIComponent(model.path)}`,
          style: 'width:100%;height:100%;object-fit:cover',
          onerror: (e) => { e.target.parentNode.innerHTML = '<span style="color:var(--fg-3);font:9px monospace;display:flex;align-items:center;justify-content:center;width:100%;height:100%">No thumb</span>' }
        })
      ),
      h('div', { style: 'display:flex;flex-direction:column;gap:2px;min-width:0' },
        h('div', { style: 'font:12px monospace;color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, model.name || 'Untitled'),
        h('div', { style: 'font:10px monospace;color:var(--fg-3)' }, model.path || ''),
        h('div', { style: 'font:9px monospace;color:var(--fg-3);display:flex;gap:8px' },
          model.polyCount ? h('span', {}, `Poly: ${Math.round(model.polyCount / 1000)}k`) : null,
          model.fileSize ? h('span', {}, `Size: ${Math.round(model.fileSize / 1024 / 1024 * 10) / 10}MB`) : null,
          model.colliderType ? h('span', {}, `Collider: ${model.colliderType}`) : null
        )
      ),
      h('button', {
        class: 'ds-ep-wm-btn ds-ep-wm-btn-primary',
        style: 'padding:4px 8px;font-size:11px;white-space:nowrap',
        onclick: (e) => {
          e.stopPropagation()
          onPlaceModel?.(model)
        }
      }, 'Place')
    )
    return row
  }

  function renderPreview() {
    if (!_previewMode || !_selectedModel) return
    const overlay = h('div', {
      style: 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000',
      onclick: (e) => {
        if (e.target === e.currentTarget) { _previewMode = false; render() }
      }
    },
      h('div', {
        style: 'background:var(--bg-1);border:1px solid var(--rule);border-radius:8px;width:90%;max-width:900px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden',
        onclick: (e) => e.stopPropagation()
      },
        h('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid var(--rule)' },
          h('h3', { style: 'margin:0;font:14px monospace;color:var(--fg)' }, _selectedModel.name || 'Untitled'),
          h('button', {
            class: 'ds-ep-wm-btn',
            style: 'padding:4px 8px;font-size:11px',
            onclick: () => { _previewMode = false; render() }
          }, Icon('x'))
        ),
        h('div', { style: 'flex:1;min-height:0;display:flex;gap:12px;padding:12px;overflow-y:auto' },
          h('div', { style: 'flex:1;min-width:300px;background:var(--bg-2);border-radius:6px;border:1px solid var(--rule);display:flex;align-items:center;justify-content:center;position:relative', id: 'model-preview-container' },
            h('div', { style: 'color:var(--fg-3);text-align:center' }, 'Loading preview...')
          ),
          h('div', { style: 'width:300px;display:flex;flex-direction:column;gap:8px;background:var(--bg-2);padding:12px;border-radius:6px;border:1px solid var(--rule);overflow-y:auto;font-size:11px' },
            h('div', {},
              h('div', { style: 'color:var(--fg-3);margin-bottom:4px' }, 'Metadata'),
              h('table', { style: 'width:100%;border-collapse:collapse' },
                _selectedModel.polyCount ? h('tr', {},
                  h('td', { style: 'color:var(--fg-3);padding:2px 4px' }, 'Polygons:'),
                  h('td', { style: 'text-align:right;padding:2px 4px' }, Math.round(_selectedModel.polyCount / 1000) + 'k')
                ) : null,
                _selectedModel.fileSize ? h('tr', {},
                  h('td', { style: 'color:var(--fg-3);padding:2px 4px' }, 'File Size:'),
                  h('td', { style: 'text-align:right;padding:2px 4px' }, Math.round(_selectedModel.fileSize / 1024 / 1024 * 10) / 10 + ' MB')
                ) : null,
                _selectedModel.colliderType ? h('tr', {},
                  h('td', { style: 'color:var(--fg-3);padding:2px 4px' }, 'Collider:'),
                  h('td', { style: 'text-align:right;padding:2px 4px' }, _selectedModel.colliderType)
                ) : null,
                _selectedModel.textureSize ? h('tr', {},
                  h('td', { style: 'color:var(--fg-3);padding:2px 4px' }, 'Texture:'),
                  h('td', { style: 'text-align:right;padding:2px 4px' }, _selectedModel.textureSize)
                ) : null
              )
            ),
            _selectedModel.tags && _selectedModel.tags.length > 0 ? h('div', {},
              h('div', { style: 'color:var(--fg-3);margin-bottom:4px' }, 'Tags'),
              h('div', { style: 'display:flex;flex-wrap:wrap;gap:4px' },
                ..._selectedModel.tags.map(tag => h('span', {
                  style: 'background:var(--accent);color:var(--accent-fg);padding:2px 6px;border-radius:3px;font-size:10px'
                }, tag))
              )
            ) : null,
            h('div', { style: 'margin-top:auto;display:flex;gap:6px;padding-top:8px;border-top:1px solid var(--rule)' },
              h('button', {
                class: 'ds-ep-wm-btn',
                style: 'flex:1;padding:6px;font-size:11px',
                onclick: (e) => {
                  e.preventDefault()
                  _previewMode = false
                  render()
                }
              }, 'Cancel'),
              h('button', {
                class: 'ds-ep-wm-btn ds-ep-wm-btn-primary',
                style: 'flex:1;padding:6px;font-size:11px',
                onclick: (e) => {
                  e.preventDefault()
                  onPlaceModel?.(_selectedModel)
                  _previewMode = false
                  render()
                }
              }, 'Place Model')
            )
          )
        )
      )
    )
    applyDiff(container.parentNode || container, [overlay], { replace: true })
    initPreviewCanvas()
  }

  function initPreviewCanvas() {
    setTimeout(() => {
      const container = document.getElementById('model-preview-container')
      if (!container || !_selectedModel) return
      onPreview?.(_selectedModel, container)
    }, 0)
  }

  function render() {
    if (!_container) return
    _ensureHosts()
    if (_previewMode) {
      renderPreview()
      return
    }
    const view = _viewMode === 'grid' ? renderGridView() : renderListView()
    applyDiff(_viewHost, [view])
  }

  let _container = container
  loadModels()
  render()

  return {
    refresh: loadModels,
    setModels: (models) => { _models = models; render() },
    destroy: () => { _container = null }
  }
}
