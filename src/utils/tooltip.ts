export function initGlobalTooltips() {
  let tooltipEl: HTMLDivElement | null = null
  let activeTarget: HTMLElement | null = null
  let currentObserver: MutationObserver | null = null

  function getTooltipEl() {
    if (tooltipEl) return tooltipEl
    tooltipEl = document.createElement('div')
    tooltipEl.className = 'global-js-tooltip'
    document.body.appendChild(tooltipEl)
    return tooltipEl
  }

  function updateTooltipPosition(target: HTMLElement, tip: HTMLDivElement, pos: string) {
    const rect = target.getBoundingClientRect()
    const tipRect = tip.getBoundingClientRect()
    
    let top = 0
    let left = rect.left + rect.width / 2

    if (pos === 'bottom') {
      top = rect.bottom + 6
    } else {
      top = rect.top - tipRect.height - 6
    }

    // Boundary checks
    if (left - tipRect.width / 2 < 8) left = tipRect.width / 2 + 8
    if (left + tipRect.width / 2 > window.innerWidth - 8) left = window.innerWidth - 8 - tipRect.width / 2
    if (top < 8) top = rect.bottom + 6
    if (top + tipRect.height > window.innerHeight - 8) top = rect.top - tipRect.height - 6

    tip.style.top = `${top}px`
    tip.style.left = `${left}px`
    tip.style.opacity = '1'
    tip.style.transform = 'translateY(0) translateX(-50%)'
  }

  document.body.addEventListener('mouseover', (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-tooltip]') as HTMLElement
    // Avoid double triggering child elements if already active
    if (!target || activeTarget === target) return
    
    const text = target.getAttribute('data-tooltip')
    if (!text) return

    // Clean up previous if any
    if (activeTarget && currentObserver) {
      currentObserver.disconnect()
    }

    activeTarget = target
    const tip = getTooltipEl()
    tip.textContent = text
    const pos = target.getAttribute('data-tooltip-pos') || 'top'

    tip.style.display = 'block'
    tip.style.opacity = '0'
    tip.style.transform = pos === 'bottom' ? 'translateY(-4px) translateX(-50%)' : 'translateY(4px) translateX(-50%)'

    requestAnimationFrame(() => {
      if (activeTarget !== target) return
      updateTooltipPosition(target, tip, pos)
    })

    const handleMouseLeave = () => {
      if (activeTarget !== target) return
      activeTarget = null
      if (currentObserver) {
        currentObserver.disconnect()
        currentObserver = null
      }
      tip.style.opacity = '0'
      tip.style.transform = tip.style.top && parseInt(tip.style.top) > target.getBoundingClientRect().bottom ? 'translateY(-4px) translateX(-50%)' : 'translateY(4px) translateX(-50%)'
      setTimeout(() => {
        if (!activeTarget) tip.style.display = 'none'
      }, 200)
      target.removeEventListener('mouseleave', handleMouseLeave)
      target.removeEventListener('click', handleClick)
    }

    const handleClick = () => {
      // Disappear on click
      handleMouseLeave()
    }

    target.addEventListener('mouseleave', handleMouseLeave)
    target.addEventListener('click', handleClick)

    // Observe text updates dynamically (e.g. Copy -> Copied)
    currentObserver = new MutationObserver(() => {
      if (activeTarget === target) {
        const newText = target.getAttribute('data-tooltip')
        if (newText) {
          tip.textContent = newText
          // Slight delay to allow DOM render to calculate new width
          requestAnimationFrame(() => {
             if (activeTarget === target) updateTooltipPosition(target, tip, pos)
          })
        } else {
          handleMouseLeave()
        }
      }
    })
    currentObserver.observe(target, { attributes: true, attributeFilter: ['data-tooltip'] })
  })
}
