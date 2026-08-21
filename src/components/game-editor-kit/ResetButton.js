import * as webjsx from '../../../vendor/webjsx/index.js'
const h = webjsx.createElement
import { Btn } from './ui-components.js'

export function ResetButton(opts = {}) {
  const {
    livePreview,
    onReset,
    onError,
    dense = false,
    ghost = false,
    className = ''
  } = opts

  const handleReset = () => {
    if (!livePreview) {
      onError?.('livePreview instance not provided')
      return
    }

    try {
      livePreview.reset?.()
      onReset?.()
    } catch (err) {
      onError?.(err.message || 'Reset failed')
    }
  }

  return Btn({
    dense,
    ghost,
    onClick: handleReset,
    title: 'Reset live preview to initial state',
    className,
    children: ['Reset']
  })
}
