# 5. UI

## 5.1 总则

本章是 UI 信息架构的规则来源。详细视觉样式可在设计文档中展开，但不得与本章定义的功能入口冲突。

- 顶部固定资源视图，显示所有物资、库存与每日净变化。
- 底部为菜单 tab，用于在主要系统间切换：设施、政策、科技、生态、贸易、星舰、异客。
- 首页即设施总览。初始展示一个可转动观察的 Three.js 球面星球。
- 每次开启游戏时，从 5 张本地星球纹理中随机选择 1 张作为球面贴图。
- 星球初始位于页面中心。点击星球后，星球缩小并停靠在左侧，右侧展示建筑列表。
- 点击建筑列表中的普通建筑进入建筑详情页。
- 点击特殊建筑等同于点击底部对应菜单 tab：K 进入政策、L 进入科技、R 进入生态、S 进入贸易、D 进入星舰。
- 一般设施页展示配方、当前产量、规模和扩建成本。
- 特殊设施页展示专属机制，例如 R 月穹生态环阶段、S 星海交易港贸易、K 月面王城政策、L 问天研究实验室科技、D 冠冕星舰坞项目进度。
- 科技界面归属于 L 问天研究实验室，但已解锁科技应可在全局状态中查看。
- 政策界面归属于 K 月面王城，同一时间只显示并执行一项当前政策。
- 外星人事件以弹窗显示，弹窗承载事件链正文、资源变化、留任成本和事件操作。
- 角色与事件链界面显示当前外交来函、已留任角色和角色派驻状态；角色美术资源后续可独立替换，不改变事件链数据。

## 5.2 星球纹理

本阶段使用 5 张本地纹理：

| 文件 | 名称 | 来源 |
| --- | --- | --- |
| `public/textures/planets/mercury.jpg` | 水星纹理 | Solar System Scope / Wikimedia Commons |
| `public/textures/planets/venus.jpg` | 金星纹理 | Solar System Scope / Wikimedia Commons |
| `public/textures/planets/earth.jpg` | 地球纹理 | Solar System Scope / Wikimedia Commons |
| `public/textures/planets/mars.jpg` | 火星纹理 | Solar System Scope / Wikimedia Commons |
| `public/textures/planets/moon.jpg` | 月球纹理 | Solar System Scope / Wikimedia Commons |

贴图文件必须保持等距柱状投影，供 Three.js 球面材质直接使用。后续可替换为原创或授权美术，但文件容器与随机选择机制不变。
