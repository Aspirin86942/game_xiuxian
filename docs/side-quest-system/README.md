# 支线任务与卷末回收规则书

## 1. 目的

本目录用于定义《灵光修仙传》支线任务系统的目标态规范、当前实现事实与内容接入约束。

本册当前重点不再只是“支线如何出现和结算”，还要回答：

- 支线如何服务主线卷主题
- 支线何时必须卷内收掉
- 支线何时只能留下读取点，不能继续可见悬挂

默认原则：

> 先改规则书，再改代码。

补充说明：

- 当前运行时真实行为，仍以代码与 `01-current-behavior.md` 为准。
- 离线原著全文只作为参考素材，不是运行时事实源。

## 2. 使用顺序

1. 先看 `00-design-principles.md`，确认支线优先服务什么。
2. 再看 `01-current-behavior.md`，确认当前正式任务状态机和 legacy 线索层的事实。
3. 再看 `02-parameters-and-formulas.md`，确认窗口、奖励档位和冲突策略。
4. 再看 `03-implementation-contract.md`，确认 `volumeAnchor / closureMode / followupHook` 等稳定契约。
5. 再看 `05-content-authoring-interface.md`，确认作者如何把支线安全接入当前项目。

## 3. 工作流

1. 先用 `01-current-behavior.md` 锁定当前事实，不把目标态直接写成“已经实现”。
2. 再用 `00-design-principles.md` 判断这条支线是在补卷主题，还是在制造新拖尾。
3. 再用 `03-implementation-contract.md` 判断这条支线应该 `volume_close`、`seed_forward` 还是 `convert_to_main`。
4. 再用 `05-content-authoring-interface.md` 检查任务原型、choices、奖励和后续读取点是否合格。
5. 改动完成后，必须在 `04-change-worklog.md` 留痕。

## 4. 目录职责

- `README.md`：说明本册定位、边界、阅读顺序与维护规则。
- `00-design-principles.md`：定义支线系统的设计宪章。
- `01-current-behavior.md`：记录当前代码中的支线状态机、legacy 线索层和关键差距。
- `02-parameters-and-formulas.md`：记录窗口、奖励档位、冲突优先级与观测项。
- `03-implementation-contract.md`：定义稳定数据契约、流程契约、卷末回收契约与测试门槛。
- `04-change-worklog.md`：记录规则级变更、前提变化与回退条件。
- `05-content-authoring-interface.md`：规定任务原型、任务 choice、奖励包与后续读取点的作者接口。
- `appendix-a-state-matrix.md`：收纳线索层、正式任务层和卷末回收矩阵。
- `appendix-b-test-scenarios.md`：收纳支线实现与回归的测试场景。

## 5. 所属系列

- 系列索引：`../rulebook-series/README.md`

## 6. 本册负责什么

- 定义支线任务的分类、触发、接取、失败、错过与结算。
- 定义支线与主线卷结构的交界，不让支线抢断主线或拖垮卷末出口。
- 定义支线在卷末的合法去向：卷内结清、转为主线回收、保留读取点。
- 定义内容作者如何根据当前项目口径改写原著素材，而不是直接复刻桥段。

## 7. 本册不负责什么

- 主线章的 `branchImpact`、失败压力与终局链，这些由 `narrative-decision-system` 主责。
- 物品 taxonomy、炼丹、战斗数值、挂机收益等非任务主体系统。
- 原著逐章摘录或纯小说式旁支扩写。

## 8. 当前事实来源

- `D:\Program_python\game_xiuxian\story-data.js`
- `D:\Program_python\game_xiuxian\game-core.js`
- `D:\Program_python\game_xiuxian\game.js`
- `D:\Program_python\game_xiuxian\tests\story-smoke.js`
- `D:\Program_python\game_xiuxian\tests\e2e\story.spec.js`

## 9. 本册当前重点

- 当前第一优先任务是给第一卷《七玄门风云》的支线接入和卷末回收建立硬规则。
- 本册当前不展开第二卷及以后正式支线池，只保留接口和边界。

## 10. 维护规则

- 任何新增正式支线，都必须先回答它服务哪一卷、补哪种旧账。
- 任何会跨卷的支线，都必须说明自己是保留读取点，而不是保留未结算任务状态。
- 任何把 legacy 线索升格为正式任务的改动，都必须同步回写 `01-current-behavior.md` 与 `04-change-worklog.md`。
