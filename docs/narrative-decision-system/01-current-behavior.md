# 01. 当前实现行为

## 1. 机制目标

截至 `2026-03-27`，当前运行时已经把剧情页右侧收口为“顶部失败压力 + 下方分支影响历史”的可见结构，但它仍不是完整目标态。

当前最重要的现状基线如下：

- 决策输入层：choice 在选前显式揭示承诺类型、可见代价、风险语义、不可执行原因。
- 可见后果层：choice 在选后只向剧情页写入 1 条可见分支影响；失败压力独立显示在顶部。
- 分支记忆层：关键选择写入 `decisionHistory / pendingEchoes / endingSeeds`，其中剧情页主显示优先读取 `decisionHistory`。
- 揭示契约层：终局页优先回指分支影响历史，而不再依赖旧的即时结果摘要。

本文件只记录当前代码已经落地的基线、仍保留的兼容物与尚未完全理想化的差距。

## 2. 术语表

| 当前实现名词 | v2 术语 | 当前含义 / 当前实现说明 |
| --- | --- | --- |
| `branchImpact` | 单次选择的可见分支影响 | choice 归一化后的稳定可见字段，包含 `title / detail / promiseLabel / riskLabel` |
| `decisionHistory` | 分支影响历史 | 当前保留最近 64 次关键 choice，记录承诺、风险、压力增量与 `branchImpactTitle / branchImpactDetail` |
| `pendingEchoes` | 隐藏承接兼容队列 | 仍保留旧延迟后果数据，但当前剧情页主显示忽略它 |
| `chapterChoices` | 历史 choice 索引 | 继续作为旧存档和缺省历史的兼容读取层 |
| `recentChoiceEcho` | 最近一次 choice 兜底锚点 | 仅在缺少 `decisionHistory` 与 `chapterChoices` 时作为最后回退 |
| `recentChoiceOutcome` | 旧结果摘要兼容层 | 仍保留以兼容旧逻辑，但不再承担剧情页主显示职责 |
| `storyConsequences` | 长期后果状态 | 当前结构为 `battleWill / tribulation / pressureTier / pressureTrend` |
| `endingSeeds` | 终局承诺链种子 | 保留最近 4 条终局承诺种子，用于结局回指 |
| `immediateResult / longTermHint / delayedEchoes` | 兼容输入素材 | 仍可作为内容归一化来源，但不再是剧情页最终显示契约 |

## 3. 覆盖范围

当前实现已经覆盖：

- 主线章节与小境界事件统一走新 choice shape。
- 所有 choice 在归一化后都具备：
  - `promiseType / promiseLabel`
  - `riskTier / riskLabel`
  - `visibleCostLabel`
  - `branchImpact`
  - `immediateResult`
  - `longTermHint`
  - `pressureDelta / resolveDelta`
  - `delayedEchoes`
  - `endingSeeds`
- `chooseStoryOption()` 会把 `branchImpactTitle / branchImpactDetail` 写入 `decisionHistory`。
- `getEchoes()` 当前优先根据 `decisionHistory` 生成分支影响列表；旧历史再回退到 `chapterChoices / recentChoiceEcho`。
- 剧情页 `echo-list` 只渲染“标题 + 正文 + 元信息”的分支影响卡，最新一条在最上面。
- `story-pressure` 继续独立显示压力档位与趋势。
- 终局页的关键承诺链优先回指分支影响主题，而不是旧的即时结果摘要。

当前与目标态的关键差距：

- 并非所有成熟 choice 都已完全手写 `branchImpact`；部分内容仍会从旧素材或兜底生成器补齐。
- `pendingEchoes` 仍是旧结构的兼容残留，尚未被重新定义为真正的隐藏承接系统。
- `immediateResult / longTermHint / delayedEchoes` 仍然存在于内容输入层，尚未彻底从作者心智模型中退役。
- 当前运行时已经把 `14 / 15 / 16 / 17 / 18 / 18_nangong_return / 19 / 20` 接为第三卷主链标签；其中 `18_nangong_return` 进入第三卷核心 8 章，`16_feiyu_return` 继续保留为卷内插章。
- 当前运行时已经把 `21 / 21_star_sea_foothold / 22 / 22_xutian_rumor / 23 / 23_star_sea_aftermath / 23_mocaihuan_return / 23_volume_close` 接为第四卷核心 8 章。
- 当前运行时保留 `24 / 25` 作为下一卷入口资产；它们不再被第四卷卷标签吞并，只承担卷外后续主链。

## 4. 状态字段

当前运行时的关键字段如下：

| 字段 | 当前角色 | 当前实现说明 |
| --- | --- | --- |
| `version` | 存档版本 | 当前固定为 `7`，存档键继续沿用 `xiuxian_save_v2` |
| `storyProgress` | 主线推进记忆 | 继续承担章节入口，仍兼容数字章节与字符串插章 |
| `storyCursor` | 剧情播放游标 | 负责 `playing / choices / ending` 三类 UI 视图切换 |
| `chapterChoices` | 旧历史索引 | 保留主线 choice 映射，供兼容回退与旧脚本读取 |
| `decisionHistory` | 可见历史主数据源 | 最近 64 次关键 choice 的承诺链历史，含 `branchImpactTitle / branchImpactDetail` |
| `pendingEchoes` | 隐藏承接兼容队列 | 当前不参与 `echo-list` 构建，但仍保留写入与兼容读取能力 |
| `endingSeeds` | 终局承诺链种子 | 最近 4 条终局种子 |
| `storyConsequences` | 长期后果状态 | `battleWill / tribulation / pressureTier / pressureTrend` |
| `recentChoiceEcho / recentChoiceOutcome` | 最后兜底兼容层 | 仅在历史缺失时协助输出，不再代表主显示契约 |
| `branchImpact` | 单次 choice 的可见文案契约 | 供 `decisionHistory`、剧情页侧栏与终局回顾复用 |
| `ending` | 终局状态 | 普通终局与走火入魔终局统一落在该字段 |

## 5. 结算顺序

当前 `chooseStoryOption()` 的固定顺序为：

1. 校验当前 story、choice 与可执行性。
2. 扣除 `costs` 并应用 `effects`。
3. 更新 `storyConsequences`、`pressureTier`、`pressureTrend`。
4. 写入 `chapterChoices / recentChoiceEcho / recentChoiceOutcome`。
5. 写入 `decisionHistory / pendingEchoes / endingSeeds`，并把分支影响正文留给可见历史使用。
6. 判定失败终局（仅在压力进入 `失控` 时触发）。
7. 判定普通终局。
8. 若未终局，则推进 `storyProgress` 并重建 `storyCursor`。

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
  - 顶部 `story-pressure` 固定显示压力档位与趋势
  - `echo-list` 仅显示分支影响历史，最新一条在最上面
  - 每张分支影响卡只显示 `标题 + 正文 + 元信息`
  - 元信息当前由 `承诺标签 + 风险标签 + 章节来源` 组成
  - `story-ending-chain` 在终局页显示关键承诺链回指
- 选后不再直接显示：
  - `即时结果`
  - `长期提示`
  - `pendingEchoes` 对应的旧延迟回响卡片

当前与目标态的 UI 差距：

- 仍有部分分支影响正文来自旧素材拼接，不是完全手写的成熟文案。
- 旧输入字段还在内容层保留，作者如果只看数据结构，仍有误写回多卡模式的风险。

## 7. 兼容策略

当前兼容策略分为“运行时旧档处理”与“可见历史回退”两层：

- 运行时：
  - `version < 7` 的本地存档在加载时直接判为不支持
  - 页面会提示旧档已失效，并自动重置为新初始状态
  - 导入旧档时直接阻断，不覆盖当前进度
- 内部兼容：
  - `decisionHistory` 缺失时，`getEchoes()` 会回退到 `chapterChoices`
  - 若 `chapterChoices` 也缺失，再回退到 `recentChoiceEcho`
  - 当历史记录缺少 `branchImpactTitle / branchImpactDetail` 时，允许使用兼容兜底生成器补齐
  - `pendingEchoes` 继续保留为历史数据，但不再参与剧情页可见 feed

## 8. 边界与异常

当前已知边界：

- `storyProgress` 仍不是纯数字计数器，插章继续使用字符串 id。
- `decisionHistory` 当前上限为 64 条，不是严格意义上的无限全局历史。
- `pendingEchoes` 仍保留旧窗口结构，但不会在可见层被读取为多张卡。
- `immediateResult / longTermHint / delayedEchoes` 仍存在于内容归一化入口中，继续要求作者和实现者明确它们只是兼容输入，而不是最终显示契约。
- 兼容兜底生成器能避免空白卡，但它不是成熟内容来源；若长期依赖，会让分支影响重新模板化。
- 第一卷附录当前把 `10 太南小会 / 11 升仙令` 记为第一卷出口，而 issue #9 要求第二卷正式承担“散修交易场、升仙令、进入黄枫谷、百药园立足、禁地前夜”这一整段成长闭环；当前运行时已经按第二卷新章节链接管这段顺序，但第一卷规则书与第二卷规则书之间的素材边界仍需显式维护。
- 第三卷卷标签当前只覆盖 `14~20` 与 `18_nangong_return`；`16_feiyu_return` 明确保留为插章。
- 第四卷卷标签当前覆盖 `21 / 21_star_sea_foothold / 22 / 22_xutian_rumor / 23 / 23_star_sea_aftermath / 23_mocaihuan_return / 23_volume_close`；`24 / 25` 继续是卷外后续入口资产。

当前异常处理底线：

- 没有可玩剧情时，剧情页回退到占位文案。
- 资源不足时，choice 按钮禁用且逻辑层再次拦截。
- 旧版存档加载 / 导入时必须提示并阻断。
- 进入终局后，剧情视图固定切换到 `ending` 模式。

若后续实现再次偏离本文件，应同步回写 `02`、`03`、`05`；若仅为实现落地与测试追平，则继续以本文件记录当前运行时事实。
