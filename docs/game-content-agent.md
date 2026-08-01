# Game Content Agent

这个 agent 调用 DeepSeek，为《月面王国》生成两类可审阅草稿：

- `text`：补充角色、事件、设施、科技、政策和 UI 的中文文字素材。
- `art`：为角色肖像、科技卡图、设施图、事件物件等生成美术资源提示词。

它默认只写入 JSON 草稿，不会自动修改 `src` 文件。

## 配置

在项目根目录创建 `.env`：

```bash
DEEPSEEK_API_KEY=replace-with-key
DEEPSEEK_API_BASE_URL=https://api.deepseek.com
GAME_CONTENT_AGENT_MODEL=deepseek-chat
```

`GAME_CONTENT_AGENT_MODEL` 可省略；省略时使用 `DEEPSEEK_MODEL`，再省略则使用 `deepseek-chat`。

## 命令

预览实际发送给模型的 messages：

```bash
npm run content-agent -- prompt --jobs all --focus roles --count 8
```

生成文字素材和美术提示词：

```bash
npm run content-agent -- generate --jobs all --focus all --count 16
```

只读取你指定的当前项目文件：

```bash
npm run content-agent -- generate --jobs text --files src/events.ts,src/economy.ts --focus events
```

只生成文字素材：

```bash
npm run content-agent -- generate --jobs text --focus events --count 10
```

只生成美术资源提示词：

```bash
npm run content-agent -- generate --jobs art --focus visitors --count 8
```

默认输出到：

```text
storage/game-content-agent/latest-draft.json
```

也可以指定输出位置：

```bash
npm run content-agent -- generate --jobs art --focus technologies --out storage/game-content-agent/tech-art-prompts.json
```

## 输出结构

```json
{
  "version": 1,
  "generatedAt": "2026-08-01T00:00:00.000Z",
  "model": "deepseek-chat",
  "focus": "all",
  "jobs": ["text", "art"],
  "summary": "...",
  "textMaterials": [],
  "artPrompts": [],
  "warnings": []
}
```

`textMaterials` 和 `artPrompts` 都带 `integrationHint`，方便后续人工挑选后再接入代码或资产目录。

`textMaterials` 可以直接覆盖显示名称、简介、标题、台词、说明文案等非 ID 字段；保留不变的只有结构性 `ID / code / 代号 / 枚举值 / 数值平衡`。
