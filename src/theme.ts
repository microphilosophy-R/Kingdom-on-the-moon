/**
 * 设计令牌（Design Tokens）—— 唯一事实来源
 *
 * 原定义位于 src/styles/40-layout-components.css 的 :root 与
 * src/styles/70-components.css。迁移后所有样式组件通过 props.theme
 * 或 GlobalStyle 注入的 :root CSS 变量（var(--ui-*)）引用。
 */

export const uiFonts = {
  /** 全局字体 */
  font: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  /** 标题衬线字体 */
  serif: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', serif",
  /** 等宽数字字体 */
  mono: "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
} as const

export const uiColors = {
  shell: 'oklch(92% .018 86)',
  shell2: 'oklch(88% .018 84)',
  surface: 'oklch(97% .01 86)',
  surface2: 'oklch(94% .014 84)',
  raised: 'oklch(98% .008 86)',
  parchment: 'oklch(90% .022 82)',
  ink: 'oklch(24% .024 250)',
  inkStrong: 'oklch(18% .026 250)',
  muted: 'oklch(47% .018 250)',
  muted2: 'oklch(57% .016 250)',
  line: 'oklch(73% .018 84)',
  lineStrong: 'oklch(64% .026 78)',
  brass: 'oklch(54% .082 76)',
  brassDark: 'oklch(43% .074 74)',
  brassSoft: 'oklch(94% .028 78)',
  brassWash: 'oklch(88% .026 78)',
  signal: 'oklch(50% .058 205)',
  signalSoft: 'oklch(92% .018 205)',
  success: 'oklch(51% .058 148)',
  successSoft: 'oklch(94% .018 142)',
  danger: 'oklch(52% .085 28)',
  dangerSoft: 'oklch(94% .02 35)',
  violet: 'oklch(49% .045 300)',
  shadow: 'oklch(35% .028 250 / .11)',
  shadowStrong: 'oklch(21% .025 250 / .26)',
} as const

export const uiFontSizes = {
  micro: '10px',
  caption: '12px',
  label: '12px',
  note: '12px',
  button: '14px',
  body: '16px',
  data: '16px',
  card: '18px',
  panel: '20px',
  dataLg: '24px',
  page: '32px',
  dataXl: '32px',
  display: '40px',
  hero: '56px',
} as const

export const uiRadii = {
  panel: '7px',
} as const

export const uiShadows = {
  panel: '0 8px 22px var(--ui-shadow)',
} as const

export const uiTokens = {
  colors: uiColors,
  fonts: uiFonts,
  fontSizes: uiFontSizes,
  radii: uiRadii,
  shadows: uiShadows,
}

export type UITheme = typeof uiTokens

/** CSS 变量名 → 值 映射（与 theme.ts 同步，供 GlobalStyle 注入 :root） */
const cssVarEntries: ReadonlyArray<readonly [string, string]> = [
  ['--ui-font', uiFonts.font],
  ['--ui-serif', uiFonts.serif],
  ['--ui-mono', uiFonts.mono],
  ['--ui-shell', uiColors.shell],
  ['--ui-shell-2', uiColors.shell2],
  ['--ui-surface', uiColors.surface],
  ['--ui-surface-2', uiColors.surface2],
  ['--ui-raised', uiColors.raised],
  ['--ui-parchment', uiColors.parchment],
  ['--ui-ink', uiColors.ink],
  ['--ui-ink-strong', uiColors.inkStrong],
  ['--ui-muted', uiColors.muted],
  ['--ui-muted-2', uiColors.muted2],
  ['--ui-line', uiColors.line],
  ['--ui-line-strong', uiColors.lineStrong],
  ['--ui-brass', uiColors.brass],
  ['--ui-brass-dark', uiColors.brassDark],
  ['--ui-brass-soft', uiColors.brassSoft],
  ['--ui-brass-wash', uiColors.brassWash],
  ['--ui-signal', uiColors.signal],
  ['--ui-signal-soft', uiColors.signalSoft],
  ['--ui-success', uiColors.success],
  ['--ui-success-soft', uiColors.successSoft],
  ['--ui-danger', uiColors.danger],
  ['--ui-danger-soft', uiColors.dangerSoft],
  ['--ui-violet', uiColors.violet],
  ['--ui-shadow', uiColors.shadow],
  ['--ui-shadow-strong', uiColors.shadowStrong],
  ['--font-micro', uiFontSizes.micro],
  ['--font-caption', uiFontSizes.caption],
  ['--font-label', uiFontSizes.label],
  ['--font-note', uiFontSizes.note],
  ['--font-button', uiFontSizes.button],
  ['--font-body', uiFontSizes.body],
  ['--font-data', uiFontSizes.data],
  ['--font-card', uiFontSizes.card],
  ['--font-panel', uiFontSizes.panel],
  ['--font-data-lg', uiFontSizes.dataLg],
  ['--font-page', uiFontSizes.page],
  ['--font-data-xl', uiFontSizes.dataXl],
  ['--font-display', uiFontSizes.display],
  ['--font-hero', uiFontSizes.hero],
  // 来自 70-components.css
  ['--ui-panel-radius', uiRadii.panel],
  ['--ui-panel-shadow', uiShadows.panel],
]

/** 由令牌生成的 :root 变量声明块，供 GlobalStyle 注入 */
export const uiCssVars = `:root {
  color-scheme: light;
  ${cssVarEntries.map(([key, value]) => `${key}: ${value};`).join('\n  ')}
}`

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends UITheme {}
}
