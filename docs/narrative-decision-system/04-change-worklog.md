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

#### 相关文档

- `01-current-behavior.md`
- `02-parameters-and-formulas.md`
- `03-implementation-contract.md`

#### 相关代码入口

- `story-data.js`
- `game-core.js`
- `game.js`

## 3. 初始基线

### `[2026-03-20] 建立叙事决策系统规则书并吸收旧 choice-system`

#### 改动内容

- 新建 `docs/rulebook-series/README.md` 作为轻量系列索引
- 新建 `docs/narrative-decision-system/` 作为第一本成熟分册
- 将旧 `docs/choice-system/` 的“暗选、明算”规则吸收进更大的叙事决策系统闭环
- 将 `choice-system` 降级为迁移说明页，不再保留并行五件套正文

#### 改动原因

- 原 `choice-system` 只能解释剧情 choice 的隐藏后果，已经不足以描述当前代码里真实存在的主线推进、小境界事件、回响顺序、终局与重开闭环
- 后续你、别的 AI、Codex 继续协作时，需要一套系统级、单权威的规则书，而不是继续围绕窄规则书打补丁

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
  - 旧 `choice-system` 关键概念未丢失
  - 新分册已覆盖主线 / 小境界 / 回响 / 终局闭环
  - `choice-system` 不再表现为并行权威

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
