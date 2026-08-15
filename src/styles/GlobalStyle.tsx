/**
 * 全局样式（GlobalStyle）
 *
 * 承载原 45-typography.css 的元素级规则、00-base-shell.css 的元素级规则
 * （含 40-layout-components.css 对元素规则的最终覆盖值），以及由 theme.ts
 * 生成的 :root 设计令牌。类级规则随组件迁移逐步移入各 styled 组件。
 */
import { createGlobalStyle, css } from 'styled-components'
import { uiCssVars } from '../theme'

const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap');`

const elementResets = css`
  /* 原 45-typography.css */
  html {
    font-size: 16px;
  }

  body,
  button,
  input,
  select,
  textarea {
    font-family: var(--ui-font);
  }

  body {
    font-size: var(--font-body);
    line-height: 1.58;
  }

  /* 原 00-base-shell.css + 40-layout-components.css 最终值 */
  * {
    box-sizing: border-box;
  }

  body {
    min-width: 320px;
    margin: 0;
    min-height: 100vh;
    background: linear-gradient(180deg, var(--ui-shell), var(--ui-shell-2));
    color: var(--ui-ink);
    font-synthesis: none;
  }

  body * {
    letter-spacing: 0 !important;
  }

  button {
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  button:focus-visible,
  [role='button']:focus-visible {
    outline: 3px solid oklch(58% .105 76 / .46);
    outline-offset: 3px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: .42;
  }

  h1,
  h2,
  h3,
  p {
    margin-top: 0;
  }

  h1,
  h2,
  h3 {
    color: var(--ui-ink-strong);
    font-family: var(--ui-serif);
    font-weight: 700;
    letter-spacing: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      transition-duration: .01ms !important;
      animation-duration: .01ms !important;
    }
  }
`

const GlobalStyle = createGlobalStyle`
  ${fontImport}

  ${uiCssVars}

  ${elementResets}
`

export default GlobalStyle
