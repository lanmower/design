import * as webjsx from '../../../vendor/webjsx/index.js'
const h = webjsx.createElement

export function createUploadProgress(opts = {}) {
  const onCancel = opts.onCancel || (() => {})
  const onComplete = opts.onComplete || (() => {})
  const onError = opts.onError || (() => {})

  let _container = null
  let _abortController = null
  let _uploadState = {
    fileName: '',
    fileSize: 0,
    bytesUploaded: 0,
    totalChunks: 0,
    currentChunk: 0,
    startTime: 0,
    status: 'idle'
  }

  const CHUNK_SIZE = 5 * 1024 * 1024

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB'
  }

  function calculateETA() {
    if (_uploadState.bytesUploaded === 0 || _uploadState.startTime === 0) return null

    const elapsed = (performance.now() - _uploadState.startTime) / 1000
    const bytesPerSecond = _uploadState.bytesUploaded / elapsed
    const bytesRemaining = _uploadState.fileSize - _uploadState.bytesUploaded

    if (bytesPerSecond <= 0) return null

    const secondsRemaining = Math.round(bytesRemaining / bytesPerSecond)
    if (secondsRemaining < 60) return secondsRemaining + 's'
    if (secondsRemaining < 3600) return Math.round(secondsRemaining / 60) + 'm'
    return Math.round(secondsRemaining / 3600) + 'h'
  }

  function getProgress() {
    if (_uploadState.fileSize === 0) return 0
    return Math.min(100, Math.round((_uploadState.bytesUploaded / _uploadState.fileSize) * 100))
  }

  function getUploadSpeed() {
    if (_uploadState.bytesUploaded === 0 || _uploadState.startTime === 0) return '0 MB/s'
    const elapsed = (performance.now() - _uploadState.startTime) / 1000
    const mbPerSecond = (_uploadState.bytesUploaded / 1024 / 1024) / elapsed
    if (mbPerSecond < 0.1) return (mbPerSecond * 1000).toFixed(0) + ' KB/s'
    return mbPerSecond.toFixed(1) + ' MB/s'
  }

  function render() {
    if (!_container) return

    const progress = getProgress()
    const eta = calculateETA()
    const speed = getUploadSpeed()

    let statusText = ''
    let statusColor = 'var(--fg-2)'

    if (_uploadState.status === 'uploading') {
      statusText = `Uploading: ${_uploadState.currentChunk}/${_uploadState.totalChunks} chunks`
      statusColor = 'var(--fg-1)'
    } else if (_uploadState.status === 'completed') {
      statusText = 'Upload completed'
      statusColor = 'var(--success,#28a745)'
    } else if (_uploadState.status === 'error') {
      statusText = 'Upload failed: ' + (_uploadState.errorMessage || 'Unknown error')
      statusColor = 'var(--error,#dc3545)'
    } else if (_uploadState.status === 'cancelled') {
      statusText = 'Upload cancelled'
      statusColor = 'var(--fg-2)'
    }

    const content = h('div', { style: 'padding:16px;border-radius:4px;background:var(--panel-bg,#fff);border:1px solid var(--panel-border,#ddd)' }, [
      h('div', { style: 'margin-bottom:12px' }, [
        h('div', { style: 'font-weight:500;margin-bottom:4px' }, _uploadState.fileName),
        h('div', { style: 'font-size:12px;color:var(--fg-2)' }, `${formatBytes(_uploadState.bytesUploaded)} / ${formatBytes(_uploadState.fileSize)}`)
      ]),

      h('div', { style: 'margin-bottom:12px' }, [
        h('div', { style: 'height:20px;background:var(--panel-bg-2,#eee);border-radius:3px;overflow:hidden;border:1px solid var(--panel-border,#ddd)' }, [
          h('div', {
            style: `height:100%;background:var(--primary,#0066cc);transition:width 0.2s;width:${progress}%`
          })
        ]),
        h('div', { style: 'font-size:11px;color:var(--fg-2);margin-top:4px;text-align:center' }, `${progress}%`)
      ]),

      h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;font-size:11px' }, [
        h('div', {}, [
          h('div', { style: 'color:var(--fg-2)' }, 'Speed'),
          h('div', { style: 'font-weight:500' }, speed)
        ]),
        h('div', {}, [
          h('div', { style: 'color:var(--fg-2)' }, eta ? 'ETA' : ''),
          h('div', { style: 'font-weight:500' }, eta || '—')
        ])
      ]),

      h('div', { style: `color:${statusColor};font-size:12px;margin-bottom:12px` }, statusText),

      _uploadState.thumbnail ? h('div', { style: 'margin-bottom:12px' }, [
        h('div', { style: 'font-size:11px;color:var(--fg-2);margin-bottom:6px' }, 'Preview'),
        h('img', { src: _uploadState.thumbnail, style: 'max-width:100%;max-height:128px;border-radius:4px;border:1px solid var(--panel-border,#ddd)' })
      ]) : null,


      h('div', { style: 'display:flex;gap:8px;justify-content:flex-end' }, [
        (_uploadState.status === 'uploading' || _uploadState.status === 'idle') && h('button', {
          type: 'button',
          style: 'padding:6px 12px;font-size:12px;border-radius:3px;background:var(--danger,#dc3545);color:#fff;border:none;cursor:pointer',
          onClick: () => {
            if (_abortController) _abortController.abort()
            _uploadState.status = 'cancelled'
            onCancel?.()
            render()
          }
        }, 'Cancel'),

        _uploadState.status === 'completed' && h('button', {
          type: 'button',
          style: 'padding:6px 12px;font-size:12px;border-radius:3px;background:var(--fg-2);color:#fff;border:none;cursor:pointer',
          onClick: () => {
            _container.innerHTML = ''
          }
        }, 'Close')
      ])
    ].filter(Boolean))

    _container.innerHTML = ''
    _container.appendChild(content)
  }

  async function uploadFile(file) {
    _uploadState = {
      fileName: file.name,
      fileSize: file.size,
      bytesUploaded: 0,
      totalChunks: Math.ceil(file.size / CHUNK_SIZE),
      currentChunk: 0,
      startTime: performance.now(),
      status: 'uploading',
      errorMessage: null,
      thumbnail: null
    }

    _abortController = new AbortController()
    render()

    try {
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)

        const formData = new FormData()
        formData.append('file', chunk)
        formData.append('uploadId', uploadId)
        formData.append('chunkIndex', chunkIndex)
        formData.append('totalChunks', totalChunks)
        formData.append('fileName', file.name)

        _uploadState.currentChunk = chunkIndex + 1
        _uploadState.bytesUploaded = end
        render()

        const response = await fetch('/upload-model', {
          method: 'POST',
          body: formData,
          signal: _abortController.signal
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        if (chunkIndex === totalChunks - 1) {
          const result = await response.json()
          if (result.thumbnail) {
            _uploadState.thumbnail = result.thumbnail
          }
        }
      }

      _uploadState.status = 'completed'
      _uploadState.bytesUploaded = file.size
      render()
      onComplete?.(_uploadState)
    } catch (error) {
      if (error.name === 'AbortError') {
        _uploadState.status = 'cancelled'
      } else {
        _uploadState.status = 'error'
        _uploadState.errorMessage = error.message
      }
      onError?.(error)
      render()
    }
  }

  return {
    mount(container) {
      _container = container
      _container.classList.add('ds-ep-panel')
      _container.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0;justify-content:center;align-items:center;padding:24px'
      render()
    },
    uploadFile,
    getState() {
      return _uploadState
    },
    render
  }
}
