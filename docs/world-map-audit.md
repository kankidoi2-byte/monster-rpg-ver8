# 世界地図システム：既存コード監査（0B / 0C）

監査日：2026-09-06 JST。基点 main `d31cfccd37219549d25df9f85c62db559aa649f3`。この文書は実装前の既存仕様と提案の区別を残す。監査時の開発ブランチには担当記録コミット `2f9a3861751bca31461af626fafd13797df788f5` がある。

## 1. 既存19マップと配置対応（0B）

根拠：`js/data.js` の `MAPS` / `M`、`js/state.js` の `availableHuntDifficulties` / `huntCandidatesFor`。下表の難易度は **既存候補と既存制限から計算** したもので、表示上の推定ではない。E=Easy、N=Normal、H=Hard、X=Extreme。括弧内は星数。候補IDは重複を除いて表示するが、実装の `enemyIds` 重複は抽選重みなので消してはいけない。

| ID / 名称 | 対応難易度 | 既存候補（★数） | 世界地図上の配置・接続案 |
|---|---|---|---|
| grassland / 草原 | E/N/H | slime(1), grassbeat(1), volteck(1), slime_gold(2), goblin(1), spaquinn(2), voltax(3), rikasheef(1), seralphia(3), sylphin(1), zephyray(2) | 中央。王都の北、森林・湖・高原へ接続 |
| volcano / 火山 | E/N/H | freigal(1), freiwolf(2), tsubaki(2), goblin(1), ignaros(2) | 南。華炎の里の南側、主要生活路と溶岩域を分離 |
| lake / 湖 | E/N/H | aquaron(1), highaquaron(2), suiren(2), goblin(1), proto_icegolem(2) | 中央東。北の雪山から水を受け、東の海へ流れる |
| seikai_irie / 蒼海の入り江 | E/N/H | aquaron(1), highaquaron(2), orcana(2), shenhairon(3), tienhairon(3), orca_stream(3) | 東海岸。湖の流出河川の河口付近 |
| kaiyu_kaiiki / 回遊海域 | N/H | highaquaron(2), orcana(2), shenhairon(3), tienhairon(3), orca_stream(3), orca_abyss(4) | 入り江の東〜南東沖 |
| deep_sea_end / 深き海の果て | N/H | orca_stream(3), shenhairon(3), tienhairon(3), orca_abyss(4) | 回遊海域の深部。深さの階層として表示 |
| snow_mountain / 雪山 | E/N/H | icegolem(2), proto_icegolem(2), slime(1), aquaron(1), goblin(1) | 北部山岳。湖の上流、北の峠は将来拡張余地 |
| forest / 森林 | E/N/H | grassbeat(1), rikasheef(1), thornbeat(2), granbeat(3), seralphia(3), slime(1), goblin(1), nightmare(2) | 西。南東へ光の平原、南西へ廃村跡 |
| light_plain / 光の平原 | E/N/H | hikari(4), slime(1), goblin(1), suiren(2), aquaron(1), luxseed(1), luxiard(2) | 森林の南東。エリシアの降臨地点。通常探索を残す |
| starry_plain / 星空の平原 | E/N/H | nemes(2), nemesia(3), nemesion(4), slime(1), goblin(1), volteck(1), spaquinn(2), nightmare(2), astralepis(2) | 北東の開けた高所。星の海への特殊接続 |
| highland_ruins / 高原遺跡 | E/N/H | volteck(1), spaquinn(2), volmoog(2), voltax(3), slime(1), goblin(1), sylphin(1), zephyray(2), tempestray(3) | 北西。世界の狭間への裂け目の初期表現候補 |
| arena / 闘技場 | E/N/H | elna_beginner(1), elna_middle(2), elna_advanced(3) | 中央南の王都内。王都は地理グループで新規戦闘マップにしない |
| magic_academy / 魔導学園 | N/H | stella_apprentice(2), stella_wizard(3), stella_sorcerer(4), lumina_apprentice(2), lumina_wizard(3), lumina_sorcerer(4) | 王都内、闘技場に隣接する施設 |
| ruined_village / 廃村跡 | E/N/H | nightmare(2), goblin(1), slime(1), nocle(1), noclaid(2), noxvelg(3) | 森林の南西。月影の洞窟は周辺地名として扱える |
| starsea / 遥かなる星の海 | H/X | nemesion(4), doom_nemesion(5) | 地上外。星空の平原を入口とする別層 |
| water_secret / 流水の秘境 | H | elna_water(4), suiren(2) | 湖から海へ向かう川の脇の隠れ谷 |
| world_between / 世界の狭間 | X | false_dragon_alfa(5), false_dragon_beta(5), false_dragon_gamma(5) | 時空外。危機後の痕跡から接続、地図の通常陸地へ埋め込まない |
| kaen_village / 華炎の里 | N/H | tsubaki(2), elna_kaen(4) | 南部火山帯の北麓。溶岩から離れた生活域 |
| golden_land / 黄金郷 | H | slime_gold(2) | 定住住所のない幻の入口。特殊入口一覧へ保持 |

配置はゲーム地理の提案であり、経緯度・気候シミュレーションではない。西の街道、北の峠、東の航路を将来章への接続余地とし、未実装地域を遊べるように表示しない。`chapter` の日本語表示文字列と将来の `worldId` / `eraId` / `chapterId` は別にする。

### 現行の特殊入口

| マップ | 現行フラグ・抽選 | 維持すべき点 / 修正候補 |
|---|---|---|
| starsea | bossOnly / 10% | HのnemesionとXのdoom_nemesionを区別。危機は後者のみ |
| water_secret | rareOnly / 12% | 通常難易度へ無制限開放せず入口獲得後にHを提示 |
| world_between | bossOnly / 8% | 通常ランダム出現から危機の痕跡へ変更。偽竜3体は★5/Xを維持 |
| golden_land | rareOnly / goldenLand / expeditionExcluded | `goldenLandMapReady` は表示で消費せず、出発時だけ1枚消費。自然発見と地図予約を分ける |

旧 `showBattleChoices()` は普通の3候補に対して特殊当選のうち1つだけを最後の枠へ配置する。地図予約があれば他の特殊当選は出ない。新方式では入口を独立保持し、この競合を持ち込まない。

黄金郷の既存抽選には不整合がある。`availableHuntDifficulties(golden_land)` はHのみだが、旧候補生成は3番目の難易度（自然発見はNも、地図予約はXも）を引き継ぐ。Xでは★2候補がなくカードが消える。新UIでは実在候補に基づくHを使い、図鑑等にも反映する。これは既存不整合の修正としてテストする。

## 2. 主要接続箇所

| 役割 | 既存箇所 | 実装時の注意 |
|---|---|---|
| バトル入口 | `js/ui.js: openBattleHub` → `startBattleFromParty` | パーティー空なら編成へ。新地図から戦闘開始する時も空配列参照を防ぐ |
| 選択画面 | `js/battle-flow.js: showBattleChoices` / `index.html: battleChoices, battleChoiceList` | チュートリアルが同じ画面・コンテナへ描画。IDを無断撤去しない |
| 戦闘依頼 | `js/state.js: createHuntRequest, registerHuntRequest, preparedHuntRequest` | 難易度、条件、乱入/三つ巴、報酬倍率を再利用。表示→出発で内容が変わらないよう保持 |
| 出発 | `startChosenBattle` → CAUTION → `beginChosenBattle` | 黄金郷消費はbegin側。新入口権利も開始の確定点で消費。失敗時に入口を失わない |
| 結果・戻り | `win`, `winMultiBattle`, `afterBattleNext`, `endPartyRecovery` | 単体勝利と複数戦勝利の双方へフック。回復・報酬・遠征進行を二重実行しない |
| 図鑑 | `registerMapDex`, `mapDexDifficulties`, `mapDexEvents` | 地図閲覧と特殊発見を区別。既存図鑑難易度は固定配列で不正確、実在候補へ統一が必要 |
| 遠征 | `expeditionDestinations`, `progressActiveExpeditions` | 現行は超ボス級候補を含むマップとexpeditionExcludedを除外。地図イベントによって派遣中データを削除しない |
| 新規/旧セーブ | `initSave`, `migrateSave`, `repairSave`, `normalizeTutorialSave` | 現行schemaVersion=4、SAVE_KEYはmb_v95c。加算移行のみ |

`createHuntRequest` は黄金郷以外のH/Xでも乱入/三つ巴を抽選する。降臨や危機を一対一固定にするなら、そのイベントだけの明示設定とし、通常マップの既存発生率まで変えない。イベント解決は敵1体の途中撃破ではなく戦闘全体の結果で判定する。

## 3. 設定と既存データの注意点

- `hikari` は現在「光の女神エリシア」★4、Hard Lv.88、キャラクター、`contractable:false` / `eligibility.contract:false`。**降臨化の承認は契約解禁の承認とは別**なので既存の契約不可を維持する。通常 `enemyIds` に12個あるhikariをイベント候補へ分離する際もIDと進化先を消さない。生態系本文の古い「ヒカリの群れ」表現も単独の降臨設定へ整える。
- `doom_nemesion` は★5の「滅亡の星 ネメシオン」、`nemesion` は別の★4。ネメシオンという名前の部分一致で危機を解決しない。
- `elixion`（エリクシオン）は錬成限定★5。新地図の候補自動収集に全Mを用いると混入するので、map.enemyIds / 明示イベント候補を使用する。
- 星数が高原/海などの見た目に比例するわけではない。ignarosは★2、tempestrayは★3、orca_abyssは★4。表示難易度を風景から作らない。
- 偽竜は危機を見送った場合にのみ出す設計にしない。討伐と明示見送りの両方で痕跡が得られる。危機放置を契約・収集の必須条件にしない。
- 別チャットのエリシア/男性/錬成サイドストーリーは今回の実装へ持ち込まない。

## 4. 推奨する加算状態設計（0C、提案）

`save.worldMap` のような独立フィールドを追加し、既存 `progress.tutorial` や `goldenLandMapReady` を置き換えない。

| フィールド案 | 内容・初期値 |
|---|---|
| version | 1 |
| selectedMapId / difficultyId | 直前の場所/難易度。無効なら草原/Easy等の有効候補へ補正 |
| explorationWins | この機能導入後の通常探索勝利数、0。旧history.winsを遡って抽選しない |
| eventSerial | 一意な発生番号、0 |
| events | 降臨/危機/特殊入口ごとの独立レコード、空オブジェクト |
| history | 解決イベントの上限付き履歴、空配列 |
| guides | 世界地図専用の初回案内フラグ。旧物語完了を変更しない |

各イベントには `id, kind, mapId, monsterId, status, triggerSerial, resolvedBy, sourceEventId` を持たせる。初版は出現→勝利解決、または明示見送りで解決。敗北・逃走・別画面移動では未解決のまま再挑戦可能とする。実時間失効は設けず、描画や再読み込みで再抽選しない。

危機の `resolvedBy` は `player` / `false_dragon` を区別して演出へ渡す。両結果で同じ偽竜入口機会を得る。世界の狭間の将来接続は参照先の `worldId` / `eraId` を拡張できる構造だけ準備し、過去改変や別時間の保存分岐は実装しない。

抽選は **通常探索の勝利確定で1回**。単体 `win` と複数戦 `winMultiBattle` の報酬ガード内から共通関数を呼び、チュートリアル救援・模擬戦・イベント戦を除外する。イベント解決と報酬・抽選状態は同じsaveGame境界で保存し、再読込時に再報酬/再抽選が起きないことを検証する。未知フィールドは可能な限り保存し、壊れた配列/数値は安全値に補正する。

黄金郷は地図予約と自然発見を別権利として管理する案が安全。自然発見から入った場合に予約済み地図を意図せず消費しない。出発確認で使用する権利を表示し、既存予約フラグと残数の整合を確認する。

## 5. チュートリアルの早期接続と移行リスク

現行はv2の序章・章区切り方式。`renderTutorialHuntChoice` は通常抽選より先に実行され、`renderTutorialSupplyRequest` が報告型依頼も描画する。草原救援は `startTutorialRescueBattle` から直接戦闘へ入る独自経路で、開始済みのゲスト・敵キューを持つ。単なる旧カード差し替えだけでは新地図を教えることにならない。

最重要：**`TUTORIAL_VERSION` を2→3に単純増加しない**。`normalizeTutorialSave` は `sourceVersion < TUTORIAL_VERSION` を「既存公開版保護」として、途中進行も完了/スキップへ切り替え、多数の一回報酬フラグをtrueにする。新地図の導入は独立フラグ/既存step維持を基本にし、必要なstepの明示対応表を加える。

| 保存状態 | 必須の移行・検証 |
|---|---|
| 新規not_started | 地図→草原→固定Easy救援へ誘導。ランダムイベント待ち不要 |
| v2 in_progress / 初回探索前 | 現在stepを保持し、必要地点ボタンへ案内を接続 |
| v2 in_progress / 救援・契約中 | 既存救援/契約の再開処理を維持。エルナやスターターを再配布しない |
| v2 in_progress / 章区切り・学園・錬成・遠征 | 新地図へ強制巻き戻さず、その章の続きから再開 |
| completed / skipped | 物語を再実行せず自由地図。新地図のみ任意の短い案内 |
| 古いv1 / replaying | 現行の旧公開版保護と再閲覧終了処理を維持 |

`data-tutorial-hunt-start`, `data-tutorial-golden-land`, `battleChoices`, `battleChoiceList` を必要な時点まで維持し、案内ターゲット不在で停止しないようにする。第1段階で旧導線との接続を確認し、第4段階で文言・誘導・中断復帰を完成させる。

## 6. 検証範囲と未確認

この監査で実行：data.jsをNode VMで読み込み、19件のmap ID・重複除外候補・★数・対応難易度を算出。AGENTS.md、公開承認契約、上記接続関数を静的確認。ゲーム実装を変更していないため、この文書自体はゲーム動作検証の合格証拠ではない。

未確認：ブラウザ操作、Android/Chromebook実機、世界地図用移行関数（未実装）、イベント収益/遭遇率、正式地形素材。実装後は `npm run check` と旧/新セーブ往復・全マップの有効候補・イベント共存・黄金郷消費・単体/乱入/三つ巴・チュートリアル完走を確認する。公開は本人承認待ちであり、監査完了を公開承認と解釈しない。
