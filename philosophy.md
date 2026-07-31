# 月面王国设计哲学

`philosophy.md` 是设计文档入口，不再承载完整规则正文。完整规则按章节拆分到 `docs/philosophy/`，后续实现、UI、数值平衡与文案应以对应章节文件为准。

## 设计原则

- 规则先于实现。若原型、代码或 UI 与文档冲突，以章节规则文件为准。
- 建筑、资源、科技、政策必须使用固定代号与固定名称，不使用旧别名。
- 玩家扮演国王，只决定方向、权重和政策；具体扩产、减产、生产方式切换由算法执行。
- 科技只解锁建筑、生产方式、效率或贸易权限，不会自动替玩家切换生产方式。
- 经济数值必须能追溯到单位人口消耗与资源价值表。

## 章节导航

| 章节 | 文件 | 内容 |
| --- | --- | --- |
| 1. 经济系统 | [docs/philosophy/economy.md](docs/philosophy/economy.md) | 资源规则、单位人口消耗、资源价值、阶段供需审计。 |
| 2. 建筑系统 | [docs/philosophy/buildings.md](docs/philosophy/buildings.md) | 建筑分类、生产方式编码、建筑配方、普通建筑与特殊建筑说明。 |
| 3. 科技与政策 | [docs/philosophy/technology-policy.md](docs/philosophy/technology-policy.md) | 科技类型、科技表、全局通用科技、特定建筑效率科技、王城政策。 |
| 4. UI | [docs/philosophy/ui.md](docs/philosophy/ui.md) | 全局导航、设施详情页、特殊设施界面、科技与政策入口。 |

## 暂不展开

人物事件暂不作为下一章展开。后续需要恢复时，应作为独立章节文件新增，并明确它与人口引入、科技交换、贸易补充和长期策略偏移之间的边界。
