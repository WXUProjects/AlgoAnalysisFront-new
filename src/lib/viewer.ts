import Viewer from 'viewerjs'
import 'viewerjs/dist/viewer.css'
import { prefersReducedMotion } from '@/lib/motion'

const ZOOMABLE_CLASS = 'md-img-zoomable'

export type ImageViewerBindOptions = {
  /** 绑定后加到图片上的 class；默认 md-img-zoomable（配合 index.css 的 cursor: zoom-in） */
  zoomableClass?: string
  /** 透传给 Viewer 的额外选项，覆盖下方默认值 */
  viewerOptions?: Viewer.Options
}

/**
 * 用 viewerjs 绑定容器内全部图片：点击任意图片打开查看器（多图为画廊，点击哪张从哪张开始）。
 * 返回清理函数（destroy + 移除 class）。容器卸载 / 图片集合变化时调用清理函数后重新绑定。
 */
export function bindImageViewer(
  root: HTMLElement,
  { zoomableClass = ZOOMABLE_CLASS, viewerOptions }: ImageViewerBindOptions = {},
): () => void {
  const viewer = new Viewer(root, {
    backdrop: true,        // 点击背景关闭
    button: true,          // 右上角关闭按钮
    navbar: 2,             // 底部缩略图导航：>768px 显示（多图翻页用）
    title: false,          // 不显示标题栏（正文 alt 多为占位，无展示需求）
    toolbar: {
      zoomIn: 1,
      zoomOut: 1,
      oneToOne: 1,
      reset: 1,
      prev: 1,
      play: 0,             // 关幻灯片播放
      next: 1,
      rotateLeft: 1,
      rotateRight: 1,
      flipHorizontal: 0,   // 关翻转
      flipVertical: 0,
    },
    transition: !prefersReducedMotion(),
    ...viewerOptions,
  })
  const imgs = Array.from(root.querySelectorAll('img'))
  imgs.forEach((img) => img.classList.add(zoomableClass))
  return () => {
    viewer.destroy()
    imgs.forEach((img) => img.classList.remove(zoomableClass))
  }
}
