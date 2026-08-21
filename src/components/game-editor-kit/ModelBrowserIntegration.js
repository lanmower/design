import { createModelBrowser } from './ModelBrowser.js'
import { createModelPreviewViewer } from './ModelPreview.js'

let _modelCache = []
let _previewInstances = new Map()

async function fetchModels() {
  try {
    const res = await fetch('/api/models')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    _modelCache = data.models || []
    return _modelCache
  } catch (err) {
    console.error('Failed to fetch models:', err)
    return []
  }
}

function getThumbnailUrl(model) {
  if (!model) return ''
  const encodedPath = encodeURIComponent(model.path || model.name)
  return `/api/thumbnail/${encodedPath}`
}

function getThumbnail(model) {
  return fetch(getThumbnailUrl(model))
    .then(res => res.ok ? res.blob() : null)
    .catch(err => { console.error('Thumbnail fetch failed:', err); return null })
}

function initializeModelBrowserPanel(container, editorContext) {
  const browser = createModelBrowser(container, {
    getAvailableModels: () => _modelCache,
    getThumbnail,
    getThumbnailUrl,
    onPreview: (model, previewContainer) => {
      if (!model || !model.path) return

      let viewer = _previewInstances.get(previewContainer)
      if (!viewer) {
        viewer = createModelPreviewViewer(previewContainer, {
          autoRotate: true,
          size: { width: 400, height: 400 }
        })
        _previewInstances.set(previewContainer, viewer)
      }

      viewer.loadModel(model.path)
    },
    onPlaceModel: (model) => {
      if (!model || !model.path) return

      if (editorContext && editorContext.placeModel) {
        editorContext.placeModel({
          modelPath: model.path,
          name: model.name,
          colliderType: model.colliderType,
          scale: model.scale
        })
      } else {
        console.warn('Editor context not available for placing model')
      }
    }
  })

  fetchModels().then(() => {
    browser.refresh()
  })

  return {
    browser,
    refresh: () => browser.refresh(),
    destroy: () => {
      browser.destroy()
      _previewInstances.forEach(v => v.dispose())
      _previewInstances.clear()
    }
  }
}

async function generateThumbnails() {
  try {
    const res = await fetch('/api/thumbnails/generate', { method: 'POST' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    console.log('Thumbnail generation result:', data)
    return data
  } catch (err) {
    console.error('Failed to generate thumbnails:', err)
    throw err
  }
}

function getThumbnailGenerationProgress() {
  return fetch('/api/thumbnails/progress')
    .then(res => res.ok ? res.json() : {})
    .catch(err => { console.error('Failed to fetch progress:', err); return {} })
}

export {
  initializeModelBrowserPanel,
  fetchModels,
  getThumbnailUrl,
  getThumbnail,
  generateThumbnails,
  getThumbnailGenerationProgress,
  _modelCache as modelCache
}
