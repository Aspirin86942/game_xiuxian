# 支线任务系统规则书

## 1. 目的

本目录用于定义《灵光修仙传》支线任务系统的目标态规范、当前实现事实与内容接入约束，不再把“支线线索是什么、何时能接、何时会错过、奖励如何与主线/NPC/资源系统对齐”留在聊天记录里。

本册采用三层写法：

- `目标态规范`：描述未来正式支线任务系统应该如何运转。
- `现状基线`：只在 `01-current-behavior.md` 中记录当前代码已经实现的显性支线线索行为。
- `落地契约`：说明未来从“线索面板”走向“正式任务系统”时，哪些状态、流程、作者接口与测试门槛必须保住。

默认原则：

> 先改规则书，再改代码。

补充说明：

- 当前运行时真实行为，仍以代码与 `01-current-behavior.md` 为准。
- 本地原著全文 `D:\Program_python\game_xiuxian\Fan Ren Xiu Xian Chuan [ Geng Xin Zhi  Di - Wang Yu.txt` 只是离线参考素材，不是运行时事实源，也不是规则书的唯一依据。

## 2. 使用顺序

1. 先看 `00-design-principles.md`，确认支线任务系统究竟优先优化什么。
2. 再看 `01-current-behavior.md`，确认当前实现其实只有“显性支线线索”，还没有正式任务状态机。
3. 再看 `02-parameters-and-formulas.md`，确认触发阈值、冲突优先级、奖励档位与观测项。
4. 再看 `03-implementation-contract.md`，确认未来实施时哪些数据、流程、UI 与测试不能被静默改坏。
5. 再看 `04-change-worklog.md`，确认本册的设计前提、版本切换与回退条件。
6. 最后看 `05-content-authoring-interface.md` 与两个附录，确认作者如何把支线任务、choice、奖励和后续读取点安全接入系统。

## 3. 工作流

1. 先在 `01-current-behavior.md` 找当前真实行为，不把“计划实现”写成“已经存在”。
2. 再在 `00-design-principles.md` 判断这次改动是否让支线真正承担叙事、奖励和状态承接，而不是只堆插曲文本。
3. 再在 `02-parameters-and-formulas.md` 确认触发条件、奖励强度、冲突策略与观测指标。
4. 再在 `03-implementation-contract.md` 判定改动属于 A/B/C 哪一级，是否触发额外测试、存档兼容或 UI 验收。
5. 改完规则或改完代码后，在 `04-change-worklog.md` 留下设计留痕，不把判断只留在聊天记录里。
6. 若新增任务资产，回到 `05-content-authoring-interface.md` 与附录，核对任务分类、choice 合格线、原著改写边界与伪分支自检。

## 4. 目录职责

- `README.md`：说明本册定位、边界、阅读顺序与维护规则。
- `00-design-principles.md`：定义支线任务系统的设计宪章。
- `01-current-behavior.md`：只记录当前代码已经实现的支线线索行为、兼容边界与已知差距。
- `02-parameters-and-formulas.md`：记录当前可验证阈值、未来稳定参数、公式、观测指标与联动风险。
- `03-implementation-contract.md`：定义稳定数据契约、稳定流程契约、稳定 UI 契约、禁止项、测试门槛与变更分级。
- `04-change-worklog.md`：记录规则级变更、设计前提转移与回退条件。
- `05-content-authoring-interface.md`：规定支线任务、任务 choice、奖励包与原著改写素材如何安全接入系统。
- `appendix-a-state-matrix.md`：收纳当前线索层与未来任务状态机的状态矩阵、冲突矩阵与可见性矩阵。
- `appendix-b-test-scenarios.md`：收纳设计验收场景、当前自动化覆盖与未来补测入口。

## 5. 所属系列

- 系列索引：`../rulebook-series/README.md`

## 6. 本册定位

- 本册是系列中的第五本 mature 分册。
- 本册不是“原著剧情备忘录”，也不是“当前 UI 逐行说明书”，而是“支线任务系统的目标规则书”。
- 本册保留 `01-current-behavior.md`，专门记录当前代码里已经存在的“显性支线线索层”，不代表其余文件会被当前实现形状绑死。

## 7. 本册负责什么

- 定义支线任务的分类、触发方式、状态流转、奖励口径与冲突裁决。
- 定义显性支线线索如何升格为正式可接取任务，而不覆盖主线播放游标。
- 定义支线与 `storyProgress`、`flags`、`npcRelations`、`routeScores`、物品奖励和游历节奏之间的稳定交界。
- 定义内容作者如何基于当前项目口径改写原著素材，避免直接搬运不适配的桥段。

## 8. 本册不负责什么

- 主线章节的 choice 承诺结构、失败压力与终局回指。
- 物品 taxonomy、持有型被动与背包持续语义。
- 闭关收益、游历资源主循环与战斗回写公式。
- 露骨原著文本摘录或原著逐章复刻。

## 9. 与其他分册的交界

- `narrative-decision-system` 负责支线任务内部的 choice 质量、`branchImpact`、失败压力与终局回指。
- `inventory-and-item-system` 负责任务奖励中的物品身份、可使用行为与持有型被动。
- `cultivation-and-expedition-system` 负责任务涉及的游历、战斗、灵石产出与主循环节奏。
- 本册负责“任务何时出现、能否接取、如何失败/错过、如何结算以及任务资产如何接入系统”。

## 10. 当前代码入口与事实来源

- `D:\Program_python\game_xiuxian\game-core.js`
- `D:\Program_python\game_xiuxian\game.js`
- `D:\Program_python\game_xiuxian\story-data.js`
- `D:\Program_python\game_xiuxian\tests\story-smoke.js`
- `D:\Program_python\game_xiuxian\tests\e2e\story.spec.js`

说明：

- 当前运行时的支线事实，主要来自 `getAvailableSideStories(state)`、`getVisibleSideQuests(state)`、`acceptSideQuest(...)`、`chooseSideQuestOption(...)` 与 `game.js` 的同行回响面板渲染。
- 原著全文只用于校对事件骨架、人物关系和阶段顺序，不直接决定本册规范。

## 11. 当前机制一句话摘要

- 当前项目已经进入“线索层 + v1 正式支线层”并存阶段；玩家现在既能看到 legacy 旁支线索，也能在同行回响区直接接取、结算首批 5 条正式支线。

## 12. 维护规则

- 任何对支线任务目标态的修改，至少同步检查 `00`、`02`、`03`、`05` 是否仍一致。
- 任何把当前代码迁向正式任务系统的实施，必须同步更新 `01` 与 `04`，避免“现状”和“计划”混写。
- 任何新增支线任务原型、奖励包或冲突策略，若不能通过 `05` 与附录中的伪分支和状态矩阵检查，就不应接入系统。
- 若未来继续拆出更细的分册，例如“任务奖励模型”或“任务冲突调度”，必须先在 `04-change-worklog.md` 记录为什么当前边界不足。
