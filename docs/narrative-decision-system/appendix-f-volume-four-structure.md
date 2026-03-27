# 附录 F. 第四卷《风起海外》结构草案

## 1. 目的

本附录用于把第四卷《风起海外》的目标结构固定下来，避免 issue #11 提到的“再别天南、初入星海、虚天残图、虚天殿、旧债回流与南宫婉线第二道关键锁点”继续只停在 issue 或聊天里。

本附录描述的是目标态第四卷结构，不代表当前运行时代码已经完全切换完成。

## 2. 8 章结构

| 新章 ID | 章节名 | `volumeRole` | 当前运行时素材吸收点 | `chapterGoal` | `chapterConflict` | `closureWrites` | `nextReads` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `volume_four_chapter_1` | 初入星海 | `opening` | 当前 `21 初入星海`，并吸收 issue #11 中“再别天南”的离卷余波与异地生存压力 | 把第四卷从“离开天南后要靠什么在乱星海活下去”这一卷级承诺正式立起来 | 韩立已经离开旧战场，却还没有在新的规则、资源和契约秩序里站稳脚跟 | `star_sea_entry_locked`、`tiannan_left_behind` | `star_sea_style_seed`、`overseas_foothold_need` |
| `volume_four_chapter_2` | 海外立足 | `escalation` | 新增运行时章节 `21_star_sea_foothold`，承接 `21` 之后的猎妖 / 跑商 / 苟修落脚方式 | 把“换地图”真正落实为“换活法”，并写明星海立足的第一套方法论 | 在更自由也更赤裸的海上，韩立要决定自己靠哪种姿态换来第一批稳固根基 | `star_sea_style_locked`、`overseas_foothold_built` | `resource_network_entry`、`fragment_map_rumor` |
| `volume_four_chapter_3` | 虚天残图 | `bonding` | 当前 `22 虚天残图` | 把新资源、新规则与新势力真正绑进第四卷主冲突 | 残图不只是机缘，而是会让所有知道它存在的人同时变得危险的门票 | `fragment_map_claimed`、`void_heaven_pressure_started` | `xutian_risk_spread`、`star_sea_reputation_test` |
| `volume_four_chapter_4` | 风声四起 | `reversal` | 新增运行时章节 `22_xutian_rumor`，吸收残图流转后的风声、追杀与错位合作压力 | 让玩家意识到虚天残图真正改变的不是收益上限，而是别人如何提前定义你 | 你还没进虚天殿，名声与风险已经先在海上扩散，连旁人的结盟都开始带着试探 | `xutian_position_exposed`、`star_sea_reputation_written` | `void_heaven_entry`、`alliance_pressure` |
| `volume_four_chapter_5` | 虚天殿前后 | `climax` | 当前 `23 星海飞驰` | 用虚天殿的结盟、夺宝、退路与翻脸，把第四卷核心矛盾真正推到台前 | 真正的考验不是谁修为更高，而是宝物、退路和同盟只能保一部分时，你会不会先把人当代价 | `void_heaven_route_locked`、`alliance_choice_written` | `nangong_stage_two_settlement`、`old_debt_return_window` |
| `volume_four_chapter_6` | 并肩余波 | `fallout` | 新增运行时章节 `23_star_sea_aftermath`，承接虚天殿后的结盟余波、名望与关系后果 | 清算虚天殿之后的人情、旧盟、声名与南宫婉线第二阶段落点 | 南宫婉不再只是大战后的第一阶段回响，而是要在更高层级里重新确认你们是否还会站到一起 | `nangong_bond_stage_two`、`star_sea_aftershock_written` | `mocaihuan_return_window`、`tiannan_return_pressure` |
| `volume_four_chapter_7` | 来信与重访 | `closure` | 当前 `23_mocaihuan_return`，从插章提升为第四卷核心章节 | 把凡俗旧账、墨彩环、旧盟关系与“你不在时别人如何过完这些年”收成可解释状态 | 韩立要回答自己究竟是重新把旧账接回手里，还是只确认旧人安好后继续离开 | `mocaihuan_debt_reframed`、`old_world_cost_acknowledged` | `star_sea_exit_review`、`return_home_trigger` |
| `volume_four_chapter_8` | 星海余波 | `exit` | 新增运行时章节 `23_volume_close`，卷末只负责把主线送往 `24 重返天南` 入口 | 完成第四卷出口，并把声名、旧盟、归乡压力和第五卷入口写清楚 | 走到这里，真正逼你回头的已不是怀旧，而是星海留下的名声、债与必须回应的旧关系 | `volume_four_exit_locked`、`tiannan_return_pressure_written` | `tiannan_return_pressure`、`nangong_bond_stage_two`、`star_sea_reputation_fixed`、`old_world_cost_acknowledged` |

## 3. 当前运行时素材吸收规则

第四卷本轮接入时，默认按以下原则吸收当前运行时素材：

- 当前 `20 再别天南` 继续固定为第三卷第 8 章出口；第四卷只读取它留下的“离卷余波、旧战场后劲与异地生存压力”，不把 `20` 挪回第四卷。
- 当前 `21 初入星海` 只承担第四卷开章，不再独自包办“初入星海 + 海外立足”的两段职责；海外立足必须拆成独立章节。
- 当前 `22 虚天残图` 继续作为第四卷中段核心章节，但残图传开后的风声、追杀、试探与名望压力必须拆成独立反转章节。
- 当前 `23 星海飞驰` 继续承担虚天殿主高潮，但虚天殿后的关系清算、南宫婉第二阶段确认与海上名望余波必须拆成独立 `fallout` 章节。
- 当前 `23_mocaihuan_return` 从“插章·来信与重访”提升为第四卷第 7 章主体，负责承担旧债回流与旧世界成本再确认，不再只作为卷外情绪插章。
- 当前 `24 重返天南` 与 `25 化神飞升` 由第五卷《归乡飞升》正式接管；第四卷只负责把主线送到第五卷入口，不得反向吞并第五卷正文职责。

## 4. 第四卷卷末读取点上限

第四卷卷末只保留以下四类读取点：

1. `tiannan_return_pressure`：为什么星海经历会逼得韩立不得不重新面对天南与旧因果。
2. `nangong_bond_stage_two`：南宫婉线在更高层级下是否完成第二阶段确认。
3. `star_sea_reputation_fixed`：韩立在乱星海留下的是哪种名声、协作气质与风格判断。
4. `old_world_cost_acknowledged`：旧盟、旧债、旧人是否被重新接回，而不是再一次压成背景。

除这四类外，本卷不允许继续拖带新的并列主冲突。

## 5. 当前第四卷设计底线

- 第四卷必须让玩家明确感到“已经离开天南旧战场，进入更自由也更赤裸的海外秩序”，而不是只把 `21 / 22 / 23` 按旧顺序继续平推。
- issue #11 中“并肩之后”的语义必须通过第四卷第 6 章的第二阶段关系清算来承担，不得通过回退第三卷 `18_nangong_return` 边界实现。
- `23_mocaihuan_return` 必须承担真正的卷内 `closure` 职责，不允许继续只写成情绪回响或路过式插章。
- 第四卷卷末必须解释为什么会进入 `24 重返天南`，不允许只靠 `nextChapterId = 24` 来充当出口说明。
