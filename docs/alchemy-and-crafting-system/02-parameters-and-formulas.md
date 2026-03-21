# 02. 参数与公式

## 1. 说明

本文件记录炼丹、制作与丹药系统的可调参数、阈值、公式、耦合关系与调参风险。

## 2. 核心阈值

| 参数名 | 当前值 | 目标值 | 作用 | 调大后的影响 | 调小后的影响 | 风险 | 允许调整范围 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `juqidan.cultivation` | `220` | `220` | 聚气丹直接提供修为 | 会压过吐纳与妖丹价值 | 会削弱成品丹存在感 | 中 | `180 - 260` |
| `zhujidan.breakthroughBonus` | `0.15` | `0.15` | 中阶突破辅助 | 会压低突破门槛 | 会让丹药存在感不足 | 中 | `0.12 - 0.18` |
| `jiedusan.healRatio` | `0.35` | `0.35` | 基础回血丹的主动恢复量 | 会挤压自然回血与战斗消耗 | 会让回血丹不值材料成本 | 中 | `0.28 - 0.4` |
| `huashendan.breakthroughBonus` | `0.25` | `0.25` | 高阶突破丹的临时提率 | 会让后期突破过稳 | 会无法缓解元婴后期卡顿 | 高 | `0.2 - 0.3` |
| `naturalRecoveryIntervalMs` | `30000` | `30000` | 非战斗回血结算间隔 | 过快会替代回血丹 | 过慢会失去保底意义 | 高 | `20000 - 60000` |
| `naturalRecoveryRatio` | `0.03` | `0.03` | 每跳恢复最大气血比例 | 过高会稀释解毒散价值 | 过低会无法形成保底 | 高 | `0.02 - 0.05` |
| `naturalRecoveryCapRatio` | `0.5` | `0.5` | 自然回血最多恢复到的气血占比 | 过高会让战斗消耗失效 | 过低会让保底体验太硬 | 高 | `0.4 - 0.6` |
| `combatVictoryHpFallbackRatio` | `已移除` | `移除` | 当前胜利后的固定回血比例 | 会进一步抹平消耗 | 降低后更依赖丹药与保底回血 | 高 | 目标态不保留 |
| `combatDefeatHpFallbackRatio` | `0.2` | `0.2` | 当前失败后的保命回血比例 | 过高会让失败成本太低 | 过低会让连续游历断档 | 高 | `0.15 - 0.25` |

## 3. 默认参数分档

- 基础回血丹：优先服务战斗续航，不承担突破语义。
- 基础修为丹：优先服务修为补足，不承担后期关键节点保底。
- 中阶突破丹：服务炼气 / 筑基 / 金丹阶段的准备感，不负责后期卡点。
- 高阶突破丹：只服务元婴及以上的关键突破，不用于前期滚雪球。

## 4. 配方表

| 配方 ID | 产物 | 目标成本 | 解锁条件 | 设计职责 |
| --- | --- | --- | --- | --- |
| `brew-jiedusan` | `jiedusan x1` | `lingcao x2 + lingshi x5` | 默认解锁 | 基础主动回血 |
| `brew-juqidan` | `juqidan x1` | `lingcao x2 + yaodan x1 + lingshi x10` | 默认解锁 | 基础修为补足 |
| `brew-zhujidan` | `zhujidan x1` | `zhujidanMaterial x1 + lingcao x2 + lingshi x20` | 拥有主药时可见 | 中阶突破准备 |
| `brew-huashendan` | `huashendan x1` | `yaodan x3 + lingcao x4 + lingshi x60` | `realmIndex >= 3` | 高阶突破准备 |

## 5. 公式

```text
actualBreakthroughRate
  = min(0.95, breakthroughRate + breakthroughBonus + passiveBreakthroughBonus)

naturalRecoveryTickGain
  = max(1, round(maxHp * naturalRecoveryRatio))

naturalRecoveryCapHp
  = max(1, floor(maxHp * naturalRecoveryCapRatio))

naturalRecoveryTicks
  = floor((nowMs - recovery.lastCheckedAt) / naturalRecoveryIntervalMs)

naturalRecoveryTotalGain
  = min(naturalRecoveryCapHp - currentHp, naturalRecoveryTicks * naturalRecoveryTickGain)

defeatFallbackHp
  = max(1, round(maxHp * 0.2))
```

## 6. 观测指标

- 回血丹是否仍是战后主要主动恢复手段。
- 自然回血是否只把玩家抬到“可继续推进但不舒适”的区间。
- 高阶突破丹是否只显著改善元婴及以上节点，而没有压垮前期节奏。
- 材料掉落是否足以支撑 1 到 2 次常规炼制，但不会让丹药无限泛滥。

## 7. 失真信号

- 玩家几乎不再主动使用 `jiedusan`。
- 玩家在中前期就开始囤高阶突破丹并用它提前抹平成长门槛。
- 战斗失败后仍能几乎无代价立即继续刷怪。
- 材料永远只被当成剧情摆设，配方系统无人触碰。

## 8. 联动参数

- `naturalRecoveryRatio` 与 `jiedusan.healRatio` 强耦合。
- `naturalRecoveryCapRatio` 与战斗胜负后的保命血线强耦合。
- `huashendan.breakthroughBonus` 与 `getBreakthroughActualRate()` 的 `0.95` 上限强耦合。
- 配方成本与怪物掉落表、剧情奖励投放强耦合。

## 9. 推荐实验方式

- 优先小步调整自然回血的间隔和封顶，不先改回血丹效果。
- 若后期突破仍偏卡，优先微调高阶突破丹强度，不先动基础突破率曲线。
- 若丹药泛滥，优先调配方成本或投放来源，不先削弱成品丹效果。

## 10. 风险说明

- 最敏感参数：`naturalRecoveryRatio`、`naturalRecoveryCapRatio`、`huashendan.breakthroughBonus`。
- 可优先小步调整参数：`brew-jiedusan`、`brew-juqidan` 的灵石与材料成本。
- 当前无确切信息：不同剧情段的丹药需求峰值与玩家平均材料库存，需结合后续测试与体验观察补充。
