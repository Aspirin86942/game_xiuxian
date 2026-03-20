# Appendix A. 状态矩阵

## 1. 目的

本附录把正文里分散的状态职责压成可审计矩阵，供后续新增机制、章节、回响或 ending 时快速核对。

## 2. 状态写入矩阵

| 事件 | `storyProgress` | `storyCursor` | `chapterChoices` | `routeScores` | `flags` | `npcRelations` | `recentChoiceEcho` | `recentChoiceOutcome` | `storyConsequences` | `ending` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 主线 choice | ✔ | ✔ | ✔ | 可选 | 可选 | 可选 | ✔ | ✔ | ✔ | 可选 |
| 小境界 choice | 可选 | ✔ | ✘ | 可选 | 可选 | 可选 | ✘ | ✔ | ✔ | 可选 |
| 普通结局 | `-1` | `ending` | 保留 | 保留 | 保留 | 保留 | 保留 | 保留 | 已写入 | ✔ |
| 死亡结局 | `-1` | `ending` | 保留 | 保留 | 保留 | 保留 | 保留 | 保留 | 已写入 | ✔ |
| 重开 | 初始值 | 重建 | 清空 | 清空 | 清空 | 清空 | 清空 | 清空 | 清空 | 清空 |

## 3. 状态读取矩阵

| 状态字段 | 被谁读取 | 读取用途 |
| --- | --- | --- |
| `storyProgress` | 主线章节 requirements / 剧情目标提示 / late branch | 决定当前主线入口 |
| `storyCursor` | `getStoryView()` / 剧情页渲染 / ending 渲染 | 决定当前剧情页展示什么 |
| `chapterChoices` | delayed echoes / 后续章节条件 | 承接延迟因果 |
| `routeScores` | 默认 `tradeoff` / 路线摘要 / 部分剧情文本 | 形成路线人格 |
| `flags` | requirements / side echoes / dialogue / endings | 承接细粒度分支 |
| `npcRelations` | 人物侧文本 / side story 展示 | 承接人物关系 |
| `recentChoiceEcho` | `getEchoes()` | 即时叙事回响 |
| `recentChoiceOutcome` | `getEchoes()` / 剧情页分支影响面板 | 即时数值解释 |
| `storyConsequences` | 战斗属性重算 / 路线摘要 / 死亡 ending 文案 | 长期风险收益映射 |
| `ending` | `getStoryView()` / 剧情页 ending 模式 / 重开入口 | 进入终局 UI |

## 4. 单次选择生命周期图

当前单次 choice 的标准生命周期可浓缩为：

1. 进入 `choices` 模式。
2. 校验 choice 存在且资源可支付。
3. 扣除 `costs`。
4. 应用 `effects`。
5. 应用 `tradeoff`。
6. 写入 `recentChoiceOutcome` / `recentChoiceEcho` / 分支状态。
7. 判定死亡 ending 或普通 ending。
8. 若未 ending，则推进下一段 story。

## 5. 使用方式

未来新增机制或扩写章节前，先问：

- 这次改动会写入哪一列。
- 这些列后续会被谁读取。
- 如果只写一列，是否会形成弱接入或伪分支。
