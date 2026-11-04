# エルナの全身立ち絵

ホームとバトルで、エルナ系5体を透過した全身立ち絵で表示する。
図鑑・一覧などのカード画像は既存の `IMG` を使用する。

| キャラクター | 添付元 | 追加画像 | 容量 |
| --- | --- | --- | ---: |
| 初級剣士エルナ | 1000012156.png | images/monsters/elna_beginner_fullbody_20261104.webp | 179,382 B |
| 中級剣士エルナ | 1000011955.png | images/monsters/elna_middle_fullbody_20261104.webp | 199,194 B |
| 上級剣士エルナ | 1000011639.png | images/monsters/elna_advanced_fullbody_20261104.webp | 287,574 B |
| 流水の剣士エルナ | 1000011708.png | images/monsters/elna_water_fullbody_20261104.webp | 489,894 B |
| 華炎の剣士エルナ | 1000011979.png | images/monsters/elna_kaen_fullbody_20261104.webp | 591,422 B |

全画像が既存の600 KiB制限内。既存画像の上書き・削除は行わない。
初級は添付画像の透過を維持。残り4枚は組み込みの画像編集で黒背景を透過し、WebPへ変換した。

## 表示処理

`js/battle-idle-media.js` の静止画登録と `battleDisplayMedia` をホーム・バトルで共有する。
人物は5形態とも同じ基準寸法を使い、全体を縦横比を保って収める。
水・炎の演出を含む。動画用デコーダーや再生設定は作成しない。
通常戦の味方・敵、三つ巴戦の敵A・敵B、交代と画面退出で共通の表示寿命を使う。

セーブ形式、既存ID、能力値、戦闘計算への変更はない。

## 検証

- `npm run check:home-water`：55体×3画面寸法の配置計算と、新規5体の実ブラウザ検証が成功。
- 新規実ブラウザ検証：幅360/412px、画像の実アルファ、ホーム枠なし、全身の収まり、通常戦両側・三つ巴戦、デコーダー不要、退出時解放、保存・再読込、動きを抑える設定。
- `node scripts/test-battle-idle-media-dom.mjs`：既存モンスターの表示寿命・サイズ・退出処理の検証が成功。
- `npm run check:images`、`npm run check:notices`、`git diff --check` が成功。
- `npm run check` の全116項目と `postcheck` が成功。最初の実行は旧コミット `d31cfccd` がない浅い取得のため停止したが、Git履歴を補完し、失敗した `check:world-map` から残りの全項目を再開して成功。先行して成功した項目は変更がないため再利用した。

実Android・Chromebook端末での確認は未実施。ブラウザ検証はChromiumのスマホ幅で行った。

## 背景透過の指示

4枚それぞれを編集対象として、組み込み画像編集へ `transparent_background: true` と以下の同一指示を渡した。

```text
Use case: background-extraction. Edit target: the single attached image. Remove only the black background and make it genuinely transparent with alpha. Preserve the EXACT original full-body character, face, hair, pose, anatomy, outfit, colors, all weapons and all water or fire effects where present. This is a production game sprite extraction, not a redesign or a new illustration. Preserve black/dark clothing and details as opaque. Remove black from gaps around hair, clothing, weapons and effects. Keep the entire composition uncropped, head and feet and weapon tips and all effects fully visible. No new objects, no shadow floor, no checkerboard in pixels, no colored backdrop. Return a transparent PNG.
```
