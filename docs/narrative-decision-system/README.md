# 叙事决策系统设计规则书

## 1. 目的

本目录用于固定《灵光修仙传》当前已经落地的叙事决策闭环，并把这套闭环提升成可长期协作、可持续调参、可稳定接入新剧情资产的当前代码版本规则书。

默认原则：

> 先改规则书，再改代码；改完代码后，再回填本册与系列索引。

本册当前是叙事玩法的唯一权威规则书。若本册与代码冲突，先以代码真实行为为准，再同步修正文档。

## 2. 使用顺序

1. 先看 `00-design-principles.md`，确认这套系统优先优化什么、什么叫好抉择、哪些不透明是允许的。
2. 再看 `01-current-behavior.md`，确认当前代码到底如何推进主线、插入小境界事件、生成回响和进入终局。
3. 再看 `02-parameters-and-formulas.md`，确认哪些阈值、公式、排序规则是可调项，哪些参数是成组联动的。
4. 再看 `03-implementation-contract.md`，确认未来改代码时必须保住的状态结构、流程顺序、UI 可见性、变更分级与设计验收门槛。
5. 再看 `04-change-worklog.md`，确认过去改动改了什么、为什么改、什么现象应触发回退。
6. 最后看 `05-content-authoring-interface.md` 与两个附录，确认新增章节、choice、显式 `tradeoff`、状态矩阵和测试场景应如何接入系统。

## 3. 设计/改动工作流

1. 先在 `01-current-behavior.md` 找当前真实行为，不凭聊天记录猜系统。
2. 再在 `00-design-principles.md` 判断这次改动是否符合设计原则，而不是只看“改了能不能跑”。
3. 再在 `02-parameters-and-formulas.md` 确认影响的主参数、耦合项、观测指标和实验方式。
4. 再在 `03-implementation-contract.md` 判断这次改动属于 A/B/C 哪一级，是否踩到稳定契约与测试门槛。
5. 改代码或改文档后，在 `04-change-worklog.md` 记录变更、设计前提是否改变、验证结果和回退条件。
6. 若新增剧情资产，回到 `05-content-authoring-interface.md` 检查是否构成伪分支、是否真的写入并被后续消费。

## 4. 目录职责

- `00-design-principles.md`：记录设计决策准则，回答“以后怎么判断一个改动是好设计还是坏设计”。
- `01-current-behavior.md`：记录叙事决策系统当前真实行为，覆盖主线、支线 / 小境界、剧情页、分支状态、回响、收益 / 负面、终局 / 重开。
- `02-parameters-and-formulas.md`：记录当前阈值、隐藏后果分档、回响排序、战斗映射、调参耦合关系与验证方法。
- `03-implementation-contract.md`：记录未来实现时必须遵守的状态、流程、UI、兼容、变更分级与设计验收契约。
- `04-change-worklog.md`：记录系统级规则变化，不把玩法演化只留在聊天记录里。
- `05-content-authoring-interface.md`：记录剧情资产如何安全接入系统，避免新增章节沦为伪分支。
- `appendix-a-state-matrix.md`：集中放状态写入矩阵、状态读取矩阵和单次 choice 生命周期图。
- `appendix-b-test-scenarios.md`：集中放固定路线样本、设计审计入口、调参实验协议与测试场景。

## 5. 所属系列

- 系列索引：`../rulebook-series/README.md`

## 6. 本册定位

- 本册是当前系列中的第一本成熟分册。
- 当前目录：`narrative-decision-system`
- 本册描述的是当前代码已经存在的叙事决策系统，而不是脱离实现的理想规格书。
- 本册的成熟度体现在：它不仅解释“现在怎么跑”，还明确“以后怎么安全演进、怎么调参、怎么加内容、怎么做设计审计”。

## 7. 本册负责什么

- 主线章节如何按 `storyProgress` 与需求条件进入叙事链路。
- 小境界事件如何按 `LEVEL_STORY_EVENTS`、`realmScore` 与 `levelStoryState` 插入当前流程。
- 剧情页如何通过 `storyCursor` 播放章节、进入 choice、进入 ending。
- 分支状态如何由 `chapterChoices`、`routeScores`、`flags`、`npcRelations`、`storyConsequences` 共同组成。
- 回响如何由 `recentChoiceOutcome`、`recentChoiceEcho`、历史 choices 与 flags 联合生成。
- 正向收益与负面代价如何转成战斗加成、风险积累与死亡结局。
- 普通结局、死亡结局与重开如何闭环到存档和 UI。
- 后续规则改动、内容扩写和调参实验应如何被规范记录与审计。

## 8. 本册不负责什么

- 单个 NPC 台词的逐句润色。
- 单章 beat 文本的全文备份或逐句改写。
- 战斗回合 AI、掉落概率、挂机收益公式等非叙事决策本体。
- 随机奇遇的独立规则书化，除非它们未来正式并入本系统。

## 9. 与其他分册的交界

- 若未来拆出 `branch-state-system`，更细的 flags 命名规范、路线 dominance 细则和 late-branch 结构可迁出。
- 若未来拆出 `echo-system`，更细的回响内容包、排序扩展和去重策略可迁出。
- 若未来拆出 `reward-risk-system`，更细的 `tradeoff` 分档、战斗映射和死亡语义调参可迁出。
- 即便未来拆册，本册仍保留系统级地图，负责说明这些分册如何串成一个完整闭环。

## 10. 当前代码事实来源

- `game-core.js`：状态初始化、旧存档兼容、剧情推进、抉择结算、回响生成、路线摘要、终局与重开闭环。
- `story-data.js`：主线章节、`LEVEL_STORY_EVENTS`、choice 归一化、默认 `tradeoff` 规则、显式结局与剧情条件。
- `game.js`：剧情页渲染、`echo-list` 与 `route-summary` 展示、结局按钮、重开 / 导出交互、音效分流。

## 11. 当前机制一句话摘要

- 当前叙事决策系统的核心是：主线与小境界事件共同向剧情页输送 choice，choice 同时写入分支状态、回响锚点与隐藏后果，正向后果变成战斗优势，负向后果累积过界会把本局推入“走火入魔”终局。

## 12. 维护规则

- 后续若新增分册，本册仍要保留系统级导航价值，不能把核心规则散落到索引或聊天记录里。
- 任何阈值、公式、可见性、终局语义或兼容策略改动，必须同时更新 `02-parameters-and-formulas.md`、`03-implementation-contract.md` 和 `04-change-worklog.md`。
- 任何新增剧情资产接入系统前，都应先核对 `05-content-authoring-interface.md` 和两个附录里的审计清单。
- 若未来把本册内容拆给其他成熟分册，必须先在本册和系列索引里写清交界，再动代码。
