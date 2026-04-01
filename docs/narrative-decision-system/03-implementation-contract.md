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

### 2.1 当前卷界合同

- 当前仓库采用“改编后的自定义分卷”合同。
- 只借用原著世界观与部分卷名意象，不承诺与原著卷界一一对应。
- 玩家可见卷标签统一使用 `改编第一卷` 到 `改编第五卷`。
- 改编第五卷《归乡飞升》是自定义终局卷，不对应原著第五卷《名震一方》。

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
- 标准卷默认按 8 章结构实现；被附录明确登记为“终局卷”的例外卷，允许压缩为 5 章，但仍必须显式写清 `volumePromise / volumeExit / maxForwardHooks`。

### 3.2 主线章节契约

未来每章主线最少要能稳定表达：

- `volumeId`
- `volumeRole`
- `chapterGoal`
- `chapterConflict`
- `closureWrites`
- `nextReads`

字段含义：

- `volumeRole`：本章在卷内承担的角色；标准卷统一使用 `opening / escalation / bonding / reversal / climax / fallout / closure / exit`，终局卷固定使用 `opening / escalation / bonding / closure / ending`。
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

### 3.4 玩家可见文案契约

以下对象虽然可以由不同字段、函数或渲染器拼出，但语义上属于稳定的玩家可见合同：

- `branchImpact.title / branchImpact.detail`
- 章节 `summary`
- 章节 `beats`
- `getChapterEchoes()` 或同职责接口返回的剧情页回响文本
- 卷章节标题与卷末标题
- `ending.title / ending.description`

这些内容必须满足：

- 可以继续由内部术语驱动实现，但最终落到玩家界面时，必须写成世界观内的叙事表达。
- 不允许把技术语义直接作为显示词面，例如把 `branchImpact`、`closure`、`final branch` 原样展示给玩家。
- 不允许把回响正文写成“资源兑换 / 关系后果 / 情绪奖励”这类系统总结句。

### 3.4.1 晚期叙事词面合同

- `getBlockedMainStoryHint()` 只负责说明门槛与当前可做事项，不再补“主线未断 / 火候未到”桥接句。
- 自动生成的 `visibleCostLabel / longTermHint / endingSeeds.note` 必须写成世界内代价、旧账、风声或门前压力，不能写“这一步会在后续重新照见它”这一类作者总结句。
- `getChapterEchoes()`、晚期章节 closing beats、`ending.description` 必须落在场景、物件、动作、关系压力之一，不得落回“这一章真正留下的是什么”。
- smoke 负责保护：章节正文、echo、blocked hint、ending 描述。
- E2E 至少保护：blocked hint、默认代价、终局页可见文本。
- 两层断言都不允许再混成“最后一句文案”一个断言。

### 3.5 终局契约

未来实现必须继续稳定表达：

- `ending.id`
- `ending.title`
- `ending.description`
- 主终局候选列表
- 异常失败终局抢占规则

其中：

- 主终局候选只允许展示符合条件的正常终局。
- 异常失败终局必须独立判定，不得与主终局共用同一组 choice。
- 终局页必须能回指最近关键分支影响链，不能只靠最后一章改口。

### 3.5 地点委托与主线的边界

- 主线负责卷结构、章节推进、卷末收束与终局回指。
- 地点委托只负责地点横截面、修仙生计与轻量资源选择。
- 地点委托不再承担 `volume_close / seed_forward / convert_to_main` 一类卷末职责。
- 主线章节可以共享地点与场景素材，但不应依赖地点委托结果才能完成解释闭环。

### 3.4 跨卷读取点契约

跨卷允许保留的只应是：

- 明确登记的 `nextReads`
- 明确登记的终局种子
- 明确登记的关系或旧账读取点

不允许把整段未解释的可见剧情、未结算支线或大串临时 flags 原样拖进下一卷。

## 4. 稳定流程契约

### 4.1 标准卷级流程顺序

除被附录明确登记为终局卷的例外卷外，未来实现必须遵守的最低顺序：

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

改编第一卷《七玄门风云》的目标结构固定为 8 章，详见 `appendix-c-volume-one-structure.md`。

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

改编第二卷《初踏修仙路》的目标结构固定为 8 章，详见 `appendix-d-volume-two-structure.md`。

第二卷本轮必须满足：

- 卷末严格止于 `禁地前夜 / 卷末收束`，不提前播放第三卷正文。
- 卷末只保留 `forbidden_ground_entry / foundation_prep_ready / mortal_debt_carryover / sect_identity_locked` 四类读取点。
- 当前运行时中与第二卷主题直接相关的素材，允许被重新编排进新的第二卷章节链。
- 已经写出的 `血色禁地 / 情债与筑基 / 李化元门下` 不作为本轮第二卷正文继续推进，但可在第二卷出口后作为第三卷临时入口资产保留。

### 4.5 第三卷目标映射

改编第三卷《魔道入侵》的目标结构固定为 8 章，详见 `appendix-e-volume-three-structure.md`。

第三卷本轮必须满足：

- 第三卷起点固定为 `14 血色禁地`，只吸收“禁地前夜”的危险感与压迫语义，不回退第二卷已锁定的 `13 / 13_volume_close` 边界。
- `18_nangong_return` 必须被视为第三卷核心第 6 章 `fallout`，而不是卷外情绪插章。
- `16_feiyu_return` 必须继续保持卷内插章定位，不进入第三卷核心 8 章角色顺序。
- 第三卷卷末只保留 `star_sea_entry / nangong_bond_stage_one / war_route_locked / postwar_resource_pressure` 四类读取点。
- 当前运行时中的 `21~25` 只作为后续卷入口资产保留，不得在本轮被平铺回第三卷正文。

### 4.6 第四卷目标映射

改编第四卷《风起海外》的目标结构固定为 8 章，详见 `appendix-f-volume-four-structure.md`。

第四卷本轮必须满足：

- 第四卷起点固定为 `21 初入星海`；issue #11 中“再别天南”的离卷余波只能吸收到第 1 章语义里，不回退第三卷已锁定的 `20` 边界。
- 新增 `21_star_sea_foothold / 22_xutian_rumor / 23_star_sea_aftermath / 23_volume_close` 四段运行时章节，用于把海外立足、风声扩散、虚天殿余波与卷末出口拆成可审计链路。
- `23_mocaihuan_return` 必须被视为第四卷核心第 7 章 `closure`，而不是卷外插章。
- 第四卷卷末只保留 `tiannan_return_pressure / nangong_bond_stage_two / star_sea_reputation_fixed / old_world_cost_acknowledged` 四类读取点。
- 第四卷卷末只负责把主线送往第五卷，不得继续承担第五卷的旧账清算、旧情分流或终局菜单职责。

### 4.7 第五卷目标映射

改编第五卷《归乡飞升》的目标结构固定为 5 章终局卷，详见 `appendix-g-volume-five-structure.md`。

第五卷本轮必须满足：

- 第五卷起点固定为 `24 重返天南`；它不再只是卷外入口资产，而是第五卷第 1 章 `opening`。
- 新增 `24_old_debt_and_name / 24_bond_destination / 25_final_branch` 三段运行时章节，用于把“旧账旧名 / 旧情去处 / 终局分流”拆成可审计链路。
- 当前 `25 化神飞升` 必须降位为第五卷第 4 章 `closure`，只负责飞升前夜的总回看与终局候选汇流，不再直接承担终局菜单。
- 第五卷第 5 章只允许落入以下 6 个终局 ID：`youxi_hongchen / dadao_tongguang / zhiying_xiangdao / xianfan_shutu / chidu_qingtian / zouhuo_rumo`。
- `zouhuo_rumo` 必须作为异常失败终局独立判定，不得混入五条主终局候选列表。
- 第五卷为终局卷，`maxForwardHooks` 固定为 `0`；不允许再把新的并列主冲突或第六卷入口问题拖出本卷。

### 4.8 当前旧约束中被明确放弃的部分

- 不再接受“后面还有很多事要写”作为卷末没收住的理由。
- 不再接受“拿到关键道具/令牌”就算卷末完成。
- 不再接受把 `fallout` 和 `exit` 写成四五章平铺事件。
- 不再接受支线在卷末继续以未解释的可见状态悬挂。
- 不再接受把第五卷终局继续写成“最后一章固定三选一”的旧菜单。

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

### 5.4 玩家词面边界

- `branchImpact / 分支影响` 在玩家界面统一映射为 `因果回响`。
- `side quest / 支线` 在玩家界面统一映射为 `旧事`；若是旧式线索态标签，统一映射为 `旧事线索`。
- 卷末章节若承担“卷内清账后的出口说明”，玩家界面统一使用 `此卷尽处`，不直接显示“卷末收束”。
- 第五卷终局前的最后问心入口，玩家界面统一使用 `门前问心`，不直接显示“终局分流”。
- 以上映射只约束玩家可见层；规则书内部字段名、实现命名与测试内部变量可以保留技术术语。

## 6. 禁止项

1. 不能让单条 `branchImpact` 承担卷末收束的全部职责。
2. 不能在 `exit` 章继续大规模引入新的同级冲突。
3. 不能把本卷需要收的旧账都推成下卷问题。
4. 不能只新增章节摘要，不新增 `closureWrites / nextReads`。
5. 不能让支线以未解释的 `available / active` 状态跨卷存活。
6. 不能只改运行时代码而不回写规则书。
7. 不能让 `branchImpact / side quest / closure / final branch` 等内部术语未经玩家词面映射就直接暴露到界面。

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
- 第四卷各章具体标题，只要不改变 8 章角色顺序、`23_mocaihuan_return` 核心章节定位与 `24` 的第五卷入口定义
- 第四卷每章吸收当前运行时旧素材的具体方式，只要新增四段中间章节仍完整承担“海外立足 / 风声扩散 / 虚天殿余波 / 卷末出口”职责
- 第五卷各章具体标题，只要不改变 5 章角色顺序、`24` 的开章定位、`25` 的飞升前夜定位与 `25_final_branch` 的终局职责
- 第五卷每章吸收当前运行时旧素材的具体方式，只要 `旧账旧名 / 旧情去处 / 飞升前夜 / 终局分流` 的职责仍完整可审计

但以下项目已锁定，不应在本轮自由漂移：

- 第一卷固定为 8 章
- 第一卷卷末最多保留 3 个跨卷读取种子
- 旧 `8/9` 不再作为并列主线尾章
- 标准卷的 `volumeRole` 枚举固定为 8 项；第五卷终局卷例外固定为 5 项压缩角色
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
- 第五卷固定为 5 章终局卷
- 第五卷起点固定为 `24 重返天南`
- 当前 `25 化神飞升` 固定为第五卷第 4 章 `closure`
- 第五卷终局固定为 5 条主终局 + 1 条异常失败终局
- `zouhuo_rumo` 固定为异常失败终局，不进入主终局候选菜单

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
- 第五卷 5 章结构在静态数据中存在唯一映射。
- `24 / 24_old_debt_and_name / 24_bond_destination / 25 / 25_final_branch` 会稳定显示第五卷章标签。
- 第五卷第 5 章只暴露符合条件的主终局，不会把异常失败终局与主终局混在同一组 choice 里。
- `youxi_hongchen / dadao_tongguang / zhiying_xiangdao / xianfan_shutu / chidu_qingtian / zouhuo_rumo` 会稳定写入 `ending.id`。

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
