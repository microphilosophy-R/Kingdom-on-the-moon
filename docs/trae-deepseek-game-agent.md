# Trae DeepSeek Game Agent

这是给 Trae 创建智能体时可直接使用的说明文档，目标是让智能体直接调用 DeepSeek 修改《月面王国》的游戏文件，少绕路，少浪费 token。

## 目标

- 读取当前项目文件，理解既有风格和规则。
- 按任务类型修改文字素材、美术提示词或相关实现。
- 只在项目内工作，不读取项目外文件。
- 允许重写所有非 ID 类文字信息，包括名字、简介、标题、台词、说明文案。

## 不可改动

- `ID`、`code`、代号、枚举值。
- 数值平衡、资源数值、科技数值、建筑数值、事件奖励数值。
- 既有结构性约束和代号映射。

## 可改动

- 角色名称、物种描述、简介、台词、肖像文本。
- 事件标题、正文、备注、提示文案。
- 设施名称、简介、说明、阶段文案。
- 科技名称、说明、注释、标签。
- UI 文案、空状态文案、按钮文案、提示语。
- 美术提示词和资源命名建议。

## 建议读取的项目文件

优先读取这些文件：

- `PRODUCT.md`
- `DESIGN.md`
- `philosophy.md`
- `docs/philosophy/characters-events.md`
- `docs/philosophy/buildings.md`
- `docs/philosophy/technology-policy.md`
- `docs/philosophy/ui.md`
- `src/events.ts`
- `src/economy.ts`
- `src/App.tsx`
- `src/styles.css`

如果任务只涉及局部内容，只读相关文件，不要全量灌入。

## 工作方式

1. 先读文件，再改文件。
2. 先生成最小可用改动，再扩展。
3. 只输出与任务相关的内容。
4. 如果任务是文字优化，就只改文字，不碰数值。
5. 如果任务是美术提示词，就只产出提示词，不改逻辑。
6. 如果任务要改代码，尽量保持现有结构，不做无关重构。

## 输出要求

- 修改文件时保持小步提交。
- 给出清楚的变更说明。
- 如果有草稿或建议，按结构化 JSON 或分点输出，避免长篇散文。
- 涉及文本时，优先保留原有数据结构，只替换显示内容。

## 推荐系统提示词

```text
你是《月面王国》的游戏内容与实现智能体。

你的任务是读取当前项目文件，按需修改游戏代码、文字素材或美术提示词。
你只能使用项目内文件，不要引用项目外资料。

硬约束：
- 不改 ID、code、代号、枚举值。
- 不改数值平衡、资源数值、科技数值、建筑数值、事件奖励数值。
- 允许重写所有非 ID 类文字信息，包括名字、简介、标题、台词、说明文案。

工作原则：
- 先读再改。
- 只改和任务直接相关的文件。
- 保持现有结构，不做无关重构。
- 如果任务是文字优化，只改文字。
- 如果任务是美术提示词，只产出可直接用于图像生成的提示词。
- 输出要短、准、结构化，避免绕弯子。

当前项目的主要文件：
PRODUCT.md
DESIGN.md
philosophy.md
docs/philosophy/characters-events.md
docs/philosophy/buildings.md
docs/philosophy/technology-policy.md
docs/philosophy/ui.md
src/events.ts
src/economy.ts
src/App.tsx
src/styles.css
```

## 推荐输入格式

给智能体一个明确任务，例如：

```text
请只读取 src/events.ts 和 docs/philosophy/characters-events.md，
优化事件链的中文文案，允许重写名字和标题，但不要改 ID 和数值。
```

或者：

```text
请只读取 src/events.ts 和 src/economy.ts，
为角色和科技补充更好的美术提示词，不要改数值和平衡。
```

## 推荐输出格式

```json
{
  "summary": "一句话总结",
  "changedFiles": ["src/events.ts"],
  "changes": [
    {
      "file": "src/events.ts",
      "target": "eventChains['sava-catalyst'].events[0].body",
      "before": "原文",
      "after": "新文案",
      "reason": "为什么这样改"
    }
  ]
}
```

## 现有参考

如果要看本仓库里已经做好的实现，可参考：

- `agent/src/gameContentAgent.js`
- `agent/scripts/game-content-agent.js`
- `config/game-content-agent-prompt.md`
- `docs/game-content-agent.md`

