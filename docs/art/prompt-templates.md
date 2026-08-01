# 文生图提示词模板

本文件为《月面王国》美术资产生成提供标准化提示词模板。所有提示词须遵循 [style-guide.md](style-guide.md) 的色彩、材质与氛围规范，并引用 [character-design.md](character-design.md) 与 [environment-design.md](environment-design.md) 的设定。提示词只描述外观，不涉及任何 id 或数值。

## 1. 通用风格锚点（所有提示词必带）

正面通用块（`{style_anchor}`）：

```text
warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source from a pale gold gas giant in the sky, soft long shadows, cold blue only in porthole shadows and signal glows, no pure black no pure white, OKLCH color discipline, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi
```

负面通用块（`{negative}`）：

```text
pure black, pure white, cyber neon, purple sci-fi haze, glossy chrome, mecha highlights, anime large eyes, gothic spires, ornate baroque, mobile game red dot clutter, tiny unreadable data tables, blue sky, white clouds, earth vegetation, rivers, heroic launch pads,夸张表情, 水彩晕染, 油画厚堆
```

参数建议：宽高比按用途选择（肖像 portrait_4_3，场景 landscape_16_9，图标 square_hd）；采样器优先 Eular a / DPM++ 2M Karras；步数 28–35；CFG 5–7。

## 2. 角色肖像模板

模板结构：`{subject}, {attire_and_material}, {pose_and_expression}, {environment}, {style_anchor}`

### 2.1 陈林（月面王）

```text
subject: a middle-aged East Asian bureaucrat, average build, slightly hunched shoulders from years of desk work, plain weary face with furrowed brow and level mouth, no crown no scepter
attire: rumpled grey-blue civil servant uniform (warm grey shell tone), a brass king-merit badge forced onto his chest, a parchment edict he never signed pressed under the armrest
pose: seated on a throne of brass and lunar-regolith ceramic, feet bound to the floor by a thin faint strand of glowing regolith dust (visualizing the vassal-law), hands resting on the armrests, resigned but clear-eyed
environment: a low-domed lunar throne hall, pale gold gas giant visible through a cold porthole, long warm shadows
{style_anchor}
```

负面：`{negative}, majestic king, flowing cape, golden crown, heroic pose, triumphant smile`

### 2.2 外星访客通用框架

```text
subject: {species description from character-design.md §4}, abstract geometric or natural-phenomenon body, not a humanized mascot
material: {ceramic glaze / oxidized brass / amber / quartz / silver tide / mist fabric / scorched polymer}
pose: diplomatic restraint, holding or presenting {signature object}, no aggressive stance
palette: warm grey base, one identifying accent color from style-guide tokens
environment: standing or hovering before a seated bound king in a lunar throne hall
{style_anchor}
```

### 2.3 萨瓦·碎光 示例

```text
subject: a figure of ice-cracked ceramic carapace, body assembled from angular glazed shards, no earthly face
material: ice-cracked ceramic glaze with faint cold-blue signal glow along fracture lines
pose: three-quarter view, palm up, holding a crystal that burns inward, shrinking
environment: lunar throne hall, pale gold gas giant light
{style_anchor}
```

负面：`{negative}, cute mascot, anime eyes, human skin, neon high saturation`

## 3. 建筑与场景模板

### 3.1 封君台遗迹

```text
subject: a low circular stone platform of ancient alien origin, a throne of brass and lunar-regolith ceramic at its center
material: weathered regolith ceramic with fine cracks, oxidized brass alloy plates etched with geometric vassal-law glyphs
environment: flat grey lunar dust plain, pale gold gas giant dominating the sky overhead, long low-angle warm shadows, empty and austere after a ceremony
{style_anchor}
```

### 3.2 建筑外观通用框架

```text
subject: {building name from environment-design.md §4}, low-slung lunar colonial architecture, no spires
material: ceramic panel walls (warm grey shell), oxidized brass fittings, cold-blue signal glow only in small portholes
environment: grey regolith surface, pale gold gas giant light, sparse neighboring facilities
{style_anchor}
```

### 3.3 冠冕星舰坞（逃生氛围）

```text
subject: a semi-recessed open starship dock, a keel angled toward the pale gold gas giant as if to pierce the sky
material: alloy framework, regolith-concrete base, brass scaffolding, faint glow of a throne-core embedded in the keel
mood: covert escape rather than heroic conquest, unreported welding sparks at night
environment: lunar surface, gas giant overhead, long shadows
{style_anchor}
```

负面：`{negative}, heroic launch tower, rocket flame, cheering crowd, military insignia`

## 4. UI 资源模板

### 4.1 资源图标

```text
subject: a single abstract symbol representing {resource}, geometric, ceremonial
style: line icon with 2px stroke, rounded endpoints, minimal fill, brass primary with one state color, on transparent or shell background
no text, no frame, no gradient glow
{style_anchor}, flat vector
```

负面：`{negative}, realistic render, 3d bevel, drop shadow, neon`

### 4.2 叙事面板背景

```text
subject: a parchment panel texture for policy and event text
style: warm parchment fiber (oklch 90% 0.022 82), slightly worn edges, faint lunar dust grains, no pattern noise, calm and readable
{style_anchor}, seamless tileable
```

### 4.3 按钮

```text
subject: a brass primary button, rectangular with 6px corner radius
style: solid brass fill (oklch 55% 0.105 76), ink or shell text, subtle oxidized texture, no gloss highlight, no neon edge
states: default / hover (brass-soft) / disabled (reduced contrast)
{style_anchor}, flat vector
```

## 5. 星球纹理

星球纹理须为等距柱状投影，供 Three.js 球面材质使用，规则见 [ui.md §5.2](../philosophy/ui.md#L22-L33)。提示词：

```text
subject: a full spherical equirectangular texture map of a {mercury/venus/earth/mars/moon}-like planetary surface
style: seamless equirectangular projection, no poles distortion, no text no labels, naturalistic but slightly desaturated to match warm grey palette
{style_anchor}
```

负面：`{negative, grid lines, coordinate ticks, atmosphere glow, stars background}`

## 6. 使用规范

- 每次生成都携带 `{style_anchor}` 与 `{negative}`，保证跨资产一致性。
- 角色与建筑提示词中的设定字段须引用 character-design.md 与 environment-design.md，不得自行发明外观。
- 生成结果后须按 [style-guide.md §7](style-guide.md#7-资源命名规范) 命名并归档到对应目录。
- 提示词只描述外观与氛围，绝不包含 id、数值、解锁条件或事件逻辑。
- 若生成结果与设定冲突，以设定文档为准调整提示词，而非反向修改设定。
