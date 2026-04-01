# 地点委托规则书

## 1. 目的

本目录用于定义《灵光修仙传》地点委托系统的目标态规范、当前实现事实与内容接入约束。

本册当前重点不再是“支线如何服务卷末收束”，而是：

- 各地点如何形成自己的委托生态
- 委托如何按地点与境界开放
- 委托如何补世界横截面，而不是补主线旧账

默认原则：

> 先改规则书，再改代码。

补充说明：

- 当前运行时真实行为，仍以代码与 `01-current-behavior.md` 为准。
- 离线原著全文只作为参考素材，不是运行时事实源。

## 2. 使用顺序

1. 先看 `00-design-principles.md`，确认地点委托优先服务什么。
2. 再看 `01-current-behavior.md`，确认当前 `commissions` 存档、地点门槛和 UI 揭示的事实。
3. 再看 `02-parameters-and-formulas.md`，确认奖励档位、开放区间和观测项。
4. 再看 `03-implementation-contract.md`，确认 `location / minRealmScore / maxRealmScore / choices` 与 `commissions` 的稳定契约。
5. 再看 `05-content-authoring-interface.md`，确认作者如何把新地点委托安全接入当前项目。

## 3. 工作流

1. 先用 `01-current-behavior.md` 锁定当前事实，不把目标态直接写成“已经实现”。
2. 再用 `00-design-principles.md` 判断这笔委托是否真的服务地点生态，而不是伪装后的主线尾巴。
3. 再用 `03-implementation-contract.md` 检查地点、境界、存档和 UI 词面的稳定边界。
4. 再用 `05-content-authoring-interface.md` 检查委托原型、choices、奖励与结果留痕是否合格。
5. 改动完成后，必须在 `04-change-worklog.md` 留痕。

## 4. 目录职责

- `README.md`：说明本册定位、边界、阅读顺序与维护规则。
- `00-design-principles.md`：定义地点委托系统的设计宪章。
- `01-current-behavior.md`：记录当前代码中的委托状态机、游历风声和 UI 事实。
- `02-parameters-and-formulas.md`：记录开放区间、奖励档位、冲突优先级与观测项。
- `03-implementation-contract.md`：定义稳定数据契约、流程契约、存档兼容契约与测试门槛。
- `04-change-worklog.md`：记录规则级变更、前提变化与回退条件。
- `05-content-authoring-interface.md`：规定地点委托标题、地点标签、choices、奖励预览和结果留痕的作者接口。
- `appendix-a-state-matrix.md`：收纳委托状态矩阵与开放规则。
- `appendix-b-test-scenarios.md`：收纳地点委托实现与回归的测试场景。

## 5. 所属系列

- 系列索引：`../rulebook-series/README.md`

## 6. 本册负责什么

- 定义地点委托的分类、触发、接取、结算、失败与空态。
- 定义地点委托与 `currentLocation + realmScore` 的开放边界。
- 定义地点委托在 UI、游历风声和存档里的统一词面与稳定字段。
- 定义内容作者如何根据当前项目口径改写原著母题，而不是直接复刻桥段。

## 7. 本册不负责什么

- 主线章节的 `branchImpact`、失败压力与终局链，这些由 `narrative-decision-system` 主责。
- 主线章节推进、卷末收束与终局解释。
- 物品 taxonomy、炼丹、战斗数值、挂机收益等非委托主体系统。

## 8. 当前事实来源

- `story-data.js`
- `game-core.js`
- `src/core/state.js`
- `src/core/world.js`
- `src/ui/renderers.js`
- `src/ui/actions.js`
- `tests/story-smoke.js`
- `tests/ui-contract-smoke.js`
- `tests/e2e/story.spec.js`

## 9. 本册当前重点

- 当前第一优先任务是把 `青牛镇` 与 `太南山` 两组固定地点委托定义清楚。
- `黄枫谷` 与 `乱星海` 暂不在本轮实现范围内，只保留接口边界与命名口径。

## 10. 维护规则

- 任何新增地点委托，都必须先回答它为什么只能发生在这个地点。
- 任何新增地点委托，都必须说明它对应的境界区间、奖励语义和结果留痕。
- 任何修改玩家可见词面的改动，都必须同步回写 `03-implementation-contract.md` 与 `05-content-authoring-interface.md`。
