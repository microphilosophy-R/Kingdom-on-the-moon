# 科技树图片提示词设计指南

## 美术规范

根据 `docs/art/style-guide.md`：

- **色调**：暖灰月尘、羊皮纸、陶瓷面板、黄铜控件为主
- **冷色**：仅作舷窗阴影、科技信号、星海信号点缀
- **禁用**：泛紫色科幻、赛博霓虹、纯黑纯白
- **质感**：陶瓷/月尘粗糙感、克制、仪式化
- **比例**：16:10（对应当前 SVG 占位符 120×74），建议输出 **480×300** 或 **960×600**

## 通用模板

```
[主体描述], [环境/背景], lunar colony aesthetic, warm grey and brass tones,
ceramic panel textures, restrained sci-fi, no neon, no pure black,
concept art style, 16:10 aspect ratio
```

### 时期修饰词

| 时期 | 叠加词 |
|------|--------|
| Early | `early colony struggle, basic equipment, lonely outpost` |
| Mid | `expanding lunar base, industrial development, trade connections` |
| Late | `advanced lunar civilization, starship construction, alien integration` |

## 按科技分类的提示词

### 能源科技（暖金 + 灰）

**TE1-1 纳米光催化剂**
> A solar panel array on a lunar surface under the glow of a pale golden gas giant in the sky, crystalline light-converting film glinting on the panels, warm amber light, lunar colony aesthetic, ceramic panel textures, restrained sci-fi, concept art style, 16:10 aspect ratio

**TE1-2 光伏阵列校准**
> Close-up of solar panels being precisely angled toward a massive golden gas giant on the horizon, calibration beams of faint cyan light tracing across the array surface, lunar dust on ceramic housings, warm grey and brass tones, technical blueprint feel, concept art style, 16:10 aspect ratio

**TE2-0 月冕能源署**
> A fusion reactor dome on grey lunar surface, glowing with dim orange heat, regolith being fed into the core, cold shadows outside the dome contrasting with warm interior light, industrial lunar architecture, brass control panels, concept art style, 16:10 aspect ratio

**TE3-0 微型黑洞约束（外星科技）**
> A contained miniature black hole suspended inside a ring-shaped apparatus, event horizon glowing with thin amber accretion, alien script engraved on dark ceramic rings, cold starlight from a porthole, restrained cosmic horror, no neon, ritualistic geometry, concept art style, 16:10 aspect ratio

### 采掘科技（灰 + 赭石）

**TC1-0 静海采掘署**
> Mining rigs on a flat grey lunar plain called "Sea of Tranquility", drill arrays piercing the dusty surface, a pale golden gas giant hanging overhead, warm dust particles in the thin light, ceramic industrial housings, lonely bureaucratic outpost, concept art style, 16:10 aspect ratio

**TC1-1 月面钻头阵列**
> Dense row of drill heads boring into grey lunar crust, regolith dust cloud catching warm amber light, exposed subsurface layers like peeled skin, brass mechanical components, industrial severity, lunar colony aesthetic, warm grey and brass tones, ceramic panel textures, restrained sci-fi, concept art style, 16:10 aspect ratio

**TC2-0 西海采掘署（小行星带）**
> A mining vessel anchored to a rocky asteroid in a debris belt, tethered by cables, distant golden gas giant in the background, cold deep space contrasted with warm cabin lights, expedition paperwork visible through a porthole, concept art style, 16:10 aspect ratio

**TC2-2 发现伊甸园（外星科技）**
> A living green planet seen through a starship viewport, alien coordinate crystal glowing with organic light on a brass console, contrast between cold void outside and warm hope inside, the planet lush and breathing, concept art style, 16:10 aspect ratio

### 生命维持（青色 + 绿色点缀）

**TB-0 水培生态球**
> A glass biosphere dome on grey lunar surface, green algae membranes glowing softly inside, the only living thing on the dead moon, warm amber interior light, water droplets on glass, ceramic base with brass fittings, lonely and fragile, concept art style, 16:10 aspect ratio

**TB-1 闭环藻膜培养**
> Intricate closed-loop pipes and membranes inside a biosphere, algae flowing through transparent tubes, dense green life in a brass-and-ceramic frame, not a drop wasted, warm humid atmosphere, concept art style, 16:10 aspect ratio

**TB-2 无水栽培技术（外星科技）**
> Strange dry spores embedding into grey lunar soil, thin green shoots emerging from regolith instead of water-fed beds, alien organic textures on ceramic trays, muted earthy tones, the resilience of life without water, concept art style, 16:10 aspect ratio

### 工业科技（赭石 + 黄铜）

**TF-0 天工精炼署**
> Industrial smelting facility on lunar surface, regolith being melted into alloy ingots, orange glow from furnace, grey smoke rising into vacuum, brass control panels with ceramic insulation, the smell of burnt moon dust, concept art style, 16:10 aspect ratio

**TF-1 重原子炼金术（外星科技）**
> Ancient alien metallurgical diagram overlaid on a modern refinery, gold-like currency beads precipitating from molten regolith, arcane symbols on brass plates, warm amber and gold tones, alchemy meets industry, concept art style, 16:10 aspect ratio

### 生态改造（绿色 + 褐色）

**TP-0 伊犁河谷**
> Terraced growing beds on a lunar slope under a dome, named after a lost Earth valley no one asks about, soft green plants in grey regolith, warm artificial sunlight, ceramic retaining walls, nostalgic and practical, concept art style, 16:10 aspect ratio

**TP-1 合金作物（外星科技）**
> Strange plants with metallic veins growing in lunar soil, small alloy nodules forming on their stems like fruit, a seed remembering a mineral vein, alien botany, brass-colored leaves, warm greenhouse light, concept art style, 16:10 aspect ratio

**TR-0 月穹生态环**
> A massive ring-shaped ecological dome under construction on the moon, scaffolding against a grey sky, the colossal ambition of making a dead rock breathe, warm lights inside the dome, human figures tiny against the scale, concept art style, 16:10 aspect ratio

### 科技/研究（蓝色信号 + 灰）

**TL-0 问天研究实验室**
> A quiet research station on the moon with instruments humming, warm desk lamp on a ceramic workbench, faint blue data signals on screens, the only place on the moon that feels like progress, porthole showing stars, concept art style, 16:10 aspect ratio

**TL-2 研究吞吐量调度**
> Server-like computing racks glowing with organized blue signal lights, power cables feeding energy into knowledge output, brass heat sinks, warm amber status indicators, the rhythm of accelerated discovery, concept art style, 16:10 aspect ratio

**TL-3 高能课题队列（晚期）**
> Research instruments running hot, visible heat shimmer above glowing processors, blue signal lights intensifying to near-white, brass cooling pipes struggling, the instruments are starting to burn, concept art style, 16:10 aspect ratio

### 王权/文化（金色 + 暖灰）

**TK-0 月面王城**
> A throne-like command chair on a lunar colony operations deck, warm brass and ceramic architecture, viewport showing the gas giant, paperwork stacked on armrest, a crown that is also a prison, bureaucratic majesty, concept art style, 16:10 aspect ratio

**TH-0 翡翠宫**
> An ornate but impractical lunar palace interior, jade-green decorative elements, luxury goods displayed on brass shelves, the most useless building on the moon, warm amber lighting, diplomatic gifts waiting to be sold, concept art style, 16:10 aspect ratio

**TM-0 新月府（晚期）**
> Elegant low-consumption lunar housing modules, warm ceramic walls with thin green plant strips, designed for living like a human after the moon learned to breathe, calm domesticity under a dome, concept art style, 16:10 aspect ratio

### 贸易科技（金色 + 冷星海）

**TS-0 星海交易港**
> A docking bay on the lunar surface, cargo containers being exchanged, distant starship silhouetted against the gas giant, warm yellow dock lights, brass transaction ledgers, the only door to the outside, concept art style, 16:10 aspect ratio

**TS-1 星际劳工（外星科技）**
> A roster of names glowing on a translucent alien tablet, silhouettes of workers arriving through a docking port, warm welcome lights, the cold void behind them, population as a tradable resource, concept art style, 16:10 aspect ratio

**TS-2 知识传输协议（外星科技）**
> Data streams flowing between a lunar console and a distant alien signal source, blue information pulses against warm brass hardware, knowledge as sound waves crossing the star sea, concept art style, 16:10 aspect ratio

**TS-3 玫瑰星球（外星科技）**
> A spice trader's ledger open on a brass desk, rose-colored planet visible through a porthole, luxury goods and diplomatic gifts ready for shipment, warm amber and rose gold tones, commerce as diplomacy, concept art style, 16:10 aspect ratio

### 全局科技（黄铜 + 灰）

**TG-1 天工工业软件套装**
> A brass-framed display showing productivity charts overlaid on lunar facility blueprints, warm panel lighting, ceramic interface elements, machines becoming slightly more industrious, concept art style, 16:10 aspect ratio

**TG-2 空间微波散热学**
> Heat dissipation fins on lunar buildings glowing faintly orange against the cold black sky, microwave patterns visualized as thin amber lines, warmth being wastefully lost to the void, the moon is already cold enough, concept art style, 16:10 aspect ratio

**TG-3 通用建筑预制件**
> Modular building components stacked neatly on a lunar construction site, brass connectors, ceramic panels, blocks waiting to become architecture, warm work lights, the pragmatism of prefabrication, concept art style, 16:10 aspect ratio

**TG-4 星海会计协议**
> A brass-and-ceramic ledger machine processing trade transactions, thin golden lines connecting trade routes, slightly reduced toll fees visualized as diminishing barriers, bureaucratic efficiency in space, concept art style, 16:10 aspect ratio

### 星舰/终局（暗金 + 冷蓝）

**TD-0 冠冕星舰坞**
> A massive starship under construction inside a lunar dock, exposed keel framework against warm dock lights, the ship named "Throne" — officially a colony achievement exhibit, actually an escape vessel, brass scaffolding, cold stars visible through the dock opening, concept art style, 16:10 aspect ratio

**TD-1 舰坞总装排程**
> Accelerated construction of the starship, more workers on scaffolding, the keel framework growing visibly faster, warm urgency in the dock lights, a foreman watching more frequently from a catwalk, concept art style, 16:10 aspect ratio

## 已生成资源

| 文件 | 科技 | 状态 |
|------|------|------|
| `src/assets/tech-tc1-1.png` | TC1-1 月面钻头阵列 | ✅ 已生成 |
