/**
 * Invisible watermark overlay for leak tracing.
 * Embeds session ID in near-invisible text across the viewport.
 * If someone takes a screenshot, increasing contrast reveals the watermark.
 */
export function createWatermark(sessionId: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = window.innerWidth * 2
  canvas.height = window.innerHeight * 2
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 99999;
    opacity: 1;
  `

  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2) // retina

  const text = `${sessionId} ${new Date().toISOString().slice(0, 16)}`
  ctx.font = '14px monospace'
  ctx.fillStyle = 'rgba(128, 128, 128, 0.012)' // nearly invisible
  ctx.textAlign = 'center'

  // Tile watermark across the canvas
  const stepX = 240
  const stepY = 120
  for (let y = 0; y < window.innerHeight; y += stepY) {
    for (let x = 0; x < window.innerWidth; x += stepX) {
      ctx.save()
      ctx.translate(x + stepX / 2, y + stepY / 2)
      ctx.rotate(-25 * Math.PI / 180)
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }
  }

  return canvas
}

/**
 * Mount watermark and protect it from removal via MutationObserver
 */
export function mountWatermark(sessionId: string): () => void {
  let canvas = createWatermark(sessionId)
  document.body.appendChild(canvas)

  const observer = new MutationObserver(() => {
    if (!document.body.contains(canvas)) {
      canvas = createWatermark(sessionId)
      document.body.appendChild(canvas)
    }
  })

  observer.observe(document.body, { childList: true })

  return () => {
    observer.disconnect()
    canvas.remove()
  }
}
