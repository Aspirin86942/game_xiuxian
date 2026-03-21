# 01. 当前实现行为

## 1. 机制目标

截至 `2026-03-21`，理想化叙事决策系统 v2 已完成运行时代码落地。

当前代码已经不再处于“旧按钮文案 + `costs` + 隐藏 `tradeoff` + 最近一次回响”的过渡态，而是进入四层闭环：

- 决策输入层：choice 在选前显式揭示承诺类型、可见代价、风险语义、不可执行原因
- 后果输出层：choice 在选后固定输出即时结果、长期提示、到期延迟回响
- 分支记忆层：关键选择写入 `decisionHistory / pendingEchoes / endingSeeds`
- 揭示契约层：剧情页显示压力档位与趋势，终局页回指关键承诺链

本文件记录的是“当前代码已经实现了什么”，不再以“目标态差距清单”为主。

## 2. 术语表

| 当前实现名词 | v2 术语 | 当前含义 / 当前实现说明 |
| --- | --- | --- |
| `storyProgress` | 主线推进记忆 | 继续承担章节入口，仍兼容数字章节与字符串插章 |
| `storyCursor` | 剧情播放游标 | 负责 `playing / choices / ending` 三类 UI 视图切换 |
| `chapterChoices` | 主线章节决策索引 | 继续作为作者读取层与旧逻辑回退层，不再独自承担核心叙事语义 |
| `decisionHistory` | 关键承诺历史 | 保留最近 12 次关键 choice 的承诺、风险、即时摘要、长期提示、压力增量 |
| `pendingEchoes` | 延迟回响队列 | 保留待兑现的延迟后果，并按 `eligibleFromProgress ~ eligibleToProgress` 窗口显示 |
| `endingSeeds` | 终局承诺链种子 | 保留最近 4 条终局承诺种子，用于结局回指 |
| `storyConsequences` | 长期后果状态 | 当前结构为 `battleWill / tribulation / pressureTier / pressureTrend` |
| `recentChoiceEcho` | 最近一次 choice 锚点 | 仅保留为兼容输出层，不再承担唯一叙事回响职责 |
| `recentChoiceOutcome` | 最近一次结果摘要 | 仅保留为兼容数值输出层，不再承担唯一后果解释职责 |
| `tradeoff` | 默认推导入口 | 仍可作为旧内容的默认推导入口，但不再直接承担 UI 语义 |

## 3. 覆盖范围

当前实现已经覆盖：

- 主线章节与小境界事件统一走 v2 choice shape
- 所有 choice 在归一化后都具备：
  - `promiseType / promiseLabel`
  - `riskTier / riskLabel`
  - `visibleCostLabel`
  - `immediateResult`
  - `longTermHint`
  - `pressureDelta / resolveDelta`
  - `delayedEchoes`
  - `endingSeeds`
- `chooseStoryOption()` 按 v2 顺序结算，并写入四层状态
- 压力系统按 `安全 / 紧绷 / 濒危 / 失控` 四档运行
- 走火入魔只在结算后进入 `失控` 时触发，不再是黑箱随机暴毙
- 剧情页选前展示承诺 / 代价 / 风险 / 禁用原因
- 剧情页选后固定展示“即时结果 → 长期提示 → 到期延迟回响”
- 终局页展示关键承诺链回指，并保留重开 / 导出结局存档入口
- 旧版存档加载时自动重置为新档，导入时阻断并提示

## 4. 状态字段

当前 v2 运行时的关键字段如下：

- `version`
  - 当前固定为 `5`
  - 存档键继续沿用 `xiuxian_save_v2`
- `storyProgress`
  - 继续作为主线入口与章节推进值
- `storyCursor`
  - 记录 `source / storyId / chapterId / beatIndex / mode`
- `chapterChoices`
  - 保留主线 choice 映射，供章节脚本与旧回响读取
- `decisionHistory`
  - 最近 12 次关键 choice 的承诺链历史
- `pendingEchoes`
  - 延迟回响队列；当前不在读取时消费，而是在窗口内持续可见
- `endingSeeds`
  - 最近 4 条终局承诺种子
- `storyConsequences`
  - `battleWill`：长期正向战斗收益
  - `tribulation`：失败压力主值
  - `pressureTier`：当前压力档位
  - `pressureTrend`：当前压力趋势
- `recentChoiceEcho / recentChoiceOutcome`
  - 仍保留，但仅作为兼容输出层
- `ending`
  - 普通终局与走火入魔终局统一落在该字段

## 5. 结算顺序

当前 `chooseStoryOption()` 的固定顺序为：

1. 校验当前 story、choice 与可执行性。
2. 扣除 `costs`。
3. 应用 `effects`。
4. 更新 `storyConsequences`、`pressureTier`、`pressureTrend`。
5. 写入 `chapterChoices / recentChoiceEcho / recentChoiceOutcome`。
6. 写入 `decisionHistory / pendingEchoes / endingSeeds`。
7. 判定失败终局（仅在压力进入 `失控` 时触发）。
8. 判定普通终局。
9. 若未终局，则推进 `storyProgress` 并重建 `storyCursor`。

当前压力分层语义为：

- `安全`：`0 ~ 2`
- `紧绷`：`3 ~ 5`
- `濒危`：`6 ~ 8`
- `失控`：`>= 9`

## 6. UI 揭示

当前 UI 事实：

- 选前可见：
  - 选项文案
  - `promiseLabel`
  - `riskLabel`
  - `visibleCostLabel`
  - 不可执行原因
- 选前不可见：
  - 精确 `battleWillGain`
  - 精确 `tribulationGain`
  - 精确 `battleWill`
  - 精确 `tribulation`
- 选后可见：
  - `echo-list` 第 1 项固定为“即时结果”
  - `echo-list` 第 2 项固定为“长期提示”
  - 第 3 项开始显示到期延迟回响
  - 常驻 `story-pressure` 区块显示压力档位与趋势
  - `story-ending-chain` 在终局页显示关键承诺链回指

补充说明：

- `route-summary` 不再暴露精确失败压力数值
- 终局页保留“重新开始另一条路 / 导出当前结局存档”

## 7. 兼容策略

当前兼容策略已切换为“运行时拒绝旧档，内部工具保留归一化能力”：

- 运行时：
  - `version < 5` 的本地存档在加载时直接判为不支持
  - 页面会提示旧档已失效，并自动重置为新初始状态
  - 导入旧档时直接阻断，不覆盖当前进度
- 内部代码：
  - `mergeSave()` 仍保留宽松归一化能力，便于测试构造状态与内部工具调用
  - `recentChoiceEcho / recentChoiceOutcome / chapterChoices` 仍保留为兼容读取层

## 8. 边界与异常

当前已知边界：

- `storyProgress` 仍不是纯数字计数器，插章继续使用字符串 id
- `pendingEchoes` 当前按窗口显示，但不会在读取后自动标记 `consumed`
- `tradeoff` 仍存在于旧内容入口中，但只用于默认推导，不再承担 UI 语义
- `recentChoiceEcho / recentChoiceOutcome` 仍会继续输出，不能再被误当作唯一叙事真相

当前异常处理底线：

- 没有可玩剧情时，剧情页回退到占位文案
- 资源不足时，choice 按钮禁用且逻辑层再次拦截
- 旧版存档加载 / 导入时必须提示并阻断
- 进入终局后，剧情视图固定切换到 `ending` 模式

若后续实现再次偏离本文件，应同步回写 `02`、`03`、`05`；若仅为实现落地与测试追平，则继续以本文件记录当前运行时事实。
