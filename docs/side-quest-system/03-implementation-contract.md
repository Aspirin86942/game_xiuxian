# 03. 实现契约

## 1. 目的

本文件写给未来要按支线任务系统规则书改代码的人。

重点是保护以下语义：

- 任务窗口
- 任务状态
- 任务与主线卷结构的边界
- 任务卷末去向
- 任务奖励与后续读取点

## 2. 代码入口

- `D:\Program_python\game_xiuxian\game-core.js`
- `D:\Program_python\game_xiuxian\game.js`
- `D:\Program_python\game_xiuxian\story-data.js`
- `D:\Program_python\game_xiuxian\tests\story-smoke.js`
- `D:\Program_python\game_xiuxian\tests\e2e\story.spec.js`

## 3. 稳定数据契约

未来正式任务系统至少需要能稳定表达以下语义；字段名可以调整，但语义不能静默消失：

- `id`
- `title`
- `category`
- `volumeAnchor`
- `triggerCondition`
- `acceptCondition`
- `failCondition`
- `successCondition`
- `rewards`
- `branchEffects`
- `closureMode`
- `followupHook`

### 3.1 新增稳定字段

- `volumeAnchor`
  - 表示这条任务服务哪一卷。
  - 第一卷固定使用 `volume_one_qixuanmen`。
- `closureMode`
  - 允许值固定为：
    - `volume_close`
    - `seed_forward`
    - `convert_to_main`
- `followupHook`
  - 表示卷末或后续章节如何读取它。
  - 允许是主线章节锚点、关系读取点或跨卷低权重种子。

### 3.2 当前状态枚举

运行时状态枚举继续保持：

- `locked`
- `available`
- `active`
- `completed`
- `failed`
- `missed`

`closureMode` 不替代运行时状态，它只规定卷末如何解释一条支线。

## 4. 稳定流程契约

### 4.1 正常生命周期

1. 先依据 `storyProgress`、`flags`、`npcRelations` 等条件推导线索。
2. 命中窗口后，任务进入 `available`。
3. 玩家接取后，任务进入 `active`。
4. 玩家达成成功条件时，任务进入 `completed`。
5. 命中失败条件或过期条件时，进入 `failed` 或 `missed`。

### 4.2 卷末生命周期

进入卷末前，任务还必须通过一次卷结构解释：

- `volume_close`
  - 卷末前必须已经进入 `completed / failed / missed`。
- `seed_forward`
  - 卷末前必须已经进入 `completed / failed / missed`，但允许同时登记低权重读取点。
- `convert_to_main`
  - 卷末前必须被主线高潮、尾声或卷末清账章节解释掉，不再以独立任务尾巴悬挂。

### 4.3 第一卷默认

改编第一卷《七玄门风云》固定遵守：

1. 第一卷支线不允许跨卷保持 `active`。
2. 第一卷支线进入卷末时，不允许继续以 `available` 形式可见悬挂。
3. 旧 `8 墨府旧事` 默认走 `volume_close`，旧 `9 曲魂初现` 默认走 `convert_to_main`。
4. 第一卷卷末最多只允许保留少量 `seed_forward` 读取点。

## 5. 稳定 UI 契约

- 当前最小 UI 仍允许 formal quest 与 legacy 线索共存。
- 但卷末不能出现“主线已离卷，第一卷支线仍大面积挂在同行回响区”的情况。
- 支线若被 `convert_to_main`，卷末应优先由主线章节解释其结果，而不是再让任务卡保持中心地位。
- `side quest / task / available / active` 等内部术语可以保留在代码、规则书与测试变量中，但玩家界面必须统一映射为世界观词面。
- 玩家可见层默认使用以下映射：
  - `side quest / 支线任务` -> `旧事`
  - legacy clue -> `旧事线索`
  - `available` -> `可应旧事`
  - 接取动作 -> `应下这桩旧事`
  - 因其他任务阻断 -> `另有旧事未了`
- 若当前没有可接条目，空态文案也应保持世界内口径，例如“暂无旧事上门”，不直接使用“暂无可接支线”。

## 6. 禁止项

1. 不能让支线在关键卷末窗口继续抢断主线。
2. 不能让 `closureMode` 只是文档字段，不影响实现与测试。
3. 不能让任务失败与错过完全没有差异。
4. 不能把一整条旧账挂到下卷，再说“以后会补”。
5. 不能让唯一奖励在兼容映射或重复读档时重复发放。
6. 不能直接把不适配当前项目口径的原著桥段搬进任务正文。
7. 不能把“支线任务 / 任务状态 / 可接任务”这类内部说明词直接作为玩家界面主文案。

## 7. 可改项

- 任务分类命名
- 奖励档位和数值
- 冲突优先级细节
- `followupHook` 的具体命名

但以下项目本轮已锁定：

- 第一卷支线必须绑定 `volume_one_qixuanmen`
- 第一卷卷末不允许未结算任务跨卷
- 第一卷旧账型支线默认优先 `convert_to_main` 或 `volume_close`

## 8. 最低测试契约

### 8.1 文档校验

- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook.py --root D:\Program_python\game_xiuxian\docs\side-quest-system`
- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook_series.py --root D:\Program_python\game_xiuxian\docs --series-dir rulebook-series`

### 8.2 代码接入后必须补齐的断言

- 第一卷支线都带有 `volumeAnchor / closureMode / followupHook` 元数据。
- 第一卷卷末前，支线不会以 `available / active` 继续挂到下一卷。
- `convert_to_main` 任务在卷末可被主线解释，而不是双重展示。
- 旧存档读入后不会重复结算第一卷支线奖励。

### 8.3 自动化命令

- `npm run test:smoke`
- `npm run test:e2e`
- `npm test`

## 9. 变更分级

### 9.1 A 级

- 调整 `closureMode` 语义
- 调整主线/支线优先级
- 调整第一卷卷末回收规则

### 9.2 B 级

- 调整任务分类
- 调整奖励档位
- 调整 `followupHook` 命名

### 9.3 C 级

- 新增任务原型
- 新增卷锚点
- 新增任务读取点

## 10. 设计验收

- 玩家能否解释这条支线为什么会出现、为何值得接、为何会错过。
- 支线是否真的补了卷主题，而不是额外制造拖尾。
- 卷末时，玩家是否还能清楚分辨“这卷已解决什么、只留下什么种子”。
