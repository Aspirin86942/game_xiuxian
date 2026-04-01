# 02. 参数与公式

## 1. 说明

本文件记录地点委托系统当前可验证阈值、运行时参数、触发公式、观测指标与联动风险。

说明：

- `当前值` 只写当前代码中已经能从 `LOCATION_COMMISSIONS_V1`、`COMMISSION_BOARD_LOCATION_ALIASES`、`resolveExpedition()` 或现有 UI 观察到的事实。
- 本册优先覆盖正式地点委托；legacy 旧事线索仅作为 `clue` fallback 的辅助口径保留。
- 本册不再把 `storyProgress` 窗口与 `missed` 结果态当成当前正式委托主契约。

## 2. 核心阈值

| 参数名 | 当前值 | 作用 | 调大后的影响 | 调小后的影响 | 风险 | 允许调整范围 |
| --- | --- | --- | --- | --- | --- | --- |
| 地点数量 | 4 组：`青牛镇 / 太南山 / 黄枫谷 / 乱星海` | 决定正式委托的地域覆盖 | 继续扩点会抬高内容与回归成本 | 缩减会让中后段地点横截面变薄 | 面板空态、地点别名与测试需同步 | 仅在规则书和测试同步后调整 |
| 每地点委托数 | 每组 4 条，共 16 条 | 保持地点委托密度可控 | 更多会挤压 375x667 单屏密度 | 更少会让地点气质不够稳定 | 列表过长会破坏单屏体验 | 建议先保持 4 条一组 |
| 境界开放区间 | 青牛镇 `0~2`；太南山 `2~4`；黄枫谷 `4~6`；乱星海 `7~10` | 控制每组委托对应的成长段 | 放宽会让旧地点长期挤占新地点 | 收紧会导致地点断层 | 境界与地点气质错位 | 只能按地点组整体评估调整 |
| 地点族可见性 | `visibleLocations` 优先，其次 `COMMISSION_BOARD_LOCATION_ALIASES[boardKey]`，最后回退 `location` | 让一条委托可在同一地点族内复用 | 扩大家族会增加跨地点可见范围 | 收缩会让别名地点看不到委托 | 黄枫谷/乱星海别名与面板元信息不一致 | 必须和地点族定义一起改 |
| 乱星海地点族 | `乱星海 / 乱星海群岛 / 乱星海诸岛 / 乱星海外海 / 乱星海海路 / 乱星海深处` | 统一海上委托显示口径 | 更多别名会扩大显示覆盖 | 更少别名会让部分海域掉出面板 | 海图章节与委托榜可见性失配 | 仅按现有别名集合维护 |
| 游历事件权重 | `battle=45 / resource=35 / risk=12 / clue=8` | 决定游历先抽到哪类反馈 | 调高 `clue` 会更常播报委托或旧事 | 调低 `clue` 会让地点委托存在感下降 | 高频播报会稀释资源/战斗反馈 | 需结合 smoke / e2e 一起评估 |
| 风声回退顺序 | `commission -> clue -> resource` | 保证有正式委托时优先播报 | 改后置会削弱地点委托存在感 | 无更低空间 | 规则书与运行时表述不一致 | 当前固定，不建议单改 |
| 单活跃限制 | 同时只允许 1 条 `active` 委托 | 控制状态复杂度与 UI 密度 | 放开会增加并行状态负担 | 无 | 存档与面板交互会一起变复杂 | 当前固定 |
| 当前展示字段 | 正式委托为 `title + detail + category + state + rewardPreview + inline actions/results`；legacy 旧事线索仍为 `title + detail` | 保持正式委托与 fallback 旧事分层 | 继续加字段会挤压单屏 | 再减少字段会让正式委托失去可解释性 | 同一容器承载两套层级，字段过多会失衡 | 当前不建议再扩字段 |

## 3. 公式

### 3.1 当前正式委托可见公式

当前正式委托可见逻辑可以抽象为：

```text
VisibleCommission = LocationFamilyGate AND RealmGate AND RuntimeStateGate
```

其中：

- `LocationFamilyGate`：`currentLocation` 是否命中 `visibleLocations`、地点族别名或单点 `location`
- `RealmGate`：`realmScore` 是否落在 `minRealmScore ~ maxRealmScore`
- `RuntimeStateGate`：运行时记录尚未进入 `hidden` 之外的不可见异常态，且 `active` 可跨地点切换后继续显示

### 3.2 当前 legacy 旧事 fallback 公式

legacy 旧事线索当前只承担 `clue` fallback，可抽象为：

```text
VisibleClue = ProgressGate AND OptionalFlagGate AND OptionalRelationGate AND NotDuplicateByTitle
```

其中：

- `ProgressGate`：`storyProgress` 是否达到旧事窗口
- `OptionalFlagGate`：是否命中特定 `flags`
- `OptionalRelationGate`：是否命中特定 `npcRelations`
- `NotDuplicateByTitle`：同名线索只保留一条

### 3.4 未来奖励强度推荐公式

未来推荐把任务奖励按章节窗口分档，而不是写死单值：

```text
RewardTier = BaseTierByStoryProgress + ModifierByRisk + ModifierByUniqueness
```

说明：

- `BaseTierByStoryProgress` 由主线阶段决定奖励基线。
- `ModifierByRisk` 体现高风险或高代价任务的额外补偿。
- `ModifierByUniqueness` 防止唯一支线奖励被设计得过轻或可重复刷取。

## 4. 观测指标

- 当前线索命中率：在关键主线节点推进后，是否能稳定看到 1~3 条新线索，而不是长期只剩占位文案。
- 线索去重正确率：同轮计算时是否因为标题碰撞误吞不同旧事线索。
- 地点委托密度：单个地点组建议仍保持 4 条上下，否则正式任务 UI 很难保持 375x667 的单屏可用性。
- 委托转化率：当前 `available -> active -> completed/failed` 的比例应可被追踪，而不是只知道“地点里曾经有委托”。
- 地点族命中率：黄枫谷与乱星海的别名地点进入时，是否仍能看到同组委托与空态。
- 唯一奖励重复率：正式委托奖励不应因读档或重复结算被二次发放。

## 5. 联动参数

- `currentLocation`：决定是否命中地点族与委托榜口径。
- `realmScore`：决定委托是否进入可见区间。
- `visibleLocations / COMMISSION_BOARD_LOCATION_ALIASES`：决定黄枫谷与乱星海等地点族的委托复用范围。
- `routeScores`：决定正式委托 choice 的结算偏向。
- `flags` 与 `npcRelations`：当前主要影响 legacy 旧事 fallback，而非正式地点委托主显示。
- `inventory` 与物品系统：未来正式任务奖励进入背包后，持续语义应交给 `inventory-and-item-system`。
- `cultivation-and-expedition-system`：未来战斗支线、探索支线的资源产出与风险收益需要与主循环同步调参。

## 6. 风险说明

- 若地点族定义与委托 `visibleLocations` 不同步，黄枫谷或乱星海的别名地点会出现“人在此地却无委托榜”的失配。
- 若标题命名不稳，当前按标题去重的策略会误吞旧事线索。
- 若未来任务奖励不按章节窗口分档，早期支线容易过肥，后期支线又会变成只剩情绪价值。
- 若继续在同一容器里叠加更多元信息，却不拆出更强分组或折叠策略，会让 375x667 下的同行回响区变得过密。
- 若把 legacy 旧事窗口继续当成正式委托主口径，会把 `commission` 与 `clue` 两套运行时混回一层。
- 若正式委托混入 `missed` 或真实时间 deadline，会与当前五态、存档兼容和 UI 词面直接冲突。
- 若原著改写没有敏感边界，任务池会和当前项目口径冲突，破坏系列文档的一致性。
