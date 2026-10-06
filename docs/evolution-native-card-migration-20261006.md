# 既存セーブの進化固有技カード補填

監査元main: f2c8e8f2a72837a8f897e994fe58b80d392d046a。

通常53・特殊3の全56経路を監査。通常は各成立レベルからLv100、特殊はレベル条件がないためLv1からLv100で旧defaultSkillIdsForMonsterと全固有技を比較した。COSTによる選択変化も含め、旧報酬が一度でも省略し得たカードを抽出。29形態・32形態/カード組・正規化後30種類となった。数は旧報告を流用せず最新データから再集計した。

## 対象と枚数

補填は下表の不足し得たカードだけ。現在所持する各対象個体が各カード1枚を必要とする。同一個体内はcanonicalSkillIdによる正規化後に重複除去。別個体・別形態の同一IDは合算。必要数N、既存の正規化済み所持数Cに対し max(0,N-C) を追加する。装備中の分も所持数に含む。現在Lv・装備・枠・COSTを補填判定に使わない。余剰を減らさず、所持しない過去の形態はcaught等から推測しない。

| 現在の所持形態 | 補填対象カード |
| --- | --- |
| freiwolf（フレイウルフ） | skill_freiwolf_03（猛火の咆哮） |
| highaquaron（ハイアクアロン） | skill_highaquaron_03（ハイドロスパイラル） |
| shenhairon（シェンハイロン） | skill_orca_abyss_02（深海の奔流） |
| tienhairon（ティエンハイロン） | skill_tienhairon_03（蒼天龍波） |
| thornbeat（ソーンビート） | skill_thornbeat_03（スパイクラッシュ） |
| granbeat（グランビート） | skill_granbeat_03（ガイアスラッシュ） |
| seralphia（セラルフィア） | skill_seralphia_03（セラフィックリーフ） |
| voltax（ボルタックス） | skill_voltax_03（ボルテックストーム）、skill_voltax_04（疾風迅雷） |
| nemesia（ネメシア） | skill_nemesia_03（コズミックノヴァ） |
| nemesion（ネメシオン） | skill_nemesion_03（アストラルエンド） |
| elna_middle（中級剣士エルナ） | skill_elna_middle_03（白刃一閃） |
| elna_advanced（上級剣士エルナ） | skill_elna_advanced_03（白銀連斬） |
| gran_volmoog（グランボルモーグ） | skill_gran_volmoog_03（グランボルトクロー） |
| stella_wizard（魔法使いステラ） | skill_stella_wizard_03（アストラルフレア） |
| stella_sorcerer（魔導師ステラ） | skill_stella_sorcerer_03（コスモスアーク） |
| lumina_wizard（魔法使いルミナ） | skill_stella_wizard_03（アストラルフレア） |
| lumina_sorcerer（魔導師ルミナ） | skill_lumina_sorcerer_03（セレスティアルレイ） |
| orca_stream（オルカストリーム） | skill_orca_abyss_02（深海の奔流） |
| orca_abyss（オルカアビス） | skill_orca_abyss_03（オルカアビス） |
| kimeragna_apex（キメラグナ・アペクス） | skill_kimeragna_apex_02（混成竜雷）、skill_kimeragna_apex_03（アペクスストーム） |
| zephyray（ゼファーレイ） | skill_zephyray_03（スカイランページ） |
| tempestray（テンペストレイ） | skill_tempestray_03（天嵐大旋回） |
| noclaid（ノクレイド） | skill_noclaid_03（暗月障壁） |
| noxvelg（ノクスヴェルグ） | skill_noxvelg_02（蝕月咆哮）、skill_noxvelg_03（ノクスエクリプス） |
| luxiard（ルクシアード） | skill_luxiard_03（黎明障壁） |
| lux_galdion（ルクスガルディオン） | skill_lux_galdion_03（ガルディオンレイ） |
| elna_water（流水の剣士エルナ） | skill_elna_water_03（蒼流連閃） |
| doom_nemesion（滅亡の星 ネメシオン） | skill_doom_nemesion_03（アポカリプスノヴァ） |
| elna_kaen（華炎の剣士エルナ） | skill_elna_kaen_03（紅蓮連閃） |

## 移行順序と保存

1. save.jsのloadSave/parseAndPrepareSaveで既存スキーマ移行・repairSave、旧名技IDのnormalizeSkillIdによる固定ID化。
2. init.jsで起動時に実在する個体の配列を保存してからinitStartersを実行。旧初期化が図鑑履歴から復元した個体を補填の所持個体とは推測しない。migrateSkillSystemで既存装備補修とequipped_skill_cards_v1のカード移行。全99枚を廃止する旧移行の意味は変更しない。
3. 旧移行のearly returnを除去し、同じ初期化で装備所持枚数の既存下限保証を完了。
4. 起動前の実在個体スナップショットのみを集計し、evolution_native_cards_v1が未記録なら補填してsave.saveMeta.migrationsに記録。対象がなくても記録。
5. 既存init.jsのsaveGameが補填枚数と移行キーを同じJSONで保存。アカウント切替・セーブ取込・復旧はreload後に同じ経路を通る。

固定v1対象表は今後のデータ変更で過去の補填範囲が広がらないよう保持する。対象カードは実行時にcanonicalSkillIdと現在のmovesで検証。旧統合前装備カードは既存互換方針のまま保持し、装備を置換しない。保存失敗時も再読込は元の不足枚数から下限まで補填するため加算増殖しない。PR257の通常・特殊進化ごとの全固有技配布は変更なし。

## 検証

- test-evolution-native-card-migration.mjs: 全56経路・全合法Lvと固定対象表を照合。全対象の0/一部不足/十分/余剰、2個体、異形態共有ID、旧名ID、旧技カード移行未実行、同一個体のID重複、再描画・再読込、新規/所持なし、個体・編成・装備・通貨・素材・進行の保持。
- 既存test-evolution-skill-cards.mjs: 全56通常/特殊経路で今後の進化配布・装備保持・キャンセル等の回帰。
- test-evolution-native-card-migration-browser.mjs: 空のブラウザcontextで旧セーブを作成。390×844でタイトル・ホーム・編成・討伐選択・戦闘開始、実保存、再読込、実プロフィール切替往復、共有カード、旧移行未実行を検証。GAME_TEST_URLで公開本編も隔離テスト可能。
- 必須npm run checkと世界地図報酬比較、現在PR headのCI成功を統合条件とする。
- Android/Chromebook実機操作は未検証。
