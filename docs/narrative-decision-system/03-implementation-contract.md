# 03. 实现契约

## 1. 目的

本文件写给未来要按“叙事决策系统设计”改代码的人。

目标是明确：

- 哪些状态结构现在已经稳定，不能随意删改
- 哪些流程顺序现在是核心行为，不能为了“看起来更合理”直接打乱
- 哪些 UI 可见性与文档同步规则必须保住
- 哪些测试和校验是最低门槛

## 2. 代码入口

### `story-data.js`

负责：

- 主线章节 `STORY_CHAPTERS`
- 小境界事件 `LEVEL_STORY_EVENTS`
- `normalizeChoice()`
- `normalizeTradeoff()`
- 章节与事件的 `requirements`
- choice 的 `effects`、显式 `tradeoff`、显式 `ending`

### `game-core.js`

负责：

- `createInitialState()` 与 `mergeSave()`
- `ensureStoryCursor()`、`getStoryView()`、`advanceStoryBeat()`、`skipStoryPlayback()`
- `chooseStoryOption()` 结算顺序
- `storyConsequences`、`recentChoiceOutcome`、`recentChoiceEcho`
- `chapterChoices`、`routeScores`、`flags`、`npcRelations`
- `getRouteSummary()` 与 `getEchoes()`
- `createTribulationEnding()`

### `game.js`

负责：

- 剧情页 DOM 渲染
- `echo-list` 与 `route-summary` 展示
- ending 页按钮
- `resetGame()` / `exportSave()`
- 剧情 / 结局音效分流

## 3. 稳定数据契约

### 3.1 主线推进状态

- `storyProgress`
  - 当前允许 `number`、`string` 与 ending 后的 `-1`
  - 不能被实现者假设为永远自增数字
- `storyCursor`
  - `source` 当前以 `main / level / ending` 为准
  - `mode` 当前以 `playing / choices / idle` 为准
  - 旧存档缺字段时必须能安全归一化

### 3.2 小境界事件状态

- `levelStoryState.events[eventId]`
  - 结构至少保留 `{ triggered, completed }`
- `levelStoryState.currentEventId`
  - 当前事件指针不能静默移除
- 兼容层要继续支持旧字段形态 `byId`

### 3.3 分支状态

- `chapterChoices`
  - 保留“章 id -> choice id”的映射能力
- `routeScores`
  - 保留 `orthodox / demonic / secluded`
- `flags`
  - 保留为可扩展对象，不要强行收窄成固定枚举前不迁移旧逻辑
- `npcRelations`
  - 保留当前关键 NPC 关系入口

### 3.4 回响与后果状态

- `recentChoiceEcho`
  - 继续保留 `{ chapterId, choiceId } | null`
- `recentChoiceOutcome`
  - 当前字段不能随意删除或改名：
    - `chapterId`
    - `choiceId`
    - `battleWillGain`
    - `tribulationGain`
    - `attackBonus`
    - `defenseBonus`
    - `hpBonus`
- `storyConsequences`
  - 继续保留：
    - `battleWill`
    - `tribulation`
- `ending`
  - 继续复用统一结局结构，不单独为死亡结局另起一套状态面

## 4. 稳定流程契约

### 4.1 当前剧情解析顺序

1. 先续播当前有效 `storyCursor`。
2. 当前 cursor 无效时，再找可用主线章节。
3. 没有可用主线时，再找可用小境界事件。
4. 仍然没有时，剧情页回落到“暂无新剧情”占位。

### 4.2 当前抉择结算顺序

1. `costs`
2. `effects`
3. `tradeoff`
4. `recentChoiceOutcome`
5. `chapterChoices / recentChoiceEcho` 或 `levelStoryState.completed`
6. 死亡 ending
7. 普通 ending
8. 常规推进与下一段剧情游标重建

### 4.3 当前必须保留的流程事实

- 不能把死亡判定提到 `tradeoff` 之前。
- 不能把 `recentChoiceOutcome` 延后到 ending 之后才写。
- 不能把 `recentChoiceEcho` 提前到 `effects` 或 `tradeoff` 之前。
- 不能把 `getEchoes()` 的“抉择余波 -> 剧情回响”顺序反过来。
- 不能把主线和小境界 choice 拆成两套完全不同的归一化结构。

## 5. 稳定 UI 契约

### 5.1 选前必须隐藏

- `tradeoff`
- `battleWillGain`
- `tribulationGain`
- “高风险 / 低风险 / 偏稳 / 偏狠”等后果提示

### 5.2 选前允许显示

- 选项文案
- `costs`
- 资源不足导致的 `disabled` 状态

### 5.3 选后必须揭示

- `echo-list` 第一条必须是 `recentChoiceOutcome` 对应的“抉择余波”
- narrative echo 只能排在数值余波后面
- “道心与因果”面板必须持续展示：
  - dominant 路线
  - 三路分值
  - 战意摘要
  - 劫煞摘要

### 5.4 ending 页必须保留

- 结局标题与结局描述
- `重新开始另一条路`
- `导出当前结局存档`

### 5.5 音效反馈契约

- 普通剧情仍走剧情音
- 普通终局走胜利音
- `走火入魔` 终局走失败音

## 6. 兼容契约

- 不能改 `LocalStorage` 键 `xiuxian_save_v2`
- 不能跳过 `mergeSave()` 对旧存档的回填
- 不能把 `storyProgress` 的旧字符串分支节点静默改坏
- 不能删除 `normalizeStoryConsequences()`、`normalizeRecentChoiceOutcome()`、`normalizeStoryCursor()` 这类兜底逻辑
- 文档与代码冲突时，必须先标明“当前代码为准”，再修正文档；不能把过时聊天记录当事实来源

## 7. 与其他分册的边界

- 当前本册负责系统级联动，不负责更细的内容资产写作规范。
- 未来若拆出 `branch-state-system`、`echo-system`、`reward-risk-system`，只能把细粒度规则迁走，不能把系统地图和跨层契约迁空。
- `choice-system` 已降级为迁移页，不得重新成为并行权威文档。

## 8. 禁止项

1. 不能只改其中一层而让主线、分支、回响、收益 / 负面脱节。
2. 不能把收益 / 代价提前渲染回剧情按钮。
3. 不能把 `tribulation` 死亡语义私自改成 `>= 42` 而不同步规则书与测试。
4. 不能只在 UI 层手写后果展示，绕开 `tradeoff` 和 `recentChoiceOutcome`。
5. 不能把 `recentChoiceOutcome` 改成历史数组却不更新存档兼容与页面结构。
6. 不能只改 UI 文案却不改系统事实文档。
7. 不能把只有本册知道的关键规则藏进聊天记录。

## 9. 可改项

- 单个章节或单个小境界事件的 `requirements`
- 默认 `tradeoff` 分档与少量关键剧情的显式 `tradeoff`
- `battleWill` 与 `tribulation` 上限
- 战斗映射公式
- `getEchoes()` 中 flag echo 的内容和数量
- 系列拆册后的 ownership 边界

任何可改项只要影响现有体感，都必须同步更新 `02-parameters-and-formulas.md` 和 `04-change-worklog.md`。

## 10. 最低测试契约

### 10.1 文档校验

- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook.py --root D:\Program_python\game_xiuxian\docs\narrative-decision-system`
- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook_series.py --root D:\Program_python\game_xiuxian\docs --series-dir rulebook-series`

### 10.2 状态与兼容测试

- 旧存档自动补齐 `storyConsequences`
- 旧存档自动补齐 `recentChoiceOutcome`
- 旧存档自动补齐 `storyCursor`
- 旧存档自动补齐 `levelStoryState`

### 10.3 UI 契约测试

- 主线按钮不显示 `战意 / 劫煞`
- 小境界按钮不显示 `战意 / 劫煞`
- `echo-list` 首项为 `抉择余波`
- ending 页保留重开与导出按钮

### 10.4 行为测试

- 主线推进仍可进入抉择
- 支线 / 小境界仍能正确插入
- `recentChoiceOutcome` 会随 choice 正确更新
- `battleWill` 会真实抬高 `attack / defense / maxHp`
- 高风险路径可以触发 `走火入魔`
- ending reset 后能回到初始状态

### 10.5 自动化命令

- `npm run test:smoke`
- `npm run test:e2e`
- `npm test`

文档-only 改动可以不跑游戏自动化回归，但后续一旦按本册改代码，上述命令至少要按影响面补跑。
