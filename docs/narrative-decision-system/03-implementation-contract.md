# 03. 实现契约

## 1. 目的

本文件写给未来按理想化叙事决策系统 v2 落地的人。

重点不是规定某个函数名必须叫什么，而是保护以下语义：

- 卷结构
- 章节角色
- 选前揭示
- 单条 `branchImpact`
- 卷末收束
- 跨卷读取点

## 2. 代码入口

当前实施入口仍在以下文件：

- `D:\Program_python\game_xiuxian\story-data.js`
- `D:\Program_python\game_xiuxian\game-core.js`
- `D:\Program_python\game_xiuxian\game.js`

说明：

- 这些文件是当前运行时入口，不代表它们的现有字段名就是最终稳定契约。
- 稳定契约优先保护“语义层”，尤其是卷结构与章节角色。

## 3. 稳定数据契约

### 3.1 主线卷契约

未来每一卷主线最少要能稳定表达：

- `volumeId`
- `volumeTitle`
- `volumePromise`
- `volumeExit`
- `maxForwardHooks`

其中：

- `volumePromise` 用于回答“这一卷从什么问题开始”。
- `volumeExit` 用于回答“这一卷为什么必须继续往前走”。
- `maxForwardHooks` 用于限制跨卷未收束尾巴数量。

### 3.2 主线章节契约

未来每章主线最少要能稳定表达：

- `volumeId`
- `volumeRole`
- `chapterGoal`
- `chapterConflict`
- `closureWrites`
- `nextReads`

字段含义：

- `volumeRole`：本章在卷内承担的角色，当前成熟卷统一使用 `opening / escalation / bonding / reversal / climax / fallout / closure / exit`。
- `chapterGoal`：本章希望推进什么，不是摘要复述。
- `chapterConflict`：本章最核心的矛盾点。
- `closureWrites`：本章会写入哪些卷内收束痕迹。
- `nextReads`：后续哪些章节、支线或终局会读取本章结果。

旧章节定义在过渡期允许缺少这些字段，但新卷结构资产不允许缺失。

### 3.3 choice 契约

未来实现必须继续稳定表达：

- `promiseType / promiseLabel`
- `riskTier / riskLabel`
- `visibleCostLabel`
- `branchImpact.title`
- `branchImpact.detail`
- 分支记忆写入
- 隐藏承接或终局种子

`branchImpact` 负责记录“你做了什么”。

`closureWrites` 负责记录“这一章为卷末收住了什么”。

两者不能互相替代。

### 3.4 跨卷读取点契约

跨卷允许保留的只应是：

- 明确登记的 `nextReads`
- 明确登记的终局种子
- 明确登记的关系或旧账读取点

不允许把整段未解释的可见剧情、未结算支线或大串临时 flags 原样拖进下一卷。

## 4. 稳定流程契约

### 4.1 卷级流程顺序

未来实现必须遵守的最低顺序：

1. 先通过 `opening` 章立题。
2. 通过 `escalation` 章加压并扩张局势。
3. 通过 `bonding` 章把人物、人情或门内关系真正绑进卷内冲突。
4. 通过 `reversal` 章改变玩家对本卷冲突的理解。
5. 通过 `climax` 章解决本卷核心矛盾。
6. 通过 `fallout` 章清算高潮后的代价、人物与旧账。
7. 通过 `closure` 章明确卷内清账边界。
8. 通过 `exit` 章只保留少量跨卷读取点，并送玩家离卷。

### 4.2 章节内流程顺序

1. 先构造选前承诺、成本、风险语义。
2. 玩家做出选择后，先结算资源与状态变化。
3. 再写入 `branchImpact` 与分支记忆。
4. 再写入 `closureWrites` 与 `nextReads`。
5. 最后才允许判定卷末出口或下一章入口。

### 4.3 第一卷目标映射

第一卷《七玄门风云》的目标结构固定为 8 章，详见 `appendix-c-volume-one-structure.md`。

旧 `0~11` 章映射固定为：

- `0 + 1` -> 新第 1 章 `入门七玄`
- `2` -> 新第 2 章 `神手谷试徒`
- `3` -> 新第 3 章 `门内旧友`
- `4 + 5` -> 新第 4 章 `药童与绿瓶`
- `6` -> 新第 5 章 `夺舍杀局`
- `7` -> 新第 6 章 `遗书与真相`
- `8 + 9` -> 卷内旧账/旧案读取区，不再并列撑成主线尾巴
- `10 + 11` -> 新第 8 章 `升仙路口`

### 4.4 第二卷目标映射

第二卷《初踏修仙路》的目标结构固定为 8 章，详见 `appendix-d-volume-two-structure.md`。

第二卷本轮必须满足：

- 卷末严格止于 `禁地前夜 / 卷末收束`，不提前播放第三卷正文。
- 卷末只保留 `forbidden_ground_entry / foundation_prep_ready / mortal_debt_carryover / sect_identity_locked` 四类读取点。
- 当前运行时中与第二卷主题直接相关的素材，允许被重新编排进新的第二卷章节链。
- 已经写出的 `血色禁地 / 情债与筑基 / 李化元门下` 不作为本轮第二卷正文继续推进，但可在第二卷出口后作为第三卷临时入口资产保留。

### 4.5 第三卷目标映射

第三卷《魔道入侵》的目标结构固定为 8 章，详见 `appendix-e-volume-three-structure.md`。

第三卷本轮必须满足：

- 第三卷起点固定为 `14 血色禁地`，只吸收“禁地前夜”的危险感与压迫语义，不回退第二卷已锁定的 `13 / 13_volume_close` 边界。
- `18_nangong_return` 必须被视为第三卷核心第 6 章 `fallout`，而不是卷外情绪插章。
- `16_feiyu_return` 必须继续保持卷内插章定位，不进入第三卷核心 8 章角色顺序。
- 第三卷卷末只保留 `star_sea_entry / nangong_bond_stage_one / war_route_locked / postwar_resource_pressure` 四类读取点。
- 当前运行时中的 `21~25` 只作为后续卷入口资产保留，不得在本轮被平铺回第三卷正文。

### 4.6 第四卷目标映射

第四卷《风起海外》的目标结构固定为 8 章，详见 `appendix-f-volume-four-structure.md`。

第四卷本轮必须满足：

- 第四卷起点固定为 `21 初入星海`；issue #11 中“再别天南”的离卷余波只能吸收到第 1 章语义里，不回退第三卷已锁定的 `20` 边界。
- 新增 `21_star_sea_foothold / 22_xutian_rumor / 23_star_sea_aftermath / 23_volume_close` 四段运行时章节，用于把海外立足、风声扩散、虚天殿余波与卷末出口拆成可审计链路。
- `23_mocaihuan_return` 必须被视为第四卷核心第 7 章 `closure`，而不是卷外插章。
- 第四卷卷末只保留 `tiannan_return_pressure / nangong_bond_stage_two / star_sea_reputation_fixed / old_world_cost_acknowledged` 四类读取点。
- 当前运行时中的 `24 / 25` 只作为下一卷入口资产保留，不得在本轮被平铺回第四卷正文。

### 4.7 当前旧约束中被明确放弃的部分

- 不再接受“后面还有很多事要写”作为卷末没收住的理由。
- 不再接受“拿到关键道具/令牌”就算卷末完成。
- 不再接受把 `fallout` 和 `exit` 写成四五章平铺事件。
- 不再接受支线在卷末继续以未解释的可见状态悬挂。

## 5. 稳定 UI 契约

### 5.1 选前必须可见

- 选项文案
- 承诺类型
- 风险语义
- 可见成本或机会成本
- 不可执行时的阻断原因

### 5.2 选后必须可见

- 恰好 1 条 `branchImpact`
- 当前失败压力所处区间与趋势
- 必要的章节/卷内元信息

### 5.3 卷末必须可见

- 本卷核心冲突已经完成哪种收束
- 本卷保留了哪些明确跨卷读取点
- 玩家是因为什么离开这一卷，而不是只是“下章可玩”

## 6. 禁止项

1. 不能让单条 `branchImpact` 承担卷末收束的全部职责。
2. 不能在 `exit` 章继续大规模引入新的同级冲突。
3. 不能把本卷需要收的旧账都推成下卷问题。
4. 不能只新增章节摘要，不新增 `closureWrites / nextReads`。
5. 不能让支线以未解释的 `available / active` 状态跨卷存活。
6. 不能只改运行时代码而不回写规则书。

## 7. 可改项

- 章节标题
- 章节内部 beats 的具体写法
- 风险文案
- 分支影响措辞
- `nextReads` 的具体命名

- 第二卷各章具体标题，只要不改变 8 章角色顺序与卷末边界
- 第二卷每章吸收当前运行时旧素材的具体方式，只要 `closureWrites / nextReads` 仍完整可审计
- 第三卷各章具体标题，只要不改变 8 章角色顺序、`16_feiyu_return` 插章边界与卷末出口定义
- 第三卷每章吸收当前运行时旧素材的具体方式，只要 `18_nangong_return` 的 `fallout` 职责与 `20` 的 `exit` 职责仍完整可审计
- 第四卷各章具体标题，只要不改变 8 章角色顺序、`23_mocaihuan_return` 核心章节定位与 `24` 的后续卷入口定义
- 第四卷每章吸收当前运行时旧素材的具体方式，只要新增四段中间章节仍完整承担“海外立足 / 风声扩散 / 虚天殿余波 / 卷末出口”职责

但以下项目已锁定，不应在本轮自由漂移：

- 第一卷固定为 8 章
- 第一卷卷末最多保留 3 个跨卷读取种子
- 旧 `8/9` 不再作为并列主线尾章
- 当前成熟卷的 `volumeRole` 枚举固定为 8 项
- 第二卷固定为 8 章
- 第二卷卷末固定止于禁地前夜后的卷末收束
- 第二卷旧档剧情进度本轮不做兼容保留，使用显式版本断点阻断
- 第三卷固定为 8 章
- 第三卷起点固定为 `14 血色禁地`
- `16_feiyu_return` 不进入第三卷核心 8 章
- 第三卷卷末固定由 `20 再别天南` 送往后续卷入口
- 第四卷固定为 8 章
- 第四卷起点固定为 `21 初入星海`
- `23_mocaihuan_return` 必须进入第四卷核心 8 章
- 第四卷卷末固定由 `23_volume_close` 送往 `24 重返天南`
- `24 / 25` 不进入第四卷核心 8 章

## 8. 最低测试契约

### 8.1 文档校验

- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook.py --root D:\Program_python\game_xiuxian\docs\narrative-decision-system`
- `python C:\Users\Aspir\.codex\skills\rulebook-author\scripts\validate_rulebook_series.py --root D:\Program_python\game_xiuxian\docs --series-dir rulebook-series`

### 8.2 代码接入后必须补齐的断言

- 第一卷 8 章结构在静态数据中存在唯一映射。
- 旧 `0~11` 章全部被映射到“保留主线 / 合并 / 下放支线”。
- 第一卷卷末不再出现未收束的并列主线尾巴。
- 第一卷支线在卷末前必须进入可解释的结果态或主线回收态。
- 旧存档 `storyProgress = 8/9/10/11` 不会卡死或重复结算。
- 第二卷 8 章结构在静态数据中存在唯一映射。
- 第二卷卷末读取点数量与类型符合附录 D 约束。
- 第二卷主线不会提前播放 `血色禁地 / 情债与筑基 / 李化元门下` 正文。
- 第二卷旧档剧情进度会被版本断点显式阻断，而不是半兼容进入中段。
- 第三卷 8 章结构在静态数据中存在唯一映射。
- `14 / 15 / 16 / 17 / 18 / 18_nangong_return / 19 / 20` 会稳定显示第三卷章标签。
- `16_feiyu_return` 会继续显示插章标签，不会被误算进第三卷核心 8 章。
- 第三卷卷末 `20` 会把主线送往 `21`，且不会继续停留在第三卷标签上。
- 第四卷 8 章结构在静态数据中存在唯一映射。
- `21 / 21_star_sea_foothold / 22 / 22_xutian_rumor / 23 / 23_star_sea_aftermath / 23_mocaihuan_return / 23_volume_close` 会稳定显示第四卷章标签。
- `23_mocaihuan_return` 不再显示插章标签，而会稳定显示第四卷第 7 章标签。
- 第四卷卷末 `23_volume_close` 会把主线送往 `24`，且不会继续停留在第四卷标签上。

### 8.3 自动化命令

- `npm run test:smoke`
- `npm run test:e2e`
- `npm test`

## 9. 变更分级

### 9.1 A 级：卷结构重定义

包括但不限于：

- 改变一卷的章数
- 改变章节角色顺序
- 改变卷末出口定义
- 改变旧章节是否下放支线

要求：

- 先改规则书
- 必须更新对应卷附录
- 必须同步补兼容测试

### 9.2 B 级：章节契约调整

包括但不限于：

- 新增或删除 `closureWrites / nextReads`
- 调整某章的 `volumeRole`
- 调整跨卷读取点数量上限

### 9.3 C 级：内容扩写

包括但不限于：

- 新增 beats
- 调整文案
- 细化 `branchImpact`
- 细化卷末回指

## 10. 设计验收

### 10.1 玩家可解释性审计

- 玩家能否说出这一卷是如何开始、如何翻转、如何结束。
- 玩家能否说出自己为什么被送到下一卷。

### 10.2 设计一致性审计

- 支线是否服务卷主题而不是抢卷末出口。
- `branchImpact` 是否只负责记录选择，而不是替代卷末解释。
- 旧账是否被清楚地分成“本卷清掉”和“跨卷读取”两类。

### 10.3 资产接入质量审计

- 新章节是否声明了 `volumeRole / chapterGoal / chapterConflict / closureWrites / nextReads`。
- 是否通过对应卷映射检查。
- 是否通过伪分支检查。
