# 02. 参数与公式

## 1. 说明

本文件记录支线任务系统当前可验证阈值、未来推荐参数、触发公式、观测指标与联动风险。

说明：

- `当前值` 只写当前代码中已经能从 `getAvailableSideStories(state)` 或现有 UI 观察到的事实。
- `未来推荐` 表示正式任务系统落地时建议采用的稳定契约，不代表当前已经实现。
- 本册不直接决定原著剧情顺序，只定义“如何把骨架转成任务系统”的参数口径。

## 2. 核心阈值

| 参数名 | 当前值 | 作用 | 调大后的影响 | 调小后的影响 | 风险 | 允许调整范围 |
| --- | --- | --- | --- | --- | --- | --- |
| 线索去重键 | `title` | 防止同一轮推导里重复出现同名线索 | 更细粒度去重会保留更多相近线索 | 更粗粒度去重会误吞不同任务 | 标题命名一旦不稳定，历史线索容易互相覆盖 | 仅建议在正式任务 ID 稳定后调整 |
| 墨府旧账窗口 | `storyProgress >= 8` | 七玄门/墨府旧案开始显性化 | 更晚触发会削弱旧账存在感 | 更早触发会抢在主线认知之前剧透 | 主线情绪节奏被打乱 | 建议维持在 8~10 |
| 曲魂旧案窗口 | `storyProgress >= 9` 且需曲魂相关旗标 | 将“曲魂问题”从主线后果延长为旁支线索 | 更晚会让旧案断裂 | 更早会与主线揭示重叠 | 世界观揭示顺序混乱 | 建议维持在 9~11 |
| 禁地余波窗口 | `storyProgress >= 14` | 把血色禁地选择沉淀为长期名声线索 | 更晚会弱化禁地重量 | 更早会压住禁地当章反馈 | 早期信息过载 | 建议维持在 14~16 |
| 灵矿余波窗口 | `storyProgress >= 19` 且需灵矿相关旗标 | 让任务后果从当章生死局延长到幸存者叙事 | 更晚会削弱“你被人记住”的感觉 | 更早会挤占主线逃离段 | 主线与支线争夺注意力 | 建议维持在 19~21 |
| 星海合作窗口 | `storyProgress >= 21` | 提前建立乱星海的人情/利益支线空间 | 更晚会让星海显得只剩主线 | 更早会削弱天南收束感 | 区域转换层次混乱 | 建议维持在 21~22 |
| 残图余波窗口 | `storyProgress >= 22` 且需残图相关旗标 | 把虚天残图从一次争图变成长期风险源 | 更晚会削弱风险延迟到账感 | 更早会把残图影响说得过满 | 玩家会感觉被反复重复同一件事 | 建议维持在 22~24 |
| 占位线索开关 | `true` | 当没有线索时仍保持线索区存在感 | 永久展示会增加噪声 | 关闭后界面容易留白 | 玩家误以为系统坏了或没有支线设计 | 建议保持开启 |
| 当前展示字段 | legacy 线索为 `title + detail`；正式支线为 `title + detail + category + state + rewardPreview + inline actions/results` | 让同行回响区同时承担退化线索层与 v1 正式支线层 | 继续加字段会挤压 375x667 的单屏空间 | 再减少字段会让正式支线失去可解释性 | 当前容器共用一列卡片，字段过多会破坏单屏体验 | v1 之后若继续扩写，需先补专门任务页或更强分组 |
| v1 可接取窗口下界 | `availableFromProgress` | 定义任务何时可从 `locked` 进入 `available` | 更晚会让支线显得总在事后补票 | 更早会剧透主线余波 | 主线与支线边界失真 | 必须显式逐任务定义 |
| v1 可接取窗口上界 | `availableToProgress` | 定义任务何时还能被接取 | 更晚会让旧账失重且难以错过 | 更早会让玩家来不及处理 | 错过判定随意漂移 | 必须显式逐任务定义 |
| v1 错过判定 | `storyProgress > availableToProgress` 且未接取 | 把“没接”与“接了但没做完”区分开 | 放宽会削弱窗口压力 | 收紧会让支线显得苛刻 | `missed` 与 `failed` 语义混淆 | v1 固定使用该规则 |
| v1 失败判定 | 已接取，且命中显式 `failCondition` 或超过窗口仍未结算 | 定义任务从 `active` 转入 `failed` | 放宽会让失败几乎不发生 | 收紧会让轻量支线太惩罚 | 与 `missed` 混写后无法稳定测试 | v1 只允许少量任务使用 |
| v1 deadline 口径 | 仅 `storyProgress` 窗口 | 避免引入真实时间或复杂倒计时 | 改成时间会大幅增加存档和 UI 复杂度 | 无 | 若偷偷混入时间逻辑，会破坏兼容和可测性 | v1 固定不用时间 |

## 3. 公式

### 3.1 当前线索可见公式

当前可见逻辑可以抽象为：

```text
VisibleClue = ProgressGate AND OptionalFlagGate AND OptionalRelationGate AND NotDuplicateByTitle
```

其中：

- `ProgressGate`：`storyProgress` 是否达到章节窗口
- `OptionalFlagGate`：是否命中特定 `flags`
- `OptionalRelationGate`：是否命中特定 `npcRelations`
- `NotDuplicateByTitle`：同名线索只保留一条

### 3.2 未来正式任务推荐公式

未来正式任务系统建议遵守：

```text
QuestStateTransition =
  locked
  -> available      (triggerCondition satisfied)
  -> active         (player accepts OR implicit activation rule)
  -> completed      (successCondition satisfied)
  -> failed/missed  (failCondition or deadlineCondition satisfied)
```

### 3.3 v1 窗口与失败公式

v1 的正式任务必须落到可直接编码的窗口语义：

```text
available = triggerCondition satisfied
            AND storyProgress >= availableFromProgress
            AND storyProgress <= availableToProgress
            AND state is locked

missed = state is locked or available
         AND storyProgress > availableToProgress

failed = state is active
         AND (
           explicit failCondition satisfied
           OR storyProgress > availableToProgress
         )

completed = state is active
            AND player resolves one quest choice
```

说明：

- v1 是单段式支线，`active -> completed` 由一次支线抉择直接触发。
- `missed` 专指“从未真正接取就跨过窗口”。
- `failed` 专指“已经接取，但没有在窗口内完成，或被明确对立条件打断”。
- v1 不允许把 `missed` 伪装成 `failed`，也不允许把 `failed` 静默回退为 `locked`。

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
- 线索去重正确率：同轮计算时是否因为标题碰撞误吞不同支线。
- 支线密度：单个章节窗口内建议同时显性的支线不要多于 3 条，否则正式任务 UI 很难保持 375x667 的单屏可用性。
- 任务转化率：未来正式任务上线后，`available -> active -> completed` 的比例应可被追踪，而不是只知道“线索出现过”。
- 错过率：未来 v1 任务的 `available -> missed` 比例应可追踪，避免窗口窄到几乎必错过，或宽到没有存在感。
- 唯一奖励重复率：未来唯一奖励不应因读档或重复触发被二次结算。

## 5. 联动参数

- `storyProgress`：决定任务窗口与奖励基线。
- `flags`：决定具体旧账、旧情、旧案是否已经被主线写入。
- `npcRelations`：决定“人情线”支线是否值得进入正式任务池。
- `routeScores`：当前线索未直接读取，但未来会决定同类任务的默认 `tradeoff` 与结算偏向。
- `inventory` 与物品系统：未来正式任务奖励进入背包后，持续语义应交给 `inventory-and-item-system`。
- `cultivation-and-expedition-system`：未来战斗支线、探索支线的资源产出与风险收益需要与主循环同步调参。

## 6. 风险说明

- 若只调章节窗口，不同步考虑主线节奏，会导致支线不是过早剧透，就是过晚失重。
- 若标题命名不稳，当前按标题去重的策略会误吞支线线索。
- 若未来任务奖励不按章节窗口分档，早期支线容易过肥，后期支线又会变成只剩情绪价值。
- 若继续在同一容器里叠加更多元信息，却不拆出更强分组或折叠策略，会让 375x667 下的同行回响区变得过密。
- 若 `availableFromProgress / availableToProgress` 不显式写入任务定义，`missed / failed` 会在实现时被拍脑袋解释，破坏规则书驱动开发。
- 若 v1 混入真实时间 deadline，会额外引入时间戳兼容、离线结算和 UI 提示复杂度，不符合本轮最小闭环目标。
- 若原著改写没有敏感边界，任务池会和当前项目口径冲突，破坏系列文档的一致性。
