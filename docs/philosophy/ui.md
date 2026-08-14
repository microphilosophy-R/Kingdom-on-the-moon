# 5. UI

> 本文档说明 `src/App.tsx` 与相关组件的界面信息架构。文档可能滞后，若与代码不一致，以代码为准。

## 5.1 顶部资源栏

顶部固定资源视图（`resource-rail`）显示全部资源：电力显示当前产量，人口显示已分配岗位，其余资源显示库存与每日净变化（`ResourceAtom`）。

## 5.2 底部导航

底部导航由 `navItems`（`App.tsx`）定义：

| 视图 | 标签 |
| --- | --- |
| facilities | 设施 |
| palace | 王城 |
| research | 科技 |
| ecology | 生态 |
| starport | 贸易 |
| ship | 星舰 |
| visitors | 异客 |

特殊建筑与导航的对应关系（`specialTabFacility`）：K → 王城、L → 科技、R → 生态、S → 贸易、D → 星舰。点击这些特殊建筑等同于点击对应底部 tab。

## 5.3 设施总览与星球

- 首页即设施总览（`PlanetFacilities`）。初始展示一个可旋转的 Three.js 星球（`PlanetScene`）。
- 每次开启游戏时，从 5 张本地星球纹理中随机选择 1 张（`planetTextures`）。
- 点击星球后星球停靠左侧，右侧展示建筑列表；点击建筑进入详情页。

## 5.4 特殊设施页

- K 王城：人口、税收、王月报告（`PalaceReportBlock`）。
- L 问天研究实验室：科技树（`ResearchTreeBlock`）。
- R 月穹生态环：四阶段进度（`EcologyPhaseBlock`）。
- S 星海交易港：双向贸易、手动采购、自动购买保护（`TradeBoardBlock`）。
- D 冠冕星舰坞：御座号进度与三阶段物资（`ShipProgressBlock`）。

普通建筑使用通用详情页，展示配方、规模、当前产量与扩建成本（`FacilityDetailPanel`）。

## 5.5 星球纹理

5 张本地纹理（`PlanetScene.tsx` 的 `planetTextures`）：

| 文件 | 名称 |
| --- | --- |
| `public/textures/planets/mercury.jpg` | 水星纹理 |
| `public/textures/planets/venus.jpg` | 金星纹理 |
| `public/textures/planets/earth.jpg` | 地球纹理 |
| `public/textures/planets/mars.jpg` | 火星纹理 |
| `public/textures/planets/moon.jpg` | 月球纹理 |

## 5.6 其它界面

- 外星人事件以弹窗显示（`Modal`），承载正文、索取 / 回赠 / 留任成本与操作（礼送 / 交换 / 留任）。
- 异客页（`Visitors`）显示已留任角色与派驻状态。
- 时间控制位于底部右侧：御日计数、正常 / 加速切换、暂停 / 继续。
- 设置面板（`SettingsPanel`）提供音量、存档（6 槽）、自动购买保护等。
- 开局门槛（`StartGate`）提供难度、观察者模式、教程开关。
- 教程（`TutorialOverlay`）与胜利结算（`VictoryModal`）分别覆盖新手引导与终局结算。
