# 01. 当前实现行为

## 1. 机制目标

记录《灵光修仙传》当前已经实现的叙事决策闭环，而不是理想中的未来设计。

当前代码已经不是单独的“剧情按钮选择器”，而是一套会同时改变以下对象的系统：

- 主线推进节奏
- 小境界事件插入时机
- 剧情页可见内容和可选项
- 分支状态与路线倾向
- 即时回响与延迟回响
- 玩家战斗加成
- 死亡结局与重开入口

## 2. 系统层级图

1. 主线章节按 `storyProgress` 与 `requirements` 判断是否可进入。
2. 小境界事件按 `LEVEL_STORY_EVENTS`、`realmScore`、`levelStoryState` 判断是否排队或插入。
3. `storyCursor` 决定剧情页当前展示主线、小境界事件还是终局。
4. choice 结算同时写入 `effects`、分支状态、隐藏后果、回响锚点与 ending。
5. `getEchoes()` 把“抉择余波 + 剧情回响 + 延迟回响 + flag 回响”汇总成可见结果。
6. `storyConsequences` 把正负后果转成战斗优势与失败风险。
7. ending 页通过重开 / 导出把本局从叙事终点重新接回初始状态。

## 3. 术语表

| 中文名 | 代码名 | 当前含义 |
| --- | --- | --- |
| 主线推进 | `storyProgress` | 当前主线章节指针；大多数时候是数字章节 id，个别 late branch 会用字符串分支 id，进入 ending 后写为 `-1` |
| 剧情游标 | `storyCursor` | 当前剧情页在看主线、小境界事件还是 ending，以及当前页数与模式 |
| 小境界事件 | `LEVEL_STORY_EVENTS` / `levelStoryState` | 跟随境界成长插入的悟境事件，独立于主线章节存在，但共用剧情页和 choice 结算 |
| 主线分支记录 | `chapterChoices` | 主线每章最终选了哪个 choice，供延迟回响和后续条件读取 |
| 路线倾向 | `routeScores` | `orthodox / demonic / secluded` 三路累计分值，影响路线摘要、后续叙事条件和默认 `tradeoff` |
| 叙事旗标 | `flags` | 更细粒度的剧情状态布尔值或偏向值，供章节、回响、对白、ending 条件读取 |
| 人情关系 | `npcRelations` | 与关键 NPC 的关系分值，影响支线文本与人物侧内容 |
| 隐藏后果 | `tradeoff` | 每个 choice 的隐藏收益 / 代价定义，选前不显示给玩家 |
| 战意 | `storyConsequences.battleWill` | 正向积累，转化为攻击、防御、气血加成 |
| 劫煞 | `storyConsequences.tribulation` | 负向积累，超过死亡语义阈值时进入“走火入魔” |
| 抉择余波 | `recentChoiceOutcome` | 最近一次 choice 的数值结算结果，只保留最近一条 |
| 即时剧情回响 | `recentChoiceEcho` | 最近一次主线 choice 的叙事回响锚点 |
| 分支影响面板 | `getEchoes()` 结果 / `echo-list` | 剧情页右侧展示的数值结算、即时回响、延迟回响和 flag 回响合集 |
| 道心与因果 | `getRouteSummary()` / `route-summary` | 常驻面板，展示当前路线倾向、分值、战意与劫煞摘要 |
| 终局 | `ending` | 当前是否已进入普通结局或死亡结局 |

## 4. 覆盖范围

当前系统覆盖：

- 主线章节 `STORY_CHAPTERS`
- 小境界事件 `LEVEL_STORY_EVENTS`
- 剧情页播放、跳至抉择、选项选择、ending 展示
- `chapterChoices`、`routeScores`、`flags`、`npcRelations` 等分支状态
- `recentChoiceEcho`、`recentChoiceOutcome`、延迟回响与 flag 回响
- `storyConsequences` 对战斗数值和死亡结局的影响
- ending 后的重开与结局导出

当前系统不覆盖：

- 随机奇遇
- 战斗回合逻辑本身
- 掉落概率和离线挂机收益公式
- 设置页、音量持久化等独立系统
- 单个剧情 beat 的全文存档化维护

## 5. 主线、支线与插入事件的进入方式

### 5.1 主线章节进入

- 当前主线入口由 `storyProgress` 决定，`getAvailableMainChapter()` 会读取 `getChapterById(state.storyProgress)`。
- 章节必须同时满足 `requirements` 才能进入，当前常见条件包括：
  - `storyProgress`
  - `cultivationAtLeast`
  - `realmScoreAtLeast`
  - `items`
  - `flags`
- 主线推进并不始终是纯数字序列。当前代码已经存在字符串分支进度，例如：
  - `16_feiyu_return`
  - `18_nangong_return`

### 5.2 小境界事件进入

- 小境界事件定义在 `LEVEL_STORY_EVENTS`，每个事件绑定一个 `realmScore`。
- `getPendingLevelEvents()` 会筛掉以下情况：
  - `event.realmScore > 当前 realmScore`
  - 事件已 `triggered`
  - 事件已 `completed`
  - `requirements` 不满足
- `setRealmScore()` 在境界上升时会调用 `queueLevelEventForRealm()`，把同 `realmScore` 的待触发事件直接挂到 `storyCursor` 上。
- 如果当前没有活跃 story cursor，`getCurrentPlayableStory()` 会优先看主线章节；没有可用主线时才回落到待触发的小境界事件。

### 5.3 当前优先级事实

- 已经在播放中的剧情优先继续，不会在中途随便跳到别的 story。
- 已经被 queue 的小境界事件会占据当前 `storyCursor`，直到完成或进入 ending。
- 当没有活跃 cursor 时，主线章节优先级高于未激活的小境界事件。

## 6. 剧情展示与抉择进入

### 6.1 `storyCursor` 如何驱动剧情页

- `ensureStoryCursor()` 会根据当前可玩 story 重建或维持 `storyCursor`。
- `storyCursor` 当前语义：
  - `source`: `main` / `level` / `ending`
  - `mode`: `playing` / `choices` / `idle`
  - `storyId` / `chapterId`: 当前 story 标识
  - `beatIndex`: 当前播放到第几页 beat

### 6.2 剧情页如何推进

- `getStoryView()` 会把当前状态转成页面需要的结构：
  - 正常剧情时返回当前 story、当前 beat、可见 beats、可选 choices
  - ending 时直接返回 ending view
- `advanceStoryBeat()` 会逐页推进 beats。
- `skipStoryPlayback()` 会直接把 `beatIndex` 跳到最后一页，并把 `mode` 切到 `choices`。

### 6.3 剧情页当前展示内容

- 主线会显示章节标题、摘要、页码与当前对白。
- 小境界事件会额外显示“悟境”与当前境界标签。
- 没有可用剧情时，页面显示“暂无新剧情 / 静候机缘”的占位文案。
- ending 时，剧情区改成结局标题、结局描述、重开按钮和导出按钮。

### 6.4 choice 进入与按钮内容

- 当 `storyCursor.mode === 'choices'` 时，剧情页才渲染 `view.choices`。
- 每个按钮当前只显示：
  - 选项文案
  - `costs` 对应的资源消耗
- 若 `canAffordCosts()` 判定资源不足，按钮直接 `disabled`。
- 按钮当前不会预告：
  - `tradeoff`
  - `battleWillGain`
  - `tribulationGain`
  - “高风险 / 低风险”之类定性提示

## 7. 状态字段

### 7.1 主线与剧情游标状态

- `storyProgress`
  - 决定当前主线章节点
  - ending 时被写成 `-1`
  - 当前实现允许 `number` 与 `string` branch id 共存
- `storyCursor`
  - 记录当前剧情页来源、页数和模式
  - `state.ending` 存在时会被归一到 `source: 'ending'`
- `unreadStory`
  - 控制剧情页角标与“有新剧情”提示

### 7.2 小境界事件状态

- `levelStoryState.events[eventId]`
  - `triggered`: 是否已经挂起或进入过
  - `completed`: 是否已经结算完成
- `levelStoryState.currentEventId`
  - 当前正在处理的小境界事件 id

### 7.3 分支状态

- `chapterChoices`
  - 只记录主线 choice
  - 键是章 id 的字符串，值是 choice id
- `routeScores`
  - `orthodox`
  - `demonic`
  - `secluded`
- `flags`
  - 存剧情布尔状态、ending 偏向、路线锚点等
- `npcRelations`
  - 记录墨大夫、厉飞雨、墨彩环、南宫婉、李化元等人物关系值

### 7.4 回响状态

- `recentChoiceEcho`
  - 最近一次主线 choice 的叙事回响锚点
  - 当前只保存一条，不保历史数组
- `recentChoiceOutcome`
  - 最近一次 choice 的数值余波
  - 当前字段包括：
    - `chapterId`
    - `choiceId`
    - `battleWillGain`
    - `tribulationGain`
    - `attackBonus`
    - `defenseBonus`
    - `hpBonus`

### 7.5 收益 / 负面状态

- `storyConsequences.battleWill`
  - 范围 `0..8`
- `storyConsequences.tribulation`
  - 范围 `0..42`
- `ending`
  - 当前结局对象或 `null`
  - 普通结局与死亡结局共用这个入口

## 8. 结算顺序

### 8.1 新剧情开启顺序

当 `ensureStoryCursor()` 发现新的可玩剧情时，当前顺序是：

1. 选择当前应该进入的 story。
2. 重写 `storyCursor` 为对应的 `source / storyId / beatIndex / mode`。
3. 若是小境界事件，标记 `levelStoryState.events[current.id].triggered = true`。
4. 更新 `levelStoryState.currentEventId`。
5. 如 story 自带 `location`，同步更新 `currentLocation`。
6. 写 `unreadStory = true`。
7. 日志追加“新剧情开启：...”。

### 8.2 choice 结算顺序

`chooseStoryOption()` 当前真实顺序是：

1. 确认当前有可玩的 story，且 `storyCursor.mode === 'choices'`。
2. 查找 choice，找不到直接报错。
3. 若按钮本来就被禁用，直接返回“资源不足”错误。
4. 扣除 `costs`。
5. 应用 choice 的 `effects`：
  - `cultivation`
  - `items`
  - `relations`
  - `routeScores`
  - `flags`
  - `location`
6. 记录日志：`剧情抉择：...`
7. 应用隐藏后果 `tradeoff`：
  - 累加 `storyConsequences`
  - 重算战斗属性
  - 写入 `recentChoiceOutcome`
  - 记录日志：`抉择余波：战意 +N，劫煞 +M`
8. 若是主线 choice，写入 `chapterChoices` 与 `recentChoiceEcho`。
9. 若是小境界 choice，标记该事件 `completed = true` 并清空 `currentEventId`。
10. 若这次 `tradeoff` 触发死亡语义，写入 `ending = 走火入魔`，`storyProgress = -1`，`storyCursor.source = 'ending'`。
11. 若未死亡但 choice 自带 `ending`，进入该结局，同样把 `storyProgress = -1`。
12. 若未 ending 且是主线 choice，按 `nextChapterId` 推进 `storyProgress`。
13. 清空当前 cursor 到 `main / idle`，再调用 `ensureStoryCursor()` 决定下一个剧情入口。

### 8.3 当前最重要的流程事实

- `tradeoff` 发生在 `effects` 之后、`choice.ending` 之前。
- 死亡判定优先于普通 ending。
- `recentChoiceOutcome` 在死亡判定之前就已经写入，所以即使本次选择直接触发死亡，余波仍然保留。
- 小境界事件的完成标记发生在死亡判定之前，因此高风险悟境选择也会先把事件记为已完成，再进 ending。

## 9. 分支状态与回响状态

### 9.1 分支状态如何写入

- `chapterChoices` 负责给“哪一章选了什么”留痕。
- `routeScores` 负责给“正道 / 魔路 / 苟修”累计总分。
- `flags` 负责给具体剧情条件、对白变化、ending 偏置留痕。
- `npcRelations` 负责给人物侧文本和支线提示提供额外状态。

### 9.2 即时回响如何写入

- 主线 choice 结算后会把 `{ chapterId, choiceId }` 写到 `recentChoiceEcho`。
- 该字段只作为“最近一条剧情回响”的锚点，不保留完整历史。

### 9.3 数值余波如何写入

- 所有 choice 结算后都会写 `recentChoiceOutcome`。
- 它只记录最近一次，而不是历史数组。
- 当前系统借助它在剧情页即时告诉玩家：
  - 本次新增了多少战意
  - 本次新增了多少劫煞
  - 当前总战斗加成已经累积到多少

### 9.4 `getEchoes()` 当前顺序

`getEchoes()` 当前固定顺序是：

1. `recentChoiceOutcome` 生成的“抉择余波”
2. `recentChoiceEcho` 对应的即时剧情回响
3. 由 `chapterChoices` 反查出的延迟回响，按章节顺序推入，并按 title 去重
4. 由 `flags` 触发的侧向回响
5. 若前面全空，显示兜底回响“尚在起势”

## 10. 收益 / 负面映射

### 10.1 `tradeoff` 如何生成

- 每个主线 choice 与小境界 choice 运行期都会被归一化出 `tradeoff`。
- 若 choice 自己显式写了 `tradeoff`，则优先用显式值。
- 若没显式写，则按 `effects.routeScores` 推导：
  - `demonic > 0` -> `battleWill +3 / tribulation +2`
  - `secluded > 0` -> `battleWill +1 / tribulation +1`
  - 其余情况 -> `battleWill +2 / tribulation +1`

### 10.2 正向收益如何转成玩家优势

- `battleWill` 不直接改怪物，而是直接强化玩家：
  - `attack += battleWill * 2`
  - `defense += floor(battleWill / 2)`
  - `maxHp += battleWill * 6`
- `battleWill` 上限当前为 `8`，理论总加成上限是：
  - 攻击 `+16`
  - 防御 `+4`
  - 气血 `+48`
- `maxHp` 增长后不会直接回满，而是沿用原本的血量比例折算。

### 10.3 负面代价如何转成风险

- `tribulation` 当前显示上限是 `42/42`。
- 真实死亡语义不是“等于 42 就死”，而是“本次结算前真实值 + 本次新增值 > 42 时死亡”。
- 因为状态会先被 clamp 到 `42` 再显示，所以 UI 看上去是封顶 `42/42`，但死亡实际由溢出触发。

### 10.4 路线倾向当前如何影响叙事

- `routeScores` 当前不直接改战斗数值。
- 它的作用是：
  - 影响 `tradeoff` 默认分档
  - 生成“正道 / 魔路 / 苟修”路线摘要
  - 影响后续回响与部分章节文本
- `getRouteSummary()` 会把 dominance、三路分值、战意摘要、劫煞摘要一并推到“道心与因果”面板。

## 11. UI 揭示

### 11.1 选前隐藏

剧情页按钮当前只显示：

- 选项文案
- `costs` 资源消耗

剧情页按钮当前明确不显示：

- `tradeoff`
- `battleWillGain`
- `tribulationGain`
- “偏稳 / 偏狠 / 高风险”提示

### 11.2 选后揭示

- 剧情页右侧的 `echo-list` 会先展示“抉择余波”，再展示即时剧情回响。
- “道心与因果”面板会持续展示：
  - 路线倾向说明
  - 三路分值
  - 战意当前值与总战斗加成
  - 劫煞当前值与“劫煞过盛将走火入魔”的提示

### 11.3 ending 页当前展示

- 标题与描述改成 ending 内容。
- 按钮固定为：
  - `重新开始另一条路`
  - `导出当前结局存档`

### 11.4 音效反馈

- 普通剧情翻页和普通 choice 继续使用剧情音。
- 普通结局使用胜利音。
- `走火入魔` 结局使用失败音。

## 12. 终局与重开

### 12.1 普通结局

- 当 choice 自带 `ending` 且本次没有先被劫煞溢出打断时，进入普通 ending。
- 进入后：
  - `state.ending = choice.ending`
  - `storyProgress = -1`
  - `storyCursor = ending / idle`

### 12.2 死亡结局

- 当前死亡结局 id：`zouhuorumo`
- 标题：`走火入魔`
- 文案直接说明“劫煞反噬心神”是原因，不是无因暴毙。
- 死亡结局与普通结局共用 ending UI，但音效走失败分支。

### 12.3 重开

- 重开入口在 ending 页按钮和全局重置确认逻辑里共用 `resetGame()`。
- `resetGame()` 当前行为：
  - 停止自动修炼与战斗循环
  - 删除 `LocalStorage` 里的 `xiuxian_save_v2`
  - `gameState = GameCore.createInitialState()`
  - 重新 `ensureStoryCursor()`
  - 重新 render 并保存新初始档

## 13. 兼容策略

- 旧存档读入走 `mergeSave()`，不是直接把原 JSON 当成可信完整状态。
- 以下状态当前会被显式回填或归一化：
  - `storyConsequences`
  - `storyCursor`
  - `playerStats`
  - `routeScores`
  - `npcRelations`
  - `flags`
  - `inventory`
  - `chapterChoices`
  - `recentChoiceEcho`
  - `recentChoiceOutcome`
  - `ending`
  - `levelStoryState`
- `normalizeStoryConsequences()` 会把 `battleWill / tribulation` clamp 到合法范围。
- `normalizeRecentChoiceOutcome()` 会把 gain 和 bonus 字段 clamp 到当前上限。
- `normalizeStoryCursor()` 允许旧 cursor 缺字段时回落到可运行值。
- 当前文档若与代码冲突，以代码真实行为为临时权威，但必须尽快补文档。

## 14. 边界与异常

### 14.1 当前属于本册范围的异常

- 当前没有 story 时，剧情页显示占位文案，不报错。
- 当前没有可选 choice 却尝试选择时，返回用户可见错误。
- choice 资源不足时，按钮直接禁用；若仍通过调用进入结算，函数也会再次拦截。
- ending 存在时，`getStoryView()` 直接进入 ending 模式，不再暴露普通剧情内容。

### 14.2 当前最容易误读的边界

- `storyProgress` 不是永远的数字。
- `recentChoiceOutcome` 只保留最近一次，不是历史日志。
- `tradeoff` 是内部字段，不应被当作按钮层提示。
- `tribulation` 显示封顶为 `42`，但死亡是溢出触发，不是 `>= 42` 触发。

### 14.3 暂不纳入本册的内容

- 随机奇遇如何独立叙事化。
- 更细粒度的 NPC 对话树与关系分段规则。
- 单独的回响内容包编写规范。
