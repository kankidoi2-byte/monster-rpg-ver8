# サウンド第2弾：素材変換・検証記録

仕様： [第2弾仕様書](https://drive.google.com/file/d/1V0e4qWgUE7_MRVTEFbzX1LthGXoCFN1OkESOld0DyjM/view)・[追加マニフェスト](https://drive.google.com/file/d/1moufU-4v69g_H5jg_xTbMLNBdKMb2a6B/view)・[第1弾仕様書第2版](https://drive.google.com/file/d/1DwiEls8q4XmIA-k3fefx2xCWLLIxRSus5JxolYXNi0U/view)。

Driveの15原本をIDで取得。原本の移動・改名・削除なし。MP3 11個は元バイトのまま。変換は FFmpeg 7.1.5、`-map 0:a:0 -c:a aac -profile:a aac_low -ar 48000 -ac 2 -b:a 192k -movflags +faststart`。トリミング、ゲイン、フェード、正規化、時間補正を加えていない。出力AAC-LC / 48 kHz / 2 ch / 192 kbps目標。

BGMは両版をFFmpegで48 kHzステレオfloat PCMへデコード。各曲の冒頭/実オンセット付近、10秒、ループ両端を含む4窓（各2秒、左右別、±2400サンプルの相互相関）すべてでピークは0サンプル。AAC先頭の負PTS −1024とSKIP_SAMPLES 1024はコンテナのprimingで、実音のシフトではない。末尾はコーデックの端数分だけ延長されるがループ外。振幅変化により単一点の閾値交差は最大5サンプル差。無音を詰めず、湖の接続前後100 msのRMSは元の約+1.43 dBに対し変換後+1.41 dB。元の音量上昇を保持し、ループ設定は変更なし。聴感・Android・iOS実機は別途確認。

個々のID、SHA-256、サイズ、オフセットの再現データは `scripts/sound-pack-02-assets.json`。公開用リポジトリのcopy設定はこのPRの対象外。第2弾の本番配信には音声とマニフェストの配置検証が必要。

| キー | ファイル | 元のSHA-256 | 採用後SHA-256 |
| --- | --- | --- | --- |
| battle_volcano | audio/bgm/bgm_battle_volcano.m4a | `abedbaba512e5728bad4be3b7f7812c30232a1d3ca00ec72495ebc7823d9eee1` | `dc9d50b1270e17db0d4557127580649b90eeedf2e0cce7f8d1b7982e22df3a71` |
| battle_lake | audio/bgm/bgm_battle_lake.m4a | `3ac579a1397ebd377cae393b0c80dadb8f396748613ae4704c05ae8b3065f0e8` | `0036de791470c750dfae3c642f9abdf898edcc517323493312877c620df2df7c` |
| battle_strong | audio/bgm/bgm_battle_strong.m4a | `dfb803635d841c00bb6a61c14e3df314853d2a80e5e2da6c7931317528769a9b` | `d08c6139221750afa965dd6120e3b9494b51d61fef1c904c8628566c3d8795ca` |
| battle_nushi | audio/bgm/bgm_battle_nushi.m4a | `918b6fc727869d35da443f7c36f3bb3e59c273fa2eb8b6c3f71ddf1b7831d072` | `2428a5a4222bff75069643203fc719e7c2d995f12cef80c09cd225e3a6f06e6d` |
| tab | audio/se/se_ui_tab.mp3 | `90a96fa1f26571ebdcb0ca472eb0e86a761634ffad39df962ab50a5198336b67` | 同一 |
| page | audio/se/se_ui_page.mp3 | `0036178d5479b2f28c78f7e5abd8dc798d55539ce4a295d8affbc24b2cd2958f` | 同一 |
| error | audio/se/se_ui_error.mp3 | `bba778a4347a646c8a036b546b72d612899770a9ce47660f177e3387b2697d7f` | 同一 |
| notify | audio/se/se_ui_notify.mp3 | `64de49b3d5f3d148ec81ff680063715f21da18b557f913577e6b002d643b6e3c` | 同一 |
| save | audio/se/se_ui_save.mp3 | `197ce54de54d7a5f80fa5c9e133c81008f710f970ac674ee6c87e5d85e7a82fa` | 同一 |
| start | audio/se/se_ui_game_start.mp3 | `82df1db619d04426a388b0077eb5cc5612eeea436ac5f52f8b007b61a67e4a9b` | 同一 |
| text | audio/se/se_ui_text.mp3 | `feadf0c22e9cdb3b98190cdbf3d83f5d01d84a0fef1f33f260f1aed416c388c8` | 同一 |
| encounter | audio/se/se_battle_encounter.mp3 | `4aab58797a1e716682b251de93e201d5ac59983aa01717cfb2dd1adfdeb3aad8` | 同一 |
| encounterStrong | audio/se/se_battle_encounter_strong.mp3 | `6bf8780b0e6322eca8d3877c6e7de37cc14f5349c34ca65e726f0e24e56446e1` | 同一 |
| swing | audio/se/se_battle_swing.mp3 | `5bdd0b6e088df62897976e90056326810d31f839478d030f3e60e4f2f62deced` | 同一 |
| turn | audio/se/se_battle_turn.mp3 | `1a20b539a0613d16910a2bf1b29d5cf0f8f669c8f31a6b3349b6aa8958aa307e` | 同一 |
