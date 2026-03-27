# 叙事决策与卷结构规则书

## 1. 目的

本目录用于同时约束两层设计：

- 单次叙事抉择 (choice) 如何做到可解释、可回看、可承接。
- 一整卷主线如何做到开篇明确、卷中反转、卷末收束、跨卷出口清楚。

本册不再只回答“一个按钮该怎么写”，也要回答“这一章为什么在这里，这一卷为什么能在这里收住”。

默认原则：

> 先改规则书，再改代码。

补充说明：

- 当前运行时真实行为，仍以代码与 `01-current-behavior.md` 为准。
- 本册其余文件定义的是目标态和接入契约，用来约束后续第一卷《七玄门风云》及后续卷的系统化改写。

## 2. 使用顺序

1. 先看 `00-design-principles.md`，确认卷结构、章节角色、choice 质量和失败压力的优先级。
2. 再看 `01-current-behavior.md`，确认当前实现离目标态还有哪些差距。
3. 再看 `02-parameters-and-formulas.md`，确认风险档位、失败压力和分支影响参数。
4. 再看 `03-implementation-contract.md`，确认稳定字段、流程顺序、卷末回收与兼容边界。
5. 再看 `05-content-authoring-interface.md`，确认作者写章节、choices、卷末出口和读取点时的最低合格线。
6. 若当前任务是第一卷重构，补看 `appendix-c-volume-one-structure.md`。
7. 若当前任务是第二卷《初踏修仙路》重构，补看 `appendix-d-volume-two-structure.md`。
8. 若当前任务是第三卷《魔道入侵》重构，补看 `appendix-e-volume-three-structure.md`。

## 3. 工作流

1. 先用 `01-current-behavior.md` 锁定当前事实，不把计划中的卷结构写成已经落地。
2. 再用 `00-design-principles.md` 判定这次改动是在改善卷级闭环，还是只是在拖长剧情。
3. 再用 `03-implementation-contract.md` 判定是否涉及新字段、旧档兼容、章节重组或卷末回收。
4. 再用 `05-content-authoring-interface.md` 检查章节、choices、`branchImpact`、`closureWrites`、`nextReads` 是否合格。
5. 改动完成后，必须回写 `04-change-worklog.md`，不要把“为什么这样收卷”留在聊天里。

## 4. 目录职责

- `README.md`：说明本册定位、边界、阅读顺序与维护规则。
- `00-design-principles.md`：定义卷结构与叙事 choice 的设计宪章。
- `01-current-behavior.md`：记录当前代码里已经落地的叙事事实与关键差距。
- `02-parameters-and-formulas.md`：记录风险语义、失败压力、分支影响与相关参数。
- `03-implementation-contract.md`：定义稳定字段、流程契约、卷末回收与兼容边界。
- `04-change-worklog.md`：记录规则级变化、前提变化与回退条件。
- `05-content-authoring-interface.md`：定义章节、choices、分支记忆、读取点和卷末出口的作者接口。
- `appendix-a-state-matrix.md`：收纳状态矩阵、揭示矩阵与后果矩阵。
- `appendix-b-test-scenarios.md`：收纳设计验收与实现回归场景。
- `appendix-c-volume-one-structure.md`：记录第一卷《七玄门风云》的 8 章卷结构和旧章映射。
- `appendix-d-volume-two-structure.md`：记录第二卷《初踏修仙路》的 8 章卷结构、当前运行时素材吸收点与卷末读取点。
- `appendix-e-volume-three-structure.md`：记录第三卷《魔道入侵》的 8 章卷结构、卷内插章边界与第四卷出口读取点。

## 5. 所属系列

- 系列索引：`../rulebook-series/README.md`

## 6. 本册负责什么

- 定义卷结构最小闭环：卷首承诺、卷中反转、卷末高潮、卷末出口。
- 定义章节在卷内的角色，不让所有章节都写成同级并列事件。
- 定义单次 choice 的承诺、风险揭示、`branchImpact`、分支记忆与终局回指。
- 定义“支线可以服务主线，但不能抢走卷末出口”的交界规则。
- 定义后续主线卷接入时，哪些读取点可以跨卷，哪些旧账必须在卷内清掉。

## 7. 本册不负责什么

- 战斗、掉落、挂机、炼丹等非叙事主体系统。
- 仅靠审美判断的 UI 微调。
- 原著逐章摘录、原文照搬或纯小说复述。
- 独立任务状态机、奖励表与任务冲突优先级的细则，这些由 `side-quest-system` 主责。

## 8. 当前事实来源

- `D:\Program_python\game_xiuxian\story-data.js`
- `D:\Program_python\game_xiuxian\game-core.js`
- `D:\Program_python\game_xiuxian\game.js`
- `D:\Program_python\game_xiuxian\tests\story-smoke.js`
- `D:\Program_python\game_xiuxian\tests\e2e\story.spec.js`

说明：

- 上述文件用于确认当前事实和兼容边界。
- 目标态卷结构优先以本册为准；若运行时代码暂未跟上，应在 `01-current-behavior.md` 与 `04-change-worklog.md` 明确记录差距。

## 9. 本册当前重点

- 当前第一优先任务已经从“把第二卷《初踏修仙路》正式入册”推进到“把第三卷《魔道入侵》正式入册并接入运行时”。
- 第三卷当前目标是：在不回退第二卷卷末边界的前提下，把 `14 血色禁地 -> 20 再别天南` 固定成 8 章闭环，并把 `18_nangong_return` 提升为卷内核心章节。
- `16_feiyu_return` 继续保留为第三卷卷内插章；`21~25` 仍只作为后续卷入口资产，不在本轮展开正式细纲。

## 10. 维护规则

- 任何涉及卷结构、章节角色或卷末出口的改动，至少同步检查 `00`、`03`、`05` 以及对应卷附录。
- 任何把旧章节下放为支线、插章或读取点的改动，都必须同步更新 `04-change-worklog.md`。
- 若规则书与当前代码冲突，应优先在 `01-current-behavior.md` 说明现状，而不是偷偷改写目标态定义。
