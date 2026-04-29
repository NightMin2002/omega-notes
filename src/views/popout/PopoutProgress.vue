<script setup lang="ts">
/**
 * PopoutProgress — 底部时间条窗口
 * 只负责时间显示、停靠与打开独立的展开面板窗口，避免透明 WebView resize 闪烁。
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

const bc = new BroadcastChannel('omega-hub-channel')
bc.onmessage = (e) => {
  if (e.data?.type === 'request-direction') {
    bc.postMessage({ type: 'direction', direction: expandDirection.value })
  }
  // 面板窗口的悬停状态通知
  if (e.data?.type === 'panel-hover') {
    isPanelHovering.value = !!e.data.hovering
    evaluateAutoCollapse()
  }
}
import { currentMonitor, type Monitor } from '@tauri-apps/api/window'
import { invoke } from '@tauri-apps/api/core'
import { emitTo } from '@tauri-apps/api/event'
import { useTasksStore } from '../../stores/tasks'

const tasksStore = useTasksStore()
tasksStore.init()

const win = getCurrentWebviewWindow()
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>
let edgeCheckTimer: ReturnType<typeof setInterval>
let hideTimeout: ReturnType<typeof setTimeout>
let collapseTimer: ReturnType<typeof setTimeout> | null = null
let unlistenCollapseRequest: (() => void) | null = null

/* ─── Hub 状态 ─── */
const isExpanded = ref(false)
const expandDirection = ref<'up' | 'down'>('up')
const isTransitioning = ref(false)
const disableTransition = ref(false)
const isHovering = ref(false)
const isPanelHovering = ref(false)
const dockEdge = ref<'none' | 'left' | 'right' | 'top'>('none')
const visualDockEdge = ref<'none' | 'left' | 'right' | 'top'>('none')

/* ─── 配置同步 ─── */
const defaultHubConfig = {
  showDay: true,
  showYear: true,
  showWeek: true,
  useDetailedText: true,
  detailedTextType: 'elapsed',
  panelPinned: false,
}

function readHubConfig() {
  try {
    return {
      ...defaultHubConfig,
      ...JSON.parse(localStorage.getItem('hub-config') || '{}'),
    }
  } catch {
    return { ...defaultHubConfig }
  }
}

const hubConfig = ref(readHubConfig())

function handleStorage(e: StorageEvent) {
  if (e.key === 'hub-config') {
    hubConfig.value = readHubConfig()
  }
}

/* ─── 窗口尺寸常量 ─── */
const FULL_WIDTH = 420
const COLLAPSED_HEIGHT = 48
const PANEL_HEIGHT = 440
const DOCK_VISIBLE_PX = 10

// 用于提取 CSS 脱框偏移量，确保无论常亮怎么变，无状态移位都高度绑定单源数据
const cssVisualDockRight = `${FULL_WIDTH - DOCK_VISIBLE_PX}px`
const cssVisualDockLeft = `-${FULL_WIDTH - DOCK_VISIBLE_PX}px`
const cssVisualDockTop = `-${COLLAPSED_HEIGHT - DOCK_VISIBLE_PX}px`

const EDGE_THRESHOLD = 15
const WIN_LABEL = 'popout-progress'
const PANEL_LABEL = 'popout-progress-panel'
const WIDGET_STATE_KEY = 'omega-widget-state'

type WidgetState =
  | { mode: 'docked'; edge: 'left' | 'right' | 'top'; y: number }
  | { mode: 'free'; x: number; y: number }

function saveWidgetState(state: WidgetState) {
  try {
    localStorage.setItem(WIDGET_STATE_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

function loadWidgetState(): WidgetState | null {
  try {
    const raw = localStorage.getItem(WIDGET_STATE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw)
    if (state?.mode === 'docked' && ['left', 'right', 'top'].includes(state.edge)) return state
    if (state?.mode === 'free' && typeof state.x === 'number' && typeof state.y === 'number') return state
  } catch { /* ignore */ }
  return null
}

type GeometryOrder = 'position-first' | 'size-first'
type WorkAreaMetrics = {
  left: number
  top: number
  right: number
  bottom: number
  scaleFactor: number
  fullWidthPx: number
  collapsedHeightPx: number
  panelHeightPx: number
  dockVisiblePx: number
  edgeThresholdPx: number
}

let preDockPosition: { x: number; y: number } | null = null
let preExpandPosition: { x: number; y: number } | null = null

async function updateGeometry(
  x: number,
  y: number,
  w: number,
  h: number,
  order: GeometryOrder = 'position-first',
) {
  await invoke('update_popout_geometry', { label: WIN_LABEL, x, y, w, h, order })
}

async function showPanel(x: number, y: number) {
  await invoke('show_progress_panel', { x, y })
}

async function hidePanel() {
  await invoke('hide_progress_panel')
}

function syncPanelDirection(direction: 'up' | 'down') {
  localStorage.setItem('hub-panel-direction', direction)
  // 通过原生的 BroadcastChannel，无视 Tauri 休眠机制，光速直达各 Webview
  bc.postMessage({ type: 'direction', direction })
  return emitTo(PANEL_LABEL, 'hub:panel-direction', { direction }).catch(() => {})
}

function getWorkAreaMetrics(monitor: Monitor): WorkAreaMetrics {
  const workArea = monitor.workArea ?? { position: monitor.position, size: monitor.size }
  const scaleFactor = monitor.scaleFactor || 1
  const left = workArea.position.x
  const top = workArea.position.y
  const width = workArea.size.width
  const height = workArea.size.height

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    scaleFactor,
    fullWidthPx: Math.round(FULL_WIDTH * scaleFactor),
    collapsedHeightPx: Math.round(COLLAPSED_HEIGHT * scaleFactor),
    panelHeightPx: Math.round(PANEL_HEIGHT * scaleFactor),
    dockVisiblePx: Math.max(1, Math.round(DOCK_VISIBLE_PX * scaleFactor)),
    edgeThresholdPx: Math.max(1, Math.round(EDGE_THRESHOLD * scaleFactor)),
  }
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

async function settleLayout() {
  await nextTick()
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
}

async function collapsePanelAndRestorePosition() {
  if (!isExpanded.value) return

  // 发送收缩动画指令，让 Panel 进行 CSS 缓动向时间条滑动隐藏
  bc.postMessage({ type: 'anim-close' })
  // 等待动画物理过度结束之后，再销毁/隐藏 WebView 防止直接黑屏截断
  await new Promise(resolve => setTimeout(resolve, 300))

  const pos = await win.outerPosition()
  // 回到展开前的位置，不强制 clamp 回屏幕内——尊重用户的放置意愿
  const targetX = preExpandPosition?.x ?? pos.x
  const targetY = preExpandPosition?.y ?? pos.y

  await hidePanel()
  await updateGeometry(targetX, targetY, FULL_WIDTH, COLLAPSED_HEIGHT, 'position-first')
  isExpanded.value = false
  preExpandPosition = null
}

/* ─── 时间与进度 ─── */
const year = computed(() => now.value.getFullYear())

const dayProgress = computed(() => {
  const start = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate()).getTime()
  return (now.value.getTime() - start) / (24 * 60 * 60 * 1000)
})

const yearProgress = computed(() => {
  const start = new Date(year.value, 0, 1).getTime()
  const end = new Date(year.value + 1, 0, 1).getTime()
  return (now.value.getTime() - start) / (end - start)
})

const dayDetailedText = computed(() => {
  if (hubConfig.value.detailedTextType === 'remaining') {
    const start = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate()).getTime()
    const remMs = 24 * 3600 * 1000 - (now.value.getTime() - start)
    const h = Math.floor(remMs / 3600000)
    const m = Math.floor((remMs % 3600000) / 60000)
    return `今日余 ${h}时${m}分`
  }
  return `今日已过 ${now.value.getHours()}时${now.value.getMinutes()}分`
})

const yearDetailedText = computed(() => {
  const start = new Date(year.value, 0, 1).getTime()
  const end = new Date(year.value + 1, 0, 1).getTime()
  const d = Math.floor((now.value.getTime() - start) / (1000 * 60 * 60 * 24))
  if (hubConfig.value.detailedTextType === 'remaining') {
    const total = Math.floor((end - start) / (1000 * 60 * 60 * 24))
    return `今年余 ${total - d}天`
  }
  return `今年已过 ${d}天`
})

const weekNumber = computed(() => {
  const d = new Date(Date.UTC(now.value.getFullYear(), now.value.getMonth(), now.value.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
})

const days = ['日', '一', '二', '三', '四', '五', '六']
const weekDay = computed(() => `周${days[now.value.getDay()]}`)

const timeStr = computed(() => {
  const isC = tasksStore.countdown.isRunning
  const rem = tasksStore.countdown.remainingSeconds
  const h = isC ? Math.floor(rem / 3600).toString().padStart(2, '0') : now.value.getHours().toString().padStart(2, '0')
  const m = isC ? Math.floor((rem % 3600) / 60).toString().padStart(2, '0') : now.value.getMinutes().toString().padStart(2, '0')
  const s = isC ? (rem % 60).toString().padStart(2, '0') : now.value.getSeconds().toString().padStart(2, '0')
  
  if (isC) {
    if (rem >= 3600) return { m: `${h}:${m}`, s: `:${s}`, runningTimer: true }
    return { m: `${m}:${s}`, s: '', runningTimer: true }
  }
  return { m: `${h}:${m}`, s: `:${s}`, runningTimer: false }
})

/* ─── 展开与折叠 ─── */
async function toggleExpand() {
  if (isTransitioning.value) return
  isTransitioning.value = true
  const previousExpanded = isExpanded.value
  const previousPreExpand = preExpandPosition ? { ...preExpandPosition } : null

  try {
    if (isExpanded.value) {
      await collapsePanelAndRestorePosition()
      return
    }

    const monitor = await currentMonitor()
    if (!monitor) return
    const metrics = getWorkAreaMetrics(monitor)
    const pos = await win.outerPosition()
    const safeX = clamp(pos.x, metrics.left, metrics.right - metrics.fullWidthPx)
    const safeY = clamp(pos.y, metrics.top, metrics.bottom - metrics.collapsedHeightPx)
    const spaceAbove = safeY - metrics.top
    const spaceBelow = metrics.bottom - (safeY + metrics.collapsedHeightPx)
    const nextDirection: 'up' | 'down' =
      spaceBelow >= metrics.panelHeightPx && (spaceBelow >= spaceAbove || spaceAbove < metrics.panelHeightPx)
        ? 'down'
        : 'up'

    preExpandPosition = { x: safeX, y: safeY }
    expandDirection.value = nextDirection

    const panelY = clamp(
      nextDirection === 'down'
        ? safeY + metrics.collapsedHeightPx
        : safeY - metrics.panelHeightPx,
      metrics.top,
      metrics.bottom - metrics.panelHeightPx,
    )

    // 发送预备动画指令：利用 translateX/Y 偷偷将实际面板挤到渲染窗体外
    bc.postMessage({ type: 'anim-prepare', direction: nextDirection })
    await syncPanelDirection(nextDirection)

    // 留给面板 Vue 一点时间挂上 hidden class
    await new Promise(r => setTimeout(r, 40))

    await showPanel(safeX, panelY)
    
    // 确保操作系统完成了透明面板的绘制，此时由于隐身外衣用户依旧看不见它
    await nextTick()
    await new Promise(r => setTimeout(r, 60))
    
    // 正式触发解除封印：CSS 将由于 is-visible 的添加开始丝滑过度
    bc.postMessage({ type: 'anim-start' })

    // 冗余触发：在窗口创建并可能有稍许延迟后再次发送，彻底治愈同步遗漏
    setTimeout(() => {
      syncPanelDirection(nextDirection)
      bc.postMessage({ type: 'anim-start' })
    }, 150)
    
    isExpanded.value = true
  } catch (e) {
    console.error('Toggle panel failed', e)
    isExpanded.value = previousExpanded
    preExpandPosition = previousPreExpand
  } finally {
    isTransitioning.value = false
    // 展开动画期间鼠标已离开 → 若未固定则自动收缩
    if (isExpanded.value && !isHovering.value && !hubConfig.value.panelPinned) {
      void collapsePanelAndRestorePosition()
    }
  }
}

/* ─── 边缘吸附 (dock) ─── */
async function dockToEdge(edge: 'left' | 'right' | 'top') {
  if (isExpanded.value || isTransitioning.value) return
  isTransitioning.value = true
  const previousEdge = dockEdge.value
  const previousPreDock = preDockPosition ? { ...preDockPosition } : null

  try {
    const pos = await win.outerPosition()
    const monitor = await currentMonitor()
    if (!monitor) return
    const metrics = getWorkAreaMetrics(monitor)

    preDockPosition = {
      x: clamp(pos.x, metrics.left, metrics.right - metrics.fullWidthPx),
      y: clamp(pos.y, metrics.top, metrics.bottom - metrics.collapsedHeightPx),
    }

    const targetY = clamp(pos.y, metrics.top, metrics.bottom - metrics.collapsedHeightPx)
    const targetX = clamp(pos.x, metrics.left, metrics.right - metrics.fullWidthPx)

    // 第一步：如果在靠右侧吸附，应该让窗口先完美贴边，再执行动画
    if (edge === 'right') {
      await updateGeometry(metrics.right - metrics.fullWidthPx, targetY, FULL_WIDTH, COLLAPSED_HEIGHT, 'position-first')
      await new Promise(r => setTimeout(r, 40))
    }

    // 第二步：开启动画偏移 (纯净完成滑动)
    visualDockEdge.value = edge
    await new Promise(r => setTimeout(r, 450)) // 确保滑动彻底结束

    // 第三步：强制切断所有过渡，瞬间贴上钢钉级的 is-docked 物理约束
    disableTransition.value = true
    dockEdge.value = edge
    visualDockEdge.value = 'none'
    await settleLayout()

    if (edge === 'left') {
      await updateGeometry(metrics.left, targetY, DOCK_VISIBLE_PX, COLLAPSED_HEIGHT, 'size-first')
    } else if (edge === 'right') {
      await updateGeometry(metrics.right - metrics.dockVisiblePx, targetY, DOCK_VISIBLE_PX, COLLAPSED_HEIGHT, 'position-first')
    } else {
      await updateGeometry(targetX, metrics.top, FULL_WIDTH, DOCK_VISIBLE_PX, 'size-first')
    }

    // 第四步：恢复过渡通道
    await new Promise(r => setTimeout(r, 50))
    disableTransition.value = false

    // 持久化吸附状态（记录边缘方向和Y坐标，供下次启动恢复）
    const finalPos = await win.outerPosition()
    saveWidgetState({ mode: 'docked', edge, y: finalPos.y })

  } catch (e) {
    console.error('Dock failed', e)
    dockEdge.value = previousEdge
    visualDockEdge.value = 'none'
    preDockPosition = previousPreDock
    disableTransition.value = false
  } finally {
    isTransitioning.value = false
  }
}

async function undock() {
  if (isTransitioning.value) return
  isTransitioning.value = true
  const previousEdge = dockEdge.value
  const previousPreDock = preDockPosition ? { ...preDockPosition } : null
  const previousDisableTransition = disableTransition.value

  try {
    const savedEdge = dockEdge.value
    
    // 我们必须先计算出复原后，完整的 420 宽的 Tauri 窗体应该摆放的基准位置
    const pos = await win.outerPosition()
    let targetX = preDockPosition?.x ?? pos.x
    let targetY = preDockPosition?.y ?? pos.y

    const monitor = await currentMonitor()
    if (monitor) {
      const metrics = getWorkAreaMetrics(monitor)
      if (savedEdge === 'right') targetX = metrics.right - metrics.fullWidthPx
      else if (savedEdge === 'left') targetX = metrics.left
      else targetX = clamp(targetX, metrics.left, metrics.right - metrics.fullWidthPx)

      if (savedEdge === 'top') targetY = metrics.top
      else targetY = clamp(targetY, metrics.top, metrics.bottom - metrics.collapsedHeightPx)
    }

    preDockPosition = null

    // 突破核心：由于 WebView 渲染滞后，在 Tauri OS 窗口尺寸变化瞬间，基于DOM宽度的排版会崩溃并漂移到左上角 0,0
    // 我们必须在 OS 窗口改变之前，就提前强行拔掉它的“10px吸附窄条”伪装，换回 420 宽的灰条并将其移出画外（此时必被 10px 的 OS 窗体物理裁剪不可见）
    // 这样当 OS 窗口重铸尺寸的混乱几十毫秒内，UI是在画外隐藏的，绝对不会像幻影一样闪烁在左上角！
    disableTransition.value = true
    dockEdge.value = 'none'
    visualDockEdge.value = savedEdge //瞬间将其转移至 410px 外躲避
    await settleLayout()
    void document.documentElement.offsetHeight

    // 让系统放开手脚撑延展成 420，此时由于它躲在 X=410px 的偏远位置，随着窗体的展开，它的左边缘恰巧会完全严丝合缝地吻合在屏幕最右侧边缘！
    await updateGeometry(targetX, targetY, FULL_WIDTH, COLLAPSED_HEIGHT, 'position-first')
    
    // 给系统重绘边框一个短暂时间，让它把画作稳定拿出来
    await nextTick()
    await new Promise(r => setTimeout(r, 60))

    // 致命核心！必须等待实打实的两帧，确保 WebView 完完全全把这个无动画的 translateX 初态绘制并锁进 GPU
    // 如果立刻恢复 disableTransition = false，浏览器会将它和上一状态合并，导致根本没有过渡瞬间跳跃（即“以左侧展开”）
    await new Promise(r => requestAnimationFrame(r))
    await new Promise(r => requestAnimationFrame(r))
    await new Promise(r => setTimeout(r, 20))

    // 重新开启引擎动力阀门，释放完美滑动
    disableTransition.value = false
    visualDockEdge.value = 'none'

    await new Promise(r => setTimeout(r, 450))

  } catch (e) {
    console.error('Undock failed', e)
    dockEdge.value = previousEdge
    visualDockEdge.value = 'none'
    preDockPosition = previousPreDock
    disableTransition.value = previousDisableTransition
  } finally {
    isTransitioning.value = false
  }
}

async function checkEdgeAndDock() {
  if (isHovering.value || dockEdge.value !== 'none' || isExpanded.value || isTransitioning.value) return

  try {
    const pos = await win.outerPosition()
    const size = await win.outerSize()
    const monitor = await currentMonitor()
    if (!monitor) return

    const metrics = getWorkAreaMetrics(monitor)

    // 窗口中心必须在工作区内部才触发吸附——如果用户已将窗口拖到屏幕外，则不拉回
    const centerX = pos.x + size.width / 2
    const centerY = pos.y + size.height / 2
    const isCenterInWorkArea =
      centerX >= metrics.left && centerX <= metrics.right &&
      centerY >= metrics.top && centerY <= metrics.bottom
    if (!isCenterInWorkArea) return

    if (pos.y <= metrics.top + metrics.edgeThresholdPx) await dockToEdge('top')
    else if (pos.x <= metrics.left + metrics.edgeThresholdPx) await dockToEdge('left')
    else if (pos.x + size.width >= metrics.right - metrics.edgeThresholdPx) await dockToEdge('right')
    else {
      // 微件不在任何边缘附近 → 用户主动拖离了边缘，保存自由浮动位置
      saveWidgetState({ mode: 'free', x: pos.x, y: pos.y })
    }
  } catch {
    // ignore
  }
}

/** 评估是否应自动收缩面板（跨窗口悬停检测） */
function evaluateAutoCollapse() {
  // 清除已有的收缩计时器
  if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null }
  // 如果面板未展开、正在过渡、或固定模式 → 不评估
  if (!isExpanded.value || isTransitioning.value || hubConfig.value.panelPinned) return
  // 如果任一窗口仍有悬停 → 不收缩
  if (isHovering.value || isPanelHovering.value) return
  // 两个窗口都无悬停 → 延迟 1.5s 后自动收缩
  collapseTimer = setTimeout(() => {
    if (!isHovering.value && !isPanelHovering.value && isExpanded.value && !hubConfig.value.panelPinned) {
      void collapsePanelAndRestorePosition()
    }
    collapseTimer = null
  }, 1500)
}

function handleMouseLeave() {
  isHovering.value = false
  if (isTransitioning.value) return
  // 面板展开时 → 触发跨窗口自动收缩评估
  if (isExpanded.value) {
    evaluateAutoCollapse()
    return
  }
  // 面板未展开 → 正常的边缘吸附检测
  hideTimeout = setTimeout(() => {
    void checkEdgeAndDock()
  }, 1000)
}

function handleMouseEnter() {
  isHovering.value = true
  clearTimeout(hideTimeout)
  if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null }
  if (isTransitioning.value) return
  if (dockEdge.value !== 'none') {
    void undock()
  }
}

async function closeWindow() {
  // 关闭前保存当前位置（若处于自由浮动状态）
  if (dockEdge.value === 'none') {
    try {
      const pos = await win.outerPosition()
      saveWidgetState({ mode: 'free', x: pos.x, y: pos.y })
    } catch { /* ignore */ }
  }
  try {
    await invoke('close_popout', { label: WIN_LABEL })
  } catch {
    window.close()
  }
}

function startDrag(e: MouseEvent) {
  if (e.button !== 0) return
  if ((e.target as HTMLElement).closest('button')) return
  if (isExpanded.value) return

  try {
    win.startDragging()
  } catch {
    // ignore
  }
}

/** 启动时无动画恢复上次保存的位置状态（吸附或自由浮动） */
async function restoreWidgetState() {
  const saved = loadWidgetState()
  if (!saved) {
    // 无保存状态，窗口以 hidden 创建，直接显示在 Rust 默认位置
    await win.show()
    return
  }

  // 先隐藏窗口，防止以全尺寸闪烁在 Rust 默认位置
  await win.hide()
  await new Promise(r => setTimeout(r, 200))

  const monitor = await currentMonitor()
  if (!monitor) {
    await win.show()
    return
  }
  const metrics = getWorkAreaMetrics(monitor)

  if (saved.mode === 'free') {
    // 恢复自由浮动位置
    const x = clamp(saved.x, metrics.left, metrics.right - metrics.fullWidthPx)
    const y = clamp(saved.y, metrics.top, metrics.bottom - metrics.collapsedHeightPx)
    await updateGeometry(x, y, FULL_WIDTH, COLLAPSED_HEIGHT, 'position-first')
    await win.show()
    return
  }

  // mode === 'docked'：恢复吸附状态
  const targetY = clamp(saved.y, metrics.top, metrics.bottom - metrics.collapsedHeightPx)
  const targetX = saved.edge === 'right'
    ? metrics.right - metrics.fullWidthPx
    : saved.edge === 'left'
      ? metrics.left
      : clamp(metrics.left + Math.round((metrics.right - metrics.left - metrics.fullWidthPx) / 2), metrics.left, metrics.right - metrics.fullWidthPx)

  // 设置 preDockPosition 为吸附位置对应的展开位置（非 Rust 初始位置）
  preDockPosition = { x: targetX, y: targetY }

  // 直接无动画吸附
  disableTransition.value = true
  dockEdge.value = saved.edge
  await settleLayout()

  if (saved.edge === 'left') {
    await updateGeometry(metrics.left, targetY, DOCK_VISIBLE_PX, COLLAPSED_HEIGHT, 'size-first')
  } else if (saved.edge === 'right') {
    await updateGeometry(metrics.right - metrics.dockVisiblePx, targetY, DOCK_VISIBLE_PX, COLLAPSED_HEIGHT, 'position-first')
  } else {
    await updateGeometry(targetX, metrics.top, FULL_WIDTH, DOCK_VISIBLE_PX, 'size-first')
  }

  await new Promise(r => setTimeout(r, 50))
  disableTransition.value = false
  await win.show()
}

onMounted(async () => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)

  edgeCheckTimer = setInterval(() => {
    if (!isHovering.value && dockEdge.value === 'none' && !isExpanded.value) {
      void checkEdgeAndDock()
    }
  }, 1500)

  window.addEventListener('storage', handleStorage)
  unlistenCollapseRequest = await win.listen('hub:collapse-request', () => {
    if (isTransitioning.value || !isExpanded.value) return
    // 固定模式下不响应面板关闭请求
    if (hubConfig.value.panelPinned) return
    void toggleExpand()
  })

  // 启动时恢复上次的位置状态（窗口以 hidden 创建，必须确保 show 被调用）
  void restoreWidgetState().catch(() => { win.show().catch(() => {}) })
})

onUnmounted(() => {
  clearInterval(timer)
  clearInterval(edgeCheckTimer)
  clearTimeout(hideTimeout)
  if (collapseTimer) clearTimeout(collapseTimer)
  window.removeEventListener('storage', handleStorage)
  unlistenCollapseRequest?.()
})
</script>

<template>
  <div class="app-container">
    <div
      class="progress-wrapper"
      :class="{
        'is-docked': dockEdge !== 'none',
        'is-docked-left': dockEdge === 'left',
        'is-docked-right': dockEdge === 'right',
        'is-docked-top': dockEdge === 'top',
        'is-expanded': isExpanded,
        'expand-down': isExpanded && expandDirection === 'down',
        'expand-up': isExpanded && expandDirection === 'up',
        'no-transition': disableTransition,
        'visual-dock-right': visualDockEdge === 'right',
        'visual-dock-left': visualDockEdge === 'left',
        'visual-dock-top': visualDockEdge === 'top',
      }"
      @mousedown="startDrag"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <div v-if="dockEdge !== 'none'" class="dock-indicator">
        <div class="dock-pulse"></div>
      </div>

      <template v-else>
        <div class="hub-header-bar">
          <div class="date-block">
            <span class="time" :class="{ 'is-timer-active': timeStr.runningTimer }">
              {{ timeStr.m }}<span class="sec">{{ timeStr.s }}</span>
            </span>
            <span v-if="hubConfig.showWeek" class="week-day">{{ year }} • {{ weekDay }} • W{{ weekNumber }}</span>
            <span v-else class="week-day">{{ year }} • {{ weekDay }}</span>
          </div>

          <div class="progress-section">
            <div v-if="hubConfig.showDay" class="track-row">
              <span class="track-label">DAY</span>
              <div class="track">
                <div class="fill day-fill" :style="{ width: `${dayProgress * 100}%` }"></div>
              </div>
              <span v-if="hubConfig.useDetailedText" class="detailed-text">{{ dayDetailedText }}</span>
            </div>

            <div v-if="hubConfig.showYear" class="track-row">
              <span class="track-label">YEA</span>
              <div class="track">
                <div class="fill year-fill" :style="{ width: `${yearProgress * 100}%` }"></div>
              </div>
              <span v-if="hubConfig.useDetailedText" class="detailed-text">{{ yearDetailedText }}</span>
            </div>
          </div>

          <div class="actions">
            <button v-if="isHovering || isExpanded" class="hub-btn expand-btn" @click="toggleExpand">
              <svg v-if="!isExpanded" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <button v-if="isHovering || isExpanded" class="hub-btn close-btn" @click="closeWindow">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent !important;
}

#app {
  height: 100vh;
  display: flex;
  background: transparent !important;
}
</style>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.progress-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-elevated, rgba(30, 30, 33, 0.92));
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  color: var(--color-text-primary);
  border-radius: 16px;
  clip-path: inset(0 round 16px);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  user-select: none;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}

.progress-wrapper.is-expanded {
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.18);
}

.progress-wrapper.expand-up {
  border-radius: 0 0 16px 16px;
  clip-path: inset(0 round 0 0 16px 16px);
  border-top: none;
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.18),
    inset 0 -1px 0 rgba(255, 255, 255, 0.04);
}

.progress-wrapper.expand-down {
  border-radius: 16px 16px 0 0;
  clip-path: inset(0 round 16px 16px 0 0);
  border-bottom: none;
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.progress-wrapper {
  transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease-out;
}

.progress-wrapper.visual-dock-right {
  /* 剥离 DOM 解析延迟，强制使用与 TS 配置绑定的绝对逻辑像素值 */
  transform: translateX(v-bind('cssVisualDockRight'));
}

.progress-wrapper.visual-dock-left {
  transform: translateX(v-bind('cssVisualDockLeft'));
}

.progress-wrapper.visual-dock-top {
  transform: translateY(v-bind('cssVisualDockTop'));
}

.progress-wrapper.no-transition {
  transition: none !important;
}

.progress-wrapper.is-docked {
  border-radius: 0;
  clip-path: none;
  border: none;
  background: var(--color-accent, #6366f1);
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
  justify-content: center;
  position: absolute;
}

.progress-wrapper.is-docked-right {
  width: 10px;
  height: 100%;
  right: 0;
  top: 0;
}

.progress-wrapper.is-docked-left {
  width: 10px;
  height: 100%;
  left: 0;
  top: 0;
}

.progress-wrapper.is-docked-top {
  width: 100%;
  height: 10px;
  top: 0;
  left: 0;
}

.dock-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.dock-pulse {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 0.5;
    transform: scale(0.8);
  }

  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.hub-header-bar {
  display: flex;
  align-items: center;
  height: 48px;
  min-height: 48px;
  padding: 0 16px;
  gap: 16px;
  cursor: grab;
}

.progress-wrapper.is-expanded .hub-header-bar {
  cursor: default;
}

.hub-header-bar:active {
  cursor: grabbing;
}

.date-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-shrink: 0;
  min-width: 60px;
}

.time {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.5px;
  transition: color 0.3s ease;
}

.time.is-timer-active {
  color: var(--color-accent, #6366f1);
  letter-spacing: 0.5px;
}

.sec {
  font-size: 11px;
  opacity: 0.8;
  font-weight: 500;
}

.week-day {
  font-size: 9px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  margin-top: 2px;
}

.progress-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  justify-content: center;
  margin-right: 8px;
}

.track-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.track-label {
  font-size: 8px;
  font-family: var(--font-mono);
  color: var(--color-text-tertiary);
  width: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.track {
  flex: 1;
  height: 6px;
  background: var(--color-bg-tertiary, rgba(255, 255, 255, 0.08));
  border-radius: 3px;
  position: relative;
  display: flex;
  align-items: center;
}

.fill {
  height: 100%;
  border-radius: 3px;
}

.day-fill {
  background: linear-gradient(90deg, oklch(0.7 0.12 230), var(--color-accent, oklch(0.6 0.2 270)));
  box-shadow: 0 0 6px color-mix(in oklch, var(--color-accent) 30%, transparent);
}

.year-fill {
  background: linear-gradient(90deg, oklch(0.8 0.15 90), oklch(0.7 0.16 55));
  box-shadow: 0 0 6px color-mix(in oklch, oklch(0.7 0.16 55) 25%, transparent);
}

.detailed-text {
  font-size: 8px;
  color: var(--color-text-secondary);
  font-weight: 500;
  font-family: var(--font-sans);
  white-space: nowrap;
  flex-shrink: 0;
}

.actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
  width: 50px;
  justify-content: flex-end;
}

.hub-btn {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary, rgba(255, 255, 255, 0.1));
  color: var(--color-text-secondary);
  border: none;
  cursor: pointer;
  appearance: none;
  padding: 0;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

@media (hover: hover) {
  .hub-btn:hover {
    background: var(--color-bg-hover, rgba(255, 255, 255, 0.15));
    color: var(--color-text-primary);
    transform: translateY(-1px);
  }

  .close-btn:hover {
    background: var(--color-danger, oklch(0.65 0.2 25));
    color: var(--color-text-inverse, #fff);
  }
}

.hub-btn:active {
  transform: scale(0.97);
}

.hub-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent, #6366f1);
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  .dock-pulse,
  .hub-btn {
    animation: none;
    transition: none;
  }
}
</style>
