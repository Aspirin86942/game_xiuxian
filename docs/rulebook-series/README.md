# 规则书系列索引

## 1. 系列目标

- 用一组规则书持续维护《灵光修仙传》的系统设计，但把“目标态规范”和“当前实现事实”明确拆开。
- 当前系列已不再只有叙事决策一个成熟分册；储物、灵石消费与物品作用也已具备独立建册条件。
- 系列索引只做导航、成熟度登记和维护规则，不保存系统事实、参数表或实现契约。

## 2. 定位

- 本索引只负责导航、分册关系、成熟度说明与维护规则。
- 真正的行为事实、参数、公式与实现契约必须落在对应 mature 分册内。
- 当前系列目录：`rulebook-series`
- 当前已成熟分册：`narrative-decision-system`、`inventory-and-item-system`、`alchemy-and-crafting-system`

## 3. 当前已成熟分册

- `narrative-decision-system`：当前第一本 mature 分册，负责理想化叙事决策系统 v2 的目标设计、现状基线与落地契约。
- `inventory-and-item-system`：当前第二本 mature 分册，负责储物、灵石消费、物品直接使用与持有型被动效果的目标设计、现状基线与落地契约。
- `alchemy-and-crafting-system`：当前第三本 mature 分册，负责材料、配方、成品丹药、非战斗保底回血与高阶突破准备的目标设计、现状基线与落地契约。

## 4. 分册清单

<!-- rulebook-series:volumes:start -->
| 目录 | 主题 | 状态 | 定位 |
| --- | --- | --- | --- |
| `narrative-decision-system` | 理想化叙事决策系统 v2 | mature | 当前第一本成熟分册；负责目标态规范、落地契约与作者接口 |
| `inventory-and-item-system` | 储物、灵石消费与物品作用系统 | mature | 当前第二本成熟分册；负责目标态规范、现状基线、参数与内容接入契约 |
| `alchemy-and-crafting-system` | 炼丹、制作与丹药系统 | mature | 当前第三本成熟分册；负责配方、丹药、非战斗回血与高阶突破准备 |
<!-- rulebook-series:volumes:end -->

## 5. 计划中分册

- `branch-memory-architecture`：`分支记忆架构`
- `echo-and-reveal-system`：`回响与揭示系统`
- `failure-pressure-model`：`失败压力与终局语义`

## 6. 阅读顺序

1. 先看 `narrative-decision-system/README.md`，确认 choice、回响、分支影响和失败压力的系统边界。
2. 再看 `inventory-and-item-system/README.md`，确认物品身份、灵石去向、持有型被动与存档契约。
3. 再看 `alchemy-and-crafting-system/README.md`，确认材料、配方、成品丹药、保底回血与突破准备的系统边界。
4. 若当前任务偏剧情选择，按 `narrative-decision-system` 的 `00 -> 01 -> 02 -> 03 -> 04 -> 05` 顺序阅读。
5. 若当前任务偏储物、消费、可使用物品，按 `inventory-and-item-system` 的 `00 -> 01 -> 02 -> 03 -> 04 -> 05` 顺序阅读。
6. 若当前任务偏炼丹、战后续航、高阶突破丹与丹炉页，按 `alchemy-and-crafting-system` 的 `00 -> 01 -> 02 -> 03 -> 04 -> 05` 顺序阅读。
7. 最后回到本索引，核对分册边界、成熟度与同步规则。

## 7. 维护规则

- 先改成熟分册，再改代码。
- 系列索引不保存系统事实、参数表或实施契约；这些内容必须写入对应 mature 分册。
- 当两个成熟分册存在交界时，先在各自 README 明确主责，再决定代码归属，不得在聊天里口头约定。
- 新分册未成熟前，只能登记为计划中分册，不能用空壳目录冒充完成。

## 8. 同步规则

- 分册目录、定位、成熟度变化时，必须同步更新本索引。
- 若已有 mature 分册新增交界关系，索引中必须同步补写新的阅读顺序与主责说明。
- 若成熟分册之间新增交界关系，索引中必须同步写清“谁负责资源来源，谁负责资源进入系统后的持续语义”。
