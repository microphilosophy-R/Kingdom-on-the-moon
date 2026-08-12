# 《月面王国》视频生成提示词

本文件为 Seedance 视频生成提供标准化提示词，用于游戏的序章开局视频和终局视频。
所有提示词遵循 [style-guide.md](style-guide.md) 的色彩、材质与氛围规范，引用 [story.md](../philosophy/story.md) 叙事设定。

## 通用风格锚点

正面通用块（`{style_anchor}`）：

```
warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source from a pale gold gas giant in the sky, soft long shadows, cold blue only in porthole shadows and signal glows, no pure black no pure white, OKLCH color discipline, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi
```

负面通用块（`{negative}`）：

```
pure black, pure white, cyber neon, purple sci-fi haze, glossy chrome, mecha highlights, anime large eyes, gothic spires, ornate baroque, mobile game red dot clutter, heroic launch towers, rocket flame, cheering crowd, majestic king, flowing cape, golden crown, triumphant smile, blue sky, white clouds, earth vegetation, 夸张表情, 水彩晕染, 油画厚堆
```

## 1. 开局视频（10 秒）：封君台 · 被困的国王

**叙事源：** `docs/philosophy/story.md` 序章 · 龙椅冤案（§0.4–§0.6）

**时间线：**
- 0–3s：太渊金光从天顶洒下，照耀灰色月面尘原，拉出绵长暖影
- 3–6s：镜头缓缓推近低矮的环形封君台遗迹，中央龙椅逐渐清晰
- 6–10s：陈林独自坐在龙椅上，双足被月壤光带锁住，镜头定在他的面容

**英文提示词：**

```
cinematic opening shot, 10 seconds, 24fps, 1920x1080:
A vast grey lunar surface under a pale gold gas giant dominating the sky, casting long soft warm shadows across the dust. Camera slowly pushes toward a low circular stone platform of ancient alien origin — the Vassal Platform — weathered regolith ceramic with fine cracks, oxidized brass alloy plates etched with geometric vassal-law glyphs. A throne of brass and lunar-regolith ceramic sits at its center. A middle-aged East Asian man in a rumpled grey-blue civil servant uniform sits on the throne, slightly hunched shoulders from years of desk work, plain weary face with furrowed brow and level mouth, no crown no scepter. A brass king-merit badge is forced onto his chest. His feet are bound to the floor by thin faint strands of glowing regolith dust — visualizing the vassal-law, slender but unbreakable. A parchment edict he never signed is pressed under the armrest. Camera holds on his resigned but clear-eyed expression. The empty plaza around him feels vast and cold. Warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source from a pale gold gas giant in the sky, soft long shadows, cold blue only in porthole shadows and faint signal glows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi.
```

**中文提示词（参考）：**

```
电影级开局镜头，10秒，24fps，1920x1080：
灰色月面荒原，天顶悬着淡金色气态巨行星太渊，低角度金光拉出绵长暖影。镜头缓缓推近一座低矮的环形外星封君台遗迹——风化的月壤陶土台面布满细裂纹，氧化黄铜合金板上刻着封君律的几何纹。中央是黄铜与月壤陶土拼接的龙椅。一个穿灰蓝制服的东亚中年男人坐在龙椅上，肩背因多年案牍微驼，普通疲惫的面孔眉头微蹙，没有王冠权杖。胸前被强行别挂了一枚黄铜王徽。双足被月壤微粒构成的细弱光带锁在地砖上——封君律的可视化，纤细但不可断。龙椅扶手下压着没签名的诏书。镜头停在他清醒而无奈的面容上。四野空旷冷峻。暖灰月尘调、羊皮纸陶瓷面板、低亮度黄铜、克制仪式感；天顶淡金巨行星为唯一暖源，柔和长影；冷蓝仅见于舷窗阴影与微弱信号光；无纯黑纯白、无赛博霓虹与紫色科幻。
```

**负面提示词：**

```
{negative}, majestic king, flowing cape, golden crown, heroic pose, triumphant smile, imperial palace, red carpet ceremony, heroic colonist, golden crown emblem
```

**参数：**
- 分辨率：1920 × 1080（16:9）
- 时长：10 秒
- 帧率：24fps

---

## 2. 终局视频（10 秒）：冠冕星舰坞 · 御座号归乡

**叙事源：** `docs/philosophy/story.md` 序章 · 归乡之舰（§0.7），`docs/art/environment-design.md` 冠冕星舰坞（§2.3）

**时间线：**
- 0–4s：月面之夜，镜头对准半嵌入式星舰坞，龙骨斜指太渊
- 4–7s：御座号王座核心暖光渐亮，未报备的焊接火花无声闪烁
- 7–10s：星舰缓缓抬升，拖曳月尘，太渊金光穿透舷窗洒入空荡船坞

**英文提示词：**

```
cinematic ending shot, 10 seconds, 24fps, 1920x1080:
A semi-recessed open starship dock on the grey lunar surface at night. The keel of the Royal Throne starship angles toward the pale gold gas giant in the sky as if to pierce the heavens. Alloy framework with subtle cold-blue signal glows, regolith-concrete base, brass scaffolding holding the ship in place. Faint warm glow of a throne-core embedded in the keel begins to intensify — unreported welding sparks flicker quietly in the darkness around the hull. The camera holds on the ship's slow deliberate rise from the dock, trailing thin moon dust that catches the pale gold light. The ship climbs, silent and determined — a bureaucrat's covert escape, not a heroic conquest. Pale gold gas giant light pours through a cold porthole into the now-empty dock, casting long warm shadows across the abandoned scaffolding. Warm grey lunar regolith palette, parchment and ceramic panels, low-luster brass fixtures, muted taupe and dusty gold, restrained ceremonial tone, single warm light source from the pale gold gas giant, soft long shadows, cold blue only in porthole shadows and faint signal glows, no pure black no pure white, matte ceramic and oxidized brass materials, clean geometric order, quiet and austere, no cyber neon no purple sci-fi.
```

**中文提示词（参考）：**

```
电影级终局镜头，10秒，24fps，1920x1080：
灰色月面之夜，半嵌入式开放星舰坞。御座号龙骨斜指天顶淡金巨行星太渊，仿佛要刺穿天穹。合金骨架泛着微弱冷蓝信号光，月壤混凝土基座，黄铜脚手架托举着船体。龙骨内嵌的王座核心暖光渐亮——未报备的焊接火花在船体暗处无声闪烁。镜头凝视星舰从船坞缓缓抬升，拖曳着细细月尘，尘粒映着淡金光。星舰攀升，沉默而决绝——一个公务员的秘密逃亡，不是英雄出征。淡金巨行星光穿透冷舷窗洒入空荡的船坞，在废弃的脚手架上拉出绵长暖影。暖灰月尘调、克制仪式感；冷蓝仅见于舷窗阴影与信号微光；无赛博霓虹、无紫色科幻。
```

**负面提示词：**

```
{negative}, heroic launch tower, rocket flame explosion, cheering crowd, military insignia, triumphant score, majestic fleet, orbital elevator, bright starry nebula sky, galaxy nebula glow
```

**参数：**
- 分辨率：1920 × 1080（16:9）
- 时长：10 秒
- 帧率：24fps

---

## 使用说明

1. 将上述英文提示词直接用于 Seedance `GenerateVideo` 接口
2. 中文提示词为参考，帮助理解叙事意图
3. 每次生成都携带通用风格锚点（`{style_anchor}`）与负面块（`{negative}`），保证跨资产一致性
4. 若生成结果与设定冲突，以 `style-guide.md` 和 `story.md` 为准调整提示词
