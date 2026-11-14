// Final prologue script, 2026-11-14. Production directions are not dialogue.
(function(root){
  "use strict";
  const data = {
  "version": 1,
  "source": {
    "scriptSha256": "e1e43de46784a0650c22295c0015aca84883345a6cb77de764ee1afdfdadcde5",
    "specSha256": "2bd746fc2a5534d3b24ccf990986f070547b8f1bb7f4c87831e375328fee0c4d",
    "masterCommit": "b8a7e64d4538e0f4ed34ea2c7a529318b83a8386"
  },
  "episodes": [
    {
      "id": "pb_07",
      "number": 7,
      "title": "行き先のない冒険",
      "location": "王都外・街道",
      "rewards": {
        "exp": 180,
        "coins": 50
      },
      "background": "images/maps/grassland.webp",
      "previousEpisodeId": null,
      "battleIds": [
        "p2_07_a",
        "p2_07_b"
      ],
      "steps": [
        {
          "id": "pb_07_pre_01",
          "kind": "narration",
          "speaker": "地の文",
          "text": "王都を出てしばらく。三人は、道しるべの前で立ち止まっていた。",
          "sourceText": "地の文：王都を出てしばらく。三人は、道しるべの前で立ち止まっていた。",
          "sourceLine": 215,
          "background": "images/maps/grassland.webp"
        },
        {
          "id": "pb_07_pre_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "東は森、西は街道……。で、ボクの姿を戻す手掛かりは、どっちにあるんだ？",
          "sourceText": "グノーシス：東は森、西は街道……。で、ボクの姿を戻す手掛かりは、どっちにあるんだ？",
          "sourceLine": 216,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_07_pre_03",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラが二つの道を交互に見て、主人公を見上げる。",
          "sourceText": "演出：ガルドラが二つの道を交互に見て、主人公を見上げる。",
          "sourceLine": 217,
          "background": "images/maps/grassland.webp",
          "display": false
        },
        {
          "id": "pb_07_pre_04",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル？",
          "sourceText": "ガルドラ：ガル？",
          "sourceLine": 218,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_07_pre_05",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "そんな目で見るなよ。ボクだって、分からないことくらいある！",
          "sourceText": "グノーシス：そんな目で見るなよ。ボクだって、分からないことくらいある！",
          "sourceLine": 219,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_07_pre_06",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "…王都に戻ろう。",
          "sourceText": "契約者：…王都に戻ろう。",
          "sourceLine": 220,
          "background": "images/maps/grassland.webp"
        },
        {
          "id": "pb_07_pre_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "…そうしよっか！",
          "sourceText": "グノーシス：…そうしよっか！",
          "sourceLine": 221,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_07_pre_08",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル！",
          "sourceText": "ガルドラ:ガル！",
          "sourceLine": 222,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_07_pre_09",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "た、大変だ！荷車が！ まだ届けてない荷物なんだ！",
          "sourceText": "トビア：た、大変だ！荷車が！ まだ届けてない荷物なんだ！",
          "sourceLine": 223,
          "background": "images/maps/grassland.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_07_pre_10",
          "kind": "production",
          "speaker": "演出",
          "text": "荷台にスライム。車輪の向こうではゴブリンが袋を引っ張っている。トビアは震えながらも荷台を押さえている。",
          "sourceText": "演出：荷台にスライム。車輪の向こうではゴブリンが袋を引っ張っている。トビアは震えながらも荷台を押さえている。",
          "sourceLine": 224,
          "background": "images/maps/grassland.webp",
          "display": false
        },
        {
          "id": "pb_07_pre_11",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ゴブリンじゃないか！荷物を置いて逃げれば……",
          "sourceText": "グノーシス：ゴブリンじゃないか！荷物を置いて逃げれば……",
          "sourceLine": 225,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_07_pre_12",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "いや、助けよう！",
          "sourceText": "契約者:いや、助けよう！",
          "sourceLine": 226,
          "background": "images/maps/grassland.webp"
        },
        {
          "id": "pb_07_pre_13",
          "kind": "system",
          "speaker": "システム",
          "text": "戦闘前に編成を確認できます。まず荷車の前のスライムを退けましょう。",
          "sourceText": "システム：戦闘前に編成を確認できます。まず荷車の前のスライムを退けましょう。",
          "sourceLine": 227,
          "background": "images/maps/grassland.webp"
        },
        {
          "id": "pb_07_battle",
          "kind": "battle",
          "speaker": "",
          "text": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceText": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceLine": 228,
          "background": "images/maps/grassland.webp",
          "battleId": "p2_07_a"
        },
        {
          "id": "pb_07_contract",
          "kind": "event",
          "action": "contract",
          "battleId": "p2_07_a",
          "grantKey": "practiceContractScroll",
          "quantity": 1
        },
        {
          "id": "pb_07_contract_ok",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "応えてくれたな！",
          "sourceText": "グノーシス：応えてくれたな！",
          "sourceLine": 229,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png",
          "when": {
            "contractOutcome": "ok"
          }
        },
        {
          "id": "pb_07_contract_ng",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "今回は応じなかったな。無理に追いかけなくていい",
          "sourceText": "グノーシス：今回は応じなかったな。無理に追いかけなくていい",
          "sourceLine": 230,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png",
          "when": {
            "contractOutcome": "ng"
          }
        },
        {
          "id": "pb_07_contract_skip",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "契約はPrayerNameが決めていい",
          "sourceText": "グノーシス：契約はPrayerNameが決めていい",
          "sourceLine": 231,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png",
          "when": {
            "contractOutcome": "skip"
          }
        },
        {
          "id": "pb_07_mid_01",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "まだだ！ 荷物を引っ張ってるやつがいる！",
          "sourceText": "グノーシス：まだだ！ 荷物を引っ張ってるやつがいる！",
          "sourceLine": 232,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "p2_07_b_start",
          "kind": "battle",
          "battleId": "p2_07_b",
          "background": "images/maps/grassland.webp"
        },
        {
          "id": "pb_07_post_01",
          "kind": "production",
          "speaker": "演出",
          "text": "ゴブリンが空の袋を放して草むらへ走る。トビアが宛名札を確かめる。",
          "sourceText": "演出：ゴブリンが空の袋を放して草むらへ走る。トビアが宛名札を確かめる。",
          "sourceLine": 234,
          "background": "images/maps/grassland.webp",
          "display": false
        },
        {
          "id": "pb_07_post_02",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "ありがとうございます！ オレ、風便見習いのトビアです。これ、王都の食堂に届ける荷物で……。",
          "sourceText": "トビア：ありがとうございます！ オレ、風便見習いのトビアです。これ、王都の食堂に届ける荷物で……。",
          "sourceLine": 235,
          "background": "images/maps/grassland.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_07_post_03",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "いつもの道なのに、こんなの初めてですよ。",
          "sourceText": "トビア：いつもの道なのに、こんなの初めてですよ。",
          "sourceLine": 236,
          "background": "images/maps/grassland.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_07_post_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "？ 初めて？",
          "sourceText": "グノーシス：？ 初めて？",
          "sourceLine": 237,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_07_post_05",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "ここは人通りが多いからモンスターもあまり近寄ってこないんですよ。オレみたいな見習いでも、この道なら大丈夫って聞いてたんだけどなぁ…",
          "sourceText": "トビア:ここは人通りが多いからモンスターもあまり近寄ってこないんですよ。オレみたいな見習いでも、この道なら大丈夫って聞いてたんだけどなぁ…",
          "sourceLine": 238,
          "background": "images/maps/grassland.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_07_post_06",
          "kind": "production",
          "speaker": "演出",
          "text": "トビアが荷車を引きかけて立ち止まり、配達鞄から布に包んだものを取り出す。",
          "sourceText": "演出：トビアが荷車を引きかけて立ち止まり、配達鞄から布に包んだものを取り出す。",
          "sourceLine": 239,
          "background": "images/maps/grassland.webp",
          "display": false
        },
        {
          "id": "pb_07_post_07",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "あ、そうだ。これ見てください。ここへ来る途中、森へ曲がる分かれ道のそばで拾ったんです。",
          "sourceText": "トビア：あ、そうだ。これ見てください。ここへ来る途中、森へ曲がる分かれ道のそばで拾ったんです。",
          "sourceLine": 240,
          "background": "images/maps/grassland.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_07_post_08",
          "kind": "production",
          "speaker": "演出",
          "text": "布を開くと、黒い破片に細い星の筋が走っている。ガルドラが鼻を近づける。",
          "sourceText": "演出：布を開くと、黒い破片に細い星の筋が走っている。ガルドラが鼻を近づける。",
          "sourceLine": 241,
          "background": "images/maps/grassland.webp",
          "display": false
        },
        {
          "id": "pb_07_post_09",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル？",
          "sourceText": "ガルドラ：ガル？",
          "sourceLine": 242,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_07_post_10",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "こら、ガルドラ！ 光ってても、食べ物じゃないぞ。",
          "sourceText": "グノーシス：こら、ガルドラ！ 光ってても、食べ物じゃないぞ。",
          "sourceLine": 243,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_07_post_11",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "拾った辺りにも、見慣れないモンスターがいたんですよ。よかったら、これ持っていきませんか？",
          "sourceText": "トビア：拾った辺りにも、見慣れないモンスターがいたんですよ。よかったら、これ持っていきませんか？",
          "sourceLine": 244,
          "background": "images/maps/grassland.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_07_post_12",
          "kind": "production",
          "speaker": "演出",
          "text": "トビアは破片を布で包み直し、主人公に渡す。",
          "sourceText": "演出：トビアは破片を布で包み直し、主人公に渡す。",
          "sourceLine": 245,
          "background": "images/maps/grassland.webp",
          "display": false
        },
        {
          "id": "pb_07_receive_shard",
          "kind": "event",
          "action": "evidence",
          "key": "blackShardRoad"
        },
        {
          "id": "pb_07_post_13",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "なんだこれ？ただの石にしては変だな～。工房に持っていこう。",
          "sourceText": "グノーシス：なんだこれ？ただの石にしては変だな～。工房に持っていこう。",
          "sourceLine": 246,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_07_post_14",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガァ〜ウ……。",
          "sourceText": "ガルドラ：ガァ〜ウ……。",
          "sourceLine": 247,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_07_post_15",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "あ、お腹すきました？ 王都ならボルドさんの食堂がありますよ！",
          "sourceText": "トビア：あ、お腹すきました？ 王都ならボルドさんの食堂がありますよ！",
          "sourceLine": 248,
          "background": "images/maps/grassland.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_07_post_16",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "フフッ。行き先、決まったな。まずはご飯だ！",
          "sourceText": "グノーシス：フフッ。行き先、決まったな。まずはご飯だ！",
          "sourceLine": 249,
          "background": "images/maps/grassland.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_07_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第7話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第7話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 251,
          "background": "images/maps/grassland.webp",
          "label": "第7話を終える"
        }
      ]
    },
    {
      "id": "pb_08",
      "number": 8,
      "title": "王都の昼下がり",
      "location": "王都・食堂→市場→広場",
      "rewards": {
        "exp": 0,
        "coins": 0
      },
      "background": "images/maps/bg_hearth_dining_hall.webp",
      "previousEpisodeId": "pb_07",
      "battleIds": [],
      "steps": [
        {
          "id": "pb_08_pre_01",
          "kind": "production",
          "speaker": "演出",
          "text": "食堂の扉が開く。煮込みの湯気に、ガルドラの鼻先が上がる。",
          "sourceText": "演出：食堂の扉が開く。煮込みの湯気に、ガルドラの鼻先が上がる。",
          "sourceLine": 256,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "display": false
        },
        {
          "id": "pb_08_pre_02",
          "kind": "dialogue",
          "speaker": "ボルド",
          "text": "トビア！ モンスターに襲われたって聞いたぞ！無事だったか？ってお前！モンスターと一緒か！それも2匹！",
          "sourceText": "ボルド：トビア！ モンスターに襲われたって聞いたぞ！無事だったか？ってお前！モンスターと一緒か！それも2匹！",
          "sourceLine": 257,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "portrait": "images/monsters/bordo_veteran_star3_20261004.webp"
        },
        {
          "id": "pb_08_pre_03",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "それってボクのことか！？",
          "sourceText": "グノーシス:それってボクのことか！？",
          "sourceLine": 258,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_08_pre_04",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "助けてもらったんですよ！それにこのモンスターは襲ってこない良いモンスターなんですよ！",
          "sourceText": "トビア：助けてもらったんですよ！それにこのモンスターは襲ってこない良いモンスターなんですよ！",
          "sourceLine": 259,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_08_pre_05",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ボクはモンスターじゃない！",
          "sourceText": "グノーシス:ボクはモンスターじゃない！",
          "sourceLine": 260,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_08_pre_06",
          "kind": "dialogue",
          "speaker": "ボルド",
          "text": "なんだ、そういうことかい。じゃあ今日は、俺から礼をさせてくれ。",
          "sourceText": "ボルド：なんだ、そういうことかい。じゃあ今日は、俺から礼をさせてくれ。",
          "sourceLine": 261,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "portrait": "images/monsters/bordo_veteran_star3_20261004.webp"
        },
        {
          "id": "pb_08_pre_06a",
          "kind": "dialogue",
          "speaker": "ボルド",
          "text": "それと、これは旅の足しにしてくれ。トビアの荷を守ってくれた礼だ。",
          "sourceText": "ボルド：それと、これは旅の足しにしてくれ。トビアの荷を守ってくれた礼だ。",
          "sourceLine": 262,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "portrait": "images/monsters/bordo_veteran_star3_20261004.webp"
        },
        {
          "id": "pb_08_receive_stipend",
          "kind": "event",
          "action": "grant",
          "key": "travelStipend",
          "coins": 100
        },
        {
          "id": "pb_08_pre_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "まったく…ボクをモンスターと間違えるなんて。でもお礼ってのは、いい心掛けだ。ボクは大盛りで！",
          "sourceText": "グノーシス：まったく…ボクをモンスターと間違えるなんて。でもお礼ってのは、いい心掛けだ。ボクは大盛りで！",
          "sourceLine": 263,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_08_pre_08",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラが椅子へ跳び乗る。主人公が熱い皿から鼻先を遠ざける。",
          "sourceText": "演出：ガルドラが椅子へ跳び乗る。主人公が熱い皿から鼻先を遠ざける。",
          "sourceLine": 264,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "display": false
        },
        {
          "id": "pb_08_pre_09",
          "kind": "dialogue",
          "speaker": "ボルド",
          "text": "慌てるな。熱いうちがうまいが、やけどしちゃ台無しだ。",
          "sourceText": "ボルド：慌てるな。熱いうちがうまいが、やけどしちゃ台無しだ。",
          "sourceLine": 265,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "portrait": "images/monsters/bordo_veteran_star3_20261004.webp"
        },
        {
          "id": "pb_08_pre_10",
          "kind": "dialogue",
          "speaker": "ボルド",
          "text": "それにしても隊商が来ねえ。森の道で足止めでも食らってるのかね……。",
          "sourceText": "ボルド：それにしても隊商が来ねえ。森の道で足止めでも食らってるのかね……。",
          "sourceLine": 266,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "portrait": "images/monsters/bordo_veteran_star3_20261004.webp"
        },
        {
          "id": "pb_08_pre_11",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "それもモンスター？",
          "sourceText": "契約者：それもモンスター？",
          "sourceLine": 267,
          "background": "images/maps/bg_hearth_dining_hall.webp"
        },
        {
          "id": "pb_08_pre_12",
          "kind": "dialogue",
          "speaker": "ボルド",
          "text": "さぁ、どうだろうな。だが明日もこうなら、献立を変えるしかない。",
          "sourceText": "ボルド：さぁ、どうだろうな。だが明日もこうなら、献立を変えるしかない。",
          "sourceLine": 268,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "portrait": "images/monsters/bordo_veteran_star3_20261004.webp"
        },
        {
          "id": "pb_08_pre_13",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ぷはぁ！ご馳走さま！美味しかったよ！",
          "sourceText": "グノーシス:ぷはぁ！ご馳走さま！美味しかったよ！",
          "sourceLine": 269,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_08_pre_14",
          "kind": "dialogue",
          "speaker": "ボルド",
          "text": "お、いい食いっぷりだな！",
          "sourceText": "ボルド:お、いい食いっぷりだな！",
          "sourceLine": 270,
          "background": "images/maps/bg_hearth_dining_hall.webp",
          "portrait": "images/monsters/bordo_veteran_star3_20261004.webp"
        },
        {
          "id": "pb_08_pre_15",
          "kind": "narration",
          "speaker": "地の文",
          "text": "食後、三人は市場へ出た。色とりどりの札を並べた店で、少女が手を振る。",
          "sourceText": "地の文：食後、三人は市場へ出た。色とりどりの札を並べた店で、少女が手を振る。",
          "sourceLine": 271,
          "background": "images/maps/bg_market_square.webp"
        },
        {
          "id": "pb_08_pre_16",
          "kind": "dialogue",
          "speaker": "リゼ",
          "text": "そこの旅人さん。出発前の買い忘れはない？",
          "sourceText": "リゼ：そこの旅人さん。出発前の買い忘れはない？",
          "sourceLine": 272,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/lize_vendor_star2_20261004.webp"
        },
        {
          "id": "pb_08_pre_17",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あるけど、安くなる？",
          "sourceText": "グノーシス：あるけど、安くなる？",
          "sourceLine": 273,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_08_pre_18",
          "kind": "dialogue",
          "speaker": "リゼ",
          "text": "ちょっとぉ。聞くのが早くない？アタシ、せっかちは嫌いなんだよなぁ。",
          "sourceText": "リゼ：ちょっとぉ。聞くのが早くない？アタシ、せっかちは嫌いなんだよなぁ。",
          "sourceLine": 274,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/lize_vendor_star2_20261004.webp"
        },
        {
          "id": "pb_08_pre_19",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "むぅ～。じゃあ、何があるの？",
          "sourceText": "グノーシス:むぅ～。じゃあ、何があるの？",
          "sourceLine": 275,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_08_pre_20",
          "kind": "dialogue",
          "speaker": "リゼ",
          "text": "使う道具を一つ選んで。見た目が似てても、できることは違うの。",
          "sourceText": "リゼ：使う道具を一つ選んで。見た目が似てても、できることは違うの。",
          "sourceLine": 276,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/lize_vendor_star2_20261004.webp"
        },
        {
          "id": "pb_08_pre_21",
          "kind": "system",
          "speaker": "システム",
          "text": "ショップで道具の効果・個数・合計金額を確認しましょう。購入を取り消しても物語は進みます。",
          "sourceText": "システム：ショップで道具の効果・個数・合計金額を確認しましょう。購入を取り消しても物語は進みます。",
          "sourceLine": 277,
          "background": "images/maps/bg_market_square.webp"
        },
        {
          "id": "pb_08_battle",
          "kind": "event",
          "speaker": "",
          "text": "戦闘なし。指定の操作を経て後半へ。",
          "sourceText": "戦闘なし。指定の操作を経て後半へ。",
          "sourceLine": 278,
          "background": "images/maps/bg_market_square.webp",
          "action": "shop"
        },
        {
          "id": "pb_08_post_01",
          "kind": "dialogue",
          "speaker": "リゼ",
          "text": "購入時「毎度あり！次もご贔屓に～！」／未購入時「あら、今日は見るだけ？ 次はちゃんと買ってってね～！」",
          "sourceText": "リゼ：購入時「毎度あり！次もご贔屓に～！」／未購入時「あら、今日は見るだけ？ 次はちゃんと買ってってね～！」",
          "sourceLine": 280,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/lize_vendor_star2_20261004.webp",
          "variants": {
            "purchased": "毎度あり！次もご贔屓に～！",
            "notPurchased": "あら、今日は見るだけ？ 次はちゃんと買ってってね～！"
          }
        },
        {
          "id": "pb_08_post_02",
          "kind": "narration",
          "speaker": "地の文",
          "text": "広場には人だかりができていた。小さな星の光が、輪を描いて宙を舞う。",
          "sourceText": "地の文：広場には人だかりができていた。小さな星の光が、輪を描いて宙を舞う。",
          "sourceLine": 281,
          "background": "images/maps/bg_market_square.webp"
        },
        {
          "id": "pb_08_post_03",
          "kind": "dialogue",
          "speaker": "ミレーユ",
          "text": "さあさあ！よそ見はもったいないよ。次の星は、君のすぐ後ろ！",
          "sourceText": "ミレーユ：さあさあ！よそ見はもったいないよ。次の星は、君のすぐ後ろ！",
          "sourceLine": 282,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/mireille_performer_star2_20261004.webp"
        },
        {
          "id": "pb_08_post_04",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガルッ！",
          "sourceText": "ガルドラ：ガルッ！",
          "sourceLine": 283,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_08_post_05",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラが光へ跳ぶ。すり抜けた拍子にグノーシスへ飛びつく。",
          "sourceText": "演出：ガルドラが光へ跳ぶ。すり抜けた拍子にグノーシスへ飛びつく。",
          "sourceLine": 284,
          "background": "images/maps/bg_market_square.webp",
          "display": false
        },
        {
          "id": "pb_08_post_06",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "わっ！ ボクは星じゃない！",
          "sourceText": "グノーシス：わっ！ ボクは星じゃない！",
          "sourceLine": 285,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_08_post_07",
          "kind": "dialogue",
          "speaker": "ミレーユ",
          "text": "ふふ、大当たり。今日いちばん元気なお客さんだ。",
          "sourceText": "ミレーユ：ふふ、大当たり。今日いちばん元気なお客さんだ。",
          "sourceLine": 286,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/mireille_performer_star2_20261004.webp"
        },
        {
          "id": "pb_08_post_08",
          "kind": "production",
          "speaker": "演出",
          "text": "客が去ると、ミレーユは道具の小箱を閉じ、声を落とす。",
          "sourceText": "演出：客が去ると、ミレーユは道具の小箱を閉じ、声を落とす。",
          "sourceLine": 287,
          "background": "images/maps/bg_market_square.webp",
          "display": false
        },
        {
          "id": "pb_08_post_09",
          "kind": "dialogue",
          "speaker": "ミレーユ",
          "text": "さっきはありがとうね。台本通りだったわ。",
          "sourceText": "ミレーユ：さっきはありがとうね。台本通りだったわ。",
          "sourceLine": 288,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/mireille_performer_star2_20261004.webp"
        },
        {
          "id": "pb_08_post_10",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "台本？何も読んでないけど？",
          "sourceText": "グノーシス:台本？何も読んでないけど？",
          "sourceLine": 289,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_08_post_11",
          "kind": "dialogue",
          "speaker": "ミレーユ",
          "text": "ふふっ、冗談よ。ところであなた達、あまり見ない格好ね。",
          "sourceText": "ミレーユ:ふふっ、冗談よ。ところであなた達、あまり見ない格好ね。",
          "sourceLine": 290,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/mireille_performer_star2_20261004.webp"
        },
        {
          "id": "pb_08_post_12",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "旅をしてるんだ。まだ始めたばかりなんだけど。",
          "sourceText": "契約者:旅をしてるんだ。まだ始めたばかりなんだけど。",
          "sourceLine": 291,
          "background": "images/maps/bg_market_square.webp"
        },
        {
          "id": "pb_08_post_13",
          "kind": "dialogue",
          "speaker": "ミレーユ",
          "text": "へぇ～、旅！それは良いわね。あ、そうだ。そしたら、こんなのは聞いたことがある？東の平原ではね、昼なのに星が見えたっていうの。",
          "sourceText": "ミレーユ:へぇ～、旅！それは良いわね。あ、そうだ。そしたら、こんなのは聞いたことがある？東の平原ではね、昼なのに星が見えたっていうの。",
          "sourceLine": 292,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/mireille_performer_star2_20261004.webp"
        },
        {
          "id": "pb_08_post_14",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "昼に星？ それ、いつの話？",
          "sourceText": "グノーシス：昼に星？ それ、いつの話？",
          "sourceLine": 293,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_08_post_15",
          "kind": "dialogue",
          "speaker": "ミレーユ",
          "text": "二晩前に戻った旅人からよ。詳しい場所までは聞けなかったけどね。",
          "sourceText": "ミレーユ：二晩前に戻った旅人からよ。詳しい場所までは聞けなかったけどね。",
          "sourceLine": 294,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/mireille_performer_star2_20261004.webp"
        },
        {
          "id": "pb_08_post_16",
          "kind": "production",
          "speaker": "演出",
          "text": "門の方で鐘が乱打される。ミレーユが小箱を抱えて振り向く。",
          "sourceText": "演出：門の方で鐘が乱打される。ミレーユが小箱を抱えて振り向く。",
          "sourceLine": 295,
          "background": "images/maps/bg_market_square.webp",
          "display": false
        },
        {
          "id": "pb_08_post_17",
          "kind": "dialogue",
          "speaker": "門番",
          "text": "門から離れろ！ 広場を空けてくれ！",
          "sourceText": "門番：門から離れろ！ 広場を空けてくれ！",
          "sourceLine": 296,
          "background": "images/maps/bg_market_square.webp"
        },
        {
          "id": "pb_08_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第8話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第8話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 298,
          "background": "images/maps/bg_market_square.webp",
          "label": "第8話を終える"
        }
      ]
    },
    {
      "id": "pb_09",
      "number": 9,
      "title": "門から響く悲鳴",
      "location": "王都・城門と広場",
      "rewards": {
        "exp": 360,
        "coins": 100
      },
      "background": "images/maps/bg_city_gate.webp",
      "previousEpisodeId": "pb_08",
      "battleIds": [
        "p2_09_a",
        "p2_09_b"
      ],
      "steps": [
        {
          "id": "pb_09_pre_01",
          "kind": "production",
          "speaker": "演出",
          "text": "グラスビートが横倒しの荷車にぶつかる。上空ではシルフィンが旋回し、門の向こうで青い火花が散る。",
          "sourceText": "演出：グラスビートが横倒しの荷車にぶつかる。上空ではシルフィンが旋回し、門の向こうで青い火花が散る。",
          "sourceLine": 303,
          "background": "images/maps/bg_city_gate.webp",
          "display": false
        },
        {
          "id": "pb_09_pre_02",
          "kind": "dialogue",
          "speaker": "ブリジット",
          "text": "門の中央を空けろ！ 人は壁沿いに下がれ！",
          "sourceText": "ブリジット：門の中央を空けろ！ 人は壁沿いに下がれ！",
          "sourceLine": 304,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/monsters/brigitte_knight_star3_20261004.webp"
        },
        {
          "id": "pb_09_pre_03",
          "kind": "dialogue",
          "speaker": "エルナ",
          "text": "こっちです！ 歩ける人は、前の人を押さずについてきて！",
          "sourceText": "エルナ：こっちです！ 歩ける人は、前の人を押さずについてきて！",
          "sourceLine": 305,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/tutorial/characters/elna_beginner.png"
        },
        {
          "id": "pb_09_pre_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "エルナ！ また大変なところで会ったな！",
          "sourceText": "グノーシス：エルナ！ また大変なところで会ったな！",
          "sourceLine": 306,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_09_pre_05",
          "kind": "dialogue",
          "speaker": "エルナ",
          "text": "あ、皆さん！ あの荷車の陰に、まだ人が！",
          "sourceText": "エルナ：あ、皆さん！ あの荷車の陰に、まだ人が！",
          "sourceLine": 307,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/tutorial/characters/elna_beginner.png"
        },
        {
          "id": "pb_09_pre_06",
          "kind": "production",
          "speaker": "演出",
          "text": "ブリジットが盾を構え、ボルテックとスパクインの放電を受け流す。",
          "sourceText": "演出：ブリジットが盾を構え、ボルテックとスパクインの放電を受け流す。",
          "sourceLine": 308,
          "background": "images/maps/bg_city_gate.webp",
          "display": false
        },
        {
          "id": "pb_09_pre_07",
          "kind": "dialogue",
          "speaker": "ブリジット",
          "text": "私はこいつらを引き受ける。荷車の前を頼めるか！",
          "sourceText": "ブリジット：私はこいつらを引き受ける。荷車の前を頼めるか！",
          "sourceLine": 309,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/monsters/brigitte_knight_star3_20261004.webp"
        },
        {
          "id": "pb_09_pre_08",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "任せて！",
          "sourceText": "契約者：任せて！",
          "sourceLine": 310,
          "background": "images/maps/bg_city_gate.webp"
        },
        {
          "id": "pb_09_pre_09",
          "kind": "dialogue",
          "speaker": "ミレーユ",
          "text": "ほら、悪いモンスターはこっちよ！",
          "sourceText": "ミレーユ：ほら、悪いモンスターはこっちよ！",
          "sourceLine": 311,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/monsters/mireille_performer_star2_20261004.webp"
        },
        {
          "id": "pb_09_pre_10",
          "kind": "production",
          "speaker": "演出",
          "text": "幻の光を追い、シルフィンが屋根の上へ離れる。",
          "sourceText": "演出：幻の光を追い、シルフィンが屋根の上へ離れる。",
          "sourceLine": 312,
          "background": "images/maps/bg_city_gate.webp",
          "display": false
        },
        {
          "id": "pb_09_pre_11",
          "kind": "dialogue",
          "speaker": "リゼ",
          "text": "お客さんたち、こっち！ 店の奥なら隠れられるよ！",
          "sourceText": "リゼ：お客さんたち、こっち！ 店の奥なら隠れられるよ！",
          "sourceLine": 313,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/monsters/lize_vendor_star2_20261004.webp"
        },
        {
          "id": "pb_09_pre_12",
          "kind": "dialogue",
          "speaker": "ボルド",
          "text": "騒がしいから来てみれば、街の中にまでモンスターだと！？動けない人は俺が運ぶ！ トビア、先に道を見てくれ！",
          "sourceText": "ボルド：騒がしいから来てみれば、街の中にまでモンスターだと！？動けない人は俺が運ぶ！ トビア、先に道を見てくれ！",
          "sourceLine": 314,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/monsters/bordo_veteran_star3_20261004.webp"
        },
        {
          "id": "pb_09_pre_13",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "は、はい！ こっち、通れます！",
          "sourceText": "トビア：は、はい！ こっち、通れます！",
          "sourceLine": 315,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_09_pre_14",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ボクらは、目の前の一体を止めるぞ！",
          "sourceText": "グノーシス：ボクらは、目の前の一体を止めるぞ！",
          "sourceLine": 316,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_09_battle",
          "kind": "battle",
          "speaker": "",
          "text": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceText": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceLine": 317,
          "background": "images/maps/bg_city_gate.webp",
          "battleId": "p2_09_a"
        },
        {
          "id": "pb_09_post_01",
          "kind": "production",
          "speaker": "演出",
          "text": "グラスビートが脇へ退く。エルナが荷車の陰から残された人達を連れ出す。",
          "sourceText": "演出：グラスビートが脇へ退く。エルナが荷車の陰から残された人達を連れ出す。",
          "sourceLine": 319,
          "background": "images/maps/bg_city_gate.webp",
          "display": false
        },
        {
          "id": "pb_09_post_02",
          "kind": "dialogue",
          "speaker": "エルナ",
          "text": "モンスターが退いた…。けど、まだ残ってます！",
          "sourceText": "エルナ：モンスターが退いた…。けど、まだ残ってます！",
          "sourceLine": 320,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/tutorial/characters/elna_beginner.png"
        },
        {
          "id": "pb_09_post_03",
          "kind": "dialogue",
          "speaker": "ブリジット",
          "text": "次の放電が来る！ 私の盾の後ろへ！",
          "sourceText": "ブリジット：次の放電が来る！ 私の盾の後ろへ！",
          "sourceLine": 321,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/monsters/brigitte_knight_star3_20261004.webp"
        },
        {
          "id": "pb_09_post_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "PrayerName、すぐに攻めなくてもいい。体力や技を見て、守る手も使おう！",
          "sourceText": "グノーシス：PrayerName、すぐに攻めなくてもいい。体力や技を見て、守る手も使おう！",
          "sourceLine": 322,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_09_post_05",
          "kind": "system",
          "speaker": "システム",
          "text": "次の戦闘でも道具・交代・装備中の補助技を使えます。使える行動は手持ちの内容で変わります。",
          "sourceText": "システム：次の戦闘でも道具・交代・装備中の補助技を使えます。使える行動は手持ちの内容で変わります。",
          "sourceLine": 323,
          "background": "images/maps/bg_city_gate.webp"
        },
        {
          "id": "p2_09_b_start",
          "kind": "battle",
          "battleId": "p2_09_b",
          "background": "images/maps/bg_city_gate.webp"
        },
        {
          "id": "pb_09_post_06",
          "kind": "production",
          "speaker": "演出",
          "text": "二戦目へ。勝利後、ブリジットが槍で地面を叩き、城門の外へ退路を示す。",
          "sourceText": "演出：二戦目へ。勝利後、ブリジットが槍で地面を叩き、城門の外へ退路を示す。",
          "sourceLine": 324,
          "background": "images/maps/bg_city_gate.webp",
          "display": false
        },
        {
          "id": "pb_09_post_07",
          "kind": "narration",
          "speaker": "地の文",
          "text": "ボルテックが門外へ退くと、スパクインもその後を追った。",
          "sourceText": "地の文：ボルテックが門外へ退くと、スパクインもその後を追った。",
          "sourceLine": 325,
          "background": "images/maps/bg_city_gate.webp"
        },
        {
          "id": "pb_09_post_08",
          "kind": "dialogue",
          "speaker": "ブリジット",
          "text": "追う必要はない。まず、倒れている者を運ぶべきだ。",
          "sourceText": "ブリジット：追う必要はない。まず、倒れている者を運ぶべきだ。",
          "sourceLine": 326,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/monsters/brigitte_knight_star3_20261004.webp"
        },
        {
          "id": "pb_09_post_09",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "街を壊しに来たにしては……ずっと後ろを気にしてたな。",
          "sourceText": "グノーシス：街を壊しに来たにしては……ずっと後ろを気にしてたな。",
          "sourceLine": 327,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_09_post_10",
          "kind": "dialogue",
          "speaker": "エルナ",
          "text": "実は、襲われたのは人だけじゃなくて、モンスターもなんです。",
          "sourceText": "エルナ：実は、襲われたのは人だけじゃなくて、モンスターもなんです。",
          "sourceLine": 328,
          "background": "images/maps/bg_city_gate.webp",
          "portrait": "images/tutorial/characters/elna_beginner.png"
        },
        {
          "id": "pb_09_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第9話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第9話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 330,
          "background": "images/maps/bg_city_gate.webp",
          "label": "第9話を終える"
        }
      ]
    },
    {
      "id": "pb_10",
      "number": 10,
      "title": "傷ついていたのは",
      "location": "王都・臨時救護所",
      "rewards": {
        "exp": 0,
        "coins": 50
      },
      "background": "images/maps/bg_medical_tent.webp",
      "previousEpisodeId": "pb_09",
      "battleIds": [],
      "steps": [
        {
          "id": "pb_10_pre_01",
          "kind": "production",
          "speaker": "演出",
          "text": "セレネが布を水で湿らせ、倒れたグラスビートの脚を確かめる。エルナは隣で包帯を切っている。",
          "sourceText": "演出：セレネが布を水で湿らせ、倒れたグラスビートの脚を確かめる。エルナは隣で包帯を切っている。",
          "sourceLine": 335,
          "background": "images/maps/bg_medical_tent.webp",
          "display": false
        },
        {
          "id": "pb_10_pre_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "モンスターも診てるのか？",
          "sourceText": "グノーシス：モンスターも診てるのか？",
          "sourceLine": 336,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_10_pre_03",
          "kind": "dialogue",
          "speaker": "セレネ",
          "text": "暴れていなければ患者よ。その布を取って。",
          "sourceText": "セレネ：暴れていなければ患者よ。その布を取って。",
          "sourceLine": 337,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/monsters/selene_patrol_star2_20261004.webp"
        },
        {
          "id": "pb_10_pre_04",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公が布を渡す。ガルドラは離れた場所に座り、治療を見守る。",
          "sourceText": "演出：主人公が布を渡す。ガルドラは離れた場所に座り、治療を見守る。",
          "sourceLine": 338,
          "background": "images/maps/bg_medical_tent.webp",
          "display": false
        },
        {
          "id": "pb_10_pre_05",
          "kind": "dialogue",
          "speaker": "セレネ",
          "text": "この擦り傷には乾いた泥が入っている。街で付いたばかりの傷じゃないわ。",
          "sourceText": "セレネ：この擦り傷には乾いた泥が入っている。街で付いたばかりの傷じゃないわ。",
          "sourceLine": 339,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/monsters/selene_patrol_star2_20261004.webp"
        },
        {
          "id": "pb_10_pre_06",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "森の坂道、今ぬかるんでます。車輪が取られるくらい。",
          "sourceText": "トビア：森の坂道、今ぬかるんでます。車輪が取られるくらい。",
          "sourceLine": 340,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_10_pre_07",
          "kind": "dialogue",
          "speaker": "セレネ",
          "text": "それだけで場所は決められないわ。でも、街へ来る前から傷ついていたのは確かね。",
          "sourceText": "セレネ：それだけで場所は決められないわ。でも、街へ来る前から傷ついていたのは確かね。",
          "sourceLine": 341,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/monsters/selene_patrol_star2_20261004.webp"
        },
        {
          "id": "pb_10_pre_08",
          "kind": "dialogue",
          "speaker": "エルナ",
          "text": "襲いに来たんじゃなくて……逃げてきたんでしょうか。",
          "sourceText": "エルナ：襲いに来たんじゃなくて……逃げてきたんでしょうか。",
          "sourceLine": 342,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/tutorial/characters/elna_beginner.png"
        },
        {
          "id": "pb_10_pre_09",
          "kind": "dialogue",
          "speaker": "ブリジット",
          "text": "ならば門を固めるだけでは終わらんな。",
          "sourceText": "ブリジット：ならば門を固めるだけでは終わらんな。",
          "sourceLine": 343,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/monsters/brigitte_knight_star3_20261004.webp"
        },
        {
          "id": "pb_10_pre_10",
          "kind": "dialogue",
          "speaker": "セレネ",
          "text": "手当ての薬なら、市場の店でも買えるわ。旅に出るなら揃えておきなさい。",
          "sourceText": "セレネ：手当ての薬なら、市場の店でも買えるわ。旅に出るなら揃えておきなさい。",
          "sourceLine": 344,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/monsters/selene_patrol_star2_20261004.webp"
        },
        {
          "id": "pb_10_pre_11",
          "kind": "system",
          "speaker": "システム",
          "text": "ショップでは道具を買えます。",
          "sourceText": "システム：ショップでは道具を買えます。",
          "sourceLine": 345,
          "background": "images/maps/bg_medical_tent.webp"
        },
        {
          "id": "pb_10_battle",
          "kind": "production",
          "speaker": "",
          "text": "戦闘なし。会話のまま後半へ。",
          "sourceText": "戦闘なし。会話のまま後半へ。",
          "sourceLine": 346,
          "background": "images/maps/bg_medical_tent.webp",
          "display": false
        },
        {
          "id": "pb_10_post_01",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "またリゼの店か！ 今度こそ値切ってやる！",
          "sourceText": "グノーシス：またリゼの店か！ 今度こそ値切ってやる！",
          "sourceLine": 348,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_10_post_02",
          "kind": "dialogue",
          "speaker": "セレネ",
          "text": "よく見て選ぶこと。それから、ここで休むのも治療のうちよ。",
          "sourceText": "セレネ：よく見て選ぶこと。それから、ここで休むのも治療のうちよ。",
          "sourceLine": 349,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/monsters/selene_patrol_star2_20261004.webp"
        },
        {
          "id": "pb_10_post_03",
          "kind": "production",
          "speaker": "演出",
          "text": "治療を終えたモンスターが頭を上げる。ガルドラも小さく首を傾ける。",
          "sourceText": "演出：治療を終えたモンスターが頭を上げる。ガルドラも小さく首を傾ける。",
          "sourceLine": 350,
          "background": "images/maps/bg_medical_tent.webp",
          "display": false
        },
        {
          "id": "pb_10_post_04",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル……。",
          "sourceText": "ガルドラ：ガル……。",
          "sourceLine": 351,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_10_post_05",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "隊商が遅れてるのも、同じ道です。森へ入る橋の先で…。",
          "sourceText": "トビア：隊商が遅れてるのも、同じ道です。森へ入る橋の先で…。",
          "sourceLine": 352,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_10_post_06",
          "kind": "dialogue",
          "speaker": "ブリジット",
          "text": "私は王都を離れられない。調べてきてもらえるか。危険なら引き返してくれ。",
          "sourceText": "ブリジット：私は王都を離れられない。調べてきてもらえるか。危険なら引き返してくれ。",
          "sourceLine": 353,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/monsters/brigitte_knight_star3_20261004.webp"
        },
        {
          "id": "pb_10_post_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ボクらに任せろ！な、PrayerName！",
          "sourceText": "グノーシス:ボクらに任せろ！な、PrayerName！",
          "sourceLine": 354,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_10_post_08",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "その前に、まずは工房に寄ろうか。",
          "sourceText": "契約者：その前に、まずは工房に寄ろうか。",
          "sourceLine": 355,
          "background": "images/maps/bg_medical_tent.webp"
        },
        {
          "id": "pb_10_post_09",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "そうだ。あの破片も見てもらわないとな。",
          "sourceText": "グノーシス：そうだ。あの破片も見てもらわないとな。",
          "sourceLine": 356,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_10_post_10",
          "kind": "dialogue",
          "speaker": "エルナ",
          "text": "私はここで手伝います。帰ったら、何があったか教えてください。",
          "sourceText": "エルナ：私はここで手伝います。帰ったら、何があったか教えてください。",
          "sourceLine": 357,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/tutorial/characters/elna_beginner.png"
        },
        {
          "id": "pb_10_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第10話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第10話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 359,
          "background": "images/maps/bg_medical_tent.webp",
          "label": "第10話を終える"
        }
      ]
    },
    {
      "id": "pb_11",
      "number": 11,
      "title": "工房に集まる手掛かり",
      "location": "魔導学園・地下工房",
      "rewards": {
        "exp": 0,
        "coins": 50
      },
      "background": "images/maps/bg_alchemy_workshop.webp",
      "previousEpisodeId": "pb_10",
      "battleIds": [],
      "steps": [
        {
          "id": "pb_11_pre_01",
          "kind": "dialogue",
          "speaker": "ステラ",
          "text": "もう帰ってきたのね！ ",
          "sourceText": "ステラ：もう帰ってきたのね！ ",
          "sourceLine": 364,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/stella_apprentice.png"
        },
        {
          "id": "pb_11_pre_02",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "色々あってね",
          "sourceText": "契約者：色々あってね",
          "sourceLine": 365,
          "background": "images/maps/bg_alchemy_workshop.webp"
        },
        {
          "id": "pb_11_pre_03",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "き、聞いてます。街がモンスターに襲われたって。",
          "sourceText": "ルミナ：き、聞いてます。街がモンスターに襲われたって。",
          "sourceLine": 366,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_11_pre_04",
          "kind": "dialogue",
          "speaker": "ステラ",
          "text": "もうちょっと早く行けば、私も活躍出来たのに！",
          "sourceText": "ステラ:もうちょっと早く行けば、私も活躍出来たのに！",
          "sourceLine": 367,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/stella_apprentice.png"
        },
        {
          "id": "pb_11_pre_05",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "そ、それは危ないよ。",
          "sourceText": "ルミナ:そ、それは危ないよ。",
          "sourceLine": 368,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_11_pre_06",
          "kind": "dialogue",
          "speaker": "ステラ",
          "text": "ルミナだって習った魔法を試したいでしょ？それより、アンタ達何しに来たのよ！",
          "sourceText": "ステラ:ルミナだって習った魔法を試したいでしょ？それより、アンタ達何しに来たのよ！",
          "sourceLine": 369,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/stella_apprentice.png"
        },
        {
          "id": "pb_11_pre_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "それを今から言うんだろ！これ！この破片！何か知らない？",
          "sourceText": "グノーシス:それを今から言うんだろ！これ！この破片！何か知らない？",
          "sourceLine": 370,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_11_pre_08",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "なんだろう？取りあえず、調べてみるね。まず、その破片を机に置いて。",
          "sourceText": "ルミナ:なんだろう？取りあえず、調べてみるね。まず、その破片を机に置いて。",
          "sourceLine": 371,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_11_pre_09",
          "kind": "production",
          "speaker": "演出",
          "text": "ルミナが破片に灯りを当てる。細い星の筋が、黒い面から浮いて見える。",
          "sourceText": "演出：ルミナが破片に灯りを当てる。細い星の筋が、黒い面から浮いて見える。",
          "sourceLine": 372,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "display": false
        },
        {
          "id": "pb_11_pre_10",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "二つの反応が重なっている。地の部分と、この光。うーん。なんだろう？ローデンさんなら、何か知ってるかな？",
          "sourceText": "ルミナ：二つの反応が重なっている。地の部分と、この光。うーん。なんだろう？ローデンさんなら、何か知ってるかな？",
          "sourceLine": 373,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_11_pre_11",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ローデン？",
          "sourceText": "グノーシス:ローデン？",
          "sourceLine": 374,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_11_pre_12",
          "kind": "dialogue",
          "speaker": "ステラ",
          "text": "工房に引きこもってる頑固ジジイよ！",
          "sourceText": "ステラ:工房に引きこもってる頑固ジジイよ！",
          "sourceLine": 375,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/stella_apprentice.png"
        },
        {
          "id": "pb_11_pre_13",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "そ、そんな言い方しちゃ駄目だよ！ローデンさんは物知りだから、色んなことを教えてくれるんです。だから、この破片についても分かるかも。",
          "sourceText": "ルミナ:そ、そんな言い方しちゃ駄目だよ！ローデンさんは物知りだから、色んなことを教えてくれるんです。だから、この破片についても分かるかも。",
          "sourceLine": 376,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_11_pre_14",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "じゃあ、その人のところまで行こう！",
          "sourceText": "グノーシス:じゃあ、その人のところまで行こう！",
          "sourceLine": 377,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_11_pre_15",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "あ、案内するね。私もその破片について気になるし。",
          "sourceText": "ルミナ:あ、案内するね。私もその破片について気になるし。",
          "sourceLine": 378,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_11_pre_16",
          "kind": "production",
          "speaker": "演出",
          "text": "ローデンの工房へ。",
          "sourceText": "演出：ローデンの工房へ。",
          "sourceLine": 379,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "display": false
        },
        {
          "id": "pb_11_pre_17",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "ロ、ローデンさん？いる？",
          "sourceText": "ルミナ:ロ、ローデンさん？いる？",
          "sourceLine": 380,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_11_pre_18",
          "kind": "dialogue",
          "speaker": "ローデン",
          "text": "おぉ、ルミナか。どうした。また錬成か？ん？なんだ、今日は1人じゃないのか。",
          "sourceText": "ローデン:おぉ、ルミナか。どうした。また錬成か？ん？なんだ、今日は1人じゃないのか。",
          "sourceLine": 381,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/roden_battle_star3_20261004.webp"
        },
        {
          "id": "pb_11_pre_19",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "う、うん。あのね、これなんだけど。",
          "sourceText": "ルミナ:う、うん。あのね、これなんだけど。",
          "sourceLine": 382,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_11_pre_20",
          "kind": "production",
          "speaker": "演出",
          "text": "ローデンに破片を見せる。",
          "sourceText": "演出：ローデンに破片を見せる。",
          "sourceLine": 383,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "display": false
        },
        {
          "id": "pb_11_pre_21",
          "kind": "dialogue",
          "speaker": "ローデン",
          "text": "寄越せ。……削り屑じゃねえ。叩いて割れた跡とも違うな。",
          "sourceText": "ローデン：寄越せ。……削り屑じゃねえ。叩いて割れた跡とも違うな。",
          "sourceLine": 384,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/roden_battle_star3_20261004.webp"
        },
        {
          "id": "pb_11_pre_22",
          "kind": "dialogue",
          "speaker": "ステラ",
          "text": "じゃあ、誰かが作った道具の破片じゃない？",
          "sourceText": "ステラ：じゃあ、誰かが作った道具の破片じゃない？",
          "sourceLine": 385,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/stella_apprentice.png"
        },
        {
          "id": "pb_11_pre_23",
          "kind": "dialogue",
          "speaker": "ローデン",
          "text": "まだそうは言ってねえ。分からんことを先に決めるな。",
          "sourceText": "ローデン：まだそうは言ってねえ。分からんことを先に決めるな。",
          "sourceLine": 386,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/roden_battle_star3_20261004.webp"
        },
        {
          "id": "pb_11_pre_24",
          "kind": "dialogue",
          "speaker": "ニコ",
          "text": "ぼくの測定器なら、反応を比べられるよ！",
          "sourceText": "ニコ：ぼくの測定器なら、反応を比べられるよ！",
          "sourceLine": 387,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/nico_maker_star2_20261004.webp"
        },
        {
          "id": "pb_11_pre_25",
          "kind": "dialogue",
          "speaker": "ローデン",
          "text": "ニコ、急に横から割って入るな。まぁいい。調べてみないことには分からんからな。",
          "sourceText": "ローデン:ニコ、急に横から割って入るな。まぁいい。調べてみないことには分からんからな。",
          "sourceLine": 388,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/roden_battle_star3_20261004.webp"
        },
        {
          "id": "pb_11_pre_26",
          "kind": "production",
          "speaker": "演出",
          "text": "針が左右へ大きく振れる。ニコが慌ててねじを押さえる。",
          "sourceText": "演出：針が左右へ大きく振れる。ニコが慌ててねじを押さえる。",
          "sourceLine": 389,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "display": false
        },
        {
          "id": "pb_11_pre_27",
          "kind": "dialogue",
          "speaker": "ステラ",
          "text": "……壊れてない？",
          "sourceText": "ステラ：……壊れてない？",
          "sourceLine": 390,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/stella_apprentice.png"
        },
        {
          "id": "pb_11_pre_28",
          "kind": "dialogue",
          "speaker": "ニコ",
          "text": "壊れてない！ たぶん。いや、確かめる。別の石でも測れば分かるはずだよ！",
          "sourceText": "ニコ：壊れてない！ たぶん。いや、確かめる。別の石でも測れば分かるはずだよ！",
          "sourceLine": 391,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/nico_maker_star2_20261004.webp"
        },
        {
          "id": "pb_11_pre_29",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "お、それならボクらが、比べられるものを持ってくるぞ。",
          "sourceText": "グノーシス：お、それならボクらが、比べられるものを持ってくるぞ。",
          "sourceLine": 392,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_11_pre_30",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "な、なら準備しないと。",
          "sourceText": "ルミナ：な、なら準備しないと。",
          "sourceLine": 393,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_11_pre_31",
          "kind": "dialogue",
          "speaker": "ニコ",
          "text": "森で同じようなのを見つけたら、持ってきてくれる？ 今度はこの破片と並べて測ってみたいんだ！",
          "sourceText": "ニコ：森で同じようなのを見つけたら、持ってきてくれる？ 今度はこの破片と並べて測ってみたいんだ！",
          "sourceLine": 394,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/nico_maker_star2_20261004.webp"
        },
        {
          "id": "pb_11_pre_32",
          "kind": "dialogue",
          "speaker": "ローデン",
          "text": "森に行くなら、技も見直していけ。技は組み合わせ次第で、今より使える技になる。ほら、この三枚で一度やってみろ。",
          "sourceText": "ローデン：森に行くなら、技も見直していけ。技は組み合わせ次第で、今より使える技になる。ほら、この三枚で一度やってみろ。",
          "sourceLine": 395,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/roden_battle_star3_20261004.webp"
        },
        {
          "id": "pb_11_battle",
          "kind": "event",
          "speaker": "",
          "text": "戦闘なし。指定の操作を経て後半へ。",
          "sourceText": "戦闘なし。指定の操作を経て後半へ。",
          "sourceLine": 396,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "action": "synthesis",
          "materialIds": [
            "s110_001",
            "s110_002",
            "s110_008"
          ],
          "resultId": "s110_061"
        },
        {
          "id": "pb_11_post_01",
          "kind": "dialogue",
          "speaker": "ローデン",
          "text": "ほう、上級の「捨て身打ち」か。いつも上の級になるわけじゃねえが……お前たち、運がいいな。しかし反動がある。ここぞってときに使え。",
          "sourceText": "ローデン：ほう、上級の「捨て身打ち」か。いつも上の級になるわけじゃねえが……お前たち、運がいいな。しかし反動がある。ここぞってときに使え。",
          "sourceLine": 398,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/roden_battle_star3_20261004.webp"
        },
        {
          "id": "pb_11_post_02",
          "kind": "dialogue",
          "speaker": "ステラ",
          "text": "へぇ、上級じゃない！ で、誰に持たせるの？",
          "sourceText": "ステラ：へぇ、上級じゃない！ で、誰に持たせるの？",
          "sourceLine": 399,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/stella_apprentice.png"
        },
        {
          "id": "pb_11_post_03",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "そうだ、装備しなきゃ使えないんだった！ PrayerName、誰が使えそうか見てこうよ。",
          "sourceText": "グノーシス：そうだ、装備しなきゃ使えないんだった！ PrayerName、誰が使えそうか見てこうよ。",
          "sourceLine": 400,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_11_equip_guide",
          "kind": "event",
          "action": "equipment"
        },
        {
          "id": "pb_11_post_04",
          "kind": "production",
          "speaker": "演出",
          "text": "ローデンが道具袋の緩んだ金具を締め直し、主人公に返す。",
          "sourceText": "演出：ローデンが道具袋の緩んだ金具を締め直し、主人公に返す。",
          "sourceLine": 401,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "display": false
        },
        {
          "id": "pb_11_post_05",
          "kind": "dialogue",
          "speaker": "ローデン",
          "text": "その技カードは持ってけ。袋の口は閉めとけよ。森で落としたら拾いにゃ行かねえぞ。",
          "sourceText": "ローデン：その技カードは持ってけ。袋の口は閉めとけよ。森で落としたら拾いにゃ行かねえぞ。",
          "sourceLine": 402,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/roden_battle_star3_20261004.webp"
        },
        {
          "id": "pb_11_post_06",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "あ、最初の破片は預かるね。似たのが見つかったら、どんな場所に落ちてたかも覚えてきて。",
          "sourceText": "ルミナ：あ、最初の破片は預かるね。似たのが見つかったら、どんな場所に落ちてたかも覚えてきて。",
          "sourceLine": 403,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_11_post_07",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル！",
          "sourceText": "ガルドラ：ガル！",
          "sourceLine": 404,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_11_post_08",
          "kind": "dialogue",
          "speaker": "ニコ",
          "text": "戻ってくるまでに、この針がホントにおかしくないか、ぼくも調べとくよ！",
          "sourceText": "ニコ：戻ってくるまでに、この針がホントにおかしくないか、ぼくも調べとくよ！",
          "sourceLine": 405,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/nico_maker_star2_20261004.webp"
        },
        {
          "id": "pb_11_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第11話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第11話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 407,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "label": "第11話を終える"
        }
      ]
    },
    {
      "id": "pb_12",
      "number": 12,
      "title": "帰れない隊商",
      "location": "森林・街道の橋",
      "rewards": {
        "exp": 420,
        "coins": 100
      },
      "background": "images/maps/forest.webp",
      "previousEpisodeId": "pb_11",
      "battleIds": [
        "p2_12_a"
      ],
      "steps": [
        {
          "id": "pb_12_pre_01",
          "kind": "narration",
          "speaker": "地の文",
          "text": "トビアが教えてくれた橋を渡ると、荷車が何台も止まっていた。一番前で、槍を持った少女が茂みをにらんでいる。",
          "sourceText": "地の文：トビアが教えてくれた橋を渡ると、荷車が何台も止まっていた。一番前で、槍を持った少女が茂みをにらんでいる。",
          "sourceLine": 412,
          "background": "images/maps/forest.webp"
        },
        {
          "id": "pb_12_pre_02",
          "kind": "dialogue",
          "speaker": "サフィラ",
          "text": "荷車のそばから動くな！ 後ろのヤツも！ そっちの茂みにもいるぞ！",
          "sourceText": "サフィラ：荷車のそばから動くな！ 後ろのヤツも！ そっちの茂みにもいるぞ！",
          "sourceLine": 413,
          "background": "images/maps/forest.webp",
          "portrait": "images/monsters/safira_caravan_star2_20261004.webp"
        },
        {
          "id": "pb_12_pre_03",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "王都へ行く隊商か？ やっぱりここだったんだ！ ボルドがずっと待ってるぞ！",
          "sourceText": "グノーシス：王都へ行く隊商か？ やっぱりここだったんだ！ ボルドがずっと待ってるぞ！",
          "sourceLine": 414,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_12_pre_04",
          "kind": "dialogue",
          "speaker": "サフィラ",
          "text": "こっちだって届けたいさ！ 見ろ、前にも後ろにもモンスターだらけだ！",
          "sourceText": "サフィラ：こっちだって届けたいさ！ 見ろ、前にも後ろにもモンスターだらけだ！",
          "sourceLine": 415,
          "background": "images/maps/forest.webp",
          "portrait": "images/monsters/safira_caravan_star2_20261004.webp"
        },
        {
          "id": "pb_12_pre_05",
          "kind": "production",
          "speaker": "演出",
          "text": "ソーンビートが土を蹴る。反対の茂みから出てきたナイトメアは、荷車の脇をすり抜け、ソーンビートに向かう。",
          "sourceText": "演出：ソーンビートが土を蹴る。反対の茂みから出てきたナイトメアは、荷車の脇をすり抜け、ソーンビートに向かう。",
          "sourceLine": 416,
          "background": "images/maps/forest.webp",
          "display": false
        },
        {
          "id": "pb_12_pre_06",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あれ？ 今、荷車には目もくれなかったぞ。あいつら、互いに怒ってるのか？",
          "sourceText": "グノーシス：あれ？ 今、荷車には目もくれなかったぞ。あいつら、互いに怒ってるのか？",
          "sourceLine": 417,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_12_pre_07",
          "kind": "dialogue",
          "speaker": "サフィラ",
          "text": "私は荷車につく！ あんたたち、先頭の車が通れるだけでいいから、道を空けて！",
          "sourceText": "サフィラ：私は荷車につく！ あんたたち、先頭の車が通れるだけでいいから、道を空けて！",
          "sourceLine": 418,
          "background": "images/maps/forest.webp",
          "portrait": "images/monsters/safira_caravan_star2_20261004.webp"
        },
        {
          "id": "pb_12_pre_08",
          "kind": "system",
          "speaker": "システム",
          "text": "三つ巴では敵同士も攻撃します。生きている相手と攻撃対象を確認しましょう。",
          "sourceText": "システム：三つ巴では敵同士も攻撃します。生きている相手と攻撃対象を確認しましょう。",
          "sourceLine": 419,
          "background": "images/maps/forest.webp"
        },
        {
          "id": "pb_12_pre_09",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "PrayerName、どっちを先に止める？ 片方ばっかり見てたら、もう片方から攻撃が飛んでくるぞ！",
          "sourceText": "グノーシス：PrayerName、どっちを先に止める？ 片方ばっかり見てたら、もう片方から攻撃が飛んでくるぞ！",
          "sourceLine": 420,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_12_battle",
          "kind": "battle",
          "speaker": "",
          "text": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceText": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceLine": 421,
          "background": "images/maps/forest.webp",
          "battleId": "p2_12_a"
        },
        {
          "id": "pb_12_post_01",
          "kind": "production",
          "speaker": "演出",
          "text": "ソーンビートが木の根元へ退き、ナイトメアは反対の茂みに消える。サフィラが槍を上げると、御者が手綱を取る。",
          "sourceText": "演出：ソーンビートが木の根元へ退き、ナイトメアは反対の茂みに消える。サフィラが槍を上げると、御者が手綱を取る。",
          "sourceLine": 423,
          "background": "images/maps/forest.webp",
          "display": false
        },
        {
          "id": "pb_12_post_02",
          "kind": "dialogue",
          "speaker": "サフィラ",
          "text": "今だ、進め！ 王都は左だ！",
          "sourceText": "サフィラ：今だ、進め！ 王都は左だ！",
          "sourceLine": 424,
          "background": "images/maps/forest.webp",
          "portrait": "images/monsters/safira_caravan_star2_20261004.webp"
        },
        {
          "id": "pb_12_post_03",
          "kind": "dialogue",
          "speaker": "御者",
          "text": "お嬢さん、右だよ。橋を戻るんだ。",
          "sourceText": "御者：お嬢さん、右だよ。橋を戻るんだ。",
          "sourceLine": 425,
          "background": "images/maps/forest.webp"
        },
        {
          "id": "pb_12_post_04",
          "kind": "dialogue",
          "speaker": "サフィラ",
          "text": "…分かってる！",
          "sourceText": "サフィラ：…分かってる！",
          "sourceLine": 426,
          "background": "images/maps/forest.webp",
          "portrait": "images/monsters/safira_caravan_star2_20261004.webp"
        },
        {
          "id": "pb_12_post_05",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "さっきまであんなに頼もしかったのになぁ……。",
          "sourceText": "グノーシス：さっきまであんなに頼もしかったのになぁ……。",
          "sourceLine": 427,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_12_post_06",
          "kind": "dialogue",
          "speaker": "サフィラ",
          "text": "聞こえてるよ！",
          "sourceText": "サフィラ：聞こえてるよ！",
          "sourceLine": 428,
          "background": "images/maps/forest.webp",
          "portrait": "images/monsters/safira_caravan_star2_20261004.webp"
        },
        {
          "id": "pb_12_post_07",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラが折れた枝に鼻を寄せる。枝の下から、森の奥へ新しい足跡が続いている。",
          "sourceText": "演出：ガルドラが折れた枝に鼻を寄せる。枝の下から、森の奥へ新しい足跡が続いている。",
          "sourceLine": 429,
          "background": "images/maps/forest.webp",
          "display": false
        },
        {
          "id": "pb_12_post_08",
          "kind": "dialogue",
          "speaker": "サフィラ",
          "text": "あのナイトメアは奥から出てきたんだ。あんなに手前で見たのは、私も初めて。",
          "sourceText": "サフィラ：あのナイトメアは奥から出てきたんだ。あんなに手前で見たのは、私も初めて。",
          "sourceLine": 430,
          "background": "images/maps/forest.webp",
          "portrait": "images/monsters/safira_caravan_star2_20261004.webp"
        },
        {
          "id": "pb_12_post_09",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "王都に来たやつらも、逃げてきたのかもしれないって話だったよな。森の奥で、何かあったのかも。",
          "sourceText": "グノーシス：王都に来たやつらも、逃げてきたのかもしれないって話だったよな。森の奥で、何かあったのかも。",
          "sourceLine": 431,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_12_post_10",
          "kind": "dialogue",
          "speaker": "サフィラ",
          "text": "奥へ行くのか？ じゃあ気をつけな。木のてっぺんより高いところで、大きな影が動いてた。",
          "sourceText": "サフィラ：奥へ行くのか？ じゃあ気をつけな。木のてっぺんより高いところで、大きな影が動いてた。",
          "sourceLine": 432,
          "background": "images/maps/forest.webp",
          "portrait": "images/monsters/safira_caravan_star2_20261004.webp"
        },
        {
          "id": "pb_12_post_11",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "分かった。",
          "sourceText": "契約者：分かった。",
          "sourceLine": 433,
          "background": "images/maps/forest.webp"
        },
        {
          "id": "pb_12_post_12",
          "kind": "dialogue",
          "speaker": "サフィラ",
          "text": "荷物は王都まで送り届ける。……橋を戻って、右！",
          "sourceText": "サフィラ：荷物は王都まで送り届ける。……橋を戻って、右！",
          "sourceLine": 434,
          "background": "images/maps/forest.webp",
          "portrait": "images/monsters/safira_caravan_star2_20261004.webp"
        },
        {
          "id": "pb_12_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第12話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第12話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 436,
          "background": "images/maps/forest.webp",
          "label": "第12話を終える"
        }
      ]
    },
    {
      "id": "pb_13",
      "number": 13,
      "title": "森を塞ぐもの",
      "location": "森林・倒木の谷",
      "rewards": {
        "exp": 560,
        "coins": 120
      },
      "background": "images/maps/forest.webp",
      "previousEpisodeId": "pb_12",
      "battleIds": [
        "p2_13_a",
        "p2_13_b"
      ],
      "steps": [
        {
          "id": "pb_13_pre_01",
          "kind": "production",
          "speaker": "演出",
          "text": "倒木の陰で、木の幹だと思っていたものが動く。ガルドラが足を止め、主人公の足元へ下がる。",
          "sourceText": "演出：倒木の陰で、木の幹だと思っていたものが動く。ガルドラが足を止め、主人公の足元へ下がる。",
          "sourceLine": 441,
          "background": "images/maps/forest.webp",
          "display": false
        },
        {
          "id": "pb_13_pre_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "うわっ。サフィラが言ってた大きな影って、あれか！",
          "sourceText": "グノーシス：うわっ。サフィラが言ってた大きな影って、あれか！",
          "sourceLine": 442,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_13_pre_03",
          "kind": "narration",
          "speaker": "地の文",
          "text": "モルグラムが谷の入口に立ちはだかり、道の両側に届きそうな腕を広げた。",
          "sourceText": "地の文：モルグラムが谷の入口に立ちはだかり、道の両側に届きそうな腕を広げた。",
          "sourceLine": 443,
          "background": "images/maps/forest.webp"
        },
        {
          "id": "pb_13_pre_04",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "通してもらえないかな？",
          "sourceText": "契約者：通してもらえないかな？",
          "sourceLine": 444,
          "background": "images/maps/forest.webp"
        },
        {
          "id": "pb_13_pre_05",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公が一歩出ると、目の前に太い腕が落ちる。跳ねた土を浴びて、ガルドラが飛びのく。",
          "sourceText": "演出：主人公が一歩出ると、目の前に太い腕が落ちる。跳ねた土を浴びて、ガルドラが飛びのく。",
          "sourceLine": 445,
          "background": "images/maps/forest.webp",
          "display": false
        },
        {
          "id": "pb_13_pre_06",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "PrayerName、下がって！ もう一度振り下ろされる前に、距離を取らないと！",
          "sourceText": "グノーシス：PrayerName、下がって！ もう一度振り下ろされる前に、距離を取らないと！",
          "sourceLine": 446,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_13_pre_07",
          "kind": "system",
          "speaker": "システム",
          "text": "この戦闘では、相手の攻撃を退けて安全な距離を作ります。HP0で退避の演出へ進みます。",
          "sourceText": "システム：この戦闘では、相手の攻撃を退けて安全な距離を作ります。HP0で退避の演出へ進みます。",
          "sourceLine": 447,
          "background": "images/maps/forest.webp"
        },
        {
          "id": "pb_13_battle",
          "kind": "battle",
          "speaker": "",
          "text": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceText": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceLine": 448,
          "background": "images/maps/forest.webp",
          "battleId": "p2_13_a"
        },
        {
          "id": "pb_13_post_01",
          "kind": "production",
          "speaker": "演出",
          "text": "モルグラムは一歩だけ下がり、振り返る。カメラがその腕の向こうへ寄る。",
          "sourceText": "演出：モルグラムは一歩だけ下がり、振り返る。カメラがその腕の向こうへ寄る。",
          "sourceLine": 450,
          "background": "images/maps/forest.webp",
          "display": false
        },
        {
          "id": "pb_13_post_02",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル！ ガルル！",
          "sourceText": "ガルドラ：ガル！ ガルル！",
          "sourceLine": 451,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_13_post_03",
          "kind": "production",
          "speaker": "演出",
          "text": "小さなグラスビートとスライムが、モルグラムの背後で身を寄せている。スライムが身じろぎすると、モルグラムが腕を広げ直す。",
          "sourceText": "演出：小さなグラスビートとスライムが、モルグラムの背後で身を寄せている。スライムが身じろぎすると、モルグラムが腕を広げ直す。",
          "sourceLine": 452,
          "background": "images/maps/forest.webp",
          "display": false
        },
        {
          "id": "pb_13_post_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あっ、後ろにもモンスター！……ボクらを通したくなかったのは、もしかしてあのモンスターたちがいたからか？",
          "sourceText": "グノーシス：あっ、後ろにもモンスター！……ボクらを通したくなかったのは、もしかしてあのモンスターたちがいたからか？",
          "sourceLine": 453,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_13_post_05",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "別の道を探そう。",
          "sourceText": "契約者：別の道を探そう。",
          "sourceLine": 454,
          "background": "images/maps/forest.webp"
        },
        {
          "id": "pb_13_post_06",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公が手を下げ、横の斜面へ向かう。モルグラムは追わず、小さな二体のそばへ戻る。",
          "sourceText": "演出：主人公が手を下げ、横の斜面へ向かう。モルグラムは追わず、小さな二体のそばへ戻る。",
          "sourceLine": 455,
          "background": "images/maps/forest.webp",
          "display": false
        },
        {
          "id": "pb_13_post_07",
          "kind": "narration",
          "speaker": "地の文",
          "text": "谷の外へ回ると、ナイトメアが小さな二体の逃げられそうな道を塞いでいた。その背後で、何もない空間に細い隙間が開いている。",
          "sourceText": "地の文：谷の外へ回ると、ナイトメアが小さな二体の逃げられそうな道を塞いでいた。その背後で、何もない空間に細い隙間が開いている。",
          "sourceLine": 456,
          "background": "images/maps/forest.webp"
        },
        {
          "id": "pb_13_post_08",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "おい、今の、空が裂けたのか？ ……PrayerName、先にあいつを道から離そう！",
          "sourceText": "グノーシス：おい、今の、空が裂けたのか？ ……PrayerName、先にあいつを道から離そう！",
          "sourceLine": 457,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_13_trait_01",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "そうだ、PrayerName。仲間にはそれぞれ「特性」って力があるんだ。誰で行くか、見てから決めよう！",
          "sourceText": "グノーシス：そうだ、PrayerName。仲間にはそれぞれ「特性」って力があるんだ。誰で行くか、見てから決めよう！",
          "sourceLine": 458,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_13_trait_02",
          "kind": "system",
          "speaker": "システム",
          "text": "特性は仲間ごとに決まっている力です。「モンスター」の一覧で仲間を選び、「ステータス」から確認できます。",
          "sourceText": "システム：特性は仲間ごとに決まっている力です。「モンスター」の一覧で仲間を選び、「ステータス」から確認できます。",
          "sourceLine": 459,
          "background": "images/maps/forest.webp"
        },
        {
          "id": "p2_13_b_start",
          "kind": "battle",
          "battleId": "p2_13_b",
          "background": "images/maps/forest.webp"
        },
        {
          "id": "pb_13_post_09",
          "kind": "production",
          "speaker": "演出",
          "text": "二戦目へ。勝利後、ナイトメアが谷と反対へ走り去る。",
          "sourceText": "演出：二戦目へ。勝利後、ナイトメアが谷と反対へ走り去る。",
          "sourceLine": 460,
          "background": "images/maps/forest.webp",
          "display": false
        },
        {
          "id": "pb_13_post_10",
          "kind": "production",
          "speaker": "演出",
          "text": "裂け目の向こうで、金属を引きずるような音がする。縁に星の筋が浮かび、一行が近づくより先に隙間は閉じる。",
          "sourceText": "演出：裂け目の向こうで、金属を引きずるような音がする。縁に星の筋が浮かび、一行が近づくより先に隙間は閉じる。",
          "sourceLine": 461,
          "background": "images/maps/forest.webp",
          "display": false
        },
        {
          "id": "pb_13_post_11",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "今の音、聞こえた？ こんなところに、あんな音を立てるものがあるか？",
          "sourceText": "グノーシス：今の音、聞こえた？ こんなところに、あんな音を立てるものがあるか？",
          "sourceLine": 462,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_13_post_12",
          "kind": "narration",
          "speaker": "地の文",
          "text": "裂け目があった真下に、星の筋が走る黒い破片が落ちていた。",
          "sourceText": "地の文：裂け目があった真下に、星の筋が走る黒い破片が落ちていた。",
          "sourceLine": 463,
          "background": "images/maps/forest.webp"
        },
        {
          "id": "pb_13_post_13",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "トビアが拾ったのとそっくりだ！ 持ってかえって調べよう！",
          "sourceText": "グノーシス：トビアが拾ったのとそっくりだ！ 持ってかえって調べよう！",
          "sourceLine": 464,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_13_receive_shard",
          "kind": "event",
          "action": "evidence",
          "key": "blackShardForest"
        },
        {
          "id": "pb_13_post_14",
          "kind": "production",
          "speaker": "演出",
          "text": "谷を振り返ると、モルグラムが小さな二体を連れ、空いた道を渡っていく。",
          "sourceText": "演出：谷を振り返ると、モルグラムが小さな二体を連れ、空いた道を渡っていく。",
          "sourceLine": 465,
          "background": "images/maps/forest.webp",
          "display": false
        },
        {
          "id": "pb_13_post_15",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル……。",
          "sourceText": "ガルドラ：ガル……。",
          "sourceLine": 466,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_13_post_16",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ガルドラ、もういいよ。ほら、あの子たちも通れた。ボクらはこっちから行こう。",
          "sourceText": "グノーシス：ガルドラ、もういいよ。ほら、あの子たちも通れた。ボクらはこっちから行こう。",
          "sourceLine": 467,
          "background": "images/maps/forest.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_13_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第13話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第13話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 469,
          "background": "images/maps/forest.webp",
          "label": "第13話を終える"
        }
      ]
    },
    {
      "id": "pb_14",
      "number": 14,
      "title": "廃村に残った剣士",
      "location": "廃村跡・広場",
      "rewards": {
        "exp": 600,
        "coins": 120
      },
      "background": "images/maps/ruined_village.webp",
      "previousEpisodeId": "pb_13",
      "battleIds": [
        "p2_14_a"
      ],
      "steps": [
        {
          "id": "pb_14_pre_01",
          "kind": "production",
          "speaker": "演出",
          "text": "壊れた柵の内側で、旅人が何人かうずくまっている。入口に立つ剣士は、片腕を覆う黒い装甲を押さえている。",
          "sourceText": "演出：壊れた柵の内側で、旅人が何人かうずくまっている。入口に立つ剣士は、片腕を覆う黒い装甲を押さえている。",
          "sourceLine": 474,
          "background": "images/maps/ruined_village.webp",
          "display": false
        },
        {
          "id": "pb_14_pre_02",
          "kind": "dialogue",
          "speaker": "レグス",
          "text": "止まれ。まだこっちは通れない。",
          "sourceText": "レグス：止まれ。まだこっちは通れない。",
          "sourceLine": 475,
          "background": "images/maps/ruined_village.webp",
          "portrait": "images/monsters/regus_wounded_star2_20261004.webp"
        },
        {
          "id": "pb_14_pre_03",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "怪我人か！ ……あっ、その腕、キミも怪我してるじゃないか！",
          "sourceText": "グノーシス：怪我人か！ ……あっ、その腕、キミも怪我してるじゃないか！",
          "sourceLine": 476,
          "background": "images/maps/ruined_village.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_14_pre_04",
          "kind": "dialogue",
          "speaker": "レグス",
          "text": "俺はいい。歩けるやつから、柵の外へ連れていけ。",
          "sourceText": "レグス：俺はいい。歩けるやつから、柵の外へ連れていけ。",
          "sourceLine": 477,
          "background": "images/maps/ruined_village.webp",
          "portrait": "images/monsters/regus_wounded_star2_20261004.webp"
        },
        {
          "id": "pb_14_pre_05",
          "kind": "production",
          "speaker": "演出",
          "text": "ノクルの影が柵を越える。レグスが前へ出かけたところで、後ろの旅人が痛みにうめく。",
          "sourceText": "演出：ノクルの影が柵を越える。レグスが前へ出かけたところで、後ろの旅人が痛みにうめく。",
          "sourceLine": 478,
          "background": "images/maps/ruined_village.webp",
          "display": false
        },
        {
          "id": "pb_14_pre_06",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "ここは手伝う。一緒に道を開けよう。",
          "sourceText": "契約者：ここは手伝う。一緒に道を開けよう。",
          "sourceLine": 479,
          "background": "images/maps/ruined_village.webp"
        },
        {
          "id": "pb_14_pre_07",
          "kind": "dialogue",
          "speaker": "レグス",
          "text": "……それなら前を頼む。俺はこいつらを守る。",
          "sourceText": "レグス：……それなら前を頼む。俺はこいつらを守る。",
          "sourceLine": 480,
          "background": "images/maps/ruined_village.webp",
          "portrait": "images/monsters/regus_wounded_star2_20261004.webp"
        },
        {
          "id": "pb_14_pre_08",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラが一歩後ずさる。それでも震える足で主人公の前に立つ。主人公はかがんで、その背に手を置く。",
          "sourceText": "演出：ガルドラが一歩後ずさる。それでも震える足で主人公の前に立つ。主人公はかがんで、その背に手を置く。",
          "sourceLine": 481,
          "background": "images/maps/ruined_village.webp",
          "display": false
        },
        {
          "id": "pb_14_pre_09",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ガルドラ、怖いなら下がっていいんだぞ。……それでも行くのか。PrayerName、そういうときに使える力がある。ココロリンクだ。",
          "sourceText": "グノーシス：ガルドラ、怖いなら下がっていいんだぞ。……それでも行くのか。PrayerName、そういうときに使える力がある。ココロリンクだ。",
          "sourceLine": 482,
          "background": "images/maps/ruined_village.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_14_pre_10",
          "kind": "system",
          "speaker": "システム",
          "text": "ココロリンクは、使える仲間と発動条件を確認してから使います。ここで発動までの手順を試せます。",
          "sourceText": "システム：ココロリンクは、使える仲間と発動条件を確認してから使います。ここで発動までの手順を試せます。",
          "sourceLine": 483,
          "background": "images/maps/ruined_village.webp"
        },
        {
          "id": "pb_14_link_practice",
          "kind": "event",
          "action": "linkPractice"
        },
        {
          "id": "pb_14_battle",
          "kind": "battle",
          "speaker": "",
          "text": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceText": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceLine": 484,
          "background": "images/maps/ruined_village.webp",
          "battleId": "p2_14_a"
        },
        {
          "id": "pb_14_post_04",
          "kind": "production",
          "speaker": "演出",
          "text": "勝利後、レグスは剣を下ろすと、立ち上がれない旅人の腕を自分の肩へ回す。",
          "sourceText": "演出：勝利後、レグスは剣を下ろすと、立ち上がれない旅人の腕を自分の肩へ回す。",
          "sourceLine": 489,
          "background": "images/maps/ruined_village.webp",
          "display": false
        },
        {
          "id": "pb_14_post_05",
          "kind": "dialogue",
          "speaker": "レグス",
          "text": "話はあとだ。まだ村の外に出ていない。",
          "sourceText": "レグス：話はあとだ。まだ村の外に出ていない。",
          "sourceLine": 490,
          "background": "images/maps/ruined_village.webp",
          "portrait": "images/monsters/regus_wounded_star2_20261004.webp"
        },
        {
          "id": "pb_14_post_06",
          "kind": "dialogue",
          "speaker": "旅人",
          "text": "奥の礼拝所から、変な音がするんです。夜になるたび、あの影が集まってきて……。",
          "sourceText": "旅人：奥の礼拝所から、変な音がするんです。夜になるたび、あの影が集まってきて……。",
          "sourceLine": 491,
          "background": "images/maps/ruined_village.webp"
        },
        {
          "id": "pb_14_post_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "音？ 森でも、裂け目が開いたときに聞こえたぞ。ここにもあるのか？",
          "sourceText": "グノーシス：音？ 森でも、裂け目が開いたときに聞こえたぞ。ここにもあるのか？",
          "sourceLine": 492,
          "background": "images/maps/ruined_village.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_14_post_08",
          "kind": "production",
          "speaker": "演出",
          "text": "村の奥で、屋根の上に伸びた影がゆっくりと向きを変える。",
          "sourceText": "演出：村の奥で、屋根の上に伸びた影がゆっくりと向きを変える。",
          "sourceLine": 493,
          "background": "images/maps/ruined_village.webp",
          "display": false
        },
        {
          "id": "pb_14_post_09",
          "kind": "dialogue",
          "speaker": "レグス",
          "text": "まだ残っているな。俺は先に、この人たちを運ぶ。頼めるか？",
          "sourceText": "レグス：まだ残っているな。俺は先に、この人たちを運ぶ。頼めるか？",
          "sourceLine": 494,
          "background": "images/maps/ruined_village.webp",
          "portrait": "images/monsters/regus_wounded_star2_20261004.webp"
        },
        {
          "id": "pb_14_post_10",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "奥を見てくるよ。",
          "sourceText": "契約者：奥を見てくるよ。",
          "sourceLine": 495,
          "background": "images/maps/ruined_village.webp"
        },
        {
          "id": "pb_14_post_11",
          "kind": "dialogue",
          "speaker": "レグス",
          "text": "あぁ、気をつけろ。",
          "sourceText": "レグス：あぁ、気をつけろ。",
          "sourceLine": 496,
          "background": "images/maps/ruined_village.webp",
          "portrait": "images/monsters/regus_wounded_star2_20261004.webp"
        },
        {
          "id": "pb_14_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第14話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第14話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 498,
          "background": "images/maps/ruined_village.webp",
          "label": "第14話を終える"
        }
      ]
    },
    {
      "id": "pb_15",
      "number": 15,
      "title": "倒しても消えない異変",
      "location": "廃村跡・崩れた礼拝所",
      "rewards": {
        "exp": 720,
        "coins": 150
      },
      "background": "images/maps/bg_ruined_chapel.webp",
      "previousEpisodeId": "pb_14",
      "battleIds": [
        "p2_15_a"
      ],
      "steps": [
        {
          "id": "pb_15_pre_01",
          "kind": "narration",
          "speaker": "地の文",
          "text": "崩れた礼拝所の壁を抜けると、ノクスヴェルグがこちらに背を向けていた。すぐ後ろで、黒い空間が息をするようにふくらんでいる。",
          "sourceText": "地の文：崩れた礼拝所の壁を抜けると、ノクスヴェルグがこちらに背を向けていた。すぐ後ろで、黒い空間が息をするようにふくらんでいる。",
          "sourceLine": 503,
          "background": "images/maps/bg_ruined_chapel.webp"
        },
        {
          "id": "pb_15_pre_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あいつの後ろだ。あの黒いところ、見えるか？",
          "sourceText": "グノーシス：あいつの後ろだ。あの黒いところ、見えるか？",
          "sourceLine": 504,
          "background": "images/maps/bg_ruined_chapel.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_15_pre_03",
          "kind": "production",
          "speaker": "演出",
          "text": "闇の縁に細い星の筋が走り、そのたびに黒い隙間の形が変わる。",
          "sourceText": "演出：闇の縁に細い星の筋が走り、そのたびに黒い隙間の形が変わる。",
          "sourceLine": 505,
          "background": "images/maps/bg_ruined_chapel.webp",
          "display": false
        },
        {
          "id": "pb_15_pre_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "やっぱり森と同じ光だ！ あいつが裂け目を開けてるなら、止めれば閉じるかも。",
          "sourceText": "グノーシス：やっぱり森と同じ光だ！ あいつが裂け目を開けてるなら、止めれば閉じるかも。",
          "sourceLine": 506,
          "background": "images/maps/bg_ruined_chapel.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_15_pre_05",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガルル……！",
          "sourceText": "ガルドラ：ガルル……！",
          "sourceLine": 507,
          "background": "images/maps/bg_ruined_chapel.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_15_pre_06",
          "kind": "production",
          "speaker": "演出",
          "text": "ノクスヴェルグが振り返り、戻ろうとした一行の足元へ爪を落とす。崩れた壁から瓦礫が滑り落ちる。",
          "sourceText": "演出：ノクスヴェルグが振り返り、戻ろうとした一行の足元へ爪を落とす。崩れた壁から瓦礫が滑り落ちる。",
          "sourceLine": 508,
          "background": "images/maps/bg_ruined_chapel.webp",
          "display": false
        },
        {
          "id": "pb_15_pre_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "うわっ！ PrayerName、先にあいつを離そう！",
          "sourceText": "グノーシス：うわっ！ PrayerName、先にあいつを離そう！",
          "sourceLine": 509,
          "background": "images/maps/bg_ruined_chapel.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_15_battle",
          "kind": "battle",
          "speaker": "",
          "text": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceText": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceLine": 510,
          "background": "images/maps/bg_ruined_chapel.webp",
          "battleId": "p2_15_a"
        },
        {
          "id": "pb_15_post_01",
          "kind": "production",
          "speaker": "演出",
          "text": "ノクスヴェルグが崩れた壁を越え、村の外へ去る。裂け目はその場に残り、低い音を立て続ける。",
          "sourceText": "演出：ノクスヴェルグが崩れた壁を越え、村の外へ去る。裂け目はその場に残り、低い音を立て続ける。",
          "sourceLine": 512,
          "background": "images/maps/bg_ruined_chapel.webp",
          "display": false
        },
        {
          "id": "pb_15_post_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あれ……まだ開いてる。",
          "sourceText": "グノーシス：あれ……まだ開いてる。",
          "sourceLine": 513,
          "background": "images/maps/bg_ruined_chapel.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_15_post_03",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "あのモンスターが開けたんじゃないのか。",
          "sourceText": "契約者：あのモンスターが開けたんじゃないのか。",
          "sourceLine": 514,
          "background": "images/maps/bg_ruined_chapel.webp"
        },
        {
          "id": "pb_15_post_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "うーん……ボク、あいつがそばにいたってだけで決めつけてたかも。",
          "sourceText": "グノーシス：うーん……ボク、あいつがそばにいたってだけで決めつけてたかも。",
          "sourceLine": 515,
          "background": "images/maps/bg_ruined_chapel.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_15_post_05",
          "kind": "production",
          "speaker": "演出",
          "text": "裂け目の縁で、星の光がいく筋も増える。光が縁を包むと、黒い口が少しずつ閉じていく。",
          "sourceText": "演出：裂け目の縁で、星の光がいく筋も増える。光が縁を包むと、黒い口が少しずつ閉じていく。",
          "sourceLine": 516,
          "background": "images/maps/bg_ruined_chapel.webp",
          "display": false
        },
        {
          "id": "pb_15_post_06",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "待って、今の見た？ 光が強くなったあとに、閉じたぞ。",
          "sourceText": "グノーシス：待って、今の見た？ 光が強くなったあとに、閉じたぞ。",
          "sourceLine": 517,
          "background": "images/maps/bg_ruined_chapel.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_15_post_07",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公は裂け目が閉じるまで待ち、落ちてきた破片を布に包む。",
          "sourceText": "演出：主人公は裂け目が閉じるまで待ち、落ちてきた破片を布に包む。",
          "sourceLine": 518,
          "background": "images/maps/bg_ruined_chapel.webp",
          "display": false
        },
        {
          "id": "pb_15_post_08",
          "kind": "narration",
          "speaker": "地の文",
          "text": "村の出口では、レグスが最後の旅人を荷車に乗せたところだった。",
          "sourceText": "地の文：村の出口では、レグスが最後の旅人を荷車に乗せたところだった。",
          "sourceLine": 519,
          "background": "images/maps/bg_ruined_chapel.webp"
        },
        {
          "id": "pb_15_post_09",
          "kind": "dialogue",
          "speaker": "レグス",
          "text": "片づいたか。",
          "sourceText": "レグス：片づいたか。",
          "sourceLine": 520,
          "background": "images/maps/bg_ruined_chapel.webp",
          "portrait": "images/monsters/regus_wounded_star2_20261004.webp"
        },
        {
          "id": "pb_15_post_10",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "戦いはね。……それで裂け目も消えると思ったんだけどなぁ。",
          "sourceText": "グノーシス：戦いはね。……それで裂け目も消えると思ったんだけどなぁ。",
          "sourceLine": 521,
          "background": "images/maps/bg_ruined_chapel.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_15_record_evidence",
          "kind": "event",
          "action": "evidence",
          "keys": [
            "blackShardVillage",
            "starLightBeforeClosing"
          ]
        },
        {
          "id": "pb_15_post_11",
          "kind": "dialogue",
          "speaker": "レグス",
          "text": "なら、拾ったものを持って戻れ。怪我人もいる。ここで答えが出るまで待つ気か。",
          "sourceText": "レグス：なら、拾ったものを持って戻れ。怪我人もいる。ここで答えが出るまで待つ気か。",
          "sourceLine": 522,
          "background": "images/maps/bg_ruined_chapel.webp",
          "portrait": "images/monsters/regus_wounded_star2_20261004.webp"
        },
        {
          "id": "pb_15_post_12",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "そうだな。拾った破片を持ってかえって、今度はちゃんと比べてみよう。",
          "sourceText": "グノーシス：そうだな。拾った破片を持ってかえって、今度はちゃんと比べてみよう。",
          "sourceLine": 523,
          "background": "images/maps/bg_ruined_chapel.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_15_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第15話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第15話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 525,
          "background": "images/maps/bg_ruined_chapel.webp",
          "label": "第15話を終える"
        }
      ]
    },
    {
      "id": "pb_16",
      "number": 16,
      "title": "星へ続く証拠",
      "location": "王都・広場→工房",
      "rewards": {
        "exp": 0,
        "coins": 100
      },
      "background": "images/maps/bg_market_square.webp",
      "previousEpisodeId": "pb_15",
      "battleIds": [],
      "steps": [
        {
          "id": "pb_16_pre_01",
          "kind": "production",
          "speaker": "演出",
          "text": "王都の広場でボルドが大鍋をかき混ぜている。サフィラが隊商の食材袋をその足元に下ろす。",
          "sourceText": "演出：王都の広場でボルドが大鍋をかき混ぜている。サフィラが隊商の食材袋をその足元に下ろす。",
          "sourceLine": 530,
          "background": "images/maps/bg_market_square.webp",
          "display": false
        },
        {
          "id": "pb_16_pre_02",
          "kind": "dialogue",
          "speaker": "ボルド",
          "text": "おお、来た来た！ これで鍋をもう一つ出せるぞ。腹すかせた奴は並んでくれ！",
          "sourceText": "ボルド：おお、来た来た！ これで鍋をもう一つ出せるぞ。腹すかせた奴は並んでくれ！",
          "sourceLine": 531,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/bordo_veteran_star3_20261004.webp"
        },
        {
          "id": "pb_16_pre_03",
          "kind": "dialogue",
          "speaker": "サフィラ",
          "text": "言っただろ、届けるって。荷物を下ろすまでが私の仕事だ！",
          "sourceText": "サフィラ：言っただろ、届けるって。荷物を下ろすまでが私の仕事だ！",
          "sourceLine": 532,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/safira_caravan_star2_20261004.webp"
        },
        {
          "id": "pb_16_pre_04",
          "kind": "dialogue",
          "speaker": "リゼ",
          "text": "はい、その袋は厨房。こっちの包みは救護所ね！ 運ぶ人が通るから、ちょっと道を空けてくれる？",
          "sourceText": "リゼ：はい、その袋は厨房。こっちの包みは救護所ね！ 運ぶ人が通るから、ちょっと道を空けてくれる？",
          "sourceLine": 533,
          "background": "images/maps/bg_market_square.webp",
          "portrait": "images/monsters/lize_vendor_star2_20261004.webp"
        },
        {
          "id": "pb_16_pre_05",
          "kind": "dialogue",
          "speaker": "エルナ",
          "text": "あっ、お帰りなさい！ 怪我はありませんか？",
          "sourceText": "エルナ：あっ、お帰りなさい！ 怪我はありませんか？",
          "sourceLine": 534,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/tutorial/characters/elna_beginner.png"
        },
        {
          "id": "pb_16_pre_06",
          "kind": "dialogue",
          "speaker": "セレネ",
          "text": "おかえり。歩けるからって平気とは限らないわ。話はあと。先に診せて。",
          "sourceText": "セレネ：おかえり。歩けるからって平気とは限らないわ。話はあと。先に診せて。",
          "sourceLine": 535,
          "background": "images/maps/bg_medical_tent.webp",
          "portrait": "images/monsters/selene_patrol_star2_20261004.webp"
        },
        {
          "id": "pb_16_pre_07",
          "kind": "narration",
          "speaker": "地の文",
          "text": "救護所を出た三人は工房へ戻り、森と廃村で拾った破片を机に並べた。",
          "sourceText": "地の文：救護所を出た三人は工房へ戻り、森と廃村で拾った破片を机に並べた。",
          "sourceLine": 536,
          "background": "images/maps/bg_alchemy_workshop.webp"
        },
        {
          "id": "pb_16_pre_07a",
          "kind": "production",
          "speaker": "演出",
          "text": "話を聞きつけたミレーユやトビアたちも、工房の入口から顔を出す。",
          "sourceText": "演出：話を聞きつけたミレーユやトビアたちも、工房の入口から顔を出す。",
          "sourceLine": 537,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "display": false
        },
        {
          "id": "pb_16_pre_08",
          "kind": "dialogue",
          "speaker": "ニコ",
          "text": "トビアが拾ったのと、森のと、廃村のか！　よーし、さっそく調べるぞ！",
          "sourceText": "ニコ：トビアが拾ったのと、森のと、廃村のか！　よーし、さっそく調べるぞ！",
          "sourceLine": 538,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/nico_maker_star2_20261004.webp"
        },
        {
          "id": "pb_16_pre_09",
          "kind": "production",
          "speaker": "演出",
          "text": "破片を替えても測定器の針は同じ幅で振れる。試しに置いた普通の石には、ぴくりとも動かない。",
          "sourceText": "演出：破片を替えても測定器の針は同じ幅で振れる。試しに置いた普通の石には、ぴくりとも動かない。",
          "sourceLine": 539,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "display": false
        },
        {
          "id": "pb_16_pre_10",
          "kind": "dialogue",
          "speaker": "ニコ",
          "text": "ほら！ 三つとも同じだ！ 普通の石じゃこうはならないんだよ！？",
          "sourceText": "ニコ：ほら！ 三つとも同じだ！ 普通の石じゃこうはならないんだよ！？",
          "sourceLine": 540,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/nico_maker_star2_20261004.webp"
        },
        {
          "id": "pb_16_pre_11",
          "kind": "dialogue",
          "speaker": "ステラ",
          "text": "……悪かったわよ。でも、それが分かったらなんなのよ？",
          "sourceText": "ステラ：……悪かったわよ。でも、それが分かったらなんなのよ？",
          "sourceLine": 541,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/stella_apprentice.png"
        },
        {
          "id": "pb_16_pre_12",
          "kind": "dialogue",
          "speaker": "ニコ",
          "text": "うーん、それは… あ、もう一回だけやってもいい？",
          "sourceText": "ニコ：うーん、それは… あ、もう一回だけやってもいい？",
          "sourceLine": 542,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/nico_maker_star2_20261004.webp"
        },
        {
          "id": "pb_16_pre_13",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "黒いところと光る筋、両方に同じ反応がある、ね。森も廃村も、同じことが起きてたのかも。もしそうなら…",
          "sourceText": "ルミナ：黒いところと光る筋、両方に同じ反応がある、ね。森も廃村も、同じことが起きてたのかも。もしそうなら…",
          "sourceLine": 543,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_16_pre_14",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ひとつ気になるんだ。廃村では、光が強くなってから裂け目が閉じた。あの光、いったい何なんだろうな。",
          "sourceText": "グノーシス：ひとつ気になるんだ。廃村では、光が強くなってから裂け目が閉じた。あの光、いったい何なんだろうな。",
          "sourceLine": 544,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_16_pre_15",
          "kind": "dialogue",
          "speaker": "ミレーユ",
          "text": "その光ってどんなのだった？……前に広場で話した旅人がね、昼に見えた星を描いてくれたの。光の伸び方が、これに似てるわ。",
          "sourceText": "ミレーユ：その光ってどんなのだった？……前に広場で話した旅人がね、昼に見えた星を描いてくれたの。光の伸び方が、これに似てるわ。",
          "sourceLine": 545,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/mireille_performer_star2_20261004.webp"
        },
        {
          "id": "pb_16_pre_16",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "東の平原なら、高原を越えた先です！ 遺跡までなら配達で通ります。地図、描きましょうか？",
          "sourceText": "トビア：東の平原なら、高原を越えた先です！ 遺跡までなら配達で通ります。地図、描きましょうか？",
          "sourceLine": 546,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_16_pre_17",
          "kind": "dialogue",
          "speaker": "ローデン",
          "text": "なら、行き先は決まりだ。地図ができる間に、工房で支度を済ませとけ。",
          "sourceText": "ローデン：なら、行き先は決まりだ。地図ができる間に、工房で支度を済ませとけ。",
          "sourceLine": 547,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/roden_battle_star3_20261004.webp"
        },
        {
          "id": "pb_16_pre_18",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "そ、そうだ、錬成の材料のこと、まだちゃんと話してなかったね。出発前に少しだけ説明するよ。",
          "sourceText": "ルミナ：そ、そうだ、錬成の材料のこと、まだちゃんと話してなかったね。出発前に少しだけ説明するよ。",
          "sourceLine": 548,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_16_battle",
          "kind": "production",
          "speaker": "",
          "text": "戦闘なし。続けて後半の会話へ。",
          "sourceText": "戦闘なし。続けて後半の会話へ。",
          "sourceLine": 549,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "display": false
        },
        {
          "id": "pb_16_post_01",
          "kind": "system",
          "speaker": "システム",
          "text": "錬成では、実行前に素材・触媒・必要コイン・成功条件を確認します。失敗のある錬成もあります。",
          "sourceText": "システム：錬成では、実行前に素材・触媒・必要コイン・成功条件を確認します。失敗のある錬成もあります。",
          "sourceLine": 551,
          "background": "images/maps/bg_alchemy_workshop.webp"
        },
        {
          "id": "pb_16_post_02",
          "kind": "dialogue",
          "speaker": "ルミナ",
          "text": "錬成するときは…レシピごとに必要な材料を確かめてね。使うとなくなるものと、残るものも、始める前に見ておくといいよ。",
          "sourceText": "ルミナ：錬成するときは…レシピごとに必要な材料を確かめてね。使うとなくなるものと、残るものも、始める前に見ておくといいよ。",
          "sourceLine": 552,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/lumina_apprentice.png"
        },
        {
          "id": "pb_16_post_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "そういえばガルドラ、あのときも出てきてすぐ、PrayerNameのとこに飛んでったよな。",
          "sourceText": "グノーシス：そういえばガルドラ、あのときも出てきてすぐ、PrayerNameのとこに飛んでったよな。",
          "sourceLine": 553,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_16_post_05",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル！",
          "sourceText": "ガルドラ：ガル！",
          "sourceLine": 554,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_16_post_06",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラが、主人公の開いた手のひらへ自分から頭を押しつける。",
          "sourceText": "演出：ガルドラが、主人公の開いた手のひらへ自分から頭を押しつける。",
          "sourceLine": 555,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "display": false
        },
        {
          "id": "pb_16_post_07",
          "kind": "dialogue",
          "speaker": "ステラ",
          "text": "仲間が育って、必要な条件がそろえば進化できることもあるわ。条件は仲間によって違うから、今すぐ進化できなくても焦ることないわよ。",
          "sourceText": "ステラ：仲間が育って、必要な条件がそろえば進化できることもあるわ。条件は仲間によって違うから、今すぐ進化できなくても焦ることないわよ。",
          "sourceLine": 556,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/stella_apprentice.png"
        },
        {
          "id": "pb_16_post_08",
          "kind": "system",
          "speaker": "システム",
          "text": "進化に必要な条件は、育成画面で確認できます。",
          "sourceText": "システム：進化に必要な条件は、育成画面で確認できます。",
          "sourceLine": 557,
          "background": "images/maps/bg_alchemy_workshop.webp"
        },
        {
          "id": "pb_16_post_09",
          "kind": "dialogue",
          "speaker": "ローデン",
          "text": "支度ができたら、仲間の技も見直しとけ。ここまでの戦いで、次に備えることも分かっただろ。",
          "sourceText": "ローデン：支度ができたら、仲間の技も見直しとけ。ここまでの戦いで、次に備えることも分かっただろ。",
          "sourceLine": 558,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/roden_battle_star3_20261004.webp"
        },
        {
          "id": "pb_16_post_10",
          "kind": "dialogue",
          "speaker": "ブリジット",
          "text": "王都の安全は私たちに任せて、気をつけて行ってこい。",
          "sourceText": "ブリジット：王都の安全は私たちに任せて、気をつけて行ってこい。",
          "sourceLine": 559,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/brigitte_knight_star3_20261004.webp"
        },
        {
          "id": "pb_16_post_11",
          "kind": "dialogue",
          "speaker": "ミレーユ",
          "text": "昼の星、見えたら帰ってきて教えてね。今度は見た人から、直接聞きたいの。",
          "sourceText": "ミレーユ：昼の星、見えたら帰ってきて教えてね。今度は見た人から、直接聞きたいの。",
          "sourceLine": 560,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/mireille_performer_star2_20261004.webp"
        },
        {
          "id": "pb_16_post_12",
          "kind": "dialogue",
          "speaker": "トビア",
          "text": "お待たせしました！ これが遺跡までの道順です。あ、サフィラさんの地図だけは、曲がり角の矢印を大きくしてありますからね。",
          "sourceText": "トビア：お待たせしました！ これが遺跡までの道順です。あ、サフィラさんの地図だけは、曲がり角の矢印を大きくしてありますからね。",
          "sourceLine": 561,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/tobia_apprentice_star2_20261004.webp"
        },
        {
          "id": "pb_16_post_13",
          "kind": "dialogue",
          "speaker": "サフィラ",
          "text": "一言余計だぞ、トビア！",
          "sourceText": "サフィラ：一言余計だぞ、トビア！",
          "sourceLine": 562,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/monsters/safira_caravan_star2_20261004.webp"
        },
        {
          "id": "pb_16_post_14",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "今度は道しるべの前で悩まなくて済むな！ 行こう、PrayerName！",
          "sourceText": "グノーシス：今度は道しるべの前で悩まなくて済むな！ 行こう、PrayerName！",
          "sourceLine": 563,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_16_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第16話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第16話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 565,
          "background": "images/maps/bg_alchemy_workshop.webp",
          "label": "第16話を終える"
        }
      ]
    },
    {
      "id": "pb_17",
      "number": 17,
      "title": "記憶を守る鎧",
      "location": "高原遺跡・外縁→記録室",
      "rewards": {
        "exp": 840,
        "coins": 180
      },
      "background": "images/maps/highland_ruins.webp",
      "previousEpisodeId": "pb_16",
      "battleIds": [
        "p2_17_a",
        "p2_17_b"
      ],
      "steps": [
        {
          "id": "pb_17_pre_01",
          "kind": "production",
          "speaker": "演出",
          "text": "石柱の間でボルモーグが放電し、少し離れたボルタックスの角にも火花が走る。光る間隔はそろっていない。",
          "sourceText": "演出：石柱の間でボルモーグが放電し、少し離れたボルタックスの角にも火花が走る。光る間隔はそろっていない。",
          "sourceLine": 570,
          "background": "images/maps/highland_ruins.webp",
          "display": false
        },
        {
          "id": "pb_17_pre_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "うわっ、王都でもこんな火花が飛んでた！ ……ここ、何体いるんだ？",
          "sourceText": "グノーシス：うわっ、王都でもこんな火花が飛んでた！ ……ここ、何体いるんだ？",
          "sourceLine": 571,
          "background": "images/maps/highland_ruins.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_17_pre_03",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラが落ちた火花へ鼻を伸ばす。主人公は抱え上げて石柱の陰へ下がる。",
          "sourceText": "演出：ガルドラが落ちた火花へ鼻を伸ばす。主人公は抱え上げて石柱の陰へ下がる。",
          "sourceLine": 572,
          "background": "images/maps/highland_ruins.webp",
          "display": false
        },
        {
          "id": "pb_17_pre_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ガルドラ、それは触るなって！ PrayerName、相手は雷だ。使う技も、先に見ておこう。",
          "sourceText": "グノーシス：ガルドラ、それは触るなって！ PrayerName、相手は雷だ。使う技も、先に見ておこう。",
          "sourceLine": 573,
          "background": "images/maps/highland_ruins.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_17_pre_05",
          "kind": "system",
          "speaker": "システム",
          "text": "相手の属性と、使う技の属性を確認しましょう。編成変更は戦闘開始前にもできます。",
          "sourceText": "システム：相手の属性と、使う技の属性を確認しましょう。編成変更は戦闘開始前にもできます。",
          "sourceLine": 574,
          "background": "images/maps/highland_ruins.webp"
        },
        {
          "id": "pb_17_pre_06",
          "kind": "narration",
          "speaker": "地の文",
          "text": "放電が止んだ隙に三人は石段へ走った。その前へ、ボルモーグが回り込む。",
          "sourceText": "地の文：放電が止んだ隙に三人は石段へ走った。その前へ、ボルモーグが回り込む。",
          "sourceLine": 575,
          "background": "images/maps/highland_ruins.webp"
        },
        {
          "id": "pb_17_battle",
          "kind": "battle",
          "speaker": "",
          "text": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceText": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceLine": 576,
          "background": "images/maps/highland_ruins.webp",
          "battleId": "p2_17_a"
        },
        {
          "id": "pb_17_post_01",
          "kind": "production",
          "speaker": "演出",
          "text": "一戦目の勝利後、ボルモーグは岩陰へ退く。一行は火花の届かない遺跡の内側へ入る。",
          "sourceText": "演出：一戦目の勝利後、ボルモーグは岩陰へ退く。一行は火花の届かない遺跡の内側へ入る。",
          "sourceLine": 578,
          "background": "images/maps/highland_ruins.webp",
          "display": false
        },
        {
          "id": "pb_17_post_02",
          "kind": "narration",
          "speaker": "地の文",
          "text": "記録室の入口に鎧が立っていた。手には剣があるのに、近づいても人の息づかいは聞こえなかった。",
          "sourceText": "地の文：記録室の入口に鎧が立っていた。手には剣があるのに、近づいても人の息づかいは聞こえなかった。",
          "sourceLine": 579,
          "background": "images/maps/bg_stone_hall.webp"
        },
        {
          "id": "pb_17_post_03",
          "kind": "dialogue",
          "speaker": "レムネス",
          "text": "私はレムネス。……止まってください。ここより先は通しません。",
          "sourceText": "レムネス：私はレムネス。……止まってください。ここより先は通しません。",
          "sourceLine": 580,
          "background": "images/maps/bg_stone_hall.webp",
          "portrait": "images/monsters/remnes_memory_star3_20261004.webp"
        },
        {
          "id": "pb_17_post_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ボクら、通れる道を探しに来たんだ。",
          "sourceText": "グノーシス：ボクら、通れる道を探しに来たんだ。",
          "sourceLine": 581,
          "background": "images/maps/bg_stone_hall.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_17_post_05",
          "kind": "dialogue",
          "speaker": "レムネス",
          "text": "後ろへ。……どうか、お下がりを。",
          "sourceText": "レムネス：後ろへ。……どうか、お下がりを。",
          "sourceLine": 582,
          "background": "images/maps/bg_stone_hall.webp",
          "portrait": "images/monsters/remnes_memory_star3_20261004.webp"
        },
        {
          "id": "pb_17_post_06",
          "kind": "production",
          "speaker": "演出",
          "text": "レムネスは一瞬だけ兜を後ろへ向ける。何もない場所を背に、こちらへ剣を構える。",
          "sourceText": "演出：レムネスは一瞬だけ兜を後ろへ向ける。何もない場所を背に、こちらへ剣を構える。",
          "sourceLine": 583,
          "background": "images/maps/bg_stone_hall.webp",
          "display": false
        },
        {
          "id": "pb_17_post_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "今、後ろの誰かに言ったのか？ ……来るぞ、PrayerName！",
          "sourceText": "グノーシス：今、後ろの誰かに言ったのか？ ……来るぞ、PrayerName！",
          "sourceLine": 584,
          "background": "images/maps/bg_stone_hall.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "p2_17_b_start",
          "kind": "battle",
          "battleId": "p2_17_b",
          "background": "images/maps/bg_stone_hall.webp"
        },
        {
          "id": "pb_17_post_08",
          "kind": "production",
          "speaker": "演出",
          "text": "二戦目へ。勝利後、鎧が膝をつく。兜は、奥の空いた席へ向いたまま。",
          "sourceText": "演出：二戦目へ。勝利後、鎧が膝をつく。兜は、奥の空いた席へ向いたまま。",
          "sourceLine": 585,
          "background": "images/maps/bg_stone_hall.webp",
          "display": false
        },
        {
          "id": "pb_17_post_09",
          "kind": "dialogue",
          "speaker": "レムネス",
          "text": "……お待ちを。まだ、道が……。",
          "sourceText": "レムネス：……お待ちを。まだ、道が……。",
          "sourceLine": 586,
          "background": "images/maps/bg_stone_hall.webp",
          "portrait": "images/monsters/remnes_memory_star3_20261004.webp"
        },
        {
          "id": "pb_17_post_10",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "誰かを待ってるの？",
          "sourceText": "契約者：誰かを待ってるの？",
          "sourceLine": 587,
          "background": "images/maps/bg_stone_hall.webp"
        },
        {
          "id": "pb_17_post_11",
          "kind": "production",
          "speaker": "演出",
          "text": "鎧は答えず、剣を床に置く。指先で壁の星図をたどり、平原の縁で手を止める。",
          "sourceText": "演出：鎧は答えず、剣を床に置く。指先で壁の星図をたどり、平原の縁で手を止める。",
          "sourceLine": 588,
          "background": "images/maps/bg_stone_hall.webp",
          "display": false
        },
        {
          "id": "pb_17_post_12",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あっ、ここか！ でも、その先にも空が描いてあるぞ。どうやって行くんだ？",
          "sourceText": "グノーシス：あっ、ここか！ でも、その先にも空が描いてあるぞ。どうやって行くんだ？",
          "sourceLine": 589,
          "background": "images/maps/bg_stone_hall.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_17_post_13",
          "kind": "narration",
          "speaker": "地の文",
          "text": "星図には三本の石柱が刻まれている。柱の間から伸びた光の道は、もう一つの空まで続いていた。",
          "sourceText": "地の文：星図には三本の石柱が刻まれている。柱の間から伸びた光の道は、もう一つの空まで続いていた。",
          "sourceLine": 590,
          "background": "images/maps/bg_stone_hall.webp"
        },
        {
          "id": "pb_17_record_star_chart",
          "kind": "event",
          "action": "evidence",
          "key": "starChart"
        },
        {
          "id": "pb_17_post_14",
          "kind": "dialogue",
          "speaker": "レムネス",
          "text": "……星の道。……お帰りの、道を。",
          "sourceText": "レムネス：……星の道。……お帰りの、道を。",
          "sourceLine": 591,
          "background": "images/maps/bg_stone_hall.webp",
          "portrait": "images/monsters/remnes_memory_star3_20261004.webp"
        },
        {
          "id": "pb_17_post_15",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "…星の道か。見せてくれて、ありがとう。……待ってる人に会えるといいな。",
          "sourceText": "グノーシス：…星の道か。見せてくれて、ありがとう。……待ってる人に会えるといいな。",
          "sourceLine": 592,
          "background": "images/maps/bg_stone_hall.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_17_post_16",
          "kind": "production",
          "speaker": "演出",
          "text": "レムネスは答えずに立ち上がり、空いた席の隣へ戻る。",
          "sourceText": "演出：レムネスは答えずに立ち上がり、空いた席の隣へ戻る。",
          "sourceLine": 593,
          "background": "images/maps/bg_stone_hall.webp",
          "display": false
        },
        {
          "id": "pb_17_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第17話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第17話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 595,
          "background": "images/maps/bg_stone_hall.webp",
          "label": "第17話を終える"
        }
      ]
    },
    {
      "id": "pb_18",
      "number": 18,
      "title": "回廊の裂け目",
      "location": "高原遺跡・奥の回廊",
      "rewards": {
        "exp": 540,
        "coins": 130
      },
      "background": "images/maps/bg_courtyard_cloister.webp",
      "previousEpisodeId": "pb_17",
      "battleIds": [
        "p2_18_a"
      ],
      "steps": [
        {
          "id": "pb_18_pre_01",
          "kind": "production",
          "speaker": "演出",
          "text": "回廊の突き当たりが裂ける。飛び出したノクレイドが石壁に爪を立てる。",
          "sourceText": "演出：回廊の突き当たりが裂ける。飛び出したノクレイドが石壁に爪を立てる。",
          "sourceLine": 600,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "display": false
        },
        {
          "id": "pb_18_pre_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "まただ！ PrayerName、下がって！",
          "sourceText": "グノーシス：まただ！ PrayerName、下がって！",
          "sourceLine": 601,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_18_pre_03",
          "kind": "production",
          "speaker": "演出",
          "text": "裂け目の奥で、もう一つの影がうごめく。縁に星の筋が走り、その影は向こう側へ押し戻される。",
          "sourceText": "演出：裂け目の奥で、もう一つの影がうごめく。縁に星の筋が走り、その影は向こう側へ押し戻される。",
          "sourceLine": 602,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "display": false
        },
        {
          "id": "pb_18_pre_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "一体だけ出てきた！ ……あの光、また縁を塞いでる。",
          "sourceText": "グノーシス：一体だけ出てきた！ ……あの光、また縁を塞いでる。",
          "sourceLine": 603,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_18_pre_05",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公がガルドラを抱え、石柱の陰に飛び込む。壁を離れたノクレイドが横から回り込む。",
          "sourceText": "演出：主人公がガルドラを抱え、石柱の陰に飛び込む。壁を離れたノクレイドが横から回り込む。",
          "sourceLine": 604,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "display": false
        },
        {
          "id": "pb_18_pre_06",
          "kind": "production",
          "speaker": "演出",
          "text": "裂け目が細くなる。取り残されたノクレイドが、帰り道を探すように一行へ牙をむく。",
          "sourceText": "演出：裂け目が細くなる。取り残されたノクレイドが、帰り道を探すように一行へ牙をむく。",
          "sourceLine": 605,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "display": false
        },
        {
          "id": "pb_18_pre_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "帰り道を塞がれて、気が立ってるんだ。PrayerName、まずはこいつを落ち着かせよう！",
          "sourceText": "グノーシス：帰り道を塞がれて、気が立ってるんだ。PrayerName、まずはこいつを落ち着かせよう！",
          "sourceLine": 606,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_18_battle",
          "kind": "battle",
          "speaker": "",
          "text": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceText": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceLine": 607,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "battleId": "p2_18_a"
        },
        {
          "id": "pb_18_post_01",
          "kind": "production",
          "speaker": "演出",
          "text": "ノクレイドが石段の外へ逃げる。残った裂け目は星の筋に縫われ、細く閉じていく。",
          "sourceText": "演出：ノクレイドが石段の外へ逃げる。残った裂け目は星の筋に縫われ、細く閉じていく。",
          "sourceLine": 609,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "display": false
        },
        {
          "id": "pb_18_post_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "見た？ 開くときも閉じるときも、あの光がそばにある。……あの光が裂け目を操ってるのか？",
          "sourceText": "グノーシス：見た？ 開くときも閉じるときも、あの光がそばにある。……あの光が裂け目を操ってるのか？",
          "sourceLine": 610,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_18_post_03",
          "kind": "production",
          "speaker": "演出",
          "text": "閉じた跡に残った星の筋が、細い糸のように回廊の外へ伸びている。",
          "sourceText": "演出：閉じた跡に残った星の筋が、細い糸のように回廊の外へ伸びている。",
          "sourceLine": 611,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "display": false
        },
        {
          "id": "pb_18_post_04",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "外へ続いてる。",
          "sourceText": "契約者：外へ続いてる。",
          "sourceLine": 612,
          "background": "images/maps/bg_courtyard_cloister.webp"
        },
        {
          "id": "pb_18_post_05",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "星図にあった平原の方だ。……やっぱり、あそこに何かあるんだな。",
          "sourceText": "グノーシス：星図にあった平原の方だ。……やっぱり、あそこに何かあるんだな。",
          "sourceLine": 613,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_18_post_06",
          "kind": "production",
          "speaker": "演出",
          "text": "グノーシスは閉じた跡を見つめたまま、しばらく動かない。",
          "sourceText": "演出：グノーシスは閉じた跡を見つめたまま、しばらく動かない。",
          "sourceLine": 614,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "display": false
        },
        {
          "id": "pb_18_post_07",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル？",
          "sourceText": "ガルドラ：ガル？",
          "sourceLine": 615,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_18_post_08",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "……ううん、なんでもない。あの音を聞くと、なんだか落ち着かないんだ。行こう、PrayerName！",
          "sourceText": "グノーシス：……ううん、なんでもない。あの音を聞くと、なんだか落ち着かないんだ。行こう、PrayerName！",
          "sourceLine": 616,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_18_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第18話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第18話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 618,
          "background": "images/maps/bg_courtyard_cloister.webp",
          "label": "第18話を終える"
        }
      ]
    },
    {
      "id": "pb_19",
      "number": 19,
      "title": "星を追う小さな竜",
      "location": "星空の平原→遥かなる星の海の入口",
      "rewards": {
        "exp": 900,
        "coins": 180
      },
      "background": "images/maps/starry_plain.webp",
      "previousEpisodeId": "pb_18",
      "battleIds": [
        "p2_19_a",
        "p2_19_b"
      ],
      "steps": [
        {
          "id": "pb_19_pre_01",
          "kind": "narration",
          "speaker": "地の文",
          "text": "高原を抜けると、背の高い草が一面に揺れていた。日が差す空に、いくつも星が見える。",
          "sourceText": "地の文：高原を抜けると、背の高い草が一面に揺れていた。日が差す空に、いくつも星が見える。",
          "sourceLine": 623,
          "background": "images/maps/starry_plain.webp"
        },
        {
          "id": "pb_19_pre_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ほんとに昼の星だ！ ……帰ったら、ミレーユに話さなきゃ！",
          "sourceText": "グノーシス：ほんとに昼の星だ！ ……帰ったら、ミレーユに話さなきゃ！",
          "sourceLine": 624,
          "background": "images/maps/starry_plain.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_19_pre_03",
          "kind": "production",
          "speaker": "演出",
          "text": "草を押し分けてネメスが走る。その後ろを、ネメシアが何度も振り返りながらついていく。",
          "sourceText": "演出：草を押し分けてネメスが走る。その後ろを、ネメシアが何度も振り返りながらついていく。",
          "sourceLine": 625,
          "background": "images/maps/starry_plain.webp",
          "display": false
        },
        {
          "id": "pb_19_pre_04",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル！",
          "sourceText": "ガルドラ：ガル！",
          "sourceLine": 626,
          "background": "images/maps/starry_plain.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_19_pre_05",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラがネメスへ駆け寄る。ネメシアはすぐに振り向き、二体の間へ体を入れる。",
          "sourceText": "演出：ガルドラがネメスへ駆け寄る。ネメシアはすぐに振り向き、二体の間へ体を入れる。",
          "sourceLine": 627,
          "background": "images/maps/starry_plain.webp",
          "display": false
        },
        {
          "id": "pb_19_pre_06",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "あ、ガルドラ、待って！",
          "sourceText": "契約者：あ、ガルドラ、待って！",
          "sourceLine": 628,
          "background": "images/maps/starry_plain.webp"
        },
        {
          "id": "pb_19_pre_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ごめん！ 何もしないから！……って、通じてるかな？",
          "sourceText": "グノーシス：ごめん！ 何もしないから！……って、通じてるかな？",
          "sourceLine": 629,
          "background": "images/maps/starry_plain.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_19_pre_08",
          "kind": "production",
          "speaker": "演出",
          "text": "ネメスが光を放つ。ガルドラが跳ねて戻り、一行の頭上を光がかすめる。",
          "sourceText": "演出：ネメスが光を放つ。ガルドラが跳ねて戻り、一行の頭上を光がかすめる。",
          "sourceLine": 630,
          "background": "images/maps/starry_plain.webp",
          "display": false
        },
        {
          "id": "pb_19_pre_09",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "通じてないな！ PrayerName、少し離れよう！",
          "sourceText": "グノーシス：通じてないな！ PrayerName、少し離れよう！",
          "sourceLine": 631,
          "background": "images/maps/starry_plain.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_19_battle",
          "kind": "battle",
          "speaker": "",
          "text": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceText": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceLine": 632,
          "background": "images/maps/starry_plain.webp",
          "battleId": "p2_19_a"
        },
        {
          "id": "pb_19_post_01",
          "kind": "production",
          "speaker": "演出",
          "text": "一戦目の勝利後、ネメスが草むらへ下がる。ネメシアは逃げず、一行との間に立つ。",
          "sourceText": "演出：一戦目の勝利後、ネメスが草むらへ下がる。ネメシアは逃げず、一行との間に立つ。",
          "sourceLine": 634,
          "background": "images/maps/starry_plain.webp",
          "display": false
        },
        {
          "id": "pb_19_post_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あっちからも来るぞ！ ……あの子を守ってるんだ。追い詰めないようにしよう。",
          "sourceText": "グノーシス：あっちからも来るぞ！ ……あの子を守ってるんだ。追い詰めないようにしよう。",
          "sourceLine": 635,
          "background": "images/maps/starry_plain.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_19_post_03",
          "kind": "system",
          "speaker": "システム",
          "text": "次の相手はネメシアです。編成を確認してから進めます。",
          "sourceText": "システム：次の相手はネメシアです。編成を確認してから進めます。",
          "sourceLine": 636,
          "background": "images/maps/starry_plain.webp"
        },
        {
          "id": "p2_19_b_start",
          "kind": "battle",
          "battleId": "p2_19_b",
          "background": "images/maps/starry_plain.webp"
        },
        {
          "id": "pb_19_post_04",
          "kind": "production",
          "speaker": "演出",
          "text": "二戦目へ。",
          "sourceText": "演出：二戦目へ。",
          "sourceLine": 637,
          "background": "images/maps/starry_plain.webp",
          "display": false
        },
        {
          "id": "pb_19_post_05",
          "kind": "production",
          "speaker": "演出",
          "text": "二戦目の勝利後、ネメシアがネメスを草の奥へ先に行かせる。一行はその場にとどまり、二体の行く先を見守る。",
          "sourceText": "演出：二戦目の勝利後、ネメシアがネメスを草の奥へ先に行かせる。一行はその場にとどまり、二体の行く先を見守る。",
          "sourceLine": 638,
          "background": "images/maps/starry_plain.webp",
          "display": false
        },
        {
          "id": "pb_19_post_06",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "どっちも同じ方に行くな。あっちに何かあるのか？",
          "sourceText": "グノーシス：どっちも同じ方に行くな。あっちに何かあるのか？",
          "sourceLine": 639,
          "background": "images/maps/starry_plain.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_19_post_07",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "……見て、草の間。",
          "sourceText": "契約者：……見て、草の間。",
          "sourceLine": 640,
          "background": "images/maps/starry_plain.webp"
        },
        {
          "id": "pb_19_post_08",
          "kind": "production",
          "speaker": "演出",
          "text": "草むらからアストラレピスの群れが浮かぶ。星のように明滅しながら、三本の石柱の間へ消えていく。",
          "sourceText": "演出：草むらからアストラレピスの群れが浮かぶ。星のように明滅しながら、三本の石柱の間へ消えていく。",
          "sourceLine": 641,
          "background": "images/maps/starry_plain.webp",
          "display": false
        },
        {
          "id": "pb_19_post_09",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "あの柱、星図にあったやつだ。",
          "sourceText": "契約者：あの柱、星図にあったやつだ。",
          "sourceLine": 642,
          "background": "images/maps/starry_plain.webp"
        },
        {
          "id": "pb_19_post_10",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "レムネスが教えてくれた道だ！ ……道って言っても、これ、足を置いて大丈夫？",
          "sourceText": "グノーシス：レムネスが教えてくれた道だ！ ……道って言っても、これ、足を置いて大丈夫？",
          "sourceLine": 643,
          "background": "images/maps/starry_plain.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_19_post_11",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公が小石を一つ投げる。光の上で跳ね、柱の向こうまで転がる。",
          "sourceText": "演出：主人公が小石を一つ投げる。光の上で跳ね、柱の向こうまで転がる。",
          "sourceLine": 644,
          "background": "images/maps/starry_plain.webp",
          "display": false
        },
        {
          "id": "pb_19_post_12",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "大丈夫そうだね。先に行くよ。",
          "sourceText": "契約者：大丈夫そうだね。先に行くよ。",
          "sourceLine": 645,
          "background": "images/maps/starry_plain.webp"
        },
        {
          "id": "pb_19_post_13",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガルッ！",
          "sourceText": "ガルドラ：ガルッ！",
          "sourceLine": 646,
          "background": "images/maps/starry_plain.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_19_post_14",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ガルドラ、違う！ キミが先じゃないってば！",
          "sourceText": "グノーシス：ガルドラ、違う！ キミが先じゃないってば！",
          "sourceLine": 647,
          "background": "images/maps/starry_plain.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_19_cross_light_path",
          "kind": "event",
          "action": "continue",
          "label": "光の道を渡る"
        },
        {
          "id": "pb_19_post_15",
          "kind": "narration",
          "speaker": "地の文",
          "text": "光を渡るうち、草を踏む音が聞こえなくなった。見上げても、足元を見ても、そこには星が流れていた。",
          "sourceText": "地の文：光を渡るうち、草を踏む音が聞こえなくなった。見上げても、足元を見ても、そこには星が流れていた。",
          "sourceLine": 648,
          "background": "images/maps/starsea.webp"
        },
        {
          "id": "pb_19_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第19話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第19話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 650,
          "background": "images/maps/starsea.webp",
          "label": "第19話を終える"
        }
      ]
    },
    {
      "id": "pb_20",
      "number": 20,
      "title": "星の海の守り手",
      "location": "遥かなる星の海・大裂け目の前",
      "rewards": {
        "exp": 1000,
        "coins": 200
      },
      "background": "images/maps/starsea.webp",
      "previousEpisodeId": "pb_19",
      "battleIds": [
        "p2_20_a"
      ],
      "steps": [
        {
          "id": "pb_20_pre_01",
          "kind": "production",
          "speaker": "演出",
          "text": "星の海の中心に大きな裂け目が開いている。ネメシオンの体から伸びた光が、縁を覆っている。",
          "sourceText": "演出：星の海の中心に大きな裂け目が開いている。ネメシオンの体から伸びた光が、縁を覆っている。",
          "sourceLine": 655,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_20_pre_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あっ、あの光だ！ 森で見たのも、廃村で見たのも、あれと同じだぞ！",
          "sourceText": "グノーシス：あっ、あの光だ！ 森で見たのも、廃村で見たのも、あれと同じだぞ！",
          "sourceLine": 656,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_20_pre_03",
          "kind": "production",
          "speaker": "演出",
          "text": "一行が光の方へ歩み寄る。",
          "sourceText": "演出：一行が光の方へ歩み寄る。",
          "sourceLine": 657,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_20_pre_04",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "止まれ。それ以上は、こちらへ来るな。",
          "sourceText": "ネメシオン：止まれ。それ以上は、こちらへ来るな。",
          "sourceLine": 658,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_20_pre_05",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "しゃべれるのか！？ じゃあ教えてよ。王都までモンスターが逃げてきたんだ。あの光、キミが出してるのか？",
          "sourceText": "グノーシス：しゃべれるのか！？ じゃあ教えてよ。王都までモンスターが逃げてきたんだ。あの光、キミが出してるのか？",
          "sourceLine": 659,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_20_pre_06",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "後にしろ。ここにいると、そなたらも巻き込まれるぞ。",
          "sourceText": "ネメシオン：後にしろ。ここにいると、そなたらも巻き込まれるぞ。",
          "sourceLine": 660,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_20_pre_07",
          "kind": "production",
          "speaker": "演出",
          "text": "裂け目が揺れる。ネメシオンは光を強めながら、足元のネメスたちを片翼で後ろへ寄せる。",
          "sourceText": "演出：裂け目が揺れる。ネメシオンは光を強めながら、足元のネメスたちを片翼で後ろへ寄せる。",
          "sourceLine": 661,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_20_pre_08",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "待ってよ！ ボクら、ずっとあの光を追ってきたんだ。何が起きてるかくらい……！",
          "sourceText": "グノーシス：待ってよ！ ボクら、ずっとあの光を追ってきたんだ。何が起きてるかくらい……！",
          "sourceLine": 662,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_20_pre_10",
          "kind": "production",
          "speaker": "演出",
          "text": "一行のすぐ前を光が横切る。ガルドラが飛びのき、主人公はその前に出て身構える。",
          "sourceText": "演出：一行のすぐ前を光が横切る。ガルドラが飛びのき、主人公はその前に出て身構える。",
          "sourceLine": 663,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_20_pre_11",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "うわっ！ ……PrayerName、今は近づけないみたいだ。みんなで持ちこたえるぞ！",
          "sourceText": "グノーシス：うわっ！ ……PrayerName、今は近づけないみたいだ。みんなで持ちこたえるぞ！",
          "sourceLine": 664,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_20_battle",
          "kind": "battle",
          "speaker": "",
          "text": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceText": "出発確認後、指定戦闘を開始。複数戦は下記の割込位置・条件に従う。",
          "sourceLine": 665,
          "background": "images/maps/starsea.webp",
          "battleId": "p2_20_a"
        },
        {
          "id": "pb_20_post_01",
          "kind": "production",
          "speaker": "演出",
          "text": "ネメシオンが態勢を崩す。その隙に裂け目から黒い衝撃が走り、一匹のネメスの方へ向かう。",
          "sourceText": "演出：ネメシオンが態勢を崩す。その隙に裂け目から黒い衝撃が走り、一匹のネメスの方へ向かう。",
          "sourceLine": 667,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_20_post_02",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "動くな！ そこにいろ！",
          "sourceText": "ネメシオン：動くな！ そこにいろ！",
          "sourceLine": 668,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_20_post_03",
          "kind": "production",
          "speaker": "演出",
          "text": "ネメシオンがネメスの前に飛び込む。背中で衝撃を受けても、かざした翼は下ろさない。",
          "sourceText": "演出：ネメシオンがネメスの前に飛び込む。背中で衝撃を受けても、かざした翼は下ろさない。",
          "sourceLine": 669,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_20_post_04",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガルッ！",
          "sourceText": "ガルドラ：ガルッ！",
          "sourceLine": 670,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_20_post_05",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラがネメスへ駆け寄る。主人公が手を伸ばして二体を岩陰へ引き寄せる。次の衝撃は、ネメシオンの広げた光が受け止める。",
          "sourceText": "演出：ガルドラがネメスへ駆け寄る。主人公が手を伸ばして二体を岩陰へ引き寄せる。次の衝撃は、ネメシオンの広げた光が受け止める。",
          "sourceLine": 671,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_20_post_06",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "もう攻撃しない。ここなら大丈夫だよ。",
          "sourceText": "契約者：もう攻撃しない。ここなら大丈夫だよ。",
          "sourceLine": 672,
          "background": "images/maps/starsea.webp"
        },
        {
          "id": "pb_20_post_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "今の、あの子をかばったんだよな。……じゃあ、ずっと裂け目を押さえてたのか？",
          "sourceText": "グノーシス：今の、あの子をかばったんだよな。……じゃあ、ずっと裂け目を押さえてたのか？",
          "sourceLine": 673,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_20_post_08",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "そうだ。その子が隠れていられるよう、岩陰を空けてくれ。",
          "sourceText": "ネメシオン：そうだ。その子が隠れていられるよう、岩陰を空けてくれ。",
          "sourceLine": 674,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_20_post_09",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公が脇へずれる。ネメシオンが身を起こすと、星の光がふたたび裂け目の縁に伸びていく。",
          "sourceText": "演出：主人公が脇へずれる。ネメシオンが身を起こすと、星の光がふたたび裂け目の縁に伸びていく。",
          "sourceLine": 675,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_20_post_10",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "……ごめん。どこにもこの光が残ってたから、キミが裂け目を開けてるんだと思った。",
          "sourceText": "グノーシス：……ごめん。どこにもこの光が残ってたから、キミが裂け目を開けてるんだと思った。",
          "sourceLine": 676,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_20_post_11",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "私も、下がれと言うばかりだった。もっと早く、わけを話すべきだったな。",
          "sourceText": "ネメシオン：私も、下がれと言うばかりだった。もっと早く、わけを話すべきだったな。",
          "sourceLine": 677,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_20_post_12",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "また来る。話は、みんなを下げてから聞かせて。",
          "sourceText": "契約者：また来る。話は、みんなを下げてから聞かせて。",
          "sourceLine": 678,
          "background": "images/maps/starsea.webp"
        },
        {
          "id": "pb_20_post_13",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "感謝する。小さな者たちを、先に後ろへ頼む。",
          "sourceText": "ネメシオン：感謝する。小さな者たちを、先に後ろへ頼む。",
          "sourceLine": 679,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_20_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第20話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第20話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 681,
          "background": "images/maps/starsea.webp",
          "label": "第20話を終える"
        }
      ]
    },
    {
      "id": "pb_21",
      "number": 21,
      "title": "異変の向こう側",
      "location": "遥かなる星の海・裂け目の縁",
      "rewards": {
        "exp": 0,
        "coins": 100
      },
      "background": "images/maps/starsea.webp",
      "previousEpisodeId": "pb_20",
      "battleIds": [],
      "steps": [
        {
          "id": "pb_21_pre_01",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "耳を澄ませてみろ。向こうから音がする。この場所にはないはずの気配も、魔力と一緒に漏れてくる。",
          "sourceText": "ネメシオン：耳を澄ませてみろ。向こうから音がする。この場所にはないはずの気配も、魔力と一緒に漏れてくる。",
          "sourceLine": 686,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_21_pre_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あの金属みたいな音だ。森のやつらも、あれが怖くて出てきたのかな。",
          "sourceText": "グノーシス：あの金属みたいな音だ。森のやつらも、あれが怖くて出てきたのかな。",
          "sourceLine": 687,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_21_pre_03",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "逃げるものもいれば、向こうの気配に引かれるものもいる。力が乱れて、思うように体を動かせなくなるものもな。",
          "sourceText": "ネメシオン：逃げるものもいれば、向こうの気配に引かれるものもいる。力が乱れて、思うように体を動かせなくなるものもな。",
          "sourceLine": 688,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_21_pre_04",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "王都で放電してたのも、それでか。",
          "sourceText": "契約者：王都で放電してたのも、それでか。",
          "sourceLine": 689,
          "background": "images/maps/starsea.webp"
        },
        {
          "id": "pb_21_pre_05",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "廃村のやつらは逆に集まってた。……そっか。あいつを退けても、裂け目が開いたままだったわけだ。",
          "sourceText": "グノーシス：廃村のやつらは逆に集まってた。……そっか。あいつを退けても、裂け目が開いたままだったわけだ。",
          "sourceLine": 690,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_21_pre_06",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "星の光は、私が塞いだ跡だ。見つけた裂け目を一つずつ閉じてきた。",
          "sourceText": "ネメシオン：星の光は、私が塞いだ跡だ。見つけた裂け目を一つずつ閉じてきた。",
          "sourceLine": 691,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_21_pre_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "廃村で見たときも、光が強くなってから閉じた。……ちゃんと見てたのになぁ。",
          "sourceText": "グノーシス：廃村で見たときも、光が強くなってから閉じた。……ちゃんと見てたのになぁ。",
          "sourceLine": 692,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_21_pre_08",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "その時のことを覚えていたから、今こうして分かったのだろう。",
          "sourceText": "ネメシオン：その時のことを覚えていたから、今こうして分かったのだろう。",
          "sourceLine": 693,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_21_pre_09",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "閉じても、また開くの？",
          "sourceText": "契約者：閉じても、また開くの？",
          "sourceLine": 694,
          "background": "images/maps/starsea.webp"
        },
        {
          "id": "pb_21_pre_10",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "閉じるたび、場所を変えて同じ開き方をする。向こうの何者かが、この世界を探っているようだ。",
          "sourceText": "ネメシオン：閉じるたび、場所を変えて同じ開き方をする。向こうの何者かが、この世界を探っているようだ。",
          "sourceLine": 695,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_21_pre_11",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "探ってるって……何かを探してるのか？",
          "sourceText": "グノーシス：探ってるって……何かを探してるのか？",
          "sourceLine": 696,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_21_pre_12",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "そこまでは分からぬ。ただ、この口が広がれば、影響はまた地上に及ぶ。",
          "sourceText": "ネメシオン：そこまでは分からぬ。ただ、この口が広がれば、影響はまた地上に及ぶ。",
          "sourceLine": 697,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_21_pre_13",
          "kind": "production",
          "speaker": "演出",
          "text": "裂け目の端が伸びる。張り渡した星の光が引かれ、細い糸のように震える。",
          "sourceText": "演出：裂け目の端が伸びる。張り渡した星の光が引かれ、細い糸のように震える。",
          "sourceLine": 698,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_21_pre_14",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "これ以上はもたぬ。縁まで手が届かない。もう少し力があれば……。",
          "sourceText": "ネメシオン：これ以上はもたぬ。縁まで手が届かない。もう少し力があれば……。",
          "sourceLine": 699,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_21_pre_15",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "……ボクにも少しなら力がある。PrayerNameを通したら、ネメシオンに渡せるかも。",
          "sourceText": "グノーシス：……ボクにも少しなら力がある。PrayerNameを通したら、ネメシオンに渡せるかも。",
          "sourceLine": 700,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_21_pre_16",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "どうすればいい？",
          "sourceText": "契約者：どうすればいい？",
          "sourceLine": 701,
          "background": "images/maps/starsea.webp"
        },
        {
          "id": "pb_21_pre_17",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "手を貸して。ボクがつなぐ。痛かったり、危ないと思ったりしたら、すぐ離すんだぞ。",
          "sourceText": "グノーシス：手を貸して。ボクがつなぐ。痛かったり、危ないと思ったりしたら、すぐ離すんだぞ。",
          "sourceLine": 702,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_21_pre_18",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公が手を差し出す。ガルドラはすぐに寄ってきて、主人公の足に体を添える。",
          "sourceText": "演出：主人公が手を差し出す。ガルドラはすぐに寄ってきて、主人公の足に体を添える。",
          "sourceLine": 703,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_21_pre_19",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル。",
          "sourceText": "ガルドラ：ガル。",
          "sourceLine": 704,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_21_pre_20",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "縁は私が押さえておこう。",
          "sourceText": "ネメシオン：縁は私が押さえておこう。",
          "sourceLine": 705,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_21_battle",
          "kind": "production",
          "speaker": "",
          "text": "戦闘なし。指定の操作を経て後半へ。",
          "sourceText": "戦闘なし。指定の操作を経て後半へ。",
          "sourceLine": 706,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_21_post_01",
          "kind": "system",
          "speaker": "システム",
          "text": "『手を重ねる』で先へ進みます。所持素材や仲間は消費しません。",
          "sourceText": "システム：『手を重ねる』で先へ進みます。所持素材や仲間は消費しません。",
          "sourceLine": 708,
          "background": "images/maps/starsea.webp"
        },
        {
          "id": "pb_21_join_hands",
          "kind": "event",
          "action": "continue",
          "label": "手を重ねる"
        },
        {
          "id": "pb_21_post_02",
          "kind": "production",
          "speaker": "演出",
          "text": "グノーシスの光が主人公の手を通り、星の縁へ広がる。一瞬だけ、今の小さな姿とは違う大きな影が重なる。輪郭や正体は確定表示しない。",
          "sourceText": "演出：グノーシスの光が主人公の手を通り、星の縁へ広がる。一瞬だけ、今の小さな姿とは違う大きな影が重なる。輪郭や正体は確定表示しない。",
          "sourceLine": 709,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "silhouette",
          "cast": [
            "グノーシス",
            "ガルドラ",
            "ネメシオン"
          ]
        },
        {
          "id": "pb_21_post_03",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "届いたか。そうだ。そのまま、離さないでくれ。",
          "sourceText": "ネメシオン：届いたか。そうだ。そのまま、離さないでくれ。",
          "sourceLine": 710,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_21_post_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "うんっ……！ PrayerName、あとちょっとだ。いける？",
          "sourceText": "グノーシス：うんっ……！ PrayerName、あとちょっとだ。いける？",
          "sourceLine": 711,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_21_post_05",
          "kind": "production",
          "speaker": "演出",
          "text": "星の光が縁をつなぎ、黒い口が閉じる。金属を引きずる音も、そこで途切れる。",
          "sourceText": "演出：星の光が縁をつなぎ、黒い口が閉じる。金属を引きずる音も、そこで途切れる。",
          "sourceLine": 712,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "starPath",
          "cast": [
            "グノーシス",
            "ネメシオン"
          ]
        },
        {
          "id": "pb_21_post_06",
          "kind": "narration",
          "speaker": "地の文",
          "text": "音が消えると、岩陰のネメスたちが一匹ずつ顔を出した。遠巻きにしていたアストラレピスも、また星の海へ広がっていく。",
          "sourceText": "地の文：音が消えると、岩陰のネメスたちが一匹ずつ顔を出した。遠巻きにしていたアストラレピスも、また星の海へ広がっていく。",
          "sourceLine": 713,
          "background": "images/maps/starsea.webp"
        },
        {
          "id": "pb_21_post_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "閉じた……閉じたぞ！ ボクだけじゃ無理だったな。みんな、ありがとう！",
          "sourceText": "グノーシス：閉じた……閉じたぞ！ ボクだけじゃ無理だったな。みんな、ありがとう！",
          "sourceLine": 714,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_21_post_08",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公が息をつく。ガルドラがその手に飛びつき、弾みでグノーシスまでひっくり返る。",
          "sourceText": "演出：主人公が息をつく。ガルドラがその手に飛びつき、弾みでグノーシスまでひっくり返る。",
          "sourceLine": 715,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_21_post_09",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "わっ！ 喜ぶのは分かるけど、ボクを踏むなって！",
          "sourceText": "グノーシス：わっ！ 喜ぶのは分かるけど、ボクを踏むなって！",
          "sourceLine": 716,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_21_post_10",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "ありがとう。助かった。地上へ漏れていた気配も薄れていく。あの子たちも、ようやく落ち着ける。",
          "sourceText": "ネメシオン：ありがとう。助かった。地上へ漏れていた気配も薄れていく。あの子たちも、ようやく落ち着ける。",
          "sourceLine": 717,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_21_post_12",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "じゃあ、王都へ帰ろう。みんな待ってるよ。……どこから話そうか！",
          "sourceText": "グノーシス：じゃあ、王都へ帰ろう。みんな待ってるよ。……どこから話そうか！",
          "sourceLine": 718,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_21_post_13",
          "kind": "production",
          "speaker": "演出",
          "text": "音楽がふっと途切れる。今閉じた場所から少し離れた空間に、細い亀裂が走る。亀裂の両側で、星の位置がわずかにずれる。",
          "sourceText": "演出：音楽がふっと途切れる。今閉じた場所から少し離れた空間に、細い亀裂が走る。亀裂の両側で、星の位置がわずかにずれる。",
          "sourceLine": 719,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "fracture",
          "cast": [
            "グノーシス",
            "ネメシオン"
          ]
        },
        {
          "id": "pb_21_post_14",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "……待て。そこを動くな。",
          "sourceText": "ネメシオン：……待て。そこを動くな。",
          "sourceLine": 720,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_21_post_15",
          "kind": "narration",
          "speaker": "地の文",
          "text": "亀裂の向こうで、大きな影が動いた。内側から押されるように、星空がたわんだ。",
          "sourceText": "地の文：亀裂の向こうで、大きな影が動いた。内側から押されるように、星空がたわんだ。",
          "sourceLine": 721,
          "background": "images/maps/starsea.webp"
        },
        {
          "id": "pb_21_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第21話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第21話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 723,
          "background": "images/maps/starsea.webp",
          "label": "第21話を終える"
        }
      ]
    },
    {
      "id": "pb_22",
      "number": 22,
      "title": "偽竜、襲来",
      "location": "遥かなる星の海→世界の狭間",
      "rewards": {
        "exp": 0,
        "coins": 250
      },
      "background": "images/maps/starsea.webp",
      "previousEpisodeId": "pb_21",
      "battleIds": [],
      "steps": [
        {
          "id": "pb_22_pre_01",
          "kind": "production",
          "speaker": "演出",
          "text": "亀裂が一気に枝分かれし、時空がガラスのように砕け散る。飛び散る破片には、直前までの星空が映っている。その向こうから偽竜 code:alfa が突き抜け、全身を星の海へ現す。",
          "sourceText": "演出：亀裂が一気に枝分かれし、時空がガラスのように砕け散る。飛び散る破片には、直前までの星空が映っている。その向こうから偽竜 code:alfa が突き抜け、全身を星の海へ現す。",
          "sourceLine": 728,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "fracture",
          "cast": [
            "偽竜 code:alfa"
          ]
        },
        {
          "id": "pb_22_pre_02",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "な、なんだと……！？",
          "sourceText": "ネメシオン：な、なんだと……！？",
          "sourceLine": 729,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_22_pre_03",
          "kind": "production",
          "speaker": "演出",
          "text": "偽竜は砕けた空間を背に、ネメシオンを通り越してグノーシスを見据える。グノーシスが息をのみ、その姿を凝視する。",
          "sourceText": "演出：偽竜は砕けた空間を背に、ネメシオンを通り越してグノーシスを見据える。グノーシスが息をのみ、その姿を凝視する。",
          "sourceLine": 730,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "eyeContact",
          "cast": [
            "偽竜 code:alfa",
            "グノーシス"
          ]
        },
        {
          "id": "pb_22_pre_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "お前は……！",
          "sourceText": "グノーシス：お前は……！",
          "sourceLine": 731,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_22_pre_05",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "皆、光の道の奥へ逃げろ！",
          "sourceText": "ネメシオン：皆、光の道の奥へ逃げろ！",
          "sourceLine": 732,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_22_pre_06",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "そなたらも下がれ！ 私の後ろへ！",
          "sourceText": "ネメシオン：そなたらも下がれ！ 私の後ろへ！",
          "sourceLine": 733,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_22_pre_07",
          "kind": "production",
          "speaker": "演出",
          "text": "ネメシオンが一行と偽竜の間に立ち、星の盾を広げる。ネメシアは光の道の入口へ走り、ネメスたちを誘導する。",
          "sourceText": "演出：ネメシオンが一行と偽竜の間に立ち、星の盾を広げる。ネメシアは光の道の入口へ走り、ネメスたちを誘導する。",
          "sourceLine": 734,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "starShield",
          "cast": [
            "偽竜 code:alfa",
            "ネメシオン"
          ]
        },
        {
          "id": "pb_22_pre_08",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "どうして、ここに……。",
          "sourceText": "グノーシス：どうして、ここに……。",
          "sourceLine": 735,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_22_pre_09",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "グノーシス、こっちへ！",
          "sourceText": "契約者：グノーシス、こっちへ！",
          "sourceLine": 736,
          "background": "images/maps/starsea.webp"
        },
        {
          "id": "pb_22_pre_10",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公がグノーシスへ手を差し出す。ガルドラも駆け寄り、二人のそばに身を寄せる。",
          "sourceText": "演出：主人公がグノーシスへ手を差し出す。ガルドラも駆け寄り、二人のそばに身を寄せる。",
          "sourceLine": 737,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "reach",
          "cast": [
            "グノーシス",
            "ガルドラ"
          ]
        },
        {
          "id": "pb_22_pre_11",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "……っ、うん！",
          "sourceText": "グノーシス：……っ、うん！",
          "sourceLine": 738,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_22_pre_12",
          "kind": "production",
          "speaker": "演出",
          "text": "三人が光の道へ向き直る。偽竜の視線は、グノーシスを捉えたまま動かない。",
          "sourceText": "演出：三人が光の道へ向き直る。偽竜の視線は、グノーシスを捉えたまま動かない。",
          "sourceLine": 739,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "starPath",
          "cast": [
            "グノーシス",
            "ガルドラ",
            "偽竜 code:alfa"
          ]
        },
        {
          "id": "pb_22_battle",
          "kind": "production",
          "speaker": "制作注記・ゲーム内非表示",
          "text": "戦闘なし。演出のまま後半へ。",
          "sourceText": "制作注記・ゲーム内非表示：戦闘なし。演出のまま後半へ。",
          "sourceLine": 740,
          "background": "images/maps/starsea.webp",
          "display": false
        },
        {
          "id": "pb_22_post_01",
          "kind": "production",
          "speaker": "演出",
          "text": "ネメシオンが星の盾を構える間に、ネメシアに導かれた最後のネメスが光の道を渡る。偽竜は逃げる群れを追わず、主人公たちへ一歩踏み出す。",
          "sourceText": "演出：ネメシオンが星の盾を構える間に、ネメシアに導かれた最後のネメスが光の道を渡る。偽竜は逃げる群れを追わず、主人公たちへ一歩踏み出す。",
          "sourceLine": 742,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "starShield",
          "cast": [
            "ネメシオン",
            "偽竜 code:alfa"
          ]
        },
        {
          "id": "pb_22_post_02",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "皆、渡ったぞ！次はそなたらだ、急げ！",
          "sourceText": "ネメシオン：皆、渡ったぞ！次はそなたらだ、急げ！",
          "sourceLine": 743,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_22_post_03",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "PrayerName、急ごう……！",
          "sourceText": "グノーシス：PrayerName、急ごう……！",
          "sourceLine": 744,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_22_post_04",
          "kind": "production",
          "speaker": "演出",
          "text": "偽竜が翼を広げる。それに呼応して三人の足元の空間がひび割れ、向こう側へ口を開く。グノーシスの光と主人公の手をつなぐ線が、その奥へ引かれる。",
          "sourceText": "演出：偽竜が翼を広げる。それに呼応して三人の足元の空間がひび割れ、向こう側へ口を開く。グノーシスの光と主人公の手をつなぐ線が、その奥へ引かれる。",
          "sourceLine": 745,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "fracture",
          "cast": [
            "グノーシス",
            "ガルドラ",
            "偽竜 code:alfa"
          ]
        },
        {
          "id": "pb_22_post_05",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "足元だ！ そこから離れろ！",
          "sourceText": "ネメシオン：足元だ！ そこから離れろ！",
          "sourceLine": 746,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_22_post_06",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "うっ、体が……！ PrayerNameまで引っ張られてる！",
          "sourceText": "グノーシス：うっ、体が……！ PrayerNameまで引っ張られてる！",
          "sourceLine": 747,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_22_post_07",
          "kind": "production",
          "speaker": "演出",
          "text": "ネメシオンが翼を伸ばす。空間がずれて、届きかけた翼の先が離れる。",
          "sourceText": "演出：ネメシオンが翼を伸ばす。空間がずれて、届きかけた翼の先が離れる。",
          "sourceLine": 748,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "reach",
          "cast": [
            "ネメシオン",
            "グノーシス"
          ]
        },
        {
          "id": "pb_22_post_08",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "まだ届く！ つかまれ！",
          "sourceText": "ネメシオン：まだ届く！ つかまれ！",
          "sourceLine": 749,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_22_post_09",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラが主人公の胸に飛びつく。主人公は片腕で抱き留め、空いた手をグノーシスへ伸ばす。",
          "sourceText": "演出：ガルドラが主人公の胸に飛びつく。主人公は片腕で抱き留め、空いた手をグノーシスへ伸ばす。",
          "sourceLine": 750,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "holdTrio",
          "cast": [
            "グノーシス",
            "ガルドラ"
          ]
        },
        {
          "id": "pb_22_post_10",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "離さない！",
          "sourceText": "契約者：離さない！",
          "sourceLine": 751,
          "background": "images/maps/starsea.webp"
        },
        {
          "id": "pb_22_post_11",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガルッ！",
          "sourceText": "ガルドラ：ガルッ！",
          "sourceLine": 752,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_22_post_12",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "くっ……！ ボクも、離さない！",
          "sourceText": "グノーシス：くっ……！ ボクも、離さない！",
          "sourceLine": 753,
          "background": "images/maps/starsea.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_22_post_13",
          "kind": "production",
          "speaker": "演出",
          "text": "互いを離さないまま、三人が裂け目へ引き込まれる。偽竜の姿も砕けた時空の向こうへ消える。ネメシオンは届かなかった翼をそのまま縁へ向け、閉じていく裂け目へ星の光を打ち込む。",
          "sourceText": "演出：互いを離さないまま、三人が裂け目へ引き込まれる。偽竜の姿も砕けた時空の向こうへ消える。ネメシオンは届かなかった翼をそのまま縁へ向け、閉じていく裂け目へ星の光を打ち込む。",
          "sourceLine": 754,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "transfer",
          "cast": [
            "グノーシス",
            "ガルドラ",
            "偽竜 code:alfa"
          ]
        },
        {
          "id": "pb_22_post_14",
          "kind": "dialogue",
          "speaker": "ネメシオン",
          "text": "その光をたどれ！ 道を見失うな！",
          "sourceText": "ネメシオン：その光をたどれ！ 道を見失うな！",
          "sourceLine": 755,
          "background": "images/maps/starsea.webp",
          "portrait": "images/monsters/nemesion_20260920.webp"
        },
        {
          "id": "pb_22_post_15",
          "kind": "production",
          "speaker": "演出",
          "text": "暗転。戦闘敗北の音や所持品喪失表示は出さない。",
          "sourceText": "演出：暗転。戦闘敗北の音や所持品喪失表示は出さない。",
          "sourceLine": 756,
          "background": "images/maps/starsea.webp",
          "display": false,
          "effect": "blackout",
          "cast": []
        },
        {
          "id": "pb_22_post_16",
          "kind": "narration",
          "speaker": "地の文",
          "text": "最後に見えた星の光が、三人のあとを追うように、暗闇へ細く伸びていった。",
          "sourceText": "地の文：最後に見えた星の光が、三人のあとを追うように、暗闇へ細く伸びていった。",
          "sourceLine": 757,
          "background": "images/maps/starsea.webp"
        },
        {
          "id": "pb_22_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「第22話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceText": "「第22話を終える」で報酬と完了を保存。次話を解放。「次の話へ」「話一覧へ」を表示。",
          "sourceLine": 759,
          "background": "images/maps/starsea.webp",
          "label": "第22話を終える"
        }
      ]
    },
    {
      "id": "pb_ep",
      "number": 23,
      "title": "世界の狭間",
      "location": "世界の狭間・漂着地点→星の灯る足場",
      "rewards": {
        "exp": 0,
        "coins": 100
      },
      "background": "images/maps/bg_misty_black_plateau.webp",
      "previousEpisodeId": "pb_22",
      "battleIds": [],
      "steps": [
        {
          "id": "pb_ep_pre_01",
          "kind": "narration",
          "speaker": "地の文",
          "text": "白い空と黒い大地の境目がどこまでも続いていた。主人公は何度かまばたきをして、ようやく自分が横たわっていると分かった。",
          "sourceText": "地の文：白い空と黒い大地の境目がどこまでも続いていた。主人公は何度かまばたきをして、ようやく自分が横たわっていると分かった。",
          "sourceLine": 764,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "effect": "arrival",
          "cast": [
            "グノーシス",
            "ガルドラ"
          ]
        },
        {
          "id": "pb_ep_pre_02",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル……ガル！",
          "sourceText": "ガルドラ：ガル……ガル！",
          "sourceLine": 765,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_ep_pre_03",
          "kind": "production",
          "speaker": "演出",
          "text": "胸元で丸まっていたガルドラが、主人公の顔をのぞき込む。少し離れたところで、グノーシスが体を起こす。",
          "sourceText": "演出：胸元で丸まっていたガルドラが、主人公の顔をのぞき込む。少し離れたところで、グノーシスが体を起こす。",
          "sourceLine": 766,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "display": false,
          "effect": "arrival",
          "cast": [
            "グノーシス",
            "ガルドラ"
          ]
        },
        {
          "id": "pb_ep_pre_04",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "PrayerName！ ……よかったぁ。いくら呼んでも返事がないから、ボク……。",
          "sourceText": "グノーシス：PrayerName！ ……よかったぁ。いくら呼んでも返事がないから、ボク……。",
          "sourceLine": 767,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_pre_05",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "二人とも、無事？",
          "sourceText": "契約者：二人とも、無事？",
          "sourceLine": 768,
          "background": "images/maps/bg_misty_black_plateau.webp"
        },
        {
          "id": "pb_ep_pre_06",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "うん。ガルドラもずっとそこにいた。立てる？ 無理しなくていいからな。",
          "sourceText": "グノーシス：うん。ガルドラもずっとそこにいた。立てる？ 無理しなくていいからな。",
          "sourceLine": 769,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_pre_07",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公がガルドラを抱いて立ち上がる。手の契約の印に、小さな光が戻る。",
          "sourceText": "演出：主人公がガルドラを抱いて立ち上がる。手の契約の印に、小さな光が戻る。",
          "sourceLine": 770,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "display": false,
          "effect": "pledgeLight",
          "cast": [
            "グノーシス",
            "ガルドラ"
          ]
        },
        {
          "id": "pb_ep_pre_08",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あっ、光った！ 契約は切れてないぞ。ここでも仲間の力は呼べそうだ。",
          "sourceText": "グノーシス：あっ、光った！ 契約は切れてないぞ。ここでも仲間の力は呼べそうだ。",
          "sourceLine": 771,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_pre_09",
          "kind": "production",
          "speaker": "演出",
          "text": "遠くで黒い大地が崩れ、音が遅れて届く。その手前に偽竜が立っている。主人公が身構えても、偽竜は近づかず、静かに息を吐くだけだった。",
          "sourceText": "演出：遠くで黒い大地が崩れ、音が遅れて届く。その手前に偽竜が立っている。主人公が身構えても、偽竜は近づかず、静かに息を吐くだけだった。",
          "sourceLine": 772,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "display": false,
          "effect": "quiet",
          "cast": [
            "偽竜 code:alfa"
          ]
        },
        {
          "id": "pb_ep_pre_09a",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あいつ……！ ……でも、襲ってこないな。",
          "sourceText": "グノーシス：あいつ……！ ……でも、襲ってこないな。",
          "sourceLine": 773,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_pre_10",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ここ、知ってる気がする。……世界の狭間だ。",
          "sourceText": "グノーシス：ここ、知ってる気がする。……世界の狭間だ。",
          "sourceLine": 774,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_pre_11",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "来たことがあるの？",
          "sourceText": "契約者：来たことがあるの？",
          "sourceLine": 775,
          "background": "images/maps/bg_misty_black_plateau.webp"
        },
        {
          "id": "pb_ep_pre_12",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "……うーん、うまく思い出せないな。",
          "sourceText": "グノーシス：……うーん、うまく思い出せないな。",
          "sourceLine": 776,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_pre_13",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラが主人公の腕から降りる。足元を流れる細い星の光へ鼻を向ける。",
          "sourceText": "演出：ガルドラが主人公の腕から降りる。足元を流れる細い星の光へ鼻を向ける。",
          "sourceLine": 777,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "display": false,
          "effect": "starPath",
          "cast": [
            "グノーシス",
            "ガルドラ"
          ]
        },
        {
          "id": "pb_ep_pre_14",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガル！",
          "sourceText": "ガルドラ：ガル！",
          "sourceLine": 778,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_ep_pre_15",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ネメシオンの光だ！ ほら、まだ続いてる。追いかけてみよう。",
          "sourceText": "グノーシス：ネメシオンの光だ！ ほら、まだ続いてる。追いかけてみよう。",
          "sourceLine": 779,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_pre_16",
          "kind": "narration",
          "speaker": "地の文",
          "text": "光は崩れずに残った小さな足場まで続いていた。三人が渡り切ると、周りの星が弱くまたたいた。",
          "sourceText": "地の文：光は崩れずに残った小さな足場まで続いていた。三人が渡り切ると、周りの星が弱くまたたいた。",
          "sourceLine": 780,
          "background": "images/maps/bg_misty_black_plateau.webp",
          "effect": "starPath",
          "cast": [
            "グノーシス",
            "ガルドラ"
          ]
        },
        {
          "id": "pb_ep_dragon_01",
          "kind": "production",
          "speaker": "演出",
          "text": "偽竜が足場の縁へ降りる。主人公はガルドラを背にかばい、グノーシスの前に立つ。偽竜は翼を畳み、その場で動きを止める。",
          "sourceText": "演出：偽竜が足場の縁へ降りる。主人公はガルドラを背にかばい、グノーシスの前に立つ。偽竜は翼を畳み、その場で動きを止める。",
          "sourceLine": 781,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "quiet",
          "cast": [
            "グノーシス",
            "ガルドラ",
            "偽竜 code:alfa"
          ]
        },
        {
          "id": "pb_ep_dragon_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "……待って、PrayerName。",
          "sourceText": "グノーシス：……待って、PrayerName。",
          "sourceLine": 782,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_dragon_03",
          "kind": "production",
          "speaker": "演出",
          "text": "グノーシスが主人公の横へ出る。偽竜がゆっくりと頭を下げ、二人の目が合う。",
          "sourceText": "演出：グノーシスが主人公の横へ出る。偽竜がゆっくりと頭を下げ、二人の目が合う。",
          "sourceLine": 783,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "eyeContact",
          "cast": [
            "偽竜 code:alfa",
            "グノーシス"
          ]
        },
        {
          "id": "pb_ep_dragon_04",
          "kind": "production",
          "speaker": "演出",
          "text": "偽竜は何も言わない。低い息遣いだけが、静かな足場に響く。グノーシスも目をそらさず、じっとその視線を受け止めている。",
          "sourceText": "演出：偽竜は何も言わない。低い息遣いだけが、静かな足場に響く。グノーシスも目をそらさず、じっとその視線を受け止めている。",
          "sourceLine": 784,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "eyeContact",
          "cast": [
            "偽竜 code:alfa",
            "グノーシス"
          ]
        },
        {
          "id": "pb_ep_dragon_05",
          "kind": "production",
          "speaker": "演出",
          "text": "長い間のあと、グノーシスの張り詰めていた表情が少し緩む。小さく頷く。",
          "sourceText": "演出：長い間のあと、グノーシスの張り詰めていた表情が少し緩む。小さく頷く。",
          "sourceLine": 785,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "eyeContact",
          "cast": [
            "偽竜 code:alfa",
            "グノーシス"
          ]
        },
        {
          "id": "pb_ep_dragon_06",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "……分かった。",
          "sourceText": "グノーシス：……分かった。",
          "sourceLine": 786,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_dragon_07",
          "kind": "production",
          "speaker": "演出",
          "text": "グノーシスが主人公へ向き直る。偽竜は顔を上げず、静かに待っている。",
          "sourceText": "演出：グノーシスが主人公へ向き直る。偽竜は顔を上げず、静かに待っている。",
          "sourceLine": 787,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "quiet",
          "cast": [
            "偽竜 code:alfa",
            "グノーシス"
          ]
        },
        {
          "id": "pb_ep_dragon_08",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "PrayerName。危ないのは、ボクらがいた世界だけじゃない。ほかにも、いくつもの世界が危機に陥ってるんだ。",
          "sourceText": "グノーシス：PrayerName。危ないのは、ボクらがいた世界だけじゃない。ほかにも、いくつもの世界が危機に陥ってるんだ。",
          "sourceLine": 788,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_dragon_09",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "ほかの世界も……？",
          "sourceText": "契約者：ほかの世界も……？",
          "sourceLine": 789,
          "background": "images/maps/world_between.webp"
        },
        {
          "id": "pb_ep_dragon_10",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "うん。こいつは、その世界を助けてほしくて、ボクらをここへ連れてきた。ボクらに力を貸してほしいんだ。",
          "sourceText": "グノーシス：うん。こいつは、その世界を助けてほしくて、ボクらをここへ連れてきた。ボクらに力を貸してほしいんだ。",
          "sourceLine": 790,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_dragon_11",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "さっき、そう伝えてきたの？",
          "sourceText": "契約者：さっき、そう伝えてきたの？",
          "sourceLine": 791,
          "background": "images/maps/world_between.webp"
        },
        {
          "id": "pb_ep_dragon_12",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "……うん。言葉じゃないけど、分かった。",
          "sourceText": "グノーシス：……うん。言葉じゃないけど、分かった。",
          "sourceLine": 792,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_dragon_13",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公が偽竜を見る。偽竜は爪を立てることも、身を乗り出すこともなく、三人の返事を待っている。",
          "sourceText": "演出：主人公が偽竜を見る。偽竜は爪を立てることも、身を乗り出すこともなく、三人の返事を待っている。",
          "sourceLine": 793,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "quiet",
          "cast": [
            "偽竜 code:alfa",
            "グノーシス"
          ]
        },
        {
          "id": "pb_ep_dragon_14",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "……でも、いきなり連れてくることはないだろ。みんな、驚いたんだぞ。",
          "sourceText": "グノーシス：……でも、いきなり連れてくることはないだろ。みんな、驚いたんだぞ。",
          "sourceLine": 794,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_dragon_15",
          "kind": "production",
          "speaker": "演出",
          "text": "偽竜が長く息を吐く。グノーシスはしばらくその顔を見つめ、もう一度主人公へ向き直る。",
          "sourceText": "演出：偽竜が長く息を吐く。グノーシスはしばらくその顔を見つめ、もう一度主人公へ向き直る。",
          "sourceLine": 795,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "quiet",
          "cast": [
            "偽竜 code:alfa",
            "グノーシス"
          ]
        },
        {
          "id": "pb_ep_post_03",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ボクの姿を戻す方法も、旅の先で見つかるかもしれない。……いや、この先にある気がするんだ。",
          "sourceText": "グノーシス：ボクの姿を戻す方法も、旅の先で見つかるかもしれない。……いや、この先にある気がするんだ。",
          "sourceLine": 796,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_post_04",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "直感ってやつ？",
          "sourceText": "契約者：直感ってやつ？",
          "sourceLine": 797,
          "background": "images/maps/world_between.webp"
        },
        {
          "id": "pb_ep_post_05",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "……うん。ごめんな、根拠とかなくて。",
          "sourceText": "グノーシス：……うん。ごめんな、根拠とかなくて。",
          "sourceLine": 798,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_dragon_16",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "どうする、PrayerName。",
          "sourceText": "グノーシス：どうする、PrayerName。",
          "sourceLine": 799,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_dragon_17",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "行こう。ちょうど目的が欲しかったんだ。",
          "sourceText": "契約者：行こう。ちょうど目的が欲しかったんだ。",
          "sourceLine": 800,
          "background": "images/maps/world_between.webp"
        },
        {
          "id": "pb_ep_post_05b",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "いいのか？ 危険かもしれないんだぞ？",
          "sourceText": "グノーシス：いいのか？ 危険かもしれないんだぞ？",
          "sourceLine": 801,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_post_05c",
          "kind": "dialogue",
          "speaker": "契約者",
          "text": "今さらだよ。それに、そういう契約だろ。",
          "sourceText": "契約者：今さらだよ。それに、そういう契約だろ。",
          "sourceLine": 802,
          "background": "images/maps/world_between.webp"
        },
        {
          "id": "pb_ep_post_05d",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "！ ありがとう！ 大好きだよ、PrayerName！",
          "sourceText": "グノーシス：！ ありがとう！ 大好きだよ、PrayerName！",
          "sourceLine": 803,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_dragon_19",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラが主人公の足元から顔を出し、グノーシスと主人公を順に見上げる。",
          "sourceText": "演出：ガルドラが主人公の足元から顔を出し、グノーシスと主人公を順に見上げる。",
          "sourceLine": 804,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "holdTrio",
          "cast": [
            "グノーシス",
            "ガルドラ"
          ]
        },
        {
          "id": "pb_ep_dragon_20",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガルッ！",
          "sourceText": "ガルドラ：ガルッ！",
          "sourceLine": 805,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_ep_dragon_21",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "分かってる！お前も一緒だ！",
          "sourceText": "グノーシス：分かってる！お前も一緒だ！",
          "sourceLine": 806,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_dragon_22",
          "kind": "production",
          "speaker": "演出",
          "text": "偽竜は静かに頭を上げる。三人へ背を向け、白い空の向こうを見据えた。そのまま翼を休め、三人の支度を待つ。",
          "sourceText": "演出：偽竜は静かに頭を上げる。三人へ背を向け、白い空の向こうを見据えた。そのまま翼を休め、三人の支度を待つ。",
          "sourceLine": 807,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "quiet",
          "cast": [
            "グノーシス",
            "ガルドラ",
            "偽竜 code:alfa"
          ]
        },
        {
          "id": "pb_ep_battle",
          "kind": "production",
          "speaker": "",
          "text": "戦闘なし。指定の操作を経て後半へ。",
          "sourceText": "戦闘なし。指定の操作を経て後半へ。",
          "sourceLine": 808,
          "background": "images/maps/world_between.webp",
          "display": false
        },
        {
          "id": "pb_ep_post_01",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "ここは、さっきみたいに崩れそうにないな。……ちょっと座っていい？",
          "sourceText": "グノーシス：ここは、さっきみたいに崩れそうにないな。……ちょっと座っていい？",
          "sourceLine": 810,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_post_02",
          "kind": "production",
          "speaker": "演出",
          "text": "ガルドラが主人公の隣に座る。グノーシスも腰を下ろし、足場の縁で待つ偽竜へ目を向ける。",
          "sourceText": "演出：ガルドラが主人公の隣に座る。グノーシスも腰を下ろし、足場の縁で待つ偽竜へ目を向ける。",
          "sourceLine": 811,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "quiet",
          "cast": [
            "グノーシス",
            "ガルドラ",
            "偽竜 code:alfa"
          ]
        },
        {
          "id": "pb_ep_gacha_01",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あ、そうだ、PrayerName！ ボクの力で、旅の仲間を呼んでみよう！ 応えてくれるやつがいるかもしれないぞ！",
          "sourceText": "グノーシス：あ、そうだ、PrayerName！ ボクの力で、旅の仲間を呼んでみよう！ 応えてくれるやつがいるかもしれないぞ！",
          "sourceLine": 812,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_gacha_02",
          "kind": "system",
          "speaker": "システム",
          "text": "キャラクターガチャを1回引けます。コインは使いません。",
          "sourceText": "システム：キャラクターガチャを1回引けます。コインは使いません。",
          "sourceLine": 813,
          "background": "images/maps/world_between.webp"
        },
        {
          "id": "pb_ep_gacha_draw",
          "kind": "event",
          "speaker": "(操作)",
          "text": "無料で1回引く。演出は通常の「魂の契約」。",
          "sourceText": "(操作)：無料で1回引く。演出は通常の「魂の契約」。",
          "sourceLine": 814,
          "background": "images/maps/world_between.webp",
          "action": "freeCharacterGacha"
        },
        {
          "id": "pb_ep_gacha_03",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "応えてくれたな！ ここからでも、ちゃんと届くんだ。",
          "sourceText": "グノーシス：応えてくれたな！ ここからでも、ちゃんと届くんだ。",
          "sourceLine": 815,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_post_06",
          "kind": "production",
          "speaker": "演出",
          "text": "足場の縁で、星の光が細い入口を描く。向こう側に見覚えのある石柱が立ち、風で草が揺れている。",
          "sourceText": "演出：足場の縁で、星の光が細い入口を描く。向こう側に見覚えのある石柱が立ち、風で草が揺れている。",
          "sourceLine": 816,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "starPath",
          "cast": [
            "グノーシス",
            "ガルドラ"
          ]
        },
        {
          "id": "pb_ep_post_07",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "あの石柱、星空の平原だ！ ネメシオンが、ここまで道をつないでくれたのかな。",
          "sourceText": "グノーシス：あの石柱、星空の平原だ！ ネメシオンが、ここまで道をつないでくれたのかな。",
          "sourceLine": 817,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_post_08",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公が小石を転がす。石は入口の向こうで跳ね、草の間へ落ちる。",
          "sourceText": "演出：主人公が小石を転がす。石は入口の向こうで跳ね、草の間へ落ちる。",
          "sourceLine": 818,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "starPath",
          "cast": [
            "グノーシス",
            "ガルドラ"
          ]
        },
        {
          "id": "pb_ep_post_09",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "通れそうだ！ ここを出る前に、戻るときの目印も見ておこうよ。",
          "sourceText": "グノーシス：通れそうだ！ ここを出る前に、戻るときの目印も見ておこうよ。",
          "sourceLine": 819,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_post_10",
          "kind": "system",
          "speaker": "システム",
          "text": "世界の狭間の足場が拠点になります。『バトル』から世界地図を開いて、地上へ出かけられます。拠点の外に広がる狭間は、まだ探索できません。",
          "sourceText": "システム：世界の狭間の足場が拠点になります。『バトル』から世界地図を開いて、地上へ出かけられます。拠点の外に広がる狭間は、まだ探索できません。",
          "sourceLine": 820,
          "background": "images/maps/world_between.webp"
        },
        {
          "id": "pb_ep_return_route",
          "kind": "event",
          "action": "returnRoute"
        },
        {
          "id": "pb_ep_post_11",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "取り敢えず、やれることをやろうぜ。",
          "sourceText": "グノーシス：取り敢えず、やれることをやろうぜ。",
          "sourceLine": 821,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_post_12",
          "kind": "dialogue",
          "speaker": "ガルドラ",
          "text": "ガルッ！",
          "sourceText": "ガルドラ：ガルッ！",
          "sourceLine": 822,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/galdra_story_v1.webp"
        },
        {
          "id": "pb_ep_post_13",
          "kind": "production",
          "speaker": "演出",
          "text": "主人公が手を差し出す。ガルドラが自分から頭を寄せ、主人公はその頭をなでる。グノーシスも二人の隣へ浮かぶ。",
          "sourceText": "演出：主人公が手を差し出す。ガルドラが自分から頭を寄せ、主人公はその頭をなでる。グノーシスも二人の隣へ浮かぶ。",
          "sourceLine": 823,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "holdTrio",
          "cast": [
            "グノーシス",
            "ガルドラ"
          ]
        },
        {
          "id": "pb_ep_post_14",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "まずは支度を整えよう。今度は、どこへ行くための支度か分かってるからな！",
          "sourceText": "グノーシス：まずは支度を整えよう。今度は、どこへ行くための支度か分かってるからな！",
          "sourceLine": 824,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_post_15",
          "kind": "narration",
          "speaker": "地の文",
          "text": "三人は、草の揺れる帰還路へ顔を向けた。その向こうで支度を整えれば、まだ見ぬ世界への旅が始まる。偽竜は足場の縁で、静かに待っていた。",
          "sourceText": "地の文：三人は、草の揺れる帰還路へ顔を向けた。その向こうで支度を整えれば、まだ見ぬ世界への旅が始まる。偽竜は足場の縁で、静かに待っていた。",
          "sourceLine": 825,
          "background": "images/maps/world_between.webp"
        },
        {
          "id": "pb_ep_kenno_01",
          "kind": "production",
          "speaker": "演出",
          "text": "グノーシスの胸元に、小さな光が一つ灯る。光は主人公の手の契約の印へ移り、静かに収まる。",
          "sourceText": "演出：グノーシスの胸元に、小さな光が一つ灯る。光は主人公の手の契約の印へ移り、静かに収まる。",
          "sourceLine": 826,
          "background": "images/maps/world_between.webp",
          "display": false,
          "effect": "pledgeLight",
          "cast": [
            "グノーシス",
            "ガルドラ"
          ]
        },
        {
          "id": "pb_ep_kenno_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "……今の、見えた？ ほんの少しだけど、ボクの中に何かが戻ってくる場所ができたみたいだ。",
          "sourceText": "グノーシス：……今の、見えた？ ほんの少しだけど、ボクの中に何かが戻ってくる場所ができたみたいだ。",
          "sourceLine": 827,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_kenno_03",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "PrayerName。……ボク、君と契約して正解だった！",
          "sourceText": "グノーシス：PrayerName。……ボク、君と契約して正解だった！",
          "sourceLine": 828,
          "background": "images/maps/world_between.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_ep_kenno_04",
          "kind": "system",
          "speaker": "システム",
          "text": "「権能」が開放されました。",
          "sourceText": "システム：「権能」が開放されました。",
          "sourceLine": 829,
          "background": "images/maps/world_between.webp"
        },
        {
          "id": "pb_ep_post_16",
          "kind": "system",
          "speaker": "システム",
          "text": "序章完了。新しい拠点から、旅を続けましょう。",
          "sourceText": "システム：序章完了。新しい拠点から、旅を続けましょう。",
          "sourceLine": 830,
          "background": "images/maps/world_between.webp"
        },
        {
          "id": "pb_ep_complete",
          "kind": "complete",
          "speaker": "",
          "text": "「序章を終える」で報酬と完了を保存。拠点案内へ。",
          "sourceText": "「序章を終える」で報酬と完了を保存。拠点案内へ。",
          "sourceLine": 840,
          "background": "images/maps/world_between.webp",
          "label": "序章を終える"
        }
      ]
    }
  ],
  "battles": {
    "p2_07_a": {
      "id": "p2_07_a",
      "episodeId": "pb_07",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "slime",
          "level": 5,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_slime_01",
            "skill_slime_02",
            "skill_slime_03"
          ]
        }
      ],
      "contractAllowed": true
    },
    "p2_07_b": {
      "id": "p2_07_b",
      "episodeId": "pb_07",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "goblin",
          "level": 5,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_goblin_01",
            "skill_goblin_02",
            "skill_goblin_03"
          ]
        }
      ],
      "contractAllowed": false
    },
    "p2_09_a": {
      "id": "p2_09_a",
      "episodeId": "pb_09",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "grassbeat",
          "level": 6,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_grassbeat_01",
            "skill_grassbeat_02",
            "skill_grassbeat_03",
            "skill_grassbeat_04",
            "skill_grassbeat_05",
            "skill_grassbeat_06"
          ]
        }
      ],
      "contractAllowed": false
    },
    "p2_09_b": {
      "id": "p2_09_b",
      "episodeId": "pb_09",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "volteck",
          "level": 6,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_volteck_01",
            "skill_volteck_02",
            "skill_volteck_03",
            "skill_volteck_04",
            "skill_volteck_05",
            "skill_volteck_06",
            "skill_volteck_07"
          ]
        }
      ],
      "contractAllowed": false
    },
    "p2_12_a": {
      "id": "p2_12_a",
      "episodeId": "pb_12",
      "mode": "three_way",
      "enemies": [
        {
          "speciesId": "thornbeat",
          "level": 8,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_thornbeat_01",
            "skill_thornbeat_02",
            "skill_thornbeat_03"
          ]
        },
        {
          "speciesId": "nightmare",
          "level": 8,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_nightmare_01",
            "skill_nightmare_02",
            "skill_nightmare_03"
          ]
        }
      ],
      "contractAllowed": false
    },
    "p2_13_a": {
      "id": "p2_13_a",
      "episodeId": "pb_13",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "morglum",
          "level": 9,
          "attackMultiplier": 0.45,
          "hpMultiplier": 0.5,
          "moveIds": [
            "skill_morglum_01",
            "skill_morglum_02",
            "skill_morglum_03"
          ]
        }
      ],
      "contractAllowed": false
    },
    "p2_13_b": {
      "id": "p2_13_b",
      "episodeId": "pb_13",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "nightmare",
          "level": 9,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_nightmare_01",
            "skill_nightmare_02",
            "skill_nightmare_03"
          ]
        }
      ],
      "contractAllowed": false
    },
    "p2_14_a": {
      "id": "p2_14_a",
      "episodeId": "pb_14",
      "mode": "invasion",
      "enemies": [
        {
          "speciesId": "nocle",
          "level": 10,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_nocle_01",
            "skill_nocle_02",
            "skill_nocle_03"
          ]
        },
        {
          "speciesId": "noclaid",
          "level": 10,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_noclaid_01",
            "skill_noclaid_02",
            "skill_noclaid_03"
          ]
        }
      ],
      "contractAllowed": false,
      "invasionRound": 2,
      "forceInvasionOnEarlyKO": true,
      "interruptCards": [
        {
          "id": "pb_14_post_01",
          "kind": "production",
          "speaker": "演出",
          "text": "第2ラウンドの乱入直前。横手の家屋の陰で、もう一対の目が光る。",
          "sourceText": "演出：第2ラウンドの乱入直前。横手の家屋の陰で、もう一対の目が光る。",
          "sourceLine": 486,
          "background": "images/maps/ruined_village.webp"
        },
        {
          "id": "pb_14_post_02",
          "kind": "dialogue",
          "speaker": "グノーシス",
          "text": "横だ、PrayerName！ まだ一体いたぞ！",
          "sourceText": "グノーシス：横だ、PrayerName！ まだ一体いたぞ！",
          "sourceLine": 487,
          "background": "images/maps/ruined_village.webp",
          "portrait": "images/tutorial/characters/gnosis-dialogue-transparent-final.png"
        },
        {
          "id": "pb_14_post_03",
          "kind": "system",
          "speaker": "システム",
          "text": "新しい相手が乱入しました。攻撃対象と味方のHPを確認してください。",
          "sourceText": "システム：新しい相手が乱入しました。攻撃対象と味方のHPを確認してください。",
          "sourceLine": 488,
          "background": "images/maps/ruined_village.webp"
        }
      ]
    },
    "p2_15_a": {
      "id": "p2_15_a",
      "episodeId": "pb_15",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "noxvelg",
          "level": 11,
          "attackMultiplier": 0.65,
          "hpMultiplier": 0.75,
          "moveIds": [
            "skill_noxvelg_01",
            "skill_noxvelg_02",
            "skill_noxvelg_03"
          ]
        }
      ],
      "contractAllowed": false
    },
    "p2_17_a": {
      "id": "p2_17_a",
      "episodeId": "pb_17",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "volmoog",
          "level": 12,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_volmoog_01",
            "skill_volmoog_02",
            "skill_volmoog_03"
          ]
        }
      ],
      "contractAllowed": false
    },
    "p2_17_b": {
      "id": "p2_17_b",
      "episodeId": "pb_17",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "character_remnes_3",
          "level": 12,
          "attackMultiplier": 0.65,
          "hpMultiplier": 0.65,
          "moveIds": [
            "skill_character_remnes_3_01",
            "skill_character_remnes_3_02",
            "skill_character_remnes_3_03"
          ]
        }
      ],
      "contractAllowed": false
    },
    "p2_18_a": {
      "id": "p2_18_a",
      "episodeId": "pb_18",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "noclaid",
          "level": 13,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_noclaid_01",
            "skill_noclaid_02",
            "skill_noclaid_03"
          ]
        }
      ],
      "contractAllowed": false
    },
    "p2_19_a": {
      "id": "p2_19_a",
      "episodeId": "pb_19",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "nemes",
          "level": 13,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_nemes_01",
            "skill_nemes_02",
            "skill_nemes_03",
            "skill_nemes_04",
            "skill_nemes_05"
          ]
        }
      ],
      "contractAllowed": false
    },
    "p2_19_b": {
      "id": "p2_19_b",
      "episodeId": "pb_19",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "nemesia",
          "level": 14,
          "attackMultiplier": 0.8,
          "hpMultiplier": 1,
          "moveIds": [
            "skill_nemesia_01",
            "skill_nemesia_02",
            "skill_nemesia_03"
          ]
        }
      ],
      "contractAllowed": false
    },
    "p2_20_a": {
      "id": "p2_20_a",
      "episodeId": "pb_20",
      "mode": "single",
      "enemies": [
        {
          "speciesId": "nemesion",
          "level": 15,
          "attackMultiplier": 0.65,
          "hpMultiplier": 0.75,
          "moveIds": [
            "skill_nemesion_01",
            "skill_nemesion_02",
            "skill_nemesion_03"
          ]
        }
      ],
      "contractAllowed": false
    }
  },
  "portraits": {
    "ボルド": "images/monsters/bordo_veteran_star3_20261004.webp",
    "リゼ": "images/monsters/lize_vendor_star2_20261004.webp",
    "ミレーユ": "images/monsters/mireille_performer_star2_20261004.webp",
    "トビア": "images/monsters/tobia_apprentice_star2_20261004.webp",
    "ブリジット": "images/monsters/brigitte_knight_star3_20261004.webp",
    "セレネ": "images/monsters/selene_patrol_star2_20261004.webp",
    "ローデン": "images/monsters/roden_battle_star3_20261004.webp",
    "ニコ": "images/monsters/nico_maker_star2_20261004.webp",
    "サフィラ": "images/monsters/safira_caravan_star2_20261004.webp",
    "レグス": "images/monsters/regus_wounded_star2_20261004.webp",
    "レムネス": "images/monsters/remnes_memory_star3_20261004.webp",
    "ネメシオン": "images/monsters/nemesion_20260920.webp",
    "グノーシス": "images/tutorial/characters/gnosis-dialogue-transparent-final.png",
    "ガルドラ": "images/tutorial/characters/galdra_story_v1.webp",
    "エルナ": "images/tutorial/characters/elna_beginner.png",
    "ステラ": "images/tutorial/characters/stella_apprentice.png",
    "ルミナ": "images/tutorial/characters/lumina_apprentice.png",
    "偽竜 code:alfa": "images/monsters/false_dragon_alfa_20260920.webp"
  },
  "optionalCards": [
    {
      "id": "pb_opt_gacha_01",
      "speaker": "リゼ",
      "text": "技の札を増やしたいなら、技ガチャも見てみる？ 何が出るかと、何を使うかを先に確かめてね。",
      "kind": "dialogue",
      "display": false
    },
    {
      "id": "pb_opt_gacha_02",
      "speaker": "グノーシス",
      "text": "会った人が、みんな勝手に仲間になるわけじゃないぞ。本人との出会いと、PrayerNameが使う契約体は別なんだ。",
      "kind": "dialogue",
      "display": true
    },
    {
      "id": "pb_opt_gacha_03",
      "speaker": "システム",
      "text": "ガチャ画面を開きます。",
      "kind": "system",
      "display": true
    },
    {
      "id": "pb_opt_evo_01",
      "speaker": "ステラ",
      "text": "いつもの進化とは違う条件が必要な仲間もいるの。何でもレベルを上げれば変わる、ってわけじゃないよ。",
      "kind": "dialogue",
      "display": true
    },
    {
      "id": "pb_opt_evo_02",
      "speaker": "システム",
      "text": "特殊進化の条件を図鑑・育成画面で確認できます。条件表示が未解放なら、既存の解放案内だけを表示します。",
      "kind": "system",
      "display": true
    },
    {
      "id": "pb_opt_gold_01",
      "speaker": "トビア",
      "text": "黄金郷の話、聞いた？ 地図を持ってた配達先の人が、出発前に何度も条件を確かめてたよ。",
      "kind": "dialogue",
      "display": true
    },
    {
      "id": "pb_opt_gold_02",
      "speaker": "グノーシス",
      "text": "見つけたら入口の説明を読もう。今の調査を急ぐために、無理して探す必要はないぞ。",
      "kind": "dialogue",
      "display": true
    },
    {
      "id": "pb_opt_gold_03",
      "speaker": "システム",
      "text": "黄金郷は対応する既存ガイドから確認できます。この物語で地図の入手・消費は要求しません。",
      "kind": "system",
      "display": true
    },
    {
      "id": "pb_opt_rank_01",
      "speaker": "ブリジット",
      "text": "積み上げた実績は記録に残る。自分のRankと称号も、ときどき確認するといい。",
      "kind": "dialogue",
      "display": true
    },
    {
      "id": "pb_opt_rank_02",
      "speaker": "システム",
      "text": "Rank・称号画面を開きます。上昇条件や付与効果は画面の説明を確認してください。",
      "kind": "system",
      "display": true
    },
    {
      "id": "pb_opt_expedition_01",
      "speaker": "トビア",
      "text": "遠い道ほど、帰りを待つ時間も考えなきゃ。出す前に、行き先と戻るまでを確かめてね。",
      "kind": "dialogue",
      "display": true
    },
    {
      "id": "pb_opt_expedition_02",
      "speaker": "グノーシス",
      "text": "遠征中の仲間を今すぐ使いたいなら、途中帰還の説明を見よう。報酬の扱いも確認してからだぞ。",
      "kind": "dialogue",
      "display": true
    },
    {
      "id": "pb_opt_expedition_03",
      "speaker": "システム",
      "text": "帰還した遠征の報酬は遠征画面で受け取れます。中・長距離遠征や途中帰還の条件もここで確認できます。",
      "kind": "system",
      "display": true
    },
    {
      "id": "pb_opt_home_01",
      "speaker": "グノーシス",
      "text": "ここにある入口は、全部同じ場所へつながるわけじゃない。まずは地上へ戻る道を覚えよう。",
      "kind": "dialogue",
      "display": true
    },
    {
      "id": "pb_opt_home_02",
      "speaker": "システム",
      "text": "拠点の各機能を選ぶと既存の初回ガイドを表示します。既読ガイドは「使い方」から再確認できます。",
      "kind": "system",
      "display": true
    }
  ],
  "totals": {
    "battles": 15,
    "exp": 6120,
    "coins": 1980,
    "stipend": 100
  },
  "sceneEffects": [
    "fracture",
    "starShield",
    "starPath",
    "reach",
    "holdTrio",
    "transfer",
    "blackout",
    "eyeContact",
    "pledgeLight",
    "silhouette",
    "arrival",
    "quiet"
  ],
  "optionalRoutes": [
    {
      "id": "gacha",
      "location": "hub",
      "afterEpisode": "pb_ep",
      "cardIds": [
        "pb_opt_gacha_02",
        "pb_opt_gacha_03"
      ],
      "action": "gacha",
      "required": false,
      "skippable": true,
      "unlockTarget": false,
      "rewards": false
    },
    {
      "id": "evolution",
      "location": "episode16",
      "afterEpisode": "pb_15",
      "speaker": "ステラ",
      "cardIds": [
        "pb_opt_evo_01",
        "pb_opt_evo_02"
      ],
      "action": "evolution",
      "required": false,
      "skippable": true,
      "unlockTarget": false,
      "rewards": false
    },
    {
      "id": "goldenLand",
      "location": "episode16",
      "afterEpisode": "pb_15",
      "speaker": "トビア",
      "cardIds": [
        "pb_opt_gold_01",
        "pb_opt_gold_02",
        "pb_opt_gold_03"
      ],
      "action": "goldenLandGuide",
      "required": false,
      "skippable": true,
      "unlockTarget": false,
      "rewards": false
    },
    {
      "id": "rank",
      "location": "episode16",
      "afterEpisode": "pb_15",
      "speaker": "ブリジット",
      "cardIds": [
        "pb_opt_rank_01",
        "pb_opt_rank_02"
      ],
      "action": "rank",
      "required": false,
      "skippable": true,
      "unlockTarget": false,
      "rewards": false
    },
    {
      "id": "expedition",
      "location": "expedition",
      "cardIds": [
        "pb_opt_expedition_01",
        "pb_opt_expedition_02",
        "pb_opt_expedition_03"
      ],
      "action": "expedition",
      "required": false,
      "skippable": true,
      "unlockTarget": false,
      "rewards": false
    },
    {
      "id": "home",
      "location": "hub",
      "afterEpisode": "pb_ep",
      "cardIds": [
        "pb_opt_home_01",
        "pb_opt_home_02"
      ],
      "action": "homeGuide",
      "required": false,
      "skippable": true,
      "unlockTarget": false,
      "rewards": false
    }
  ]
};
  root.PROLOGUE_PART2_DATA=Object.freeze(data);
})(globalThis);
