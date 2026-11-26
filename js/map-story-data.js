/* Approved Drive manuscript, 2026-10-12; dialogue is preserved verbatim. */
const GRASSLAND_STORY = {
  "id": "grassland_whose",
  "version": 1,
  "mapId": "grassland",
  "title": "草原は、誰のもの",
  "completedText": "草原の暮らしを知り、道を見つけた。",
  "episodes": [
    {
      "id": "gl_01",
      "number": 1,
      "title": "枯草の下で",
      "unlockAfter": null,
      "recommendedLevel": 1,
      "battleMode": "single",
      "enemies": [
        {
          "speciesId": "slime",
          "level": 1,
          "hp": 55,
          "speed": 40,
          "attackMultiplier": 0.8,
          "moveIds": [
            "skill_slime_01",
            "skill_slime_03"
          ]
        }
      ],
      "firstReward": {
        "exp": 80,
        "coins": 30
      },
      "repeatReward": {
        "exp": 20,
        "coins": 10
      },
      "preNodes": [
        {
          "id": "gl_01_pre_01",
          "kind": "narration",
          "speaker": "narrator",
          "text": "雨の少ない日が続いていた。丘の向こうへ続く古道を探し、三人は背の高い草の間を歩いている。"
        },
        {
          "id": "gl_01_pre_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "あの丘を越えれば、石の道が見えるはずだぞ。……たぶん！"
        },
        {
          "id": "gl_01_pre_03",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガウ。"
        },
        {
          "id": "gl_01_pre_04",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "草が伸びすぎて見えないんだ！ おっ、あの窪地なら歩きやすそうだな。"
        },
        {
          "id": "gl_01_pre_05",
          "kind": "stage",
          "speaker": null,
          "text": "ガルドラが枯草の薄い窪地へ降りる。草の下からスライムが跳ね、ガルドラが契約者の方へ飛び退く。"
        },
        {
          "id": "gl_01_pre_06",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガァ～ウ！"
        },
        {
          "id": "gl_01_pre_07",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "スライムだ！"
        },
        {
          "id": "gl_01_pre_08",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "向こうも驚いてる！ 距離を取るために、まず身を守るぞ！"
        }
      ],
      "postNodes": [
        {
          "id": "gl_01_post_01",
          "kind": "stage",
          "speaker": null,
          "text": "スライムが枯草の奥へ退く。一行は窪地の端まで下がる。"
        },
        {
          "id": "gl_01_post_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "空いてる場所だと思ったんだけどな〜。"
        },
        {
          "id": "gl_01_post_03",
          "kind": "stage",
          "speaker": null,
          "text": "別のスライムが枯草を包み込む。ガルドラが柔らかい土を前足で押し、契約者を見上げる。"
        },
        {
          "id": "gl_01_post_04",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル！"
        },
        {
          "id": "gl_01_post_05",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "おっ、よく見つけたな！ スライムは枯草や残った魔力を取り込んで、土に養分を戻すんだ。"
        },
        {
          "id": "gl_01_post_06",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "どこにでもいるな。"
        },
        {
          "id": "gl_01_post_07",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "そういうこと！ 草が少ないからって、何もないわけじゃないんだぞ。"
        },
        {
          "id": "gl_01_post_08",
          "kind": "narration",
          "speaker": "narrator",
          "text": "窪地の先には、短くなった草が帯のように続いている。"
        }
      ]
    },
    {
      "id": "gl_02",
      "number": 2,
      "title": "食べ残された草",
      "unlockAfter": "gl_01",
      "recommendedLevel": 2,
      "battleMode": "single",
      "enemies": [
        {
          "speciesId": "grassbeat",
          "level": 2,
          "hp": 122,
          "speed": 62,
          "attackMultiplier": 0.85,
          "moveIds": [
            "skill_grassbeat_01",
            "skill_grassbeat_02"
          ]
        }
      ],
      "firstReward": {
        "exp": 120,
        "coins": 40
      },
      "repeatReward": {
        "exp": 20,
        "coins": 10
      },
      "preNodes": [
        {
          "id": "gl_02_pre_01",
          "kind": "stage",
          "speaker": null,
          "text": "短い草の帯を中央に表示。脇には茎だけ残った草。遠くでリカシーフが低木の葉を食べている。"
        },
        {
          "id": "gl_02_pre_02",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "この細い道、丘まで続いてるかな。"
        },
        {
          "id": "gl_02_pre_03",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "ふふん、いいところに気づいたな！ 行ってみよう！"
        },
        {
          "id": "gl_02_pre_04",
          "kind": "narration",
          "speaker": "narrator",
          "text": "草の帯は低い茂みで途切れた。葉の陰からグラスビートが身体を起こす。"
        },
        {
          "id": "gl_02_pre_05",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガルル！"
        },
        {
          "id": "gl_02_pre_06",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "しまった、近すぎた！ 引き返せる場所をつくろう！"
        }
      ],
      "postNodes": [
        {
          "id": "gl_02_post_01",
          "kind": "stage",
          "speaker": null,
          "text": "グラスビートが草の深い側へ退く。残った葉の縁と、低木の食べ跡を順に示す。"
        },
        {
          "id": "gl_02_post_02",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "道じゃなくて、食べた跡だったのか。"
        },
        {
          "id": "gl_02_post_03",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "ああ。ここは葉が減ってる。あっちのリカシーフは、もう少し高いところを食べてるな。"
        },
        {
          "id": "gl_02_post_04",
          "kind": "stage",
          "speaker": null,
          "text": "ガルドラが短い草と残った茎を交互に嗅ぐ。"
        },
        {
          "id": "gl_02_post_05",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル！"
        },
        {
          "id": "gl_02_post_06",
          "kind": "narration",
          "speaker": "narrator",
          "text": "土が草を育てて、その草を食べるものがいる。"
        },
        {
          "id": "gl_02_post_07",
          "kind": "narration",
          "speaker": "narrator",
          "text": "先の低木から、枝が折れる音がした。"
        }
      ]
    },
    {
      "id": "gl_03",
      "number": 3,
      "title": "一つの茂み、二つの暮らし",
      "unlockAfter": "gl_02",
      "recommendedLevel": 3,
      "battleMode": "three_way",
      "enemies": [
        {
          "speciesId": "rikasheef",
          "level": 3,
          "hp": 119,
          "speed": 78,
          "attackMultiplier": 0.85,
          "moveIds": [
            "skill_rikasheef_01",
            "skill_rikasheef_02"
          ]
        },
        {
          "speciesId": "goblin",
          "level": 3,
          "hp": 104,
          "speed": 50,
          "attackMultiplier": 0.85,
          "moveIds": [
            "skill_goblin_01",
            "skill_goblin_02"
          ]
        }
      ],
      "firstReward": {
        "exp": 180,
        "coins": 55
      },
      "repeatReward": {
        "exp": 20,
        "coins": 10
      },
      "preNodes": [
        {
          "id": "gl_03_pre_01",
          "kind": "stage",
          "speaker": null,
          "text": "低木の左にリカシーフ、右に木の実と枝を抱えたゴブリン。双方が互いを威嚇する。"
        },
        {
          "id": "gl_03_pre_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "……あれ、先客同士が揉めてるぞ。"
        },
        {
          "id": "gl_03_pre_03",
          "kind": "narration",
          "speaker": "narrator",
          "text": "リカシーフがゴブリンを追う。ゴブリンは棍棒を振り、回り込んだ一行にも向けた。"
        },
        {
          "id": "gl_03_pre_04",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガルル！"
        },
        {
          "id": "gl_03_pre_05",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "横を通るだけだけど、今はどっちにも伝わりそうにない！戦うしかないみたいだ！"
        },
        {
          "id": "gl_03_pre_06",
          "kind": "system",
          "speaker": "system",
          "text": "三つ巴戦：敵同士も攻撃します。攻撃する相手を選んでください。"
        }
      ],
      "postNodes": [
        {
          "id": "gl_03_post_01",
          "kind": "stage",
          "speaker": null,
          "text": "二体は別々の方向へ退く。ゴブリンが落とした枝を拾うのは、離れた後の地の文でのみ描く。"
        },
        {
          "id": "gl_03_post_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "ふう……。実と葉を取り合ってたんだな。"
        },
        {
          "id": "gl_03_post_03",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル！"
        },
        {
          "id": "gl_03_post_04",
          "kind": "stage",
          "speaker": null,
          "text": "ガルドラが茂みへ向き直る。契約者が手を差し出して呼び戻す。"
        },
        {
          "id": "gl_03_post_05",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "離れよう。"
        },
        {
          "id": "gl_03_post_06",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "そうだな。ボク達が勝ったからって、この茂みがボク達のものになるわけじゃない。"
        },
        {
          "id": "gl_03_post_07",
          "kind": "narration",
          "speaker": "narrator",
          "text": "少し離れた野花の上を、小さな影が滑っていった。"
        }
      ]
    },
    {
      "id": "gl_04",
      "number": 4,
      "title": "風に消えた種",
      "unlockAfter": "gl_03",
      "recommendedLevel": 4,
      "battleMode": "single",
      "enemies": [
        {
          "speciesId": "sylphin",
          "level": 4,
          "hp": 136,
          "speed": 90,
          "attackMultiplier": 0.9,
          "moveIds": [
            "skill_sylphin_01",
            "skill_sylphin_02",
            "skill_sylphin_03"
          ]
        }
      ],
      "firstReward": {
        "exp": 220,
        "coins": 70
      },
      "repeatReward": {
        "exp": 20,
        "coins": 10
      },
      "preNodes": [
        {
          "id": "gl_04_pre_01",
          "kind": "stage",
          "speaker": null,
          "text": "シルフィンが野花の上を滑空。ガルドラが見上げる。"
        },
        {
          "id": "gl_04_pre_02",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル！"
        },
        {
          "id": "gl_04_pre_03",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "あれはシルフィンだ。水じゃなくて、風の中を泳ぐんだぞ。"
        },
        {
          "id": "gl_04_pre_04",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "気持ちよさそう！"
        },
        {
          "id": "gl_04_pre_05",
          "kind": "stage",
          "speaker": null,
          "text": "ガルドラが飛び上がり、低空を横切る。シルフィンが急旋回し、草と種が舞う。"
        },
        {
          "id": "gl_04_pre_06",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガァ～ウ！"
        },
        {
          "id": "gl_04_pre_07",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "あっ"
        },
        {
          "id": "gl_04_pre_08",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "飛ぶ道を塞いじゃったな。こっちまで風に巻かれるぞ！"
        }
      ],
      "postNodes": [
        {
          "id": "gl_04_post_01",
          "kind": "stage",
          "speaker": null,
          "text": "シルフィンが遠ざかる。契約者の袖とガルドラの背に小さな粒。"
        },
        {
          "id": "gl_04_post_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "花粉と……こっちは種だな！ 草や花に触れて、運んでるんだ。"
        },
        {
          "id": "gl_04_post_03",
          "kind": "stage",
          "speaker": null,
          "text": "ガルドラが身体を振り、粒が風下へ飛ぶ。"
        },
        {
          "id": "gl_04_post_04",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガルル！"
        },
        {
          "id": "gl_04_post_05",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "こら、ボクにかけるな！ ……あっ、風があっちへ運んでいくぞ"
        },
        {
          "id": "gl_04_post_06",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガウ！"
        },
        {
          "id": "gl_04_post_07",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "シルフィン達の通り道が、草の広がりにもつながるんだな。"
        },
        {
          "id": "gl_04_post_08",
          "kind": "narration",
          "speaker": "narrator",
          "text": "三人は地面の跡だけでなく、風に揺れる草も見るようになった。"
        }
      ]
    },
    {
      "id": "gl_05",
      "number": 5,
      "title": "草が揺れる、その上で",
      "unlockAfter": "gl_04",
      "recommendedLevel": 5,
      "battleMode": "single",
      "enemies": [
        {
          "speciesId": "volteck",
          "level": 5,
          "hp": 148,
          "speed": 95,
          "attackMultiplier": 0.95,
          "moveIds": [
            "skill_volteck_01",
            "skill_volteck_02",
            "skill_volteck_03"
          ]
        }
      ],
      "firstReward": {
        "exp": 280,
        "coins": 85
      },
      "repeatReward": {
        "exp": 20,
        "coins": 10
      },
      "preNodes": [
        {
          "id": "gl_05_pre_01",
          "kind": "stage",
          "speaker": null,
          "text": "遠くのリカシーフが草を揺らす。小さな虫が飛び立つ。"
        },
        {
          "id": "gl_05_pre_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "おっ、草の中から虫が飛び出してきたぞ！"
        },
        {
          "id": "gl_05_pre_03",
          "kind": "stage",
          "speaker": null,
          "text": "上空の影が地面を横切る。ボルテックが虫を追って急降下。"
        },
        {
          "id": "gl_05_pre_04",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガァ～ウ！"
        },
        {
          "id": "gl_05_pre_05",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "ボルテックだ！ 狩りの進路に入ってる、頭上に気をつけろ！"
        }
      ],
      "postNodes": [
        {
          "id": "gl_05_post_01",
          "kind": "stage",
          "speaker": null,
          "text": "ボルテックが離れた草地へ移り、再び獲物を探す。ガルドラは草の陰で身を低くする。"
        },
        {
          "id": "gl_05_post_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "あいつも食べなきゃ生きられないからな。ボク達が狩りを全部止めるわけにはいかないぞ。"
        },
        {
          "id": "gl_05_post_03",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル。"
        },
        {
          "id": "gl_05_post_04",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "お、隠れるのは覚えたか。草はご飯だけじゃなく、身を隠す場所にもなるんだな。"
        },
        {
          "id": "gl_05_post_05",
          "kind": "stage",
          "speaker": null,
          "text": "画面奥の雲を一段暗くする。雷撃の演出はまだ入れない。"
        },
        {
          "id": "gl_05_post_06",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "雲が厚くなってきた。丘へ急ごう。でも、空を見ながらだぞ！"
        }
      ]
    },
    {
      "id": "gl_06",
      "number": 6,
      "title": "風の通り道",
      "unlockAfter": "gl_05",
      "recommendedLevel": 6,
      "battleMode": "single",
      "enemies": [
        {
          "speciesId": "zephyray",
          "level": 6,
          "hp": 215,
          "speed": 108,
          "attackMultiplier": 0.95,
          "moveIds": [
            "skill_zephyray_01",
            "skill_zephyray_02",
            "skill_zephyray_03"
          ]
        }
      ],
      "firstReward": {
        "exp": 340,
        "coins": 100
      },
      "repeatReward": {
        "exp": 20,
        "coins": 10
      },
      "preNodes": [
        {
          "id": "gl_06_pre_01",
          "kind": "narration",
          "speaker": "narrator",
          "text": "丘の切れ目では、草が一方向へ強く倒れていた。シルフィン達は斜面の低い側へ寄っている。"
        },
        {
          "id": "gl_06_pre_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "この切れ目を抜ければ近道だ！"
        },
        {
          "id": "gl_06_pre_03",
          "kind": "stage",
          "speaker": null,
          "text": "突風にガルドラが流される。契約者が手を伸ばし、ガルドラがその腕へしがみつく。"
        },
        {
          "id": "gl_06_pre_04",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガァ～ウ！"
        },
        {
          "id": "gl_06_pre_05",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "うわっ！ こっちへ下がれ！"
        },
        {
          "id": "gl_06_pre_06",
          "kind": "stage",
          "speaker": null,
          "text": "ゼファーレイが風の筋に沿って接近し、翼を広げる。"
        },
        {
          "id": "gl_06_pre_07",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "ゼファーレイだ！押し戻されないように、足場を確保するぞ！"
        }
      ],
      "postNodes": [
        {
          "id": "gl_06_post_01",
          "kind": "stage",
          "speaker": null,
          "text": "ゼファーレイが強い風の側へ離れる。三人は丘の陰へ下がる。"
        },
        {
          "id": "gl_06_post_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "……近道だって、急ぎすぎたな。"
        },
        {
          "id": "gl_06_post_03",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル！"
        },
        {
          "id": "gl_06_post_04",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "同じ空でも、風の強さが違うんだ。ボク達に通りやすい場所と、あいつらに通りやすい場所も違う。"
        },
        {
          "id": "gl_06_post_05",
          "kind": "stage",
          "speaker": null,
          "text": "草の間から石の縁が見える。"
        },
        {
          "id": "gl_06_post_06",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "石だ！ あれが古道かもしれない。今度は先を見てから行こう！"
        }
      ]
    },
    {
      "id": "gl_07",
      "number": 7,
      "title": "石の道にも、暮らしはある",
      "unlockAfter": "gl_06",
      "recommendedLevel": 7,
      "battleMode": "single",
      "enemies": [
        {
          "speciesId": "proto_icegolem",
          "level": 7,
          "hp": 252,
          "speed": 18,
          "attackMultiplier": 1,
          "moveIds": [
            "skill_proto_icegolem_04",
            "skill_proto_icegolem_02",
            "skill_proto_icegolem_05"
          ]
        }
      ],
      "firstReward": {
        "exp": 400,
        "coins": 120
      },
      "repeatReward": {
        "exp": 20,
        "coins": 10
      },
      "preNodes": [
        {
          "id": "gl_07_pre_01",
          "kind": "stage",
          "speaker": null,
          "text": "石の古道を表示。ゴーレムが決まった線を巡回。三人は崩れた石の脇で止まる。"
        },
        {
          "id": "gl_07_pre_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "待て。あの足音、近づいてるぞ。"
        },
        {
          "id": "gl_07_pre_03",
          "kind": "narration",
          "speaker": "narrator",
          "text": "崩れた箇所を回り込むと、巡回するゴーレムの進路と重なった。胸の核が光る。"
        },
        {
          "id": "gl_07_pre_04",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガルル！"
        },
        {
          "id": "gl_07_pre_05",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "あれはゴーレムだ！ 大きな拳が来るぞ、受けるならしっかり守らないと！"
        }
      ],
      "postNodes": [
        {
          "id": "gl_07_post_01",
          "kind": "stage",
          "speaker": null,
          "text": "ゴーレムが膝をつき、核の光を弱める。三人は距離を取り、足元へ視線を移す。"
        },
        {
          "id": "gl_07_post_02",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル！"
        },
        {
          "id": "gl_07_post_03",
          "kind": "narration",
          "speaker": "narrator",
          "text": "石の隙間に、黄金色のスライムがいた。そばに溜まった枯草を取り込んでいる。"
        },
        {
          "id": "gl_07_post_04",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "おおっ、スライムゴールド！ ……追いかけるなよ、ガルドラ！"
        },
        {
          "id": "gl_07_post_05",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "珍しい色でも、枯草や残った魔力を取り込む暮らしはつながってるんだな。"
        },
        {
          "id": "gl_07_post_06",
          "kind": "narration",
          "speaker": "narrator",
          "text": "遠くで石の足音が再び響く。ゴーレムは元の巡回路を歩いている。"
        },
        {
          "id": "gl_07_post_07",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "止めたままにはできないな。ここも、ただ空いた道じゃなかった。"
        },
        {
          "id": "gl_07_post_08",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "足音を聞いて、離れよう。"
        }
      ]
    },
    {
      "id": "gl_08",
      "number": 8,
      "title": "隠れ場所の値段",
      "unlockAfter": "gl_07",
      "recommendedLevel": 8,
      "battleMode": "single",
      "enemies": [
        {
          "speciesId": "spaquinn",
          "level": 8,
          "hp": 254,
          "speed": 105,
          "attackMultiplier": 1.05,
          "moveIds": [
            "skill_spaquinn_01",
            "skill_spaquinn_02",
            "skill_spaquinn_03"
          ]
        }
      ],
      "firstReward": {
        "exp": 460,
        "coins": 140
      },
      "repeatReward": {
        "exp": 20,
        "coins": 10
      },
      "preNodes": [
        {
          "id": "gl_08_pre_01",
          "kind": "narration",
          "speaker": "narrator",
          "text": "古道の先には長い草が残っていた。小さな生き物は、葉の下でほとんど姿が見えない。"
        },
        {
          "id": "gl_08_pre_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "草の陰なら、上から見つかりにくいな。"
        },
        {
          "id": "gl_08_pre_03",
          "kind": "stage",
          "speaker": null,
          "text": "突風で草が倒れる。ガルドラの影が露出し、スパクインが急降下。"
        },
        {
          "id": "gl_08_pre_04",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガァ～ウ！"
        },
        {
          "id": "gl_08_pre_05",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "スパクインだ！ 隠れてた場所が、一気に開けたぞ！"
        }
      ],
      "postNodes": [
        {
          "id": "gl_08_post_01",
          "kind": "stage",
          "speaker": null,
          "text": "スパクインが高度を上げる。倒れた草が少し起きる。"
        },
        {
          "id": "gl_08_post_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "風で倒れれば、隠れ場所じゃなくなるのか～。"
        },
        {
          "id": "gl_08_post_03",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル。"
        },
        {
          "id": "gl_08_post_04",
          "kind": "stage",
          "speaker": null,
          "text": "ガルドラが契約者の足元から上空を見上げる。"
        },
        {
          "id": "gl_08_post_05",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "短い草は食べた跡で、長い草は隠れる場所か。"
        },
        {
          "id": "gl_08_post_06",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "ああ。草の長さだけじゃなく、風と空も見ないとな！"
        },
        {
          "id": "gl_08_post_07",
          "kind": "narration",
          "speaker": "narrator",
          "text": "雷雲が丘へ迫り、飛ぶ生き物達が風を避けて集まり始めた。"
        }
      ]
    },
    {
      "id": "gl_09",
      "number": 9,
      "title": "狭くなった空",
      "unlockAfter": "gl_08",
      "recommendedLevel": 9,
      "battleMode": "three_way",
      "enemies": [
        {
          "speciesId": "zephyray",
          "level": 9,
          "hp": 251,
          "speed": 108,
          "attackMultiplier": 1.05,
          "moveIds": [
            "skill_zephyray_01",
            "skill_zephyray_03"
          ]
        },
        {
          "speciesId": "spaquinn",
          "level": 9,
          "hp": 266,
          "speed": 105,
          "attackMultiplier": 1.05,
          "moveIds": [
            "skill_spaquinn_01",
            "skill_spaquinn_02",
            "skill_spaquinn_03"
          ]
        }
      ],
      "firstReward": {
        "exp": 540,
        "coins": 165
      },
      "repeatReward": {
        "exp": 20,
        "coins": 10
      },
      "preNodes": [
        {
          "id": "gl_09_pre_01",
          "kind": "stage",
          "speaker": null,
          "text": "丘の陰にゼファーレイ、スパクイン、遠くに小さなシルフィンの影。"
        },
        {
          "id": "gl_09_pre_02",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "ここも、風を避けられる場所なんだ。"
        },
        {
          "id": "gl_09_pre_03",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "それで空の連中も集まったんだな。通れる場所が狭くなってる。"
        },
        {
          "id": "gl_09_pre_04",
          "kind": "narration",
          "speaker": "narrator",
          "text": "ゼファーレイの進路へスパクインが降りる。双方が威嚇し、低空でぶつかり合う。"
        },
        {
          "id": "gl_09_pre_05",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガルル！"
        },
        {
          "id": "gl_09_pre_06",
          "kind": "stage",
          "speaker": null,
          "text": "三人が移動する先へ二体が旋回。一行もそれぞれの攻撃対象になる。"
        },
        {
          "id": "gl_09_pre_07",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "茂みの時と同じだ！ 今度は食べ物じゃなく、通る場所が重なってる！"
        },
        {
          "id": "gl_09_pre_08",
          "kind": "system",
          "speaker": "system",
          "text": "三つ巴戦：敵同士も攻撃します。両方を警戒してください。"
        }
      ],
      "postNodes": [
        {
          "id": "gl_09_post_01",
          "kind": "stage",
          "speaker": null,
          "text": "二体が左右へ離れる。三人は丘の下へ進む。"
        },
        {
          "id": "gl_09_post_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "今だ、地面の方へ！ また戻ってくるかもしれないぞ！"
        },
        {
          "id": "gl_09_post_03",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル！"
        },
        {
          "id": "gl_09_post_04",
          "kind": "narration",
          "speaker": "narrator",
          "text": "シルフィン達はさらに低い草地へ寄った。遠くではリカシーフの群れが向きを変える。"
        },
        {
          "id": "gl_09_post_05",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "空だけじゃない。地上の連中も動き始めてるな。"
        },
        {
          "id": "gl_09_post_06",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "次は、あの群れの進む先を見よう。"
        }
      ]
    },
    {
      "id": "gl_10",
      "number": 10,
      "title": "動き出した草原",
      "unlockAfter": "gl_09",
      "recommendedLevel": 11,
      "battleMode": "single",
      "enemies": [
        {
          "speciesId": "seralphia",
          "level": 11,
          "hp": 345,
          "speed": 92,
          "attackMultiplier": 1.05,
          "moveIds": [
            "skill_seralphia_01",
            "skill_seralphia_02",
            "skill_seralphia_03"
          ]
        }
      ],
      "firstReward": {
        "exp": 650,
        "coins": 200
      },
      "repeatReward": {
        "exp": 20,
        "coins": 10
      },
      "preNodes": [
        {
          "id": "gl_10_pre_01",
          "kind": "narration",
          "speaker": "narrator",
          "text": "雲の影が古道を覆う。リカシーフの群れが斜面へ向かい、その先頭近くに大きな姿が見えた。"
        },
        {
          "id": "gl_10_pre_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "セラルフィア……！ あの大きな角を見ろ。"
        },
        {
          "id": "gl_10_pre_03",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "あの群れと、同じ方へ向かってるね。"
        },
        {
          "id": "gl_10_pre_04",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "止まろう。道を横切るまで待つんだ。"
        },
        {
          "id": "gl_10_pre_05",
          "kind": "stage",
          "speaker": null,
          "text": "背後から別の群れ。三人が脇へ下がると、セラルフィアが向き直り角を下げる。"
        },
        {
          "id": "gl_10_pre_06",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガルル！"
        },
        {
          "id": "gl_10_pre_07",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "取り囲むつもりだと思われたか……！ 進路を塞ぎ続けないでね！"
        }
      ],
      "postNodes": [
        {
          "id": "gl_10_post_01",
          "kind": "stage",
          "speaker": null,
          "text": "セラルフィアが距離を取る。三人は古道の脇へ下がり、群れを先に通す。"
        },
        {
          "id": "gl_10_post_02",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル！"
        },
        {
          "id": "gl_10_post_03",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "待て待て、追わなくていい！ "
        },
        {
          "id": "gl_10_post_04",
          "kind": "narration",
          "speaker": "narrator",
          "text": "リカシーフ達が草を踏み、丘の陰へ消える。セラルフィアも同じ方向へ進んだ。"
        },
        {
          "id": "gl_10_post_05",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "強い相手も、ここで食べて、移動してるんだな。"
        },
        {
          "id": "gl_10_post_06",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "強いからって、草原の全部を使えるわけじゃないのか。"
        },
        {
          "id": "gl_10_post_07",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "……ああ。ボク達も、道を譲った方が進める時があるみたいだね。"
        },
        {
          "id": "gl_10_post_08",
          "kind": "stage",
          "speaker": null,
          "text": "遠雷。雲の下に大きな翼の影。"
        },
        {
          "id": "gl_10_post_09",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "雨が来る！あの斜面の陰へ行こう！"
        }
      ]
    },
    {
      "id": "gl_11",
      "number": 11,
      "title": "雨のあとに残る道",
      "unlockAfter": "gl_10",
      "recommendedLevel": 12,
      "battleMode": "single",
      "enemies": [
        {
          "speciesId": "voltax",
          "level": 13,
          "hp": 384,
          "speed": 115,
          "attackMultiplier": 0.75,
          "moveIds": [
            "skill_voltax_01",
            "skill_voltax_02",
            "skill_voltax_03"
          ]
        }
      ],
      "firstReward": {
        "exp": 800,
        "coins": 260
      },
      "repeatReward": {
        "exp": 20,
        "coins": 10
      },
      "preNodes": [
        {
          "id": "gl_11_pre_01",
          "kind": "narration",
          "speaker": "narrator",
          "text": "避難先へ続く斜面の上で、ボルタックスが雷雲を背に翼を広げていた。"
        },
        {
          "id": "gl_11_pre_02",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "ボルタックスだ……！ 開けた所を真っすぐ進むのは危ないぞ。"
        },
        {
          "id": "gl_11_pre_03",
          "kind": "stage",
          "speaker": null,
          "text": "ガルドラが飛び出しかけ、上空を見て戻る。契約者を振り返る。"
        },
        {
          "id": "gl_11_pre_04",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル！"
        },
        {
          "id": "gl_11_pre_05",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "よし、一緒に行くぞ！ 群れが通った側なら、今は道が空いてる！"
        },
        {
          "id": "gl_11_pre_06",
          "kind": "narration",
          "speaker": "narrator",
          "text": "三人は草の陰から斜面へ向かう。最後の開けた場所でボルタックスが向き直った。"
        },
        {
          "id": "gl_11_pre_07",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "あと少しだ！ 身を守って、通り抜ける力をつくろう！"
        }
      ],
      "postNodes": [
        {
          "id": "gl_11_post_01",
          "kind": "stage",
          "speaker": null,
          "text": "ボルタックスが遠い雲の方へ離れる。三人は斜面の陰へ避難。戦闘終了直後には晴天にしない。"
        },
        {
          "id": "gl_11_post_02",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガァ～ウ。"
        },
        {
          "id": "gl_11_post_03",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "ふう……。あいつも離れたな。"
        },
        {
          "id": "gl_11_post_04",
          "kind": "narration",
          "speaker": "narrator",
          "text": "近づいていた雲から、雨が降り始めた。草を打つ音が、しばらく三人の声を隠した。"
        },
        {
          "id": "gl_11_post_05",
          "kind": "stage",
          "speaker": null,
          "text": "短い暗転。地の文「雨が弱まったころ」。"
        },
        {
          "id": "gl_11_post_06",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "窪地に、水が溜まってるね。"
        },
        {
          "id": "gl_11_post_07",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "同じ草原でも、さっきと違うな。水のある所へ動く連中もいるぞ。"
        },
        {
          "id": "gl_11_post_08",
          "kind": "stage",
          "speaker": null,
          "text": "暗転。地の文「それから数日後」。最初の窪地へ。"
        },
        {
          "id": "gl_11_post_09",
          "kind": "narration",
          "speaker": "narrator",
          "text": "枯草の一部は土に混じり、周りには小さな芽があった。スライムは枯草を取り込み、グラスビートは葉の陰にいる。"
        },
        {
          "id": "gl_11_post_10",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル！"
        },
        {
          "id": "gl_11_post_11",
          "kind": "dialogue",
          "speaker": "contractor",
          "text": "最初に見た場所だ。芽が出てる……。"
        },
        {
          "id": "gl_11_post_12",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "土へ戻るものがあって、また草が育つ。風に運ばれた種も、この辺りに来たのかもしれないな。"
        },
        {
          "id": "gl_11_post_13",
          "kind": "stage",
          "speaker": null,
          "text": "遠くにリカシーフ、花の上にシルフィン。空の鳥の影が流れる。"
        },
        {
          "id": "gl_11_post_14",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "ボク達が通り抜けても、草原は続くみたいだ。"
        },
        {
          "id": "gl_11_post_15",
          "kind": "stage",
          "speaker": null,
          "text": "ガルドラは足元と上空を見てから、契約者を振り返る。"
        },
        {
          "id": "gl_11_post_16",
          "kind": "dialogue",
          "speaker": "gnosis",
          "text": "ふふん。君も少しは、草原の歩き方が分かってきたな！"
        },
        {
          "id": "gl_11_post_17",
          "kind": "dialogue",
          "speaker": "galdra",
          "text": "ガル！"
        },
        {
          "id": "gl_11_post_18",
          "kind": "narration",
          "speaker": "narrator",
          "text": "三人は、生き物の動きの間を選んで歩き出した。"
        }
      ]
    }
  ]
};

/* Approved Drive manuscript v2, 2026-11-08. Dialogue text is verbatim. */
const VOLCANO_STORY = {
  id: "volcano_breath",
  version: 1,
  mapId: "volcano",
  title: "火山の息づかい",
  completedText: "火山の変化を知り、別の道を見つけた。",
  episodes: [
    {
      id: "vc_01",
      number: 1,
      title: "山から降りてきたもの",
      unlockAfter: null,
      recommendedLevel: 12,
      battleMode: "single",
      enemies: [
        {"speciesId": "freigal", "level": 12, "hp": 179, "speed": 64, "attackMultiplier": 0.8, "moveIds": ["skill_freigal_01", "skill_freigal_02"]},
      ],
      firstReward: {"exp": 180, "coins": 60},
      repeatReward: {"exp": 20, "coins": 10},
      preNodes: [
        {"id": "vc_01_pre_01", "kind": "narration", "speaker": "narrator", "text": "山の向こうへ続く道を探して、三人は火山の麓へ来た。黒い岩の向こうから、熱を含んだ風が流れてくる。"},
        {"id": "vc_01_pre_02", "kind": "dialogue", "speaker": "gnosis", "text": "古い道が山の脇を通ってるはずだ。火口まで登らなくても、向こうへ行けるぞ！"},
        {"id": "vc_01_pre_03", "kind": "stage", "speaker": null, "text": "岩陰に数体のフレイガル。さらに一体が山側から降り、温かい岩のそばへ入る。"},
        {"id": "vc_01_pre_04", "kind": "dialogue", "speaker": "galdra", "text": "ガル！"},
        {"id": "vc_01_pre_05", "kind": "dialogue", "speaker": "gnosis", "text": "フレイガルだ。炎をまとう子狼だぞ。……ここにずいぶん集まってるな。"},
        {"id": "vc_01_pre_06", "kind": "stage", "speaker": null, "text": "ガルドラが岩陰へ近づく。フレイガルが立ち上がり、炎を強めて飛び出す。契約者はガルドラを呼び戻すように手を出す。"},
        {"id": "vc_01_pre_08", "kind": "dialogue", "speaker": "gnosis", "text": "向こうも警戒してる！ まず距離をつくるぞ！"},
      ],
      postNodes: [
        {"id": "vc_01_post_01", "kind": "stage", "speaker": null, "text": "フレイガルが岩陰へ退く。追撃せず、三人は離れた石の上で止まる。"},
        {"id": "vc_01_post_02", "kind": "dialogue", "speaker": "galdra", "text": "ガァ～ウ。"},
        {"id": "vc_01_post_03", "kind": "dialogue", "speaker": "gnosis", "text": "こら、今は追いかけるな。あの岩のそばへ戻ったぞ。"},
        {"id": "vc_01_post_04", "kind": "narration", "speaker": "narrator", "text": "別のフレイガルが山側から降り、先客のいる岩を避けて隣へ移った。"},
        {"id": "vc_01_post_05", "kind": "dialogue", "speaker": "gnosis", "text": "上で何かに追われたのか？ ……まだ分からないな。"},
        {"id": "vc_01_post_06", "kind": "stage", "speaker": null, "text": "ガルドラが山側へ鼻先を向ける。灰の上に、新しい足跡がいくつも残っている。"},
        {"id": "vc_01_post_07", "kind": "dialogue", "speaker": "gnosis", "text": "道を探しながら見てみよう。今度は近づきすぎるなよ！"},
        {"id": "vc_01_post_08", "kind": "narration", "speaker": "narrator", "text": "足跡の先には、灰を払った岩と、掘り返された土があった。"},
      ],
    },
    {
      id: "vc_02",
      number: 2,
      title: "温かい石、熱すぎる石",
      unlockAfter: "vc_01",
      recommendedLevel: 12,
      battleMode: "single",
      enemies: [
        {"speciesId": "goblin", "level": 13, "hp": 155, "speed": 57, "attackMultiplier": 0.9, "moveIds": ["skill_goblin_01", "skill_goblin_03"]},
      ],
      firstReward: {"exp": 220, "coins": 70},
      repeatReward: {"exp": 20, "coins": 10},
      preNodes: [
        {"id": "vc_02_pre_01", "kind": "stage", "speaker": null, "text": "ゴブリンが岩の隙間から耐熱植物を摘み、袋へ鉱石を入れる。熱の強い石には近づかない。"},
        {"id": "vc_02_pre_02", "kind": "dialogue", "speaker": "gnosis", "text": "ゴブリンも来てるな。植物と鉱石を集めてるみたいだぞ。"},
        {"id": "vc_02_pre_03", "kind": "narration", "speaker": "narrator", "text": "三人は採集物の山を避け、岩の端を通ろうとした。袋からこぼれた鉱石が、ガルドラの足元へ転がる。"},
        {"id": "vc_02_pre_04", "kind": "dialogue", "speaker": "galdra", "text": "ガル！"},
        {"id": "vc_02_pre_05", "kind": "stage", "speaker": null, "text": "ガルドラが鉱石を追って一歩跳ぶ。ゴブリンが袋を抱え、棍棒を向ける。"},
        {"id": "vc_02_pre_06", "kind": "dialogue", "speaker": "gnosis", "text": "違う違う、取りに来たんじゃない！ ……伝わってないな。"},
        {"id": "vc_02_pre_07", "kind": "stage", "speaker": null, "text": "契約者がガルドラを後ろへ下げる。ゴブリンが棍棒を振って迫る。"},
        {"id": "vc_02_pre_08", "kind": "dialogue", "speaker": "gnosis", "text": "荷物から離れよう！ 攻撃を防いで、通る場所を空けるぞ！"},
      ],
      postNodes: [
        {"id": "vc_02_post_01", "kind": "stage", "speaker": null, "text": "ゴブリンは落ちた鉱石を拾い、袋を抱えて退く。一行は採集物を持ち去らない。"},
        {"id": "vc_02_post_02", "kind": "dialogue", "speaker": "gnosis", "text": "大事な収穫だったんだな。ガルドラ、転がるもの全部を追うなよ。"},
        {"id": "vc_02_post_03", "kind": "dialogue", "speaker": "galdra", "text": "ガル。"},
        {"id": "vc_02_post_04", "kind": "stage", "speaker": null, "text": "ガルドラが隣の石へ前足を乗せ、すぐに引っ込める。"},
        {"id": "vc_02_post_06", "kind": "dialogue", "speaker": "gnosis", "text": "さっきのフレイガルは、こういう岩のそばにいたな。ゴブリンは避けて通ってる。"},
        {"id": "vc_02_post_07", "kind": "narration", "speaker": "narrator", "text": "熱の弱い側には植物が残り、採集の跡が続いていた。"},
        {"id": "vc_02_post_08", "kind": "dialogue", "speaker": "gnosis", "text": "同じ岩場でも、使いやすい場所が違うんだな。ボク達も足元を見て進もう！"},
      ],
    },
    {
      id: "vc_03",
      number: 3,
      title: "重なった縄張り",
      unlockAfter: "vc_02",
      recommendedLevel: 12,
      battleMode: "three_way",
      enemies: [
        {"speciesId": "freigal", "level": 14, "hp": 192, "speed": 65, "attackMultiplier": 0.85, "moveIds": ["skill_freigal_01", "skill_freigal_02", "skill_freigal_03"]},
        {"speciesId": "goblin", "level": 14, "hp": 160, "speed": 58, "attackMultiplier": 0.85, "moveIds": ["skill_goblin_01", "skill_goblin_02", "skill_goblin_03"]},
      ],
      firstReward: {"exp": 300, "coins": 90},
      repeatReward: {"exp": 20, "coins": 10},
      preNodes: [
        {"id": "vc_03_pre_01", "kind": "narration", "speaker": "narrator", "text": "先の岩場は狭く、片側には温かい石、もう片側には採集できる植物が残っていた。"},
        {"id": "vc_03_pre_02", "kind": "stage", "speaker": null, "text": "フレイガルが岩のそばで唸る。袋を背負ったゴブリンが、棍棒で地面を叩いて追い払おうとする。"},
        {"id": "vc_03_pre_03", "kind": "dialogue", "speaker": "gnosis", "text": "また集まってる。今度は採集する場所と重なったんだな。"},
        {"id": "vc_03_pre_04", "kind": "dialogue", "speaker": "galdra", "text": "ガルル！"},
        {"id": "vc_03_pre_05", "kind": "narration", "speaker": "narrator", "text": "三人が外側を回ろうとすると、ゴブリンが後ずさり、フレイガルがその先へ跳んだ。一行も双方の正面に入ってしまう。"},
        {"id": "vc_03_pre_06", "kind": "dialogue", "speaker": "gnosis", "text": "しまった！ 君、ガルドラと一緒に下がって！"},
        {"id": "vc_03_pre_07", "kind": "stage", "speaker": null, "text": "両者が互いを威嚇しながら、一行にも向き直る。"},
        {"id": "vc_03_pre_08", "kind": "system", "speaker": "system", "text": "三つ巴戦：敵同士も攻撃します。攻撃する相手を選んでください。"},
      ],
      postNodes: [
        {"id": "vc_03_post_01", "kind": "stage", "speaker": null, "text": "二体が別々の岩陰へ退く。一行は狭い場所から離れる。"},
        {"id": "vc_03_post_02", "kind": "dialogue", "speaker": "gnosis", "text": "ふう……。温かい岩に来たものと、そこで採集してたものがぶつかったのか。"},
        {"id": "vc_03_post_03", "kind": "dialogue", "speaker": "galdra", "text": "ガル！"},
        {"id": "vc_03_post_04", "kind": "stage", "speaker": null, "text": "ガルドラが灰の上を嗅ぐ。山側から下る足跡が何本も重なっている。"},
        {"id": "vc_03_post_05", "kind": "dialogue", "speaker": "gnosis", "text": "麓だけの話じゃなさそうだな。上から、次々に降りてきてる。"},
        {"id": "vc_03_post_07", "kind": "narration", "speaker": "narrator", "text": "一行は広い斜面へ回る。小さな足跡の脇に、ひと回り大きな足跡が現れた。"},
      ],
    },
    {
      id: "vc_04",
      number: 4,
      title: "灰の上を歩く影",
      unlockAfter: "vc_03",
      recommendedLevel: 12,
      battleMode: "single",
      enemies: [
        {"speciesId": "freiwolf", "level": 15, "hp": 250, "speed": 77, "attackMultiplier": 0.85, "moveIds": ["skill_freiwolf_01", "skill_freiwolf_03"]},
      ],
      firstReward: {"exp": 380, "coins": 110},
      repeatReward: {"exp": 20, "coins": 10},
      preNodes: [
        {"id": "vc_04_pre_01", "kind": "narration", "speaker": "narrator", "text": "冷えた溶岩の斜面には薄く灰が積もり、岩の隙間に苔や地衣類が残っていた。"},
        {"id": "vc_04_pre_02", "kind": "dialogue", "speaker": "gnosis", "text": "ここは歩けそうだな。火山でも、どこも溶岩が流れてるわけじゃない。"},
        {"id": "vc_04_pre_03", "kind": "stage", "speaker": null, "text": "ガルドラが小さな足跡を追う。少し離れて、大きな足跡も同じ方向へ続く。"},
        {"id": "vc_04_pre_04", "kind": "dialogue", "speaker": "galdra", "text": "ガル！"},
        {"id": "vc_04_pre_05", "kind": "dialogue", "speaker": "gnosis", "text": "その隣も見ろ。大きいのが、同じ方へ歩いてるぞ。"},
        {"id": "vc_04_pre_06", "kind": "stage", "speaker": null, "text": "岩陰からフレイウルフが現れる。三人が退こうとすると、その進路へ回り込んで唸る。"},
        {"id": "vc_04_pre_07", "kind": "dialogue", "speaker": "gnosis", "text": "フレイウルフ！ 斜面を巡って獲物を探す炎の狼だ。"},
        {"id": "vc_04_pre_08", "kind": "dialogue", "speaker": "gnosis", "text": "足跡ばかり見て、近づきすぎたな……！ 身を守って離れるぞ！"},
      ],
      postNodes: [
        {"id": "vc_04_post_01", "kind": "stage", "speaker": null, "text": "フレイウルフが距離を取り、小型種の足跡が続く側へ去る。"},
        {"id": "vc_04_post_02", "kind": "dialogue", "speaker": "galdra", "text": "ガルル！"},
        {"id": "vc_04_post_03", "kind": "dialogue", "speaker": "gnosis", "text": "追わなくていいぞ！ ……あいつも下へ向かったな。"},
        {"id": "vc_04_post_04", "kind": "narration", "speaker": "narrator", "text": "灰の上では、大きな足跡が小さな足跡の列へ重なっていた。"},
        {"id": "vc_04_post_05", "kind": "dialogue", "speaker": "gnosis", "text": "小さい連中が動けば、獲物を探す方も動く。住処だけじゃなく、食べ物の場所も変わるんだ。"},
        {"id": "vc_04_post_06", "kind": "stage", "speaker": null, "text": "風に熱気が混じる。斜面の先で、灰とは違う赤い光が揺れる。"},
        {"id": "vc_04_post_07", "kind": "dialogue", "speaker": "gnosis", "text": "古道はあっちのはずだ。熱が強くなってる……様子を見てから行こう。"},
      ],
    },
    {
      id: "vc_05",
      number: 5,
      title: "途切れた道",
      unlockAfter: "vc_04",
      recommendedLevel: 13,
      battleMode: "single",
      enemies: [
        {"speciesId": "tsubaki", "level": 16, "hp": 272, "speed": 80, "attackMultiplier": 0.8, "moveIds": ["skill_tsubaki_01", "skill_tsubaki_02", "skill_tsubaki_03"]},
      ],
      firstReward: {"exp": 460, "coins": 130},
      repeatReward: {"exp": 20, "coins": 10},
      preNodes: [
        {"id": "vc_05_pre_01", "kind": "narration", "speaker": "narrator", "text": "石を並べた古道は、赤く光る溶岩の流れに途中を呑まれていた。向こう岸には道の続きが見える。"},
        {"id": "vc_05_pre_02", "kind": "dialogue", "speaker": "gnosis", "text": "あっ……！ 道がない。新しく流れてきたのか。"},
        {"id": "vc_05_pre_03", "kind": "stage", "speaker": null, "text": "溶岩のそばにツバキ達が浮かぶ。花弁のような結晶翼が、熱気の中で光る。"},
        {"id": "vc_05_pre_04", "kind": "dialogue", "speaker": "galdra", "text": "ガル！"},
        {"id": "vc_05_pre_05", "kind": "dialogue", "speaker": "gnosis", "text": "炎の精霊ツバキだ。ここには、むしろ集まってきてるんだな。"},
        {"id": "vc_05_pre_06", "kind": "narration", "speaker": "narrator", "text": "三人は離れた岩棚から迂回路を探す。一体のツバキが進路へ浮かび、火花を散らした。"},
        {"id": "vc_05_pre_06a", "kind": "dialogue", "speaker": "tsubaki", "text": "ウフフ"},
        {"id": "vc_05_pre_07", "kind": "stage", "speaker": null, "text": "ガルドラが身を低くし、契約者の足元へ戻る。"},
        {"id": "vc_05_pre_08", "kind": "dialogue", "speaker": "gnosis", "text": "これ以上は近づけない！ まず攻撃を防いで、岩棚へ退くぞ！"},
      ],
      postNodes: [
        {"id": "vc_05_post_01", "kind": "stage", "speaker": null, "text": "ツバキが溶岩側へ離れる。一行は距離のある岩棚に戻り、流れを見渡す。"},
        {"id": "vc_05_post_02", "kind": "dialogue", "speaker": "gnosis", "text": "ツバキは火の魔力を取り込むんだ。あの流れは、あいつらには使える場所なんだな。"},
        {"id": "vc_05_post_03", "kind": "dialogue", "speaker": "galdra", "text": "ガル。"},
        {"id": "vc_05_post_04", "kind": "dialogue", "speaker": "gnosis", "text": "フレイガルが離れて、ツバキが集まる……。強い誰かが、全部追い出したわけじゃなさそうだ。"},
        {"id": "vc_05_post_05", "kind": "narration", "speaker": "narrator", "text": "道の脇には新しい溶岩、遠くには噴気。麓へ降りた足跡と、熱に近づく精霊の姿がつながった。"},
        {"id": "vc_05_post_06", "kind": "dialogue", "speaker": "contractor", "text": "山の熱が変わってるんだね。"},
        {"id": "vc_05_post_07", "kind": "dialogue", "speaker": "gnosis", "text": "ああ。住みにくくなるものも、使える場所が増えるものもいるんだ。"},
        {"id": "vc_05_post_08", "kind": "dialogue", "speaker": "gnosis", "text": "古道は諦めよう。横へ抜けられるか、ここから見える範囲を確かめるぞ。"},
      ],
    },
    {
      id: "vc_06",
      number: 6,
      title: "火のそばを離れないもの",
      unlockAfter: "vc_05",
      recommendedLevel: 14,
      battleMode: "single",
      enemies: [
        {"speciesId": "ignaros", "level": 17, "hp": 280, "speed": 68, "attackMultiplier": 0.95, "moveIds": ["skill_ignaros_01", "skill_ignaros_02", "skill_ignaros_03"]},
      ],
      firstReward: {"exp": 540, "coins": 150},
      repeatReward: {"exp": 20, "coins": 10},
      preNodes: [
        {"id": "vc_06_pre_01", "kind": "narration", "speaker": "narrator", "text": "横へ続く岩棚は火口の側面へ近づいていた。ここから先の道は、岩壁に隠れて見えない。"},
        {"id": "vc_06_pre_02", "kind": "stage", "speaker": null, "text": "イグナロスが熱い岩のそばにいる。重い甲殻の隙間で、赤い光が脈打つ。"},
        {"id": "vc_06_pre_03", "kind": "dialogue", "speaker": "gnosis", "text": "イグナロスだ。火口の熱を、鎧の力にする灼熱獣だぞ。"},
        {"id": "vc_06_pre_04", "kind": "dialogue", "speaker": "galdra", "text": "ガルル！"},
        {"id": "vc_06_pre_05", "kind": "dialogue", "speaker": "gnosis", "text": "この熱でも離れないのか……。近寄らず、手前の岩から先を見よう。"},
        {"id": "vc_06_pre_06", "kind": "narration", "speaker": "narrator", "text": "岩の端を回ると、イグナロスの正面に出た。獣が一行へ踏み込む。"},
        {"id": "vc_06_pre_07", "kind": "stage", "speaker": null, "text": "契約者がガルドラを背後へ呼び寄せる。"},
        {"id": "vc_06_pre_08", "kind": "dialogue", "speaker": "gnosis", "text": "ここも縄張りだった！ 気をつけろ、押し戻されないように守るぞ！"},
      ],
      postNodes: [
        {"id": "vc_06_post_01", "kind": "stage", "speaker": null, "text": "イグナロスが熱の強い岩へ戻る。一行は来た側へ距離を取る。"},
        {"id": "vc_06_post_02", "kind": "dialogue", "speaker": "gnosis", "text": "下へ逃げるわけじゃないんだな。こいつには、あの熱が必要なんだ。"},
        {"id": "vc_06_post_03", "kind": "narration", "speaker": "narrator", "text": "低い地鳴りが響いた。先の岩壁から、来た時には見えなかった噴気が上がる。"},
        {"id": "vc_06_post_04", "kind": "dialogue", "speaker": "galdra", "text": "ガァ～ウ！"},
        {"id": "vc_06_post_05", "kind": "stage", "speaker": null, "text": "ガルドラが足を止める。契約者は先へ進まず、来た道へ身体を向ける。"},
        {"id": "vc_06_post_06", "kind": "dialogue", "speaker": "contractor", "text": "戻ろう。"},
        {"id": "vc_06_post_07", "kind": "dialogue", "speaker": "gnosis", "text": "ああ、引き返すぞ。あいつが暮らせても、ボク達が通れるとは限らない。"},
        {"id": "vc_06_post_08", "kind": "narration", "speaker": "narrator", "text": "三人は火口から離れる。岩棚の足元を確かめながら、帰り道をたどった。"},
      ],
    },
    {
      id: "vc_07",
      number: 7,
      title: "帰り道に集まるもの",
      unlockAfter: "vc_06",
      recommendedLevel: 14,
      battleMode: "three_way",
      enemies: [
        {"speciesId": "freiwolf", "level": 18, "hp": 275, "speed": 78, "attackMultiplier": 0.6, "moveIds": ["skill_freiwolf_01", "skill_freiwolf_02", "skill_freiwolf_03"]},
        {"speciesId": "tsubaki", "level": 18, "hp": 289, "speed": 80, "attackMultiplier": 0.6, "moveIds": ["skill_tsubaki_01", "skill_tsubaki_02", "skill_tsubaki_03"]},
      ],
      firstReward: {"exp": 640, "coins": 180},
      repeatReward: {"exp": 20, "coins": 10},
      preNodes: [
        {"id": "vc_07_pre_01", "kind": "narration", "speaker": "narrator", "text": "戻る途中、来た時に通れた岩場から熱気が噴き出していた。三人は離れた斜面へ回る。"},
        {"id": "vc_07_pre_02", "kind": "stage", "speaker": null, "text": "フレイウルフが噴気を避けて横切る。その先へツバキが浮かび、火花が散る。"},
        {"id": "vc_07_pre_03", "kind": "dialogue", "speaker": "gnosis", "text": "離れたい方と、近づきたい方が、同じ場所へ来たんだな……。"},
        {"id": "vc_07_pre_04", "kind": "dialogue", "speaker": "galdra", "text": "ガルル！"},
        {"id": "vc_07_pre_05", "kind": "narration", "speaker": "narrator", "text": "フレイウルフが唸り、ツバキが翼を広げる。一行が退く側にも噴気が上がり、双方の進路と重なる。"},
        {"id": "vc_07_pre_06", "kind": "dialogue", "speaker": "gnosis", "text": "君、足場を確かめて！ ここを抜けるまで、両方を警戒するぞ！"},
        {"id": "vc_07_pre_07", "kind": "system", "speaker": "system", "text": "三つ巴戦：敵同士も攻撃します。攻撃する相手を選んでください。"},
      ],
      postNodes: [
        {"id": "vc_07_post_01", "kind": "stage", "speaker": null, "text": "二体が違う方向へ離れる。一行は噴気から距離を取る。"},
        {"id": "vc_07_post_02", "kind": "dialogue", "speaker": "galdra", "text": "ガル！"},
        {"id": "vc_07_post_03", "kind": "stage", "speaker": null, "text": "ガルドラが岩の端で止まり、灰に残る足跡を見る。契約者を振り返る。"},
        {"id": "vc_07_post_04", "kind": "dialogue", "speaker": "gnosis", "text": "あっ、その足跡！ ゴブリンが採集してた側へ続いてるな。"},
        {"id": "vc_07_post_05", "kind": "narration", "speaker": "narrator", "text": "グノーシスが先を見る。道には溶岩がなく、見える範囲に新しい噴気もない。"},
        {"id": "vc_07_post_06", "kind": "dialogue", "speaker": "gnosis", "text": "前に通れたからって、今も同じとは限らないぞ。……よし、ここは進めそうだ。"},
        {"id": "vc_07_post_07", "kind": "stage", "speaker": null, "text": "契約者がうなずく。ガルドラは飛び出さず、三人で足場を確かめて進む。"},
        {"id": "vc_07_post_08", "kind": "narration", "speaker": "narrator", "text": "足跡の残る道は、高い尾根へ続く岩棚に合流した。"},
      ],
    },
    {
      id: "vc_08",
      number: 8,
      title: "赤く脈打つ岩壁",
      unlockAfter: "vc_07",
      recommendedLevel: 15,
      battleMode: "single",
      enemies: [
        {"speciesId": "ignaros", "level": 19, "hp": 297, "speed": 69, "attackMultiplier": 0.85, "moveIds": ["skill_ignaros_01", "skill_ignaros_02", "skill_ignaros_03"]},
      ],
      firstReward: {"exp": 760, "coins": 210},
      repeatReward: {"exp": 20, "coins": 10},
      preNodes: [
        {"id": "vc_08_pre_01", "kind": "narration", "speaker": "narrator", "text": "尾根へ抜ける岩棚に、別のイグナロスがいた。先ほどの個体より大きく、甲殻の内側が強く光っている。"},
        {"id": "vc_08_pre_02", "kind": "dialogue", "speaker": "gnosis", "text": "あの岩壁にも熱が漏れてる。ここを使ってるんだな。"},
        {"id": "vc_08_pre_03", "kind": "stage", "speaker": null, "text": "三人が止まり、離れた側を見渡す。後方から噴気が上がり、引き返す通路が狭まる。"},
        {"id": "vc_08_pre_04", "kind": "dialogue", "speaker": "galdra", "text": "ガルル！"},
        {"id": "vc_08_pre_05", "kind": "dialogue", "speaker": "gnosis", "text": "後ろへは戻れない……！ 岩棚の外側なら、尾根へ出られるぞ。"},
        {"id": "vc_08_pre_06", "kind": "narration", "speaker": "narrator", "text": "一行が外側へ動くと、イグナロスが向き直った。獣が角を下げ、岩を踏み砕きながら迫る。"},
        {"id": "vc_08_pre_07", "kind": "stage", "speaker": null, "text": "契約者がガルドラを呼び寄せ、足場の広い位置で止まる。"},
        {"id": "vc_08_pre_08", "kind": "dialogue", "speaker": "gnosis", "text": "先に身を守るぞ！ 距離をつくってから、あの出口へ！"},
      ],
      postNodes: [
        {"id": "vc_08_post_01", "kind": "stage", "speaker": null, "text": "イグナロスが岩壁側へ下がる。一行は追わず、外側の岩棚を通って尾根へ出る。"},
        {"id": "vc_08_post_02", "kind": "dialogue", "speaker": "galdra", "text": "ガァ～ウ。"},
        {"id": "vc_08_post_03", "kind": "dialogue", "speaker": "gnosis", "text": "ふう……。よく一緒に来たな、ガルドラ。"},
        {"id": "vc_08_post_04", "kind": "narration", "speaker": "narrator", "text": "高い場所から、新しい溶岩の流れと、その両側を移動する小さな姿が見えた。"},
        {"id": "vc_08_post_05", "kind": "dialogue", "speaker": "gnosis", "text": "熱い場所が増えて、道も暮らす場所も変わったんだな。麓で見た動きは、ここにつながってたのか。"},
        {"id": "vc_08_post_06", "kind": "stage", "speaker": null, "text": "上空に遠い翼の影。新しい溶岩の流れの上で、大きく弧を描く。"},
        {"id": "vc_08_post_07", "kind": "dialogue", "speaker": "galdra", "text": "ガル！"},
        {"id": "vc_08_post_08", "kind": "dialogue", "speaker": "gnosis", "text": "空にもいる……。まず尾根を下ろう。今度は頭上も見て進むぞ。"},
      ],
    },
    {
      id: "vc_09",
      number: 9,
      title: "火山の息づかい",
      unlockAfter: "vc_08",
      recommendedLevel: 16,
      battleMode: "single",
      enemies: [
        {"speciesId": "ashleia", "level": 20, "hp": 447, "speed": 92, "attackMultiplier": 0.3, "moveIds": ["s110_067", "s110_014", "s110_003"]},
      ],
      firstReward: {"exp": 920, "coins": 260},
      repeatReward: {"exp": 20, "coins": 10},
      preNodes: [
        {"id": "vc_09_pre_01", "kind": "narration", "speaker": "narrator", "text": "麓へ続く尾根の上で、巨大な火炎鳥が旋回していた。赤黒い翼が、溶岩から上がる熱気を受けて広がる。"},
        {"id": "vc_09_pre_02", "kind": "dialogue", "speaker": "gnosis", "text": "アシュレイアだ……！ 火口の上を巡る大型の火炎鳥だぞ。"},
        {"id": "vc_09_pre_03", "kind": "stage", "speaker": null, "text": "アシュレイアが新しい溶岩の流れの上を滑る。尾根を横切って、再び熱気の筋へ戻る。"},
        {"id": "vc_09_pre_04", "kind": "dialogue", "speaker": "gnosis", "text": "飛ぶ場所も変わったのか。下から上がる風を使ってるんだな。"},
        {"id": "vc_09_pre_05", "kind": "dialogue", "speaker": "galdra", "text": "ガル。"},
        {"id": "vc_09_pre_06", "kind": "stage", "speaker": null, "text": "ガルドラが飛び出しかけて止まり、契約者を振り返る。契約者はそばへ手招きする。"},
        {"id": "vc_09_pre_07", "kind": "dialogue", "speaker": "contractor", "text": "一緒に行こう。"},
        {"id": "vc_09_pre_08", "kind": "narration", "speaker": "narrator", "text": "三人は岩の陰を選んで下る。最後の開けた場所で、アシュレイアがこちらへ向き直り、翼を傾けた。"},
        {"id": "vc_09_pre_09", "kind": "dialogue", "speaker": "gnosis", "text": "来るぞ！ 身を守って、尾根を下りる場所をつくろう！"},
      ],
      postNodes: [
        {"id": "vc_09_post_01", "kind": "stage", "speaker": null, "text": "アシュレイアが高度を上げ、熱気の筋へ離れる。一行は追撃せず、尾根を下る。溶岩や噴気は消さない。"},
        {"id": "vc_09_post_02", "kind": "dialogue", "speaker": "galdra", "text": "ガァ～ウ。"},
        {"id": "vc_09_post_03", "kind": "dialogue", "speaker": "gnosis", "text": "抜けた……！ あいつも、空へ戻ったな。"},
        {"id": "vc_09_post_04", "kind": "narration", "speaker": "narrator", "text": "三人は熱の弱い岩場まで下り、そこで足を止めた。山の奥からは、まだ低い地鳴りが聞こえる。"},
        {"id": "vc_09_post_05", "kind": "stage", "speaker": null, "text": "短い暗転。地の文「それから数日後」。一行が麓の、広く見渡せる場所を再訪する。"},
        {"id": "vc_09_post_06", "kind": "narration", "speaker": "narrator", "text": "ゴブリンは以前と違う岩のそばで採集し、フレイガルは別の温かい石に集まっていた。"},
        {"id": "vc_09_post_07", "kind": "dialogue", "speaker": "galdra", "text": "ガル！"},
        {"id": "vc_09_post_08", "kind": "dialogue", "speaker": "gnosis", "text": "あっちへ移ったんだな。前に使ってた場所と、少し違うぞ。"},
        {"id": "vc_09_post_09", "kind": "stage", "speaker": null, "text": "遠くの斜面にフレイウルフ。熱気のそばにはツバキ、岩壁の赤い光の近くにはイグナロスの姿。火口へ再び近づく描写はしない。"},
        {"id": "vc_09_post_10", "kind": "dialogue", "speaker": "gnosis", "text": "過酷な環境だけど、強さだけで全てが決まるわけじゃないんだな。"},
        {"id": "vc_09_post_11", "kind": "narration", "speaker": "narrator", "text": "アシュレイアが遠い空を巡る。新しい溶岩の流れから上がる気流に乗り、翼を大きく広げた。"},
        {"id": "vc_09_post_12", "kind": "stage", "speaker": null, "text": "契約者が麓の広い迂回路を指す。山の側面を避けて、向こうへ続いている。"},
        {"id": "vc_09_post_13", "kind": "dialogue", "speaker": "contractor", "text": "あっちから行けそうじゃない？"},
        {"id": "vc_09_post_14", "kind": "dialogue", "speaker": "gnosis", "text": "古道とは違うけど、向こうへ続いてるな。ふふん、今度は足元も頭上も確かめて行くぞ！"},
        {"id": "vc_09_post_15", "kind": "stage", "speaker": null, "text": "ガルドラが足元を見てから、契約者を振り返る。三人で歩き出す。"},
        {"id": "vc_09_post_16", "kind": "dialogue", "speaker": "galdra", "text": "ガル！"},
        {"id": "vc_09_post_17", "kind": "narration", "speaker": "narrator", "text": "火山の熱は、道を変え、暮らす場所を変えていく。三人は今の山を見ながら、向こうへ続く道を選んだ。"},
      ],
    },
  ],
};

const MAP_STORIES = Object.freeze([GRASSLAND_STORY, VOLCANO_STORY]);
