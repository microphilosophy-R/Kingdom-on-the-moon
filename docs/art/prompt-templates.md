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

### 3.4 常规建筑逐条提示词（可直接出图）

以下补齐《月面王国》14 座常规建筑的完整提示词（D 冠冕星舰坞见 §3.3），供人工出图直接使用。默认按设施详情面板主视觉出图：**方形构图 1:1**（宽景卡片可用 16:10，在 prompt 结尾把 `square composition` 换成 `wide cinematic composition`）。每条均内嵌 `{style_anchor}` 通用锚点（见 §1），`{negative}` 指 §1 通用负面块；文件名按 [style-guide.md §7](../art/style-guide.md#7-资源命名规范) 使用 `bldg-<代号>` 前缀。

#### 3.4.1 E1 日冕能源署（`bldg-e1.jpg`）

```text
promptEn: a low-slung solar energy facility on grey lunar surface, tilted photovoltaic array panels mounted on oxidized brass frames, neat rows of ceramic panel housings, thin lunar dust film on the panels catching pale gold light, warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source from a pale gold gas giant in the sky, soft long shadows, cold blue only in porthole shadows and faint signal glows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 月面低矮太阳能设施。黄铜支架上斜置成排光伏板，板面覆薄薄月尘映着淡金光；陶瓷面板机柜整齐排列。暖灰月尘调、羊皮纸与陶瓷面板、低亮度黄铜、克制仪式感；天顶淡金巨行星为唯一暖源，拉出柔和长影；冷蓝仅见于舷窗阴影与微弱信号光；无纯黑纯白、无赛博霓虹与紫色科幻。概念图，方形构图。
negative: {negative}, heroic launch tower, rocket flame, sunny solar farm, glossy glass skyscraper
```

#### 3.4.2 C1 静海采掘署（`bldg-c1.jpg`）

```text
promptEn: a lunar extraction facility on flat grey regolith, a low array of surface drills and short derricks, regolith-concrete bases, dusty ceramic control huts, conveyor tracks laid at orderly right angles, pale gold gas giant light raking across the site, long soft shadows, warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, cold blue only in porthole shadows and faint signal glows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 平缓灰色月壤上的采掘设施。低矮的月面钻头阵列与短井架，月壤混凝土基座，覆尘陶瓷控制棚，输送轨道以直角井然排列。淡金巨行星光横扫场地，拉出长影。暖灰月尘调、克制仪式感；冷蓝仅见于舷窗阴影与信号光。概念图，方形构图。
negative: {negative}, open-pit mine cliff, giant excavator, smoking chimney, jungle trees
```

#### 3.4.3 K 月面王城（`bldg-k.jpg`）

```text
promptEn: a low-domed government hall on the lunar surface, ceramic panel walls, oxidized brass lintel with a simple geometric moon-king emblem, parchment notices hung by the entrance, a cold porthole through which the pale gold gas giant light enters, long warm shadows across the empty plaza, warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, cold blue only in porthole shadows and faint signal glows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 月面低矮穹顶政务厅。陶瓷釉面外墙，黄铜门楣嵌简洁几何月面王徽，入口旁张贴羊皮诏书；冷调舷窗透入淡金巨行星光，广场空阔、长影横陈。暖灰月尘调、克制仪式感；冷蓝仅见于舷窗阴影。概念图，方形构图。
negative: {negative}, imperial palace, golden crown emblem, heroic colonist, red carpet ceremony
```

#### 3.4.4 B 水培生态球（`bldg-b.jpg`）

```text
promptEn: a transparent hydroponic ecosphere dome on grey lunar soil, translucent ceramic base ring, faint green-tinted algae membrane inside, soft warm light filtering through the sphere from the pale gold gas giant, thin condensation beads on the shell, muted success-green and warm grey palette, parchment and ceramic panels, low-luster brass fixtures, restrained ceremonial tone, single warm light source casting soft long shadows, cold blue only in porthole shadows, no pure black no pure white, matte ceramic materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 灰色月壤上的透明水培生态球。透光陶瓷底座环，内部淡绿藻膜可见，淡金巨行星光透过球体，外壳凝着细密水珠。muted 成功绿与暖灰配色、克制仪式感；冷蓝仅见于舷窗阴影。概念图，方形构图。
negative: {negative}, lush tropical greenhouse, palm trees, rainbow, cartoon bubbles
```

#### 3.4.5 E2 月冕能源署（`bldg-e2.jpg`）

```text
promptEn: a low toroidal He-3 fusion reactor facility on grey lunar surface, dim warm orange glow rising from the top of the ring, regolith dust feeding into the reaction core, alloy ring housing with oxidized brass instrument nodes and small ceramic panels, cold shadows outside contrasting the warm interior light, warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source from a pale gold gas giant in the sky, soft long shadows, cold blue only in porthole shadows and faint signal glows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 灰色月面上的低矮 He3 聚变环设施。环顶透出昏暗暖橙光，月壤缓缓送入反应核心；合金环罩配黄铜仪表节点与小片陶瓷面板，环外冷影与环内暖光对比。暖灰月尘调、克制仪式感；冷蓝仅见于舷窗阴影。概念图，方形构图。
negative: {negative}, nuclear reactor cooling towers, steam, city lights, glowing neon ring
```

#### 3.4.6 C2 西海采掘署（`bldg-c2.jpg`）

```text
promptEn: an asteroid-belt expedition dock on the lunar surface, low alloy trestle platforms connected by taut mooring cables, a compact expedition vessel in a small berth, brass docking posts and ceramic module housing, faint cold-blue signal lights only at cable ends, warm pale gold gas giant light from above, long soft shadows, warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, cold blue only in signal glows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 月面小行星带远征码头。低矮合金栈桥以绷紧系泊索相连，泊位停着一艘紧凑远征小艇；黄铜系泊桩与陶瓷模块舱，缆索末端仅见冷蓝信号光。天顶淡金巨行星光斜照。暖灰月尘调、克制仪式感。概念图，方形构图。
negative: {negative}, space station ring in orbit, rocket launch, heroic astronaut, galaxy nebula glow
```

#### 3.4.7 F 天工精炼署（`bldg-f.jpg`）

```text
promptEn: an industrial refining facility on the lunar surface, a low row of smelting furnaces with warm amber glow, overhead regolith conveyor pipes in orderly geometric lines, ceramic control panels and brass valve wheels, thin dust haze catching pale gold light, warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source from a pale gold gas giant in the sky, soft long shadows, cold blue only in porthole shadows and faint signal glows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 月面工业精炼设施。低矮一排精炼炉透出暖琥珀光，头顶月壤输送管呈直角几何排列，陶瓷控制面板与黄铜阀轮，薄尘雾映着淡金光。暖灰月尘调、克制仪式感；冷蓝仅见于舷窗阴影。概念图，方形构图。
negative: {negative}, blast furnace flare, steam stacks, molten lava, cyber factory neon
```

#### 3.4.8 P 伊犁河谷（`bldg-p.jpg`）

```text
promptEn: stepped cultivation terraces carved into a shallow lunar valley, ceramic planters in descending rows holding sparse grey-green seedlings, thin mist-like irrigation films between the steps, warm pale gold light on the terraces, muted success-green accents on warm grey, parchment and ceramic panels, low-luster brass fixtures, restrained ceremonial tone, single warm light source casting soft long shadows, cold blue only in porthole shadows, no pure black no pure white, matte ceramic materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 浅月谷中凿出的阶梯式培育床。陶瓷种植槽逐级而下，槽内稀疏灰绿幼苗，层级间悬薄雾状灌溉膜，淡金光铺满梯面。muted 成功绿点缀暖灰底。克制仪式感。概念图，方形构图。
negative: {negative}, green rice paddies, blue river, earth vegetation, rainbows, cartoon farm
```

#### 3.4.9 R 月穹生态环（`bldg-r.jpg`）

```text
promptEn: a large ring-shaped climate terraforming device on the lunar surface, alloy ring segments linked by thin translucent ecological membranes, faint cold-blue signal glow along the ring, low clouds of processed gas drifting inside the ring, warm grey palette with small cold accents, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source from a pale gold gas giant in the sky, soft long shadows, cold blue only in porthole shadows and signal glows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 月面大型环形气候改造装置。合金环段以半透明生态膜相连，环身浮着微弱冷蓝信号光，环内低垂着处理过的气体云。暖灰底、小面积冷色点缀。克制仪式感。概念图，方形构图。
negative: {negative}, sci-fi portal ring, neon purple energy, dome city, green alien planet
```

#### 3.4.10 L 问天研究实验室（`bldg-l.jpg`）

```text
promptEn: a vaulted-roof research laboratory on the lunar surface, arched ceramic panel building with low brass frame windows, faint cold-blue glow of an internal lithography machine through small portholes, an orderly antenna array on the roof, pale gold light on the ceramic walls, warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source from a pale gold gas giant in the sky, soft long shadows, cold blue only in porthole shadows and signal glows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 月面拱顶研究实验室。拱形陶瓷面板建筑配低矮黄铜框窗，小舷窗透出内部光刻机的微弱冷蓝光，屋顶整齐的天线阵列，陶瓷墙映着淡金光。暖灰月尘调、克制仪式感。概念图，方形构图。
negative: {negative}, particle accelerator ring, glass skyscraper, glowing computer lab, anime robot
```

#### 3.4.11 H 翡翠宫（`bldg-h.jpg`）

```text
promptEn: a carved palace facade on the lunar surface, green-glazed ceramic walls with restrained geometric relief patterns, thin mist-like curtains hanging from brass cornices, warm light spilling from arched doorways, success-green glaze and warm grey palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source from a pale gold gas giant in the sky, soft long shadows, cold blue only in porthole shadows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 月面雕花宫廷立面。绿釉陶瓷墙面刻着克制的几何浮雕，黄铜檐下悬薄雾帘幕，拱形门洞泻出暖光。success 暖绿釉与暖灰调，克制仪式感。概念图，方形构图。
negative: {negative}, jade palace fantasy, golden dragons, ornate baroque, bright green neon
```

#### 3.4.12 M 新月府（`bldg-m.jpg`）

```text
promptEn: low arc-shaped ecological habitat pods nestled in a shallow crater, composite material shells with small ceramic windows, soft success-green growing lights inside the pods, warm pale gold giant light on the curved roofs, cold blue only in porthole shadows, warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source casting soft long shadows, no pure black no pure white, matte composite and ceramic materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 浅陨坑中相依的弧形生态居住舱。复合材料舱壳配小陶瓷窗，舱内透出柔和 success 绿生长光，弧形屋顶映着淡金巨行星光。暖灰月尘调、克制仪式感；冷蓝仅见于舷窗阴影。概念图，方形构图。
negative: {negative}, glass dome city, modern housing estate, palm trees, cartoon space colony
```

#### 3.4.13 S 星海交易港（`bldg-s.jpg`）

```text
promptEn: a ring docking platform suspended at the edge of low lunar orbit, seen from inside a wide porthole, ceramic panel deck, brass mooring posts, thin mist-like energy shield with faint cold-blue signal shimmer, distant star sea beyond the ring, warm interior light on the deck, warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source from a pale gold gas giant in the sky, soft long shadows, cold blue only in porthole shadows and signal glows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 悬于月面低轨道边缘的环形对接平台，从宽阔舷窗内望去：陶瓷面板甲板、黄铜系泊桩、薄雾状能量护盾泛着微弱冷蓝信号，环外远处是星海，甲板暖光笼罩。暖灰月尘调、克制仪式感。概念图，方形构图。
negative: {negative}, giant space station, rocket landing, orbital elevator, bright starry nebula sky
```

#### 3.4.14 E3 归元装置（`bldg-e3.jpg`）

```text
promptEn: a floating micro black hole containment shell above a shallow crater on the lunar surface, dark alloy housing with faint cold-blue signal rings, a barely visible warped glow at the core, thin brass mooring tethers to ceramic anchors, sparse distant figures for scale, warm grey and dark alloy palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source from a pale gold gas giant in the sky, soft long shadows, cold blue only in signal glows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi, concept art, square composition
promptZh: 浅陨坑上空悬浮的微型黑洞约束壳。暗色合金外壳泛着微弱冷蓝信号环，核心处有几乎不可见的扭曲微光，细黄铜系泊索垂向陶瓷锚点，远处零星人影作尺度参照。暖灰与暗合金调，克制仪式感。概念图，方形构图。
negative: {negative}, glowing purple black hole, cosmic explosion, sci-fi portal, godzilla monster
```

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
