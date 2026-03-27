# 附录 E. 第三卷《魔道入侵》结构草案

## 1. 目的

本附录用于把第三卷《魔道入侵》的目标结构固定下来，避免 issue #10 提到的“试炼、战争、阵营冲突与南宫婉线正式起势”继续只停在 issue 或聊天里。

本附录描述的是目标态第三卷结构，不代表当前运行时代码已经完全切换完成。

## 2. 8 章结构

| 新章 ID | 章节名 | `volumeRole` | 当前运行时素材吸收点 | `chapterGoal` | `chapterConflict` | `closureWrites` | `nextReads` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `volume_three_chapter_1` | 血色禁地 | `opening` | 当前 `14 血色禁地`，并吸收 issue #10 中“禁地前夜”的危险感与资源压迫语义 | 把第三卷从“试炼会改写路数”这一卷级承诺正式立起来 | 韩立已经进场，但还没有决定自己会先保命、先认人还是先夺资源 | `forbidden_ground_rules_locked`、`trial_pressure_started` | `nangong_first_bond`、`foundation_debt_choice` |
| `volume_three_chapter_2` | 情债与筑基 | `escalation` | 当前 `15 情债与筑基` | 回收禁地结果，并把筑基与情债处理方式绑成同一压力节点 | 破境不再只是数值成长，而是你要决定如何背着这笔情债继续走 | `foundation_step_completed`、`nangong_debt_mode_locked` | `li_lineage_pressure`、`old_friend_recall` |
| `volume_three_chapter_3` | 李化元门下 | `bonding` | 当前 `16 李化元门下` | 把门墙、归属与宗门任务代价真正绑进第三卷主冲突 | 韩立开始知道“站进门里”不是拿庇护，而是要连责任与代价一起拿 | `li_lineage_entry_locked`、`sect_duty_pressure_started` | `yan_fort_board`、`feiyu_insert_window` |
| `volume_three_chapter_4` | 燕家堡风云 | `reversal` | 当前 `17 燕家堡风云` | 让韩立第一次被摆上更大的势力棋盘，并感到局势正在失控 | 家族、宗门、魔道势力已经不再允许他只按个人求生逻辑应对 | `yan_fort_position_exposed`、`war_board_revealed` | `war_alignment_test`、`nangong_after_war` |
| `volume_three_chapter_5` | 魔道争锋 | `climax` | 当前 `18 魔道争锋` | 用边境大战和阵营冲突把第三卷核心矛盾真正推到台前 | 正道 / 魔路 / 苟修不再只是路线标签，而要在生死局里给出代价 | `war_route_locked`、`nangong_joint_survival_written` | `nangong_stage_one_settlement`、`mine_deadlock_entry` |
| `volume_three_chapter_6` | 并肩之后 | `fallout` | 当前 `18_nangong_return` | 清算大战之后的人情、亏欠与关系第一阶段落点 | 南宫婉不再只是出场人物，而是终局级关系线的第一道锁点 | `nangong_bond_stage_one`、`war_emotion_aftershock` | `mine_deadlock_entry`、`later_nangong_read` |
| `volume_three_chapter_7` | 灵矿死局 | `closure` | 当前 `19 灵矿死局` | 把大战后的死局、资源伦理与路线气质收成可解释状态 | 韩立必须回答“更稳更快”和“还认不认人”到底谁排前面 | `mine_deadlock_resolved`、`postwar_resource_pressure_written` | `star_sea_exit`、`route_identity_review` |
| `volume_three_chapter_8` | 再别天南 | `exit` | 当前 `20 再别天南` | 完成第三卷出口，并把地图外扩送到第四卷入口 | 离开天南不是简单换地图，而是承认战争、旧债与关系已把他推到新阶段 | `volume_three_exit_locked`、`star_sea_entry_confirmed` | `star_sea_entry`、`nangong_bond_stage_one`、`war_route_locked`、`postwar_resource_pressure` |

## 3. 当前运行时素材吸收规则

第三卷本轮接入时，默认按以下原则吸收当前运行时素材：

- 当前 `14 血色禁地` 继续作为第三卷开章，但要吸收 issue #10 中“血色禁地前夜”的危险感、收益诱因和资源压迫语义；不把 `13 / 13_volume_close` 从第二卷挪回第三卷。
- 当前 `15 情债与筑基`、`16 李化元门下`、`17 燕家堡风云`、`18 魔道争锋` 继续按现有主线顺序接入第三卷核心 8 章。
- 当前 `18_nangong_return` 从“插章·并肩之后”提升为第三卷第 6 章主体，负责承担大战后的 `fallout`，不再只作为情绪奖励回响。
- 当前 `16_feiyu_return` 保留为“卷内插章·旧友重逢”，用于读取第三卷中段的凡俗旧日回声，但不进入第三卷核心 8 章角色序列。
- 当前 `19 灵矿死局` 与 `20 再别天南` 共同负责第三卷后段收口与离卷，不得把 `21~25` 提前平铺成第三卷正文。
- 当前 `21 初入星海`、`22 虚天残图`、`23 星海飞驰 / 来信与重访`、`24 重返天南`、`25 化神飞升` 继续作为后续卷入口资产保留。

## 4. 第三卷卷末读取点上限

第三卷卷末只保留以下四类读取点：

1. `star_sea_entry`：玩家为何会离开天南并进入乱星海。
2. `nangong_bond_stage_one`：南宫婉线第一阶段到底是认下、压住还是错开。
3. `war_route_locked`：大战与灵矿死局之后，正道 / 魔路 / 苟修的价值气质如何被锁定。
4. `postwar_resource_pressure`：大战、矿脉与后撤带来的资源、旧伤和压力如何延续到下一卷。

除这四类外，本卷不允许继续拖带新的并列主冲突。

## 5. 当前第三卷设计底线

- 第三卷必须让玩家明确感到“已经从宗门内低调求生进入大局冲突”，而不是只把第二卷卷末后的章节按旧顺序继续平推。
- `18_nangong_return` 必须承担真正的卷内后果职责，不允许继续只写成大战后的情绪回响。
- `16_feiyu_return` 只能作为第三卷卷内插章读取“凡心未死”的旧友回声，不能抢走第三卷核心反转、高潮或卷末出口。
- 第三卷卷末必须解释为什么要进入乱星海，不允许只靠 `nextChapterId = 21` 来充当出口说明。
