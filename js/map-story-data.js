/* Approved Drive manuscript, 2026-10-12; dialogue is preserved verbatim. */
const GRASSLAND_STORY = {
  "id": "grassland_whose",
  "version": 1,
  "mapId": "grassland",
  "title": "草原は、誰のもの",
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
