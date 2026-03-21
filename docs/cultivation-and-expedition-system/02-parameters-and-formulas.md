# 02. 参数与公式

## 1. 说明

本文件记录修炼与游历主循环系统当前可验证的参数、固定的目标态参数、公式、耦合关系与调参风险。

## 2. 核心阈值

| 参数名 | 当前值 | 作用 | 调大后的影响 | 调小后的影响 | 风险 | 允许调整范围 |
| --- | --- | --- | --- | --- | --- | --- |
| `training.lingshi_to_cultivation` | `10` | 每 1 枚灵石转化的修为值 | 修炼更快，游历资源压力下降 | 修炼更慢，刷游历时间增加 | 直接影响主循环长度与章节节奏 | 建议小步调整，优先 `8 ~ 12` |
| `training.batch.1` | `1` | 单次闭关最小批量 | 更高会损失精细控制 | 更低无意义 | 改动会破坏按钮语义 | 保持不变 |
| `training.batch.10` | `10` | 中批量闭关 | 更高会让中期变成大额跳跃 | 更低与单次区别变弱 | 会影响操作节奏 | 建议保持 `10` |
| `training.batch.max` | 语义规则：`min(当前灵石, ceil((maxCultivation - cultivation)/10))` | 一键闭关到当前可达上限 | 更宽松更省操作 | 更严格会增加无效点击 | 错误实现会导致溢出扣费 | 保持公式语义 |
| `expedition.event.battle.weight` | `45` | 游历命中战斗的权重 | 战斗更常见，掉落存在感更高 | 资源事件更常见，战斗存在感下降 | 会改变战斗在主循环中的位置 | 建议 `40 ~ 50` |
| `expedition.event.resource.weight` | `35` | 游历命中资源事件的权重 | 灵石获取更稳定 | 资源节奏更依赖战斗 | 会改变灵石经济稳定性 | 建议 `30 ~ 40` |
| `expedition.event.risk.weight` | `12` | 游历命中风险损耗的权重 | 失败成本更明显 | 主循环更平滑 | 过高会形成挫败感 | 建议 `8 ~ 15` |
| `expedition.event.clue.weight` | `8` | 游历命中线索事件的权重 | 剧情提示更频繁 | 资源导向更强 | 过高会稀释资源效率 | 建议 `5 ~ 10` |
| `expedition.resource.base_reward` | `max(2, ceil(maxCultivation / 80))` | 非战斗资源事件的灵石产出 | 前中后期资源更充裕 | 刷游历次数增加 | 与闭关收益强耦合 | 可与战斗奖励联调 |
| `expedition.battle.win_reward` | `max(3, ceil(maxCultivation / 90))` | 战斗胜利的固定灵石产出 | 战斗收益更高 | 战斗更像纯阻碍 | 会改变战斗价值感 | 建议不低于资源事件 |
| `expedition.battle.loss_ratio` | `floor(win_reward / 2)`，至少 `1` | 战斗失败时灵石损失 | 战斗失败惩罚更重 | 战斗失败代价更轻 | 若过高，会形成恶性循环 | 建议不超过胜利值的一半 |
| `expedition.risk.loss` | `max(1, ceil(maxCultivation / 140))` | 非战斗风险事件的灵石损失 | 风险事件更伤经济 | 风险存在感下降 | 与线索事件频次耦合 | 建议小步调整 |
| `expedition.risk.hp_ratio` | `0.12` | 风险事件扣除的最大气血比例 | 风险事件更危险 | 风险事件更像轻提示 | 过高会挤压战斗表现 | 建议 `0.08 ~ 0.15` |
| `save.min_supported_version` | `6` | 当前可读取的最小存档版本 | 更高会拒绝更多旧档 | 更低会增加迁移成本 | 直接影响导入边界 | 当前固定为 `6` |
| `offline.training` | 已删除 | 主循环中不再提供离线修炼 | 无 | 无 | 不应恢复为隐性成长入口 | 当前禁止恢复 |

## 3. 默认参数分档

- `train-batch-small`：适合精细补满修为差值。
- `train-batch-medium`：适合中段快速闭关，减少重复点击。
- `train-batch-max`：适合在资源足够时一次性把修为推到可达上限。
- `expedition-battle`：产出灵石、掉落与战斗日志，不直接给修为。
- `expedition-resource`：稳定补充灵石，作为闭关燃料入口。
- `expedition-risk`：提供轻度资源与气血惩罚，避免游历只有正收益。
- `expedition-clue`：提供剧情或目标提示；若当前无有效线索，则回退为资源事件。

## 4. 公式

```text
remainingCultivation = max(0, maxCultivation - cultivation)

maxTrainableStones = min(inventory.lingshi, ceil(remainingCultivation / training.lingshi_to_cultivation))

actualTrainingBatch = {
    "1": min(1, maxTrainableStones),
    "10": min(10, maxTrainableStones),
    "max": maxTrainableStones
}[batchKey]

trainingGain = actualTrainingBatch * training.lingshi_to_cultivation

resourceReward = max(2, ceil(maxCultivation / 80))

battleReward = max(3, ceil(maxCultivation / 90))

riskLoss = max(1, ceil(maxCultivation / 140))

battleLoss = min(inventory.lingshi, max(1, floor(battleReward / 2)))
```

## 5. 观测指标

- 玩家是否能在不看文档的情况下理解“先游历拿灵石，再闭关涨修为”。
- 同一小境界是否大致需要 `6 ~ 10` 次成功游历才能攒满一次突破所需修为。
- 战斗与资源事件的体感是否都有存在感，而不是其中一类完全沦为噪音。
- 灵石是否仍能支撑剧情 choice 的支付需求，而不会被闭关消耗完全挤压。
- 完整导出 / 导入是否仍可用，且不会误导玩家以为存在平衡可信承诺。

## 6. 失真信号

- 玩家最优动作重新退化成“只点修炼按钮，不想游历”。
- 战斗胜利若继续直接给修为，说明旧主循环残留未清干净。
- 灵石再次在背包里直接吸收，说明修炼入口语义失守。
- 风险事件几乎不发生或代价过高，都会让游历节奏失真。
- 设置页仍然沿用“导出存档但默认可信”的暗示，说明单机边界未说明清楚。

## 7. 联动参数

- `training.lingshi_to_cultivation` 与所有游历灵石产出参数强耦合。
- `training.lingshi_to_cultivation` 与剧情中 `lingshi` 代价强耦合。
- `expedition.event.*.weight` 与战斗存在感、资源稳定性、剧情提示频次强耦合。
- `battleReward` 与怪物掉落表、丹药价值、装备掉落体验强耦合。
- `save.min_supported_version` 与导入/导出文案、测试夹具、旧档行为强耦合。

## 8. 推荐实验方式

- 先用 smoke 测试验证状态勾稽，再用 e2e 观察 375x667 视口下交互是否顺手。
- 调整闭关倍率时，优先重放“游历 → 闭关 → 突破”的完整链路，而不是只看单次闭关结果。
- 调整事件池权重时，至少做一轮固定随机种子回归，确认战斗、资源、损耗、线索都能被命中。
- 调整战斗失败代价时，优先验证不会把 `inventory.lingshi` 打成负数，也不会把玩家锁死。

## 9. 风险说明

- 哪些参数最敏感：
  - `training.lingshi_to_cultivation`
  - `expedition.event.*.weight`
  - `battleReward`
  - `save.min_supported_version`
- 哪些参数可以优先小步调整：
  - `expedition.risk.hp_ratio`
  - `expedition.risk.loss`
  - `resourceReward`
  - 非关键游历提示文案
