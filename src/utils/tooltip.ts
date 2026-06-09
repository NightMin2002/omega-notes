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
    let left = 0

    if (pos === 'right' || pos === 'left') {
      if (pos === 'right') {
        left = rect.right + 12
        // 如果右侧空间不足且左侧空间更大，则翻转到左侧
        if (left + tipRect.width > window.innerWidth - 8 && rect.left > window.innerWidth - rect.right) {
          left = rect.left - tipRect.width - 12
        }
      } else {
        left = rect.left - tipRect.width - 12
        // 如果左侧空间不足且右侧空间更大，则翻转到右侧
        if (left < 8 && window.innerWidth - rect.right > rect.left) {
          left = rect.right + 12
        }
      }

      // 纵向居中
      top = rect.top + (rect.height - tipRect.height) / 2
      // 边界修正
      if (top < 8) top = 8
      if (top + tipRect.height > window.innerHeight - 8) {
        top = window.innerHeight - tipRect.height - 8
      }

      tip.style.top = `${top}px`
      tip.style.left = `${left}px`
    } else {
      left = rect.left + rect.width / 2

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
    }
  }

  document.body.addEventListener('mouseover', (e: MouseEvent) => {
    // 1. 若有右键菜单存在，则在此期间静默挂起所有 tooltip
    if (document.querySelector('.context-menu')) return

    const target = (e.target as HTMLElement).closest('[data-tooltip], [data-tooltip-html]') as HTMLElement
    // Avoid double triggering child elements if already active
    if (!target || activeTarget === target) return
    
    const text = target.getAttribute('data-tooltip')
    const htmlText = target.getAttribute('data-tooltip-html')
    if (!text && !htmlText) return

    // Clean up previous if any
    if (activeTarget && currentObserver) {
      currentObserver.disconnect()
    }

    activeTarget = target
    const tip = getTooltipEl()
    
    if (htmlText) {
      tip.innerHTML = htmlText
      tip.classList.add('has-html')
    } else {
      tip.textContent = text || ''
      tip.classList.remove('has-html')
    }
    const pos = target.getAttribute('data-tooltip-pos') || 'top'

    // 2. 瞬间移动逻辑：关掉过渡动画，重置并定位到新坐标以防止“飞越”闪现
    tip.style.transition = 'none'
    tip.style.opacity = '0'
    if (pos === 'right' || pos === 'left') {
      tip.style.transform = pos === 'right' ? 'translateX(-6px)' : 'translateX(6px)'
    } else {
      tip.style.transform = pos === 'bottom' ? 'translateY(-4px) translateX(-50%)' : 'translateY(4px) translateX(-50%)'
    }
    tip.style.display = 'block'

    // 立即更新位置到新目标
    updateTooltipPosition(target, tip, pos)

    // 强制触发重排锁死坐标
    tip.offsetHeight

    // 3. 在下一帧开启 transition 并设置最终状态
    requestAnimationFrame(() => {
      if (activeTarget !== target) return
      tip.style.transition = '' // 恢复 CSS 中的过渡效果
      tip.style.opacity = '1'
      if (pos === 'right' || pos === 'left') {
        tip.style.transform = 'translateY(0)'
      } else {
        tip.style.transform = 'translateY(0) translateX(-50%)'
      }
    })

    const handleMouseLeave = () => {
      if (activeTarget !== target) return
      activeTarget = null
      if (currentObserver) {
        currentObserver.disconnect()
        currentObserver = null
      }
      tip.style.opacity = '0'
      if (pos === 'right' || pos === 'left') {
        tip.style.transform = pos === 'right' ? 'translateX(-6px)' : 'translateX(6px)'
      } else {
        tip.style.transform = tip.style.top && parseInt(tip.style.top) > target.getBoundingClientRect().bottom ? 'translateY(-4px) translateX(-50%)' : 'translateY(4px) translateX(-50%)'
      }
      setTimeout(() => {
        if (!activeTarget) {
          tip.style.display = 'none'
          tip.classList.remove('has-html')
        }
      }, 200)
      target.removeEventListener('mouseleave', handleMouseLeave)
      target.removeEventListener('click', handleClick)
      target.removeEventListener('contextmenu', handleClick)
    }

    const handleClick = () => {
      // Disappear on click or right-click
      handleMouseLeave()
    }

    target.addEventListener('mouseleave', handleMouseLeave)
    target.addEventListener('click', handleClick)
    target.addEventListener('contextmenu', handleClick)

    // Observe text updates dynamically (e.g. Copy -> Copied)
    currentObserver = new MutationObserver(() => {
      if (activeTarget === target) {
        const newText = target.getAttribute('data-tooltip')
        const newHtmlText = target.getAttribute('data-tooltip-html')
        if (newText || newHtmlText) {
          if (newHtmlText) {
            tip.innerHTML = newHtmlText
            tip.classList.add('has-html')
          } else {
            tip.textContent = newText || ''
            tip.classList.remove('has-html')
          }
          // Slight delay to allow DOM render to calculate new width
          requestAnimationFrame(() => {
             if (activeTarget === target) updateTooltipPosition(target, tip, pos)
          })
        } else {
          handleMouseLeave()
        }
      }
    })
    currentObserver.observe(target, { attributes: true, attributeFilter: ['data-tooltip', 'data-tooltip-html'] })
  })
}
