# Lunar Crown Design System

## Visual Theme

月面政务舱内的指挥台。顶部是库存仪表，底部是系统 tab，中间是一颗可旋转观察的星球。深墨蓝灰像舷窗外的阴影，羊皮纸般的暖灰像御令，微量黄铜色只标记可行动事项。界面采用产品型信息密度，设施以名录和检查器承载，不再依赖营销式首页。

## Color Palette

- ink: `oklch(13% 0.018 265)`
- panel: `oklch(18% 0.018 260)`
- lunar: `oklch(70% 0.018 82)`
- brass: `oklch(76% 0.12 78)`
- cyan: `oklch(76% 0.095 205)`
- danger: `oklch(67% 0.16 25)`

## Typography

Headings: Noto Serif SC, Songti SC, serif. UI: Noto Sans SC, Microsoft YaHei, sans-serif. Numbers use ui-monospace.

## Components

Fine 1px outlines, square-to-soft corners, dark solid action controls, and selected states with a full amber surface rather than stripe accents. Buttons have clear focus rings and 180ms opacity/color transitions.

## 3D Surface

Three.js 星球是主界面的第一视觉对象。默认居中，可拖拽旋转；展开设施后缩小停靠左侧。贴图来自本地 `public/textures/planets/`，每次开局随机选择一张。Canvas 必须有稳定尺寸，避免加载或响应式布局导致空白。

## Navigation

顶部只保留品牌、御日和资源视图。底部固定 tab 作为主要系统入口：设施、政策、科技、生态、贸易、星舰、异客。外星人事件使用弹窗，不挤占资源视图或底部菜单。
