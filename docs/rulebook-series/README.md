# 规则书系列索引

## 1. 系列目标

- 用一组规则书持续维护《灵光修仙传》的叙事玩法，但每次只把真正成熟的一册做完整。
- 当前优先把“叙事决策系统设计”做成可实施、可维护、可继续扩册的第一本成熟分册。
- 后续若再拆 `branch-state-system`、`echo-system`、`reward-risk-system`，以本索引为统一导航入口。

## 2. 定位

- 本索引只负责导航、分册关系、成熟度说明与维护规则。
- 真正的行为事实、参数、公式和工程契约只写在成熟分册内，不在索引里复制一套。
- 当前系列目录：`rulebook-series`
- 当前唯一权威分册：`narrative-decision-system`

## 3. 当前已成熟分册

- `narrative-decision-system`：当前第一本成熟分册，也是现阶段唯一权威规则书。

## 4. 分册清单

<!-- rulebook-series:volumes:start -->
| 目录 | 主题 | 状态 | 定位 |
| --- | --- | --- | --- |
| `narrative-decision-system` | 叙事决策系统设计 | mature | 当前第一本成熟分册，也是叙事玩法唯一权威规则书 |
<!-- rulebook-series:volumes:end -->

## 5. 计划中分册

- `branch-state-system`：`分支状态系统`
- `echo-system`：`回响系统`
- `reward-risk-system`：`收益与负面系统`

## 6. 阅读顺序

1. 先看 `narrative-decision-system/README.md`，确认当前分册定位与事实来源。
2. 再按顺序阅读 `00-design-principles.md`、`01-current-behavior.md`、`02-parameters-and-formulas.md`、`03-implementation-contract.md`、`04-change-worklog.md`、`05-content-authoring-interface.md`。
3. 最后看两个附录，核对状态矩阵、测试场景和设计审计清单。
4. 回到本索引核对成熟度、分册边界与后续扩册规则。

## 7. 维护规则

- 先改成熟分册，再改代码；改完代码后，再回填成熟分册与本索引。
- 不要把只有一册成熟的系列，误写成“所有分册都已对齐”。
- 新分册未成熟前，只能登记为计划中分册，不要预先生成空壳正文冒充完成。

## 8. 同步规则

- 分册目录名变化时同步改索引。
- 分册从 draft 升级为 mature 时同步改索引。
- 若 `narrative-decision-system` 把部分内容迁给未来分册，必须同步更新本索引和分册 README 的交界说明。
