import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/code-hl.css'
// 全局引入：列表简述 / 题面 / 博客都可能渲染公式，避免仅 MarkdownBody 懒加载时卡片无样式
import 'katex/dist/katex.min.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
