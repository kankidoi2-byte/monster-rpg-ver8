# 技演出対応一覧

基準 main: 282f774d00e240c599f8542843d7f27a65a49cec。登録200技（旧装備互換を含む）＋通常攻撃＋弱体化互換経路。モンスターの生技配列も全件照合済み。

「演出あり」は技種別の既存CSS演出、「汎用演出」は名前による共通分類または効果別の補助演出。全技専用画像という意味ではありません。弱体化は登録200技・現在の敵技配列には存在せず、既存処理の互換経路として補完。通常攻撃は意図的に簡素な共通打撃（240ms）とします。

| ID | 技名 | 使用元（原技） | 旧対応 | 演出形 | 旧結果→新命中 ms | 全長 ms |
|---|---|---|---|---|---|---|
| skill_freigal_01 | 火炎牙 | フレイガル | 演出あり（技種別） | fang | 400→168 | 400 |
| skill_freigal_02 | フレイムクロー | フレイガル | 演出あり（技種別） | claw | 380→106 | 380 |
| skill_freigal_03 | 爆炎チャージ | フレイガル | 演出あり（技種別） | charge | 460→294 | 460 |
| skill_freigal_04 | フレアチャージ | フレイガル | 演出あり（技種別） | charge | 460→294 | 460 |
| skill_freiwolf_01 | 炎狼牙 | フレイウルフ | 演出あり（技種別） | fang | 400→168 | 400 |
| skill_freiwolf_02 | フレアラッシュ | フレイウルフ | 演出あり（技種別） | charge | 460→294 | 460 |
| skill_freiwolf_03 | 猛火の咆哮 | フレイウルフ | 汎用演出 | buff | 460→221 | 460 |
| skill_aquaron_01 | 水流弾 | アクアロン | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_aquaron_02 | しっぽ打ち | アクアロン | 演出あり（技種別） | tail | 420→143 | 420 |
| skill_aquaron_03 | 大波召喚 | アクアロン | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_aquaron_04 | アクアシールド | アクアロン | 汎用演出 | shield | 500→260 | 500 |
| skill_highaquaron_01（旧装備互換） | 水竜弾 | ハイアクアロン | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_highaquaron_02 | 竜の尾撃 | ハイアクアロン | 演出あり（技種別） | tail | 420→143 | 420 |
| skill_highaquaron_03 | ハイドロスパイラル | ハイアクアロン | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_shenhairon_01 | 神海の爪 | シェンハイロン | 演出あり（技種別） | claw | 380→106 | 380 |
| skill_shenhairon_02 | 蒼竜の咆哮 | シェンハイロン | 演出あり（技種別） | roar | 480→374 | 480 |
| skill_shenhairon_03（旧装備互換） | 海王瀑流 | シェンハイロン | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_tienhairon_01（旧装備互換） | 天海の舞 | ティエンハイロン | 汎用演出 | heal | 500→225 | 500 |
| skill_tienhairon_02 | 月華水刃 | ティエンハイロン | 演出あり（技種別） | blade | 420→344 | 420 |
| skill_tienhairon_03 | 蒼天龍波 | ティエンハイロン | 汎用演出 | wave | 460→368 | 460 |
| skill_grassbeat_01 | リーフカッター | グラスビート | 汎用演出 | blade | 420→344 | 420 |
| skill_grassbeat_02 | 吸収 | グラスビート | 汎用演出 | mystic | 480→264 | 480 |
| skill_grassbeat_03 | 森の一撃 | グラスビート | 演出あり（技種別） | strike | 400→152 | 400 |
| skill_grassbeat_04 | ポイズンニードル | グラスビート | 汎用演出 | projectile | 420→344 | 420 |
| skill_grassbeat_05 | スリープパウダー | グラスビート | 汎用演出 | sleep | 520→218 | 520 |
| skill_grassbeat_06 | トキシックガーデン | グラスビート | 汎用演出 | field | 520→250 | 520 |
| skill_thornbeat_01 | ソーンホーン | ソーンビート | 演出あり（技種別） | horn | 380→144 | 380 |
| skill_thornbeat_02 | 森の甲殻 | ソーンビート | 汎用演出 | guard | 440→211 | 440 |
| skill_thornbeat_03 | スパイクラッシュ | ソーンビート | 演出あり（技種別） | strike | 400→152 | 400 |
| skill_granbeat_01 | グランホーン | グランビート | 演出あり（技種別） | horn | 380→144 | 380 |
| skill_granbeat_02（旧装備互換） | 森王の装甲 | グランビート | 汎用演出 | guard | 440→211 | 440 |
| skill_granbeat_03 | ガイアスラッシュ | グランビート | 演出あり（技種別） | charge | 460→294 | 460 |
| skill_rikasheef_01 | 若葉の突進 | リカシーフ | 演出あり（技種別） | charge | 460→294 | 460 |
| skill_rikasheef_02 | 癒しの芽吹き | リカシーフ | 汎用演出 | heal | 500→225 | 500 |
| skill_rikasheef_03 | リーフスパーク | リカシーフ | 汎用演出 | projectile | 420→344 | 420 |
| skill_seralphia_01（旧装備互換） | 翠翼の突風 | セラルフィア | 汎用演出 | wave | 460→368 | 460 |
| skill_seralphia_02（旧装備互換） | 森精の祝福 | セラルフィア | 汎用演出 | heal | 500→225 | 500 |
| skill_seralphia_03 | セラフィックリーフ | セラルフィア | 汎用演出 | projectile | 420→344 | 420 |
| skill_nightmare_01 | 影打ち | ナイトメア | 汎用演出 | strike | 400→152 | 400 |
| skill_nightmare_02 | 呪いの視線 | ナイトメア | 汎用演出 | mystic | 480→264 | 480 |
| skill_nightmare_03 | 闇の波動 | ナイトメア | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_volteck_01 | 雷つつき | ボルテック | 演出あり（技種別） | beak | 340→129 | 340 |
| skill_volteck_02 | 急降下 | ボルテック | 演出あり（技種別） | charge | 460→294 | 460 |
| skill_volteck_03 | 雷鳴弾 | ボルテック | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_volteck_04 | サンダーボルト | ボルテック | 汎用演出 | lightning | 440→194 | 440 |
| skill_volteck_05 | パラライズショック | ボルテック | 汎用演出 | lightning | 440→194 | 440 |
| skill_volteck_06 | サンダーストーム | ボルテック | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_volteck_07 | ライトニングチェイン | ボルテック | 汎用演出 | lightning | 440→194 | 440 |
| skill_spaquinn_01 | 雷撃 | スパクイン | 汎用演出 | lightning | 440→194 | 440 |
| skill_spaquinn_02 | 突風 | スパクイン | 汎用演出 | wave | 460→368 | 460 |
| skill_spaquinn_03 | スパークダイブ | スパクイン | 演出あり（技種別） | charge | 460→294 | 460 |
| skill_voltax_01 | 雷嵐 | ボルタックス | 汎用演出 | field | 520→250 | 520 |
| skill_voltax_02 | 暴風刃 | ボルタックス | 演出あり（技種別） | blade | 420→344 | 420 |
| skill_voltax_03 | ボルテックストーム | ボルタックス | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_voltax_04 | 疾風迅雷 | ボルタックス | 汎用演出 | charge | 460→294 | 460 |
| skill_icegolem_01 | 氷の拳 | アイスゴーレム | 演出あり（技種別） | fist | 370→215 | 370 |
| skill_icegolem_02 | 守りを固める | アイスゴーレム | 汎用演出 | guard | 440→211 | 440 |
| skill_icegolem_03 | 凍結クラッシュ | アイスゴーレム | 演出あり（技種別） | strike | 400→152 | 400 |
| skill_proto_icegolem_01 | 氷塊拳 | プロトアイスゴーレム | 演出あり（技種別） | fist | 370→215 | 370 |
| skill_proto_icegolem_02（旧装備互換） | 重装防御 | プロトアイスゴーレム | 汎用演出 | guard | 440→211 | 440 |
| skill_proto_icegolem_03 | 大氷河クラッシュ | プロトアイスゴーレム | 演出あり（技種別） | strike | 400→152 | 400 |
| skill_elysia_01 | 光雫弾 | エリシア | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_elysia_02 | 祈りの癒し | エリシア | 汎用演出 | heal | 500→225 | 500 |
| skill_elysia_03 | 希望の光 | エリシア | 汎用演出 | buff | 460→221 | 460 |
| skill_elysia_prayer_01 | 祈光弾 | 光祈の巫女エリシア | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_elysia_prayer_02（旧装備互換） | 聖祈の癒し | 光祈の巫女エリシア | 汎用演出 | heal | 500→225 | 500 |
| skill_elysia_prayer_03 | 光祈結界 | 光祈の巫女エリシア | 汎用演出 | guard | 440→211 | 440 |
| skill_hikari_01 | 聖光の槍 | 光の女神エリシア | 汎用演出 | projectile | 420→344 | 420 |
| skill_hikari_02 | ヒールオーラ | 光の女神エリシア | 汎用演出 | heal | 500→225 | 500 |
| skill_hikari_03 | ジャッジメント | 光の女神エリシア | 汎用演出 | field | 520→250 | 520 |
| skill_nemes_01 | 星屑の牙 | ネメス | 演出あり（技種別） | fang | 400→168 | 400 |
| skill_nemes_02 | 竜のひっかき | ネメス | 演出あり（技種別） | claw | 380→106 | 380 |
| skill_nemes_03 | コスモブレス | ネメス | 演出あり（技種別） | breath | 430→138 | 430 |
| skill_nemes_04 | イリュージョン | ネメス | 汎用演出 | mystic | 480→264 | 480 |
| skill_nemes_05 | ベノムブレス | ネメス | 演出あり（技種別） | breath | 430→138 | 430 |
| skill_nemesia_01 | 星雲の爪 | ネメシア | 演出あり（技種別） | claw | 380→106 | 380 |
| skill_nemesia_02 | 竜星ブレス | ネメシア | 演出あり（技種別） | breath | 430→138 | 430 |
| skill_nemesia_03 | コズミックノヴァ | ネメシア | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_nemesion_01 | 星界の爪 | ネメシオン | 演出あり（技種別） | claw | 380→106 | 380 |
| skill_nemesion_02 | 銀河竜波 | ネメシオン | 汎用演出 | wave | 460→368 | 460 |
| skill_nemesion_03 | アストラルエンド | ネメシオン | 汎用演出 | field | 520→250 | 520 |
| skill_doom_nemesion_01 | 滅星爪 | 滅亡の星 ネメシオン | 演出あり（技種別） | claw | 380→106 | 380 |
| skill_doom_nemesion_02 | 終焉竜波 | 滅亡の星 ネメシオン | 汎用演出 | wave | 460→368 | 460 |
| skill_doom_nemesion_03 | アポカリプスノヴァ | 滅亡の星 ネメシオン | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_elna_beginner_01 | 斬りつけ | 初級剣士エルナ | 演出あり（技種別） | sword | 340→82 | 340 |
| skill_elna_beginner_02 | 見習いの構え | 初級剣士エルナ | 汎用演出 | guard | 440→211 | 440 |
| skill_elna_beginner_03（旧装備互換） | 勇気の一撃 | 初級剣士エルナ | 演出あり（技種別） | sword | 340→82 | 340 |
| skill_elna_middle_01 | 連続斬り | 中級剣士エルナ | 演出あり（技種別） | sword | 340→82 | 340 |
| skill_elna_middle_02（旧装備互換） | 受け流し | 中級剣士エルナ | 汎用演出 | guard | 440→211 | 440 |
| skill_elna_middle_03 | 白刃一閃 | 中級剣士エルナ | 演出あり（技種別） | sword | 340→82 | 340 |
| skill_elna_advanced_01（旧装備互換） | 閃光斬り | 上級剣士エルナ | 演出あり（技種別） | sword | 340→82 | 340 |
| skill_elna_advanced_02 | 剣士の集中 | 上級剣士エルナ | 汎用演出 | buff | 460→221 | 460 |
| skill_elna_advanced_03 | 白銀連斬 | 上級剣士エルナ | 演出あり（技種別） | sword | 340→82 | 340 |
| skill_suiren_01（旧装備互換） | 水霊弾 | 水の精霊スイレン | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_suiren_02 | 癒しの水 | 水の精霊スイレン | 汎用演出 | heal | 500→225 | 500 |
| skill_suiren_03（旧装備互換） | 水鏡の波紋 | 水の精霊スイレン | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_elna_water_01 | 流水斬り | 流水の剣士エルナ | 演出あり（技種別） | sword | 340→82 | 340 |
| skill_elna_water_02 | 水鏡の構え | 流水の剣士エルナ | 汎用演出 | guard | 440→211 | 440 |
| skill_elna_water_03 | 蒼流連閃 | 流水の剣士エルナ | 演出あり（技種別） | sword | 340→82 | 340 |
| skill_slime_01 | たいあたり | スライム | 演出あり（技種別） | body | 440→282 | 440 |
| skill_slime_02（旧装備互換） | ぷるぷる | スライム | 汎用演出 | guard | 440→211 | 440 |
| skill_slime_03（旧装備互換） | スライムアタック | スライム | 演出あり（技種別） | body | 440→282 | 440 |
| skill_slime_gold_01（旧装備互換） | たいあたり | スライムゴールド | 演出あり（技種別） | body | 440→282 | 440 |
| skill_slime_gold_02（旧装備互換） | きんいろボディ | スライムゴールド | 汎用演出 | guard | 440→211 | 440 |
| skill_slime_gold_03（旧装備互換） | ゴールドアタック | スライムゴールド | 演出あり（技種別） | body | 440→282 | 440 |
| skill_goblin_01 | 棍棒攻撃 | ゴブリン | 演出あり（技種別） | club | 420→244 | 420 |
| skill_goblin_02（旧装備互換） | 威嚇 | ゴブリン | 汎用演出 | guard | 440→211 | 440 |
| skill_goblin_03 | 毒の短剣 | ゴブリン | 演出あり（技種別） | dagger | 340→129 | 340 |
| skill_false_dragon_alfa_01 | 虚光砲 | 偽竜 code:alfa | 演出あり（技種別） | beam | 350→84 | 350 |
| skill_false_dragon_alfa_02 | 偽神の爪 | 偽竜 code:alfa | 演出あり（技種別） | claw | 380→106 | 380 |
| skill_false_dragon_alfa_03 | コード・アルファ | 偽竜 code:alfa | 演出あり（技種別） | beam | 350→84 | 350 |
| skill_false_dragon_beta_01 | 断界光 | 偽竜 code:beta | 演出あり（技種別） | beam | 350→84 | 350 |
| skill_false_dragon_beta_02 | 偽竜の翼撃 | 偽竜 code:beta | 演出あり（技種別） | wing | 400→136 | 400 |
| skill_false_dragon_beta_03 | コード・ベータ | 偽竜 code:beta | 演出あり（技種別） | beam | 350→84 | 350 |
| skill_false_dragon_gamma_01 | 虚無光翼 | 偽竜 code:gamma | 演出あり（技種別） | wing | 400→136 | 400 |
| skill_false_dragon_gamma_02 | 偽竜の咆哮 | 偽竜 code:gamma | 演出あり（技種別） | roar | 480→374 | 480 |
| skill_false_dragon_gamma_03 | コード・ガンマ | 偽竜 code:gamma | 演出あり（技種別） | beam | 350→84 | 350 |
| skill_volmoog_01 | 雷爪 | ボルモーグ | 演出あり（技種別） | claw | 380→106 | 380 |
| skill_volmoog_02 | 帯電咆哮 | ボルモーグ | 汎用演出 | guard | 440→211 | 440 |
| skill_volmoog_03 | ボルテッククロー | ボルモーグ | 演出あり（技種別） | claw | 380→106 | 380 |
| skill_gran_volmoog_01 | 雷岩砕き | グランボルモーグ | 演出あり（技種別） | strike | 400→152 | 400 |
| skill_gran_volmoog_02 | 帯電結晶鎧 | グランボルモーグ | 汎用演出 | guard | 440→211 | 440 |
| skill_gran_volmoog_03 | グランボルトクロー | グランボルモーグ | 演出あり（技種別） | claw | 380→106 | 380 |
| skill_stella_apprentice_01 | 星屑弾 | 見習い魔法使いステラ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_stella_apprentice_02 | マジックショット | 見習い魔法使いステラ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_stella_apprentice_03 | スターブースト | 見習い魔法使いステラ | 汎用演出 | buff | 460→221 | 460 |
| skill_stella_wizard_01 | スターライトレイ | 魔法使いステラ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_stella_wizard_02 | マジックバースト | 魔法使いステラ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_stella_wizard_03 | アストラルフレア | 魔法使いステラ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_stella_sorcerer_01 | 星天の裁き | 魔導師ステラ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_stella_sorcerer_02（旧装備互換） | グランドマジック | 魔導師ステラ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_stella_sorcerer_03 | コスモスアーク | 魔導師ステラ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_lumina_apprentice_01（旧装備互換） | 星光弾 | 見習い魔法使いルミナ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_lumina_apprentice_02（旧装備互換） | マジックノート | 見習い魔法使いルミナ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_lumina_apprentice_03（旧装備互換） | ルミナスチャージ | 見習い魔法使いルミナ | 汎用演出 | buff | 460→221 | 460 |
| skill_lumina_wizard_01（旧装備互換） | 星月の光弾 | 魔法使いルミナ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_lumina_wizard_02（旧装備互換） | マジックブルーム | 魔法使いルミナ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_lumina_wizard_03（旧装備互換） | ルミナスレイ | 魔法使いルミナ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_lumina_sorcerer_01（旧装備互換） | 星晶の裁き | 魔導師ルミナ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_lumina_sorcerer_02 | ルミナスマジック | 魔導師ルミナ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_lumina_sorcerer_03 | セレスティアルレイ | 魔導師ルミナ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_orcana_01（旧装備互換） | アクアテイル | オルカーナ | 演出あり（技種別） | tail | 420→143 | 420 |
| skill_orcana_02 | 蒼海の突進 | オルカーナ | 演出あり（技種別） | charge | 460→294 | 460 |
| skill_orcana_03（旧装備互換） | クリスタルウェーブ | オルカーナ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_orca_stream_01 | ストリームテイル | オルカストリーム | 演出あり（技種別） | tail | 420→143 | 420 |
| skill_orca_stream_02 | 蒼流の突撃 | オルカストリーム | 汎用演出 | charge | 460→294 | 460 |
| skill_orca_stream_03（旧装備互換） | オルカウェーブ | オルカストリーム | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_orca_abyss_01 | アビステイル | オルカアビス | 演出あり（技種別） | tail | 420→143 | 420 |
| skill_orca_abyss_02 | 深海の奔流 | オルカアビス | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_orca_abyss_03 | オルカアビス | オルカアビス | 汎用演出 | field | 520→250 | 520 |
| skill_tsubaki_01 | 火花の舞 | 炎の精霊ツバキ | 汎用演出 | field | 520→250 | 520 |
| skill_tsubaki_02 | 灼熱花弁 | 炎の精霊ツバキ | 汎用演出 | projectile | 420→344 | 420 |
| skill_tsubaki_03 | 炎華結界 | 炎の精霊ツバキ | 汎用演出 | guard | 440→211 | 440 |
| skill_elna_kaen_01 | 華炎斬り | 華炎の剣士エルナ | 演出あり（技種別） | sword | 340→82 | 340 |
| skill_elna_kaen_02 | 炎花の構え | 華炎の剣士エルナ | 汎用演出 | guard | 440→211 | 440 |
| skill_elna_kaen_03 | 紅蓮連閃 | 華炎の剣士エルナ | 演出あり（技種別） | sword | 340→82 | 340 |
| skill_alchemion_01 | 錬核崩砕 | 錬核獣アルケミオン | 演出あり（技種別） | strike | 400→152 | 400 |
| skill_kimeragna_01 | 猛毒翔破 | 混成翼竜キメラグナ | 汎用演出 | charge | 460→294 | 460 |
| skill_sylphin_01 | そよ風のひれ | シルフィン | 演出あり（技種別） | fin | 400→136 | 400 |
| skill_sylphin_02（旧装備互換） | エアスライド | シルフィン | 汎用演出 | charge | 460→294 | 460 |
| skill_sylphin_03 | 風まとう | シルフィン | 汎用演出 | buff | 460→221 | 460 |
| skill_zephyray_01 | ゼファーカッター | ゼファーレイ | 汎用演出 | blade | 420→344 | 420 |
| skill_zephyray_02 | 旋風回避 | ゼファーレイ | 汎用演出 | guard | 440→211 | 440 |
| skill_zephyray_03 | スカイランページ | ゼファーレイ | 演出あり（技種別） | charge | 460→294 | 460 |
| skill_tempestray_01 | テンペストフィン | テンペストレイ | 演出あり（技種別） | fin | 400→136 | 400 |
| skill_tempestray_02（旧装備互換） | 嵐翼の守り | テンペストレイ | 汎用演出 | guard | 440→211 | 440 |
| skill_tempestray_03 | 天嵐大旋回 | テンペストレイ | 汎用演出 | field | 520→250 | 520 |
| skill_ignaros_01 | 溶岩角 | イグナロス | 演出あり（技種別） | horn | 380→144 | 380 |
| skill_ignaros_02（旧装備互換） | 灼熱装甲 | イグナロス | 汎用演出 | guard | 440→211 | 440 |
| skill_ignaros_03 | 火口崩し | イグナロス | 演出あり（技種別） | strike | 400→152 | 400 |
| skill_nocle_01 | 影牙 | ノクル | 演出あり（技種別） | fang | 400→168 | 400 |
| skill_nocle_02 | 夜滑り | ノクル | 汎用演出 | charge | 460→294 | 460 |
| skill_nocle_03 | 月蝕の気配 | ノクル | 汎用演出 | buff | 460→221 | 460 |
| skill_noclaid_01 | ムーンシャドウ | ノクレイド | 汎用演出 | mystic | 480→264 | 480 |
| skill_noclaid_02 | 夜竜爪 | ノクレイド | 演出あり（技種別） | claw | 380→106 | 380 |
| skill_noclaid_03 | 暗月障壁 | ノクレイド | 汎用演出 | guard | 440→211 | 440 |
| skill_noxvelg_01 | 夜天竜牙 | ノクスヴェルグ | 演出あり（技種別） | fang | 400→168 | 400 |
| skill_noxvelg_02 | 蝕月咆哮 | ノクスヴェルグ | 演出あり（技種別） | roar | 480→374 | 480 |
| skill_noxvelg_03 | ノクスエクリプス | ノクスヴェルグ | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_luxseed_01 | 光芽弾 | ルクシード | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_luxseed_02 | 幼竜の尾 | ルクシード | 演出あり（技種別） | tail | 420→143 | 420 |
| skill_luxseed_03 | 朝光の息吹 | ルクシード | 汎用演出 | heal | 500→225 | 500 |
| skill_luxiard_01 | ルクスホーン | ルクシアード | 演出あり（技種別） | horn | 380→144 | 380 |
| skill_luxiard_02 | 光竜爪 | ルクシアード | 演出あり（技種別） | claw | 380→106 | 380 |
| skill_luxiard_03 | 黎明障壁 | ルクシアード | 汎用演出 | guard | 440→211 | 440 |
| skill_lux_galdion_01 | 守光竜牙 | ルクスガルディオン | 演出あり（技種別） | fang | 400→168 | 400 |
| skill_lux_galdion_02（旧装備互換） | 聖竜の庇護 | ルクスガルディオン | 汎用演出 | guard | 440→211 | 440 |
| skill_lux_galdion_03 | ガルディオンレイ | ルクスガルディオン | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_astralepis_01 | 星兎跳 | アストラレピス | 演出あり（技種別） | leg | 360→122 | 360 |
| skill_astralepis_02 | アストラルステップ | アストラレピス | 汎用演出 | buff | 460→221 | 460 |
| skill_astralepis_03 | 流星蹴り | アストラレピス | 演出あり（技種別） | leg | 360→122 | 360 |
| skill_galdra_01 | 黒錬牙 | ガルドラ | 演出あり（技種別） | fang | 400→168 | 400 |
| skill_galdra_02 | 幼竜翼撃 | ガルドラ | 演出あり（技種別） | wing | 400→136 | 400 |
| skill_galdra_03 | 蒼核ブレス | ガルドラ | 演出あり（技種別） | breath | 430→138 | 430 |
| skill_kimeragna_apex_01 | 猛毒天翔破 | キメラグナ・アペクス | 汎用演出 | charge | 460→294 | 460 |
| skill_kimeragna_apex_02 | 混成竜雷 | キメラグナ・アペクス | 汎用演出 | lightning | 440→194 | 440 |
| skill_kimeragna_apex_03 | アペクスストーム | キメラグナ・アペクス | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_elixion_01 | 賢金錬輪 | 賢金神竜エリクシオン | 演出あり（技種別） | magic | 440→343 | 440 |
| skill_elixion_02 | 神竜錬壁 | 賢金神竜エリクシオン | 汎用演出 | guard | 440→211 | 440 |
| skill_elixion_03 | エリクシオン・ノヴァ | 賢金神竜エリクシオン | 演出あり（技種別） | magic | 440→343 | 440 |
| (通常攻撃) | 通常攻撃 | 通常攻撃コマンド・技変換フォールバック | 未対応（被弾表示のみ） | generic→strike | 0→91 | 240 |
| (debuff) | 弱体化（既存処理の互換経路） | 互換処理 | 未対応（被弾表示のみ） | generic→debuff | 0→173 | 360 |

追加攻撃は独立した登録IDではなく repeat_attack 効果の2撃目。同じ雷撃演出をもう一度再生し、各命中で結果を更新します。吸収・反動・毒・混乱自傷は既存の結果ラベルを保持し、攻撃成功を示す演出を勝手に追加しません。減動設定では移動・点滅を省略し、HP・結果ラベル・履歴を維持します。
