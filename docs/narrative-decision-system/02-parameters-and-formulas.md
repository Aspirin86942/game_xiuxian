# 02. 参数与公式

## 1. 说明

本文件记录叙事决策系统当前可调的阈值、排序规则、默认分档、派生公式与调节风险。

本文件不负责解释完整流程；流程顺序以 `01-current-behavior.md` 为准，工程保护栏以 `03-implementation-contract.md` 为准。

## 2. 核心阈值

| 参数名 | 当前值 | 作用 | 调大后的影响 | 调小后的影响 | 风险 | 允许调整范围 |
| --- | --- | --- | --- | --- | --- | --- |
| 主线推进匹配语义 | `storyProgress` 精确匹配章节 `requirements.storyProgress` | 决定当前章节是否可进入 | 分支节点越多，叙事路径越细 | 章节表达能力下降，更难承接 late branch | 若把精确匹配改成区间或模糊匹配，现有 late branch 很容易串章 | 允许继续使用 `number` 与 `string`，不建议改成单一枚举前先重写所有章节条件 |
| 小境界事件入口阈值 | `realmScoreAtLeast` + 未 `triggered/completed` | 决定悟境事件何时进入可玩队列 | 事件更早出现，叙事密度上升 | 事件更晚出现，悟境层反馈变弱 | 改错会导致悟境事件不触发或压住主线 | 建议只改单个事件，不全局改语义 |
| `battleWill` 上限 | `8` | 限制正向收益能堆到多高 | 战斗会明显更轻松，后期滚雪球更强 | 战意更快封顶，剧情选择的成长回报变弱 | 调太高会把游历战斗打成无压力 | `0..12` 内可讨论，超出需重测战斗节奏 |
| `tribulation` 显示上限 | `42` | 控制 UI 上劫煞条的封顶值 | 看起来更宽松 | 看起来更苛刻 | 若只改显示值不改死亡语义，文档和代码会脱节 | 建议与死亡语义一起审查 |
| `tribulation` 死亡语义 | `nextTribulation > 42` | 决定何时进入“走火入魔” | 容错更高，高风险线更能压线通关 | 更容易中途暴毙 | 最容易被误改成 `>= 42`，会直接改变通关路线 | 允许改，但必须同步文档与测试 |
| `recentChoiceOutcome` 保留条数 | 仅最近 `1` 条 | 决定剧情页即时余波如何展示 | 若改成多条，历史感更强 | 若改成 `0`，玩家难以理解数值后果 | 改为历史列表会影响 UI、存档和测试 | 当前建议保持 `1` |
| `getEchoes()` 排序语义 | `余波 -> 即时回响 -> 延迟回响 -> flag 回响 -> 兜底` | 决定玩家先看到什么解释 | 提前某类回响会改变因果理解顺序 | 延后某类回响会让反馈不够直接 | 顺序一乱，玩家会先看见文学解释、后看见真实数值结果 | 建议保持语义排序，不建议按“更好看”随意重排 |
| 路线显示兜底语义 | `routeScores` 最高项；若最高分 `<= 0` 显示“未定” | 决定“道心与因果”面板怎么解释当前路线 | 更早显露路线人格 | 更晚显露路线人格 | tie 规则若改，会影响玩家对自己当前路线的判断 | 可改展示文案，不建议改 score 源结构 |

## 3. 主线 / 支线触发规则

### 3.1 主线章节触发

- 主线章节当前是“精确 `storyProgress` + `requirements` 条件”模式。
- 当前代码已经混用以下形式：
  - 数字章节：`0`、`1`、`2` ...
  - 字符串分支节点：`16_feiyu_return`、`18_nangong_return`
- 这意味着未来实现不能把 `storyProgress` 当成纯数字自增计数器。

### 3.2 小境界事件触发

- 每个小境界事件都绑定一个 `realmScore`。
- 事件必须同时满足：
  - `event.realmScore <= 当前 realmScore`
  - 未 `triggered`
  - 未 `completed`
  - `requirements` 满足
- 境界提升时，`queueLevelEventForRealm()` 会优先把同级事件挂到 `storyCursor`。

### 3.3 主线与小境界的当前优先级

- 活跃中的 cursor 优先续播。
- 已经 queue 的小境界事件会直接抢占当前 cursor。
- 无活跃 cursor 时，主线章节优先于未激活的小境界事件。

## 4. 默认隐藏后果与分支参数来源

### 4.1 默认 `tradeoff` 分档

| 参数名 | 当前值 | 作用 | 调大后的影响 | 调小后的影响 | 风险 | 允许调整范围 |
| --- | --- | --- | --- | --- | --- | --- |
| 魔路默认分档 | `routeScores.demonic > 0 -> battleWill +3 / tribulation +2` | 让魔路 choice 形成高收益高代价体感 | 魔路更狠、更快滚雪球 | 魔路与其他路线差异感变弱 | 高风险线死亡概率和爽感会一起变化 | 建议保持单次 `battleWill 1..3`、`tribulation 1..2` |
| 苟修默认分档 | `routeScores.secluded > 0 -> battleWill +1 / tribulation +1` | 让苟修更稳、更慢热 | 苟修也会更有即时战力 | 苟修会更像纯拖节奏路线 | 调太低会让玩家觉得“稳但没回报” | 建议保持低风险低回报定位 |
| 正道 / Neutral 默认分档 | 其余情况 -> `battleWill +2 / tribulation +1` | 提供中档收益与中档风险 | 正常推进更有力量感 | 正常推进会显得偏弱 | 低风险主线是否顺畅通关强依赖这一档 | 建议作为基准档，不轻易挪到极端值 |
| 显式覆盖单次 `battleWillGain` 钳制 | `1..3` | 防止单个 choice 爆表或失去正反馈 | 上限更高会让关键剧情爆发更强 | 下限更低会出现“没有收益”的 choice | 改动会影响所有手写 `tradeoff` 的解释空间 | 不建议超出当前 clamp 区间 |
| 显式覆盖单次 `tribulationGain` 钳制 | `1..2` | 保证每次抉择都有代价且不会单次过重 | 上限更高会明显放大暴毙率 | 下限更低会出现“零代价”路线 | 会直接改变暗选、明算的设计底色 | 不建议突破当前 clamp 区间 |

### 4.2 `routeScores` 的派生作用

- 决定默认 `tradeoff` 分档。
- 决定“道心与因果”面板的 dominant 路线文案。
- 决定部分剧情与回响的解释口径。

## 5. 回响排序规则

当前 `getEchoes()` 排序固定如下：

1. `recentChoiceOutcome` -> 抉择余波
2. `recentChoiceEcho` -> 最新剧情回响
3. 历史 `chapterChoices` -> 延迟回响
4. `flags` -> 侧向回响
5. 兜底回响 -> `尚在起势`

排序影响：

- 若把数值余波往后挪，玩家会先看到文学性解释，后看到真实数值后果。
- 若把 flag 回响提前，剧情页会更像“资料卡”，而不是“刚刚做完这一步之后的余波”。
- 若移除兜底回响，前期会出现空面板。

## 6. 公式

### 6.1 战斗收益公式

```text
attackBonus = battleWill * 2
defenseBonus = floor(battleWill / 2)
hpBonus = battleWill * 6
```

### 6.2 负面触发公式

```text
displayTribulation = min(nextTribulation, 42)
triggerDeath = nextTribulation > 42
```

### 6.3 当前 HP 处理语义

```text
newMaxHp = baseMaxHp + battleWillBonus + otherBonuses
currentHp = 按旧血量比例折算到 newMaxHp，不额外回满
```

### 6.4 剧情页排序语义

```text
echoes = [recentChoiceOutcome, recentChoiceEcho, delayedEchoes, flagEchoes, fallbackEcho]
```

## 7. 终局与失败语义

### 7.1 普通终局

- 条件：choice 自带 `ending`，且本次没有先被劫煞溢出打断。
- 结果：
  - `ending = choice.ending`
  - `storyProgress = -1`
  - `storyCursor.source = 'ending'`

### 7.2 死亡终局

- 条件：`nextTribulation > 42`
- 结果：
  - `ending = createTribulationEnding()`
  - `storyProgress = -1`
  - `storyCursor.source = 'ending'`
  - `recentChoiceOutcome` 仍保留

### 7.3 重开语义

- `resetGame()` 会删除 `xiuxian_save_v2` 并重建 `createInitialState()`。
- 重开不是在旧状态上局部回滚，而是直接重建整局。

## 8. 风险说明

- 最敏感的平衡点是默认 `tradeoff` 三档，其次才是 `battleWill` 上限，再其次才是死亡语义。
- 把死亡语义改成 `>= 42` 的风险最高，因为它会直接改变原本能压线通关的路线。
- 改 `getEchoes()` 顺序的风险不在数值，而在玩家对“因果先后”的理解会被改写。
- 改 `storyProgress` 的数据形态风险很高，因为当前主线已经依赖字符串分支节点。
- 改 `recentChoiceOutcome` 的保留条数会同时影响存档结构、UI 展示与测试快照。

## 9. `battleWill` 参数组调参手册

### 9.1 观测指标

- 中后期平均战斗胜率
- `battleWill` 达到上限的中位剧情节点
- 玩家在第几章后开始觉得“战意继续增长已无意义”
- 高风险路线与低风险路线的战斗体感差距

### 9.2 失真信号

- 多数路线在中期前就封顶
- 玩家在高风险路线中因战斗过强而忽略风险管理
- 低风险路线始终体感不到长期回报

### 9.3 联动参数

- `battleWill` 上限
- `attackBonus = battleWill * 2`
- `defenseBonus = floor(battleWill / 2)`
- `hpBonus = battleWill * 6`
- 默认 `tradeoff` 三档中的 `battleWillGain`

### 9.4 推荐实验方式

- 每次只改一项核心映射公式或上限。
- 保持 `tribulation` 相关参数不变，先看战斗体感变化。
- 固定跑一条低风险线和一条高风险线做人手验证。

## 10. `tribulation` 参数组调参手册

### 10.1 观测指标

- 高风险路线平均死亡率
- 玩家第一次进入“濒临走火入魔”区间的大致章节
- 高风险线成功压线通关的比例
- 玩家是否普遍因为未知死亡压力而过度保守

### 10.2 失真信号

- 多数高风险线在中段前就被强制终结
- 玩家长时间不敢点高风险 choice
- 死亡出现时玩家无法解释自己为何会死

### 10.3 联动参数

- `tribulation` 显示上限
- `tribulation` 死亡语义
- 单次 `tribulationGain` clamp
- 默认三档 `tradeoff` 中的 `tribulationGain`

### 10.4 推荐实验方式

- 不要单独只改显示上限。
- 每次只调一组：阈值语义或 gain 分布，不同时改。
- 高风险线至少测试两种打法：
  - 保守压线
  - 激进堆收益

## 11. 默认 `tradeoff` 参数组调参手册

### 11.1 观测指标

- 三条路线的平均通关率
- 三条路线的平均战意增长速度
- 三条路线的平均劫煞累积速度
- 玩家在同类章节中是否会形成单一优势选法

### 11.2 失真信号

- 魔路成为严格优势解
- 苟修路线长期没有正反馈
- 正道 / Neutral 路线无法形成稳定中档体验

### 11.3 联动参数

- 魔路默认分档
- 苟修默认分档
- 正道 / Neutral 默认分档
- 单次 `battleWillGain` / `tribulationGain` clamp

### 11.4 推荐实验方式

- 优先调整默认三档，不优先改死亡语义。
- 一次只改一条路线的默认分档，保持另外两条不动。
- 每次改动后补做“高风险压线样本”和“低风险主线样本”。

## 12. 回响排序参数组调参手册

### 12.1 观测指标

- 玩家是否能先理解刚刚的数值后果
- 剧情页右侧第一条信息是否稳定对应“最近一次选择”
- 延迟回响是否还能被感知为“过去选择的承接”

### 12.2 失真信号

- 玩家先看到文学性解释，后看到真实结果，导致因果倒置
- 旗标回响挤占即时余波位置
- 前期经常出现空面板或过多重复信息

### 12.3 联动参数

- `getEchoes()` 主排序
- `recentChoiceOutcome` 是否保留
- `recentChoiceEcho` 是否保留
- delayed echoes 的推入顺序和去重语义

### 12.4 推荐实验方式

- 不要在没有明确理由时重排主排序。
- 若必须动排序，先做玩家可解释性审计，再做设计一致性审计。
- 回响排序改动应视为高风险体验改动，而不是普通 UI 文案调整。
