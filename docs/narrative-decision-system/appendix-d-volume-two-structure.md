# 附录 D. 第二卷《初踏修仙路》结构草案

## 1. 目的

本附录用于把第二卷《初踏修仙路》的目标结构固定下来，避免第二卷继续被旧 `10~16` 章的运行时顺序拖着走。

本附录描述的是目标态第二卷结构，不代表当前运行时代码已经完全切换完成。

## 2. 8 章结构

| 新章 ID | 章节名 | `volumeRole` | 当前运行时素材吸收点 | `chapterGoal` | `chapterConflict` | `closureWrites` | `nextReads` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `volume_two_chapter_1` | 离开旧地 | `opening` | 第一卷出口后续空档、离卷余波 | 建立“旧路已断、新路未稳”的过渡感 | 韩立已经离开七玄门阶段，却还没有真正站稳修仙路 | `leaves_qixuan_behind`、`accepts_new_road_pressure` | `mortal_debt_return`、`tainan_market_entry` |
| `volume_two_chapter_2` | 凡俗旧债未清 | `escalation` | 墨府、嘉元城、墨彩环旧因果回响 | 把凡俗旧债重新纳入第二卷主冲突 | 韩立能继续往前走，但旧人已经替他过完了这些年 | `mortal_debt_reframed`、`mocaihuan_seed_retained` | `scattered_cultivator_world`、`trade_caution` |
| `volume_two_chapter_3` | 太南山与散修交易场 | `bonding` | 当前 `太南小会` 的市集、消息与散修素材 | 建立散修世界的交易、情报与算计规则 | 修仙路不只靠修为，还要先懂资源、消息和风险价码 | `tainan_rules_learned`、`market_contact_seeded` | `token_conflict`、`black_market_route` |
| `volume_two_chapter_4` | 升仙令与修士杀机 | `reversal` | 当前 `升仙令`、太南山暗线与埋伏素材 | 让玩家第一次完整感受修士视角的生死局 | 修仙世界并不比凡俗更讲道理，令牌与资格会直接招来杀机 | `token_conflict_resolved`、`sects_choice_forced` | `yellow_maple_entry`、`survival_style_confirmed` |
| `volume_two_chapter_5` | 进入黄枫谷 | `climax` | 当前 `升仙令` 后半、入宗门桥段 | 完成第二卷的核心身份转换 | 韩立必须决定自己把命和前途暂时交给哪套秩序 | `yellow_maple_identity_locked`、`sect_ladder_started` | `herb_garden_low_start`、`sect_rule_pressure` |
| `volume_two_chapter_6` | 百药园立足 | `fallout` | 当前 `百药园杂役` 的药园、绿瓶、积累素材 | 把宗门内低位立足、绿瓶保密与长期积累写成稳定节奏 | 韩立要在不起眼的位置攒根基，同时避免过早暴露自己 | `herb_garden_foundation_built`、`green_bottle_hidden_again` | `forbidden_ground_eve`、`foundation_prep_ready` |
| `volume_two_chapter_7` | 宗门人际与禁地前夜 | `closure` | 当前 `血色禁地前夜` 的门内躁动、同门试探、禁地氛围素材 | 把宗门规则、人际位置与禁地压力合并成卷内闭环 | 韩立终于站稳修仙第一层台阶，但也必须承认自己已进入更残酷的圈层 | `sect_position_established`、`forbidden_ground_ready` | `volume_two_exit`、`third_volume_entry` |
| `volume_two_chapter_8` | 卷末收束 | `exit` | 当前禁地前夜后的卷末解释层 | 明确第二卷为什么到这里结束，以及第三卷从哪里开始 | 玩家已经真正踏上修仙路，但仍未学会怎样处理人情、旧债与更高层级的杀局 | `volume_two_exit_locked`、`third_volume_hooks_registered` | `forbidden_ground_entry`、`foundation_prep_ready`、`mortal_debt_carryover`、`sect_identity_locked` |

## 3. 当前运行时素材吸收规则

第二卷本轮接入时，默认按以下原则吸收当前运行时素材：

- 当前 `10 太南小会`、`11 升仙令` 的散修市场、令牌与宗门选择素材，转为第二卷中段的成长与反转内容。
- 当前 `12 百药园杂役` 的药园、绿瓶保密与低位积累素材，转为第二卷第 6 章主体。
- 当前 `13 血色禁地前夜` 的门内躁动、结队气氛与禁地压力素材，转为第二卷第 7 章主体。
- 当前 `14 血色禁地`、`15 情债与筑基`、`16 李化元门下` 不再算作第二卷正文，而是在第二卷卷末后作为第三卷临时入口资产保留。

## 4. 第二卷卷末读取点上限

第二卷卷末只保留以下四类读取点：

1. `forbidden_ground_entry`：玩家为何会进入血色禁地这一卷。
2. `foundation_prep_ready`：筑基前置资源、药园积累与修炼准备是否到位。
3. `mortal_debt_carryover`：墨府、墨彩环等凡俗旧债还剩哪一种明确因果。
4. `sect_identity_locked`：黄枫谷内的立足方式、门内评价与生存姿态。

除这四类外，本卷不允许继续拖带新的并列主冲突。

## 5. 当前第二卷设计底线

- 第二卷必须让玩家感受到“世界变大了”，而不是只看见地图从七玄门换成黄枫谷。
- 第二卷的主冲突是“如何真正站稳修仙路的第一层台阶”，不是“直接打完第三卷前半”。
- 墨彩环与凡俗旧债只能作为第二卷压力与人格底色来源，不能重新膨胀成独立长主线。
- 卷末必须明确写出为什么下一卷会进入血色禁地，而不是简单把 `nextChapterId` 指过去。
