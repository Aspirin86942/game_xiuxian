# 04. 规则变更记录

## 1. 使用规则

本文件只记录叙事决策系统的系统级规则变化，不记录普通代码重构或单纯措辞润色。

每次变更至少要写清：

- 改了什么
- 为什么改
- 影响了哪些层级
- 预期玩家体验如何变化
- 是否影响旧存档
- 是否要同步更新 smoke / e2e / 文档校验
- 设计前提是否改变
- 回退条件是什么

如果一次改动同时影响主线推进、回响顺序和收益 / 负面语义，不要压成一句“细调体验”，而是明确拆出影响面。

## 2. 记录模板

### `[YYYY-MM-DD] [变更标题]`

#### 改动内容

- 

#### 改动原因

- 

#### 影响层级

- 主线推进：
- 支线 / 小境界：
- 剧情页展示：
- 分支状态：
- 回响顺序 / 余波：
- 收益 / 负面：
- 终局 / 重开：

#### 预期体验变化

- 

#### 设计前提是否改变

- `选前隐藏 / 选后揭示`：是 / 否
- `风险可积累而非随机暴毙`：是 / 否
- `主线与小境界共用 choice 闭环`：是 / 否
- `数值余波先于叙事回响展示`：是 / 否

#### 是否影响旧状态 / 旧存档 / 旧客户端

- 是 / 否
- 若是，影响点：

#### 是否需要同步更新测试

- 是 / 否
- 若是，需要更新：
  - smoke：
  - e2e：
  - 规则书校验：

#### 验收命令 / 手工核对

- 自动化命令：
- 手工核对点：

#### 回退条件

- 若出现以下现象，说明本次改动应回退：
  - 

#### 相关文档

- `01-current-behavior.md`
- `02-parameters-and-formulas.md`
- `03-implementation-contract.md`

#### 相关代码入口

- `story-data.js`
- `game-core.js`
- `game.js`

## 3. 初始基线

### `[2026-03-20] 建立并增强叙事决策系统规则书`

#### 改动内容

- 新建 `docs/rulebook-series/README.md` 作为轻量系列索引
- 新建 `docs/narrative-decision-system/` 作为第一本成熟分册
- 将窄规则书内容彻底吸收进更大的叙事决策系统闭环
- 补充设计原则层、内容接入接口层与审计附录

#### 改动原因

- 原先的规则书结构更适合“阅读理解”，还不足以支撑长期设计、多人协作与 AI/Codex 接力
- 当前代码里真实存在的主线推进、小境界事件、回响顺序、终局与重开闭环，需要一套系统级、单权威、可持续演进的规则书

#### 影响层级

- 主线推进：文档覆盖范围扩大，开始记录 `storyProgress` 与 late branch 语义
- 支线 / 小境界：文档纳入 `LEVEL_STORY_EVENTS` 与 `levelStoryState`
- 剧情页展示：文档纳入 `storyCursor`、`echo-list`、ending 页与按钮契约
- 分支状态：文档纳入 `chapterChoices`、`routeScores`、`flags`、`npcRelations`
- 回响顺序 / 余波：文档明确 `getEchoes()` 的真实排序
- 收益 / 负面：文档继续保留并扩写 `tradeoff`、`storyConsequences`、战斗映射和死亡语义
- 终局 / 重开：文档纳入普通结局、`走火入魔`、`resetGame()`

#### 预期体验变化

- 无直接玩家体验变化
- 本次只调整文档结构和权威来源，不改运行时代码

#### 设计前提是否改变

- `选前隐藏 / 选后揭示`：否
- `风险可积累而非随机暴毙`：否
- `主线与小境界共用 choice 闭环`：否
- `数值余波先于叙事回响展示`：否

#### 是否影响旧状态 / 旧存档 / 旧客户端

- 否
- 本次不改存档结构，只改规则书

#### 是否需要同步更新测试

- 否
- 本次无需改游戏测试，但需要通过规则书校验

#### 验收命令 / 手工核对

- 自动化命令：
  - `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook.py --root D:\Program_python\game_xiuxian\docs\narrative-decision-system`
  - `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook_series.py --root D:\Program_python\game_xiuxian\docs --series-dir rulebook-series`
- 手工核对点：
  - 历史窄规则书中的关键概念未丢失
  - 新分册已覆盖主线 / 小境界 / 回响 / 终局闭环
  - 设计原则层、内容接入接口层和状态矩阵已补齐

#### 回退条件

- 若补充文档后仍无法支撑“先读规则书再改代码”的工作流
- 若新增层级引入大量重复内容，导致当前行为事实更难定位

#### 相关文档

- `README.md`
- `01-current-behavior.md`
- `02-parameters-and-formulas.md`
- `03-implementation-contract.md`

#### 相关代码入口

- `story-data.js`
- `game-core.js`
- `game.js`

## 4. 记录建议

- 一次只改一类规则，避免把“分支条件重写”“回响顺序重排”“战斗映射调参”混进同一条。
- 若改动同时影响主线通关和高风险死亡概率，必须在“影响层级”与“预期体验变化”里单列。
- 若改动只是把旧事实补写进文档，也要记录“为什么现在补”，避免后续再误以为这是新设计。
