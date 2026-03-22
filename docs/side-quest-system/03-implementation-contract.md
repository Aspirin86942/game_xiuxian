# 03. 实现契约

## 1. 目的

本文件写给未来要按支线任务系统规则书改代码的人。

## 2. 代码入口

- 当前事实入口：
- `D:\Program_python\game_xiuxian\game-core.js`
- `D:\Program_python\game_xiuxian\game.js`
- `D:\Program_python\game_xiuxian\story-data.js`
- `D:\Program_python\game_xiuxian\tests\story-smoke.js`
- `D:\Program_python\game_xiuxian\tests\e2e\story.spec.js`

说明：

- `game-core.js` 当前已经负责首批 5 条正式支线的最小状态机、旧存档回填、接取与结算。
- `game.js` 当前已经负责在 `#side-story-list` 中渲染正式支线卡并处理最小交互。
- `story-data.js` 当前已经承接 `SIDE_QUESTS_V1` 配置表。

## 3. 稳定数据契约

未来正式任务系统至少需要能稳定表达以下语义；字段名可以调整，但语义不能静默消失：

- `VisibleClue`
- `id`
- `title`
- `detail`
- `category`
- `chapterWindow`
- `sourceFlags`
- `npc`
- `SideQuestDefinition`
- `id`
- `title`
- `category`
- `availableFromProgress`
- `availableToProgress`
- `triggerCondition`
- `acceptCondition`
- `failCondition`
- `successCondition`
- `rewards`
- `branchEffects`
- `priority`
- `exclusiveGroup`
- `deadline`
- `RewardPackage`
- 灵石 / 道具 / 功法 / 关系变化 / 路线倾向 / 旗标变化
- `SideQuestRuntimeEntry`
- `questId`
- `state`
- `availableAtProgress`
- `acceptedAtProgress`
- `deadlineProgress` 或 `deadlineTimestamp`
- `resolvedAtProgress`
- `lastResult`

稳定状态枚举：

- `locked`
- `available`
- `active`
- `completed`
- `failed`
- `missed`

当前代码里已经存在 v1 所需的最小正式字段；若未来继续扩展字段，仍必须补默认值与兼容层，不能假装旧存档天然拥有新结构。

v1 额外约束：

- 必须使用 `availableFromProgress` / `availableToProgress` 作为正式任务窗口。
- v1 固定使用 `deadlineProgress`，不实现 `deadlineTimestamp`。
- `lastResult` 只需要支持 `completed / failed / missed` 的轻量摘要，不要求完整任务日志。

## 4. 稳定流程契约

1. 先依据 `storyProgress`、`flags`、`npcRelations` 和其他条件推导显性线索。
2. 再把命中的线索映射为 `available` 任务，或继续只作为线索保留。
3. 玩家接取后，任务进入 `active`，并与主线推进、游历、战斗或 NPC 交互挂钩。
4. 达成成功条件时结算奖励，进入 `completed`。
5. 命中失败条件或过期条件时进入 `failed` 或 `missed`，不得静默回滚为 `locked`。
6. 同轮命中多个任务时，先按 `priority`，再按 `exclusiveGroup`，最后按与当前 `storyProgress` 的接近度裁决。

v1 固定判定：

1. `storyProgress < availableFromProgress` 时，任务保持 `locked`。
2. `availableFromProgress <= storyProgress <= availableToProgress` 且触发条件满足时，任务进入 `available`。
3. 玩家点击接取后，任务进入 `active`。
4. 玩家在当前卡片内完成一次支线抉择后，任务立即进入 `completed` 并结算奖励。
5. 若任务从未接取，且 `storyProgress > availableToProgress`，则进入 `missed`。
6. 若任务已接取，但在结算前 `storyProgress > availableToProgress` 或命中显式 `failCondition`，则进入 `failed`。

额外流程约束：

- 支线不得直接覆盖主线播放游标；主线优先推进。
- 支线如果要在剧情页出现，应通过插章、独立结算或后续读取点承接，而不是强行插进主线章节流。
- 唯一奖励只能结算一次，读档重放不得造成重复领取。
- v1 只允许一个 `active` 支线同时存在；其余 `available` 任务必须保留，但接取按钮禁用。

## 5. 稳定 UI 契约

- 当前最小 UI 保底：
- 即便没有完整任务日志，也必须至少保留“显性线索区/同行回响区”作为退化方案。
- 正式任务 UI 当前已经在同一区域落地，至少展示：
- 任务标题
- 任务分类
- 当前状态
- 奖励概览
- `available` 的接取入口
- `active` 的卡内 choices
- `completed / failed / missed` 的结果摘要

v1 固定 UI 契约：

- 继续复用 `#side-story-list`，不新增页签，不新增独立任务页。
- `available`：显示任务标题、分类、状态标签、奖励概览、接取按钮。
- `active`：在当前卡片内显示 1 组支线 choices，并在卡内完成即时结算。
- `completed`：显示已完成摘要与奖励已结算提示。
- `missed`：显示已错过原因。
- `failed`：显示失败原因，但首批任务可以少用该状态。

选前必须隐藏：

- 精确的隐藏承接读取章节
- 隐藏路线权重算法
- 内部优先级打分细节

选后必须展示：

- 玩家当前接受/完成/错过了什么任务
- 奖励是否已结算
- 任务为何失败或错过

当前 UI 与未来目标态的差距必须被保留为显式文档差距，不能在实现时默默补齐却不回写规则书。当前仍未落地的差距主要是独立任务日志、多段追踪和更强的列表密度治理。

## 6. 禁止项

- 不能把当前“线索卡”写成“正式任务日志”并在文档里偷换概念。
- 不能让支线无条件抢断主线剧情播放。
- 不能让任务失败或错过完全无提示。
- 不能在 v1 中偷偷引入真实时间 deadline 或跨章节多段追踪。
- 不能把唯一奖励设计成可通过刷新、读档、重复触发反复领取。
- 不能直接把原著露骨或敏感桥段搬进任务正文。
- 不能只加文本，不加任务后果、奖励或后续读取点。

## 7. 可改项

- 任务分类的具体命名
- 奖励档位和数值区间
- 冲突优先级的具体权重算法
- 是否用进度还是时间作为 deadline 主轴
- 正式任务 UI 的呈现形态

但 v1 已锁定以下默认，不应在本轮实现中再自由发挥：

- deadline 主轴固定为 `storyProgress`
- 任务形态固定为单段式即时结算
- 奖励范围固定为轻量奖励
- 不新增独立任务页

只要这些改动影响玩家理解、作者接口或兼容策略，就必须同步更新 `02` 与 `04`。

## 8. 最低测试契约

- 兼容测试：
- 旧存档缺少任务字段时，系统能补默认值并继续读取现有线索。
- 当前只有线索层的存档升级到正式任务系统时，不会把已有主线状态污染成错误任务状态。

- UI 契约测试：
- 当前线索区仍然可见。
- 当前正式任务 UI 与 legacy 线索共存时，375x667 下不得破坏单屏体验。
- 线索/任务列表不得因为新增元信息出现难用的额外嵌套滚动。

- 行为测试：
- `available -> active -> completed` 可通过正式支线 UI 走通。
- `missed` 与 `failed` 的结果态必须可见，不允许只在存档里变化。
- 主线推进与支线触发同回合命中时，主线优先且支线不丢失。
- `exclusiveGroup` 任务同轮命中时，只允许一个进入 `available` 或 `active`。
- 超时任务会正确进入 `failed` 或 `missed`。
- 唯一奖励不会重复结算。
- 线索命中后能生成预期任务原型，而不是只剩静态文案。

- 自动化命令：
- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook.py --root D:\Program_python\game_xiuxian\docs\side-quest-system`
- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook_series.py --root D:\Program_python\game_xiuxian\docs --series-dir rulebook-series`
- `npm test`

## 9. 变更分级

- A 级：
- 调整任务状态枚举语义
- 调整主线/支线优先级
- 调整唯一奖励与错过规则
- 调整原著改写边界

- B 级：
- 调整任务分类
- 调整奖励档位
- 调整冲突优先级细节
- 调整 deadline 口径

- C 级：
- 新增任务原型
- 新增线索窗口
- 新增任务奖励包
- 新增读取点或后续回响

要求：

- A 级改动必须先改规则书，再动代码。
- B/C 级改动至少同步更新 `02`、`04`、`05`。

## 10. 设计验收

- 玩家可解释性审计：
- 玩家是否能解释这条支线为什么会出现、为何会错过、为何值得接。

- 设计一致性审计：
- 任务是否延续当前项目的克制口径，而不是突然切成 MMO 式清单任务。
- 支线是否真正与主线、NPC、资源系统有交界，而不是孤立彩蛋。

- 资产接入质量审计：
- 新任务是否写明分类、状态流转、奖励包、冲突组、失败条件和读取点。
- 是否通过原著改写边界检查，没有直接搬运不适配桥段。
