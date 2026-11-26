/* A curated home carousel, independent from the notice history. */
const HOME_BANNERS=Object.freeze([
  {id:'missions',tag:'新機能',title:'ミッションが登場',description:'達成するとコインがもらえます',target:'missions',image:null},
  {id:'prologue',tag:'ストーリー',title:'序章の続きが遊べます',description:'第7話〜第22話と終幕を追加',target:'story',image:null},
  {id:'ice',tag:'新属性',title:'氷属性を追加しました',description:'アイスゴーレムが氷属性に',target:'notices',image:null},
  {id:'feedback',tag:'意見箱',title:'意見を送るとお礼が届きます',description:'1日1回 コイン500枚',target:'feedback',image:null},
  {id:'faq',tag:'Q&A',title:'よくある質問',description:'G-BLESSとは？ ほか',target:'notices',image:null}
].map(Object.freeze));
