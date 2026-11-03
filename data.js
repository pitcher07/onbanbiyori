// ゲームデータ定義（能力・トレーニング・個性・活動形態・発掘場所・会場・イベント・名前と評価文の素材）。
// 数値は遊びながら調整する。変えたら game_design.md に記録すること。
const AB=[['sing','歌唱'],['play','演奏'],['comp','作曲'],['dance','ダンス'],['expr','表現'],['char','カリスマ']];
const AB_NAME=Object.fromEntries(AB);
const SEASONS=['春','夏','秋','冬'];
const SEASON_ICON=['🌸','☀️','🍁','❄️'];
// 素質ランク（下限値の高い順）
const RANKS=[['S',90],['A',80],['B',65],['C',50],['D',0]];
const RANK_NOTE={S:'トップクラスの才能',A:'一流になれる',B:'十分に活躍できる',C:'人並み',D:'伸びにくい'};
const ROSTER_MAX=20;
const FAV_MAX=3;
const POLICIES={
  balance:{name:'バランス',desc:'全能力が少しずつ伸びる',w:{sing:.4,play:.4,comp:.4,dance:.4,expr:.4,char:.4},cost:8},
  voice:{name:'ボイストレーニング',desc:'歌唱◎ 表現△',w:{sing:1,expr:.25},cost:10},
  play:{name:'楽器練習',desc:'演奏◎ ダンス△（リズム感）',w:{play:1,dance:.25},cost:10},
  comp:{name:'作曲合宿',desc:'作曲◎ 表現○（作詞で言葉を磨く）',w:{comp:1,expr:.45},cost:10},
  dance:{name:'ダンスレッスン',desc:'ダンス◎ カリスマ○ 表現△',w:{dance:1,char:.4,expr:.2},cost:12},
  stage:{name:'ステージ経験',desc:'カリスマ◎ 表現◎ 歌唱△ 演奏△（未編成だと効果半減）',w:{char:.75,expr:.75,sing:.2,play:.2},cost:14},
  rest:{name:'休養',desc:'トレーニングなし・調子が大きく回復',w:{},cost:-35},
};
// compat：その個性を持つ人と他の人との相性に加える値
const TRAITS={
  genius:{name:'天才肌',desc:'トレーニングの伸びが大きいが波がある。自然にも伸びやすい'},
  hard:{name:'努力家',desc:'重点トレーニングの効果が高く、素質の壁を越えやすい'},
  clutch:{name:'本番に強い',desc:'楽曲の出来とライブが良くなる'},
  slump:{name:'スランプ気味',desc:'時々成長が止まる。使わない能力が鈍りやすい'},
  mood:{name:'ムードメーカー',desc:'グループの楽曲が良くなり、仲間の疲れを軽くする。誰とでも相性が良い',compat:12},
  late:{name:'晩成',desc:'所属から2年後に大きく伸びる'},
  early:{name:'早熟',desc:'所属から2年間はよく伸びるが、その後は伸びにくい'},
  tough:{name:'タフ',desc:'トレーニングで疲れにくい'},
  sensitive:{name:'繊細',desc:'表現が伸びやすく楽曲の出来も上がるが、疲れやすい'},
  free:{name:'自由人',desc:'トレーニングの効果はやや低いが、自然に伸びやすい'},
  perfect:{name:'完璧主義',desc:'楽曲の出来が上がるが、疲れやすい'},
  lone:{name:'一匹狼',desc:'1人で活動すると楽曲が良くなるが、グループでは力を出しにくい。人と合わせるのが苦手',compat:-15},
  leader:{name:'リーダー気質',desc:'グループの楽曲が良くなる。誰とでもまずまず相性が良い',compat:8},
  versatile:{name:'器用',desc:'バランストレーニングの効果が高い'},
  buzz:{name:'話題性',desc:'所属する組のファンが増えやすく、SNSで話題になりやすい'},
  rival:{name:'負けず嫌い',desc:'トレーニングの効果が少し高い。同じトレーニングの仲間となら、相性がふつうでも切磋琢磨できる'},
  showoff:{name:'目立ちたがり',desc:'カリスマが伸びやすい。目立ちたがり同士は相性が悪い'},
  natural:{name:'天然',desc:'憎めない人柄で、誰とでも相性が良い',compat:8},
  fragile:{name:'怪我しやすい',desc:'怪我をしやすい'},
  voice:{name:'天性の声',desc:'歌唱が伸びやすい'},
};
// 同時に持たない個性の組み合わせ
const TRAIT_CONFLICT=[['early','late'],['tough','fragile'],['leader','lone'],['tough','sensitive']];
const TYPES={
  singer:{name:'ソロシンガー',min:1,max:1,w:{sing:.35,expr:.3,char:.2,comp:.15}},
  ssw:{name:'シンガーソングライター',min:1,max:1,w:{comp:.35,sing:.3,play:.2,expr:.15}},
  rapper:{name:'ラッパー',min:1,max:1,w:{expr:.35,char:.3,comp:.25,sing:.1}},
  dj:{name:'DJ・トラックメイカー',min:1,max:1,w:{comp:.45,play:.35,char:.2}},
  duo:{name:'デュオ',min:2,max:2,w:{sing:.3,comp:.25,expr:.25,char:.2}},
  unit:{name:'ユニット',min:3,max:4,w:{sing:.3,expr:.25,comp:.2,char:.15,dance:.1}},
  band:{name:'バンド',min:3,max:5,w:{play:.35,comp:.3,sing:.2,char:.15}},
  inst:{name:'インストバンド',min:2,max:5,w:{play:.55,comp:.35,expr:.1}},
  idol:{name:'アイドルグループ',min:3,max:8,w:{dance:.3,sing:.25,char:.3,expr:.15}},
  dvg:{name:'ダンス＆ボーカルグループ',min:3,max:7,w:{dance:.35,sing:.35,expr:.15,char:.15}},
  vocal:{name:'ボーカルグループ',min:3,max:6,w:{sing:.5,expr:.3,comp:.2}},
  crew:{name:'ヒップホップクルー',min:2,max:6,w:{expr:.3,char:.3,comp:.2,dance:.2}},
};
const sizeStr=t=>t.min===t.max?`${t.min}人`:`${t.min}〜${t.max}人`;
const AUDITION_AGES=[15,26];
const PLACES={
  livehouse:{name:'ライブハウス',desc:'演奏・作曲が得意な人が多い（18〜30歳）',bias:{play:14,comp:10},ages:[18,30]},
  dance:{name:'ダンススクール',desc:'ダンス・カリスマが得意な人が多い（14〜22歳）',bias:{dance:14,char:8},ages:[14,22]},
  street:{name:'路上ライブ',desc:'歌唱・表現が得意な人が多い（16〜27歳）',bias:{sing:14,expr:10},ages:[16,27]},
  sns:{name:'SNS',desc:'作曲・表現が得意な人が多い（14〜24歳）',bias:{comp:12,expr:8},ages:[14,24]},
};
// ライブ会場（必要ファン数の低い順）
const VENUES=[{name:'ライブハウス',cap:300,need:0},{name:'ホール',cap:2000,need:3000},{name:'アリーナ',cap:15000,need:25000},{name:'ドーム',cap:50000,need:100000}];
// 夏フェスの出演枠（必要ファン数の低い順）
const FEST=[{name:'サブステージ',need:2000},{name:'メインステージ',need:15000},{name:'ヘッドライナー',need:60000}];

// 人名
const SUR='佐藤 鈴木 高橋 田中 伊藤 渡辺 山本 中村 小林 加藤 吉田 山田 佐々木 山口 松本 井上 木村 林 清水 森 池田 橋本 阿部 石川 前田 藤田 小川 岡田 村上 近藤 坂本 遠藤 青木 藤井 西村 福田 太田 三浦 藤原 白石 岡本 松田 中川 中野 原田 小野 田村 竹内 金子 和田 中山 石井 上田 森田 原 柴田 酒井 工藤 横山 宮崎 宮本 内田 高木 安藤 谷口 大野 丸山 今井 高田 藤本 武田 村田 上野 杉山 増田 平野 大塚 千葉 久保 松井 小島 岩崎 桜井 野口 松尾 野村 木下 菊地 佐野 大西 杉本 新井 浜田 菅原 市川 水野 小松 島田 古川 小山 高野 西田 山内 西川 五十嵐 北村 安田 中田 川口 平田 川崎 飯田 吉川 本田 沢田 辻 関 宮田 東 望月 堀 九条 一ノ瀬 天野 星野 朝倉 月島 葉山 如月 神崎 早乙女 日向 芹沢 結城 氷室 鳴海'.split(' ');
const GIV='陽向 蒼 湊 律 奏 結衣 澪 葵 ひなた 凛 悠 遥 楓 晴 透 朔 詩 響 灯 紬 光 渚 樹 千尋 真白 七海 颯 環 柚 彩 蓮 陽翔 大和 悠真 湊斗 慧 玲 碧 柊 瑛太 健 拓海 翔 隼 大輝 涼 航 仁 匠 一輝 誠 優斗 理央 莉子 美咲 さくら 芽衣 花 愛 心春 陽菜 結菜 杏 美羽 琴音 茉莉 千夏 舞 梓 菜々 麻衣 瑠璃 小春 由依 遥香 栞 雫 ことね あかり みのり すみれ のぞみ つばさ かなで しずく 弦 歌恋 律歌 響子 奏多 音羽 琥珀 真琴 薫 京 エマ レオ ミナ ジュン ルカ アン リサ ケイ ノア ユウ'.split(' ');
// 曲名
const SONG_JA_A='夜明けの 青い 最後の 真夏の ひかりの 雨上がりの 遠い はじまりの 星降る 透明な 君との 眠らない 午前零時の 誰もいない さよならの 名前のない 八月の 白い 優しい 嘘つきの 二度目の 秘密の'.split(' ');
const SONG_JA_B='メロディ 約束 ステージ 帰り道 ラブソング ストーリー パレード 夢 シグナル 空 季節 ダンス 花束 手紙 交差点 惑星 灯台 ブルース 魔法 革命 ワルツ 合言葉'.split(' ');
const SONG_WORD='群青 残響 陽炎 蜃気楼 花火 春雷 夜光 万華鏡 流星群 微熱 白昼夢 走馬灯 追い風 未来図 青写真 逆光 雨音 不夜城'.split(' ');
const SONG_PHRASE='屋上で待ってる/君に会いたいだけ/もう一度だけ/走れ、走れ/ここにいるよ/明日は晴れるかな/さよならは言わない/夢の続きを見よう/全部ぶっとばせ/まだ帰りたくない/笑ってよ/ねえ、聞こえる？/踊れないなら歌えばいい/世界はきっと僕らのもの'.split('/');
const EN_ADJ='Midnight/Electric/Golden/Silent/Neon/Crazy/Lonely/Brand New/Endless/Velvet/Paper/Wild/Blue/Broken/Lucky/Sweet/Crystal/Northern/Summer/Last/Little/Supersonic'.split('/');
const EN_NOUN='Runner Dreamer Sky Parade Signal Heart Highway Letter Romance Revolution Moon Groove Story Fire Garden Rain Satellite Lullaby Machine Diary Jukebox Rocket'.split(' ');
const EN_PHRASE='Hello, Tomorrow/Into the Blue Hour/Count to Ten/Nobody Sleeps Tonight/Kiss the Rain Goodbye/Ride the Last Train/Turn Up the Stars/Wish You Were Louder/Breakfast on the Moon/Same Old Brand New Day/Overdrive Heart/Ghost in the Jukebox/Dancing on a Paper Plane/Call Me When the Sun Goes Down'.split('/');
const SONG_KATA='サマーデイズ ミラーボール ハイウェイ ラストダンス ネバーランド シャングリラ ミッドナイト ブルーモーメント カレイドスコープ ステラ'.split(' ');
// アーティスト名
const UN_KATA_A='ミッドナイト シルバー ブルー サニー ノクターン ネオン ルミナス ポラリス スカイ ガーネット ペーパー ハニー モノクロ エレクトリック ラズベリー サテライト'.split(' ');
const UN_KATA_B='ライン パレード シグナル ガーデン トレイン リーフ ステップ ホライズン ノート ドロップ ジャンクション ポスト サーカス ラボ クラブ'.split(' ');
const UN_EN_B='Cats Rockets Lights Kids Wolves Engines Ghosts Dreamers Pilots Bandits Stars Riders Monkeys Sirens Strangers'.split(' ');
const UN_WORD='NOVA LUMEN ECLIPSE ORBIT AURORA VERTEX HALO PRISM ZEPHYR IRIS ARIA COMET'.split(' ');
const UN_JA_A='月曜 群青 真夜中の 放課後 雨色 硝子の 銀河 夕焼け 迷子の 三日月 路地裏 午前二時の'.split(' ');
const UN_JA_B='アパート 少年団 少女 楽団 図書館 カルテット 遊園地 劇場 喫茶 列車 研究所 合唱団'.split(' ');
const UN_HIRA='ねむれる森 ひだまり日和 あおぞら組 ほしのこ よるのうた わたあめ団 なないろ そらまめ ぽかぽか通信 さかさまの空'.split(' ');
const STAGE='KAI Noa sora REN MIO Lynx YUKI Hikari mono Ash Rio Lune TOMO Sena Coco nagi Juno ZEN Rui Aki'.split(' ');
const RIVALS='霧島ユウ/ノースフォール/綾瀬ミオ/カメレオンズ/月白/PRISM GATE/早瀬トオル/ラストオーダー/七色ポスト/東雲バンド'.split('/');

// 評価コメント（音楽ライター）の素材。文末の「。」は付けない
const WRITERS='三上ナオ 柏木礼 久遠ミチル 宇佐美透 真鍋京子 ハル川島 小椋ジン 片桐ユキエ'.split(' ');
const REV_TOP={ // [低い, 中くらい, 高い]
  sing:[['まだ粗削りだが、素直な歌声には好感が持てる','歌声に伸びしろを感じる'],['芯のある歌声が耳に残る','聴き手の心をつかむ声を持っている'],['圧倒的な歌唱力はすでに一級品','一声で空気を変える歌声は唯一無二']],
  play:[['楽器の扱いはまだぎこちないが熱意は伝わる','演奏には荒さの中に光るものがある'],['安定した演奏力がサウンドを支えている','手堅いプレイが曲に厚みを与えている'],['卓越したプレイは聴く者を黙らせる','楽器を自在に操る姿はまさに名手']],
  comp:[['メロディセンスの片鱗が見える','曲作りはまだ手探りだが、発想は面白い'],['書く曲には確かなフックがある','耳に残るメロディを書く力がある'],['楽曲を生み出す力は天賦のもの','ヒットの方程式を体で知っている作り手だ']],
  dance:[['動きにはまだ硬さが残るが、リズム感は悪くない','ダンスは発展途上だが体のバネがある'],['キレのあるダンスが目を引く','しなやかな動きでステージを彩る'],['ダンスはもはや芸術の域','一挙手一投足が観客を魅了する']],
  expr:[['感情を伝えようとする姿勢が見える','表現にはまだ照れが残る'],['言葉ひとつひとつに表情が宿る','曲の世界観を体現する力がある'],['表現力の深さは群を抜く','聴く者の感情を揺さぶる表現者だ']],
  char:[['ステージに立つと、どこか目を引く','人を惹きつける素質の片鱗がある'],['自然と視線を集める華がある','ステージ映えする存在感を持っている'],['立っているだけで場を支配するカリスマ','スターと呼ぶにふさわしいオーラがある']],
};
const REV_SECOND=['{a}も確かな武器だ','{a}の伸びも見逃せない','{a}にも非凡なものを感じる'];
const REV_TRAIT={
  genius:'ふとした瞬間に見せる閃きは天才肌そのもの',hard:'積み重ねた努力が音に表れている',clutch:'本番での勝負強さは折り紙付き',
  slump:'好不調の波をどう乗りこなすかが鍵になる',mood:'周囲を明るくする人柄も大きな魅力',late:'本領を発揮するのはまだ先だろう',
  early:'若くして完成度が高い',tough:'多少の無理ではびくともしない体力がある',sensitive:'繊細な感性が作品ににじむ',
  free:'型にはまらない自由さが持ち味',perfect:'妥協を許さない姿勢が完成度を引き上げている',lone:'群れない孤高のスタイルを貫いている',
  leader:'仲間を引っ張る統率力もある',versatile:'何でもこなす器用さが光る',buzz:'話題を呼ぶ存在感がある',
  rival:'負けず嫌いな性格が成長の原動力だ',showoff:'目立ってなんぼという気概が頼もしい',natural:'天然の愛されキャラでもある',
  fragile:'体調管理が今後の課題',voice:'生まれ持った声質は天からの贈り物だ',
};
const REV_WEAK=['{a}はまだ課題だ','{a}が伸びればさらに化ける','{a}は今後の宿題だろう'];
const REV_UP=['ここ最近の成長ぶりは目覚ましい','この短期間で見違えるほど成長した'];
const REV_DOWN=['最近はやや精彩を欠いている','少し伸び悩んでいる印象だ'];
const REV_VET=['キャリアを重ねた円熟味がにじむ','ベテランらしい安定感がある'];
const REV_POT=['まだ底が見えない','秘めた可能性は計り知れない'];
const REV_END=[ // 総合値の段階ごと
  ['まだ原石だが、磨けば光るはずだ','荒削りな今の姿も、数年後には懐かしく思えるかもしれない'],
  ['今後の成長に期待したい','次の一手が楽しみだ'],
  ['注目株のひとりと言っていい','シーンで頭角を現しつつある'],
  ['いまやシーンの中心にいる存在だ','この世代を代表する一人だろう'],
  ['時代を代表する才能だ','音楽史に名を刻む日も遠くない'],
];

// イベント
// t：対象（p=人、u=活動中の組、a=事務所全体）。season：発生する季節（省略で通年）。
// w(c)：発生の重み（0なら発生しない）。人・組が対象のイベントは、対象全体での合計がおおむね w になるように調整される。
// run(c)：選択肢なしの強制イベントの効果。結果の文を返す。choices：選択肢つきイベント。
// 組の調子（D56）：うまくいっている組は解散系のイベントが起きにくく、伸び悩んでいる組は起きやすい
// うまくいっている＝2年以内の曲が3位以内に入った、または去年か今年に受賞した
const recentPeak=u=>Math.min(99,...S.songs.filter(s=>s.ours&&s.unitId===u.id&&T()-s.t<8).map(s=>s.peak||99));
const unitHot=u=>recentPeak(u)<=3||u.awards.some(a=>parseInt(a)>=S.year-1);
// 伸び悩み＝2曲以上出して結成から1年半以上たつのに、2年以内の曲がトップ10に入っていない
const unitCold=u=>u.songs>=2&&T()-u.formed>=6&&recentPeak(u)>10;
const breakupF=u=>unitHot(u)?.15:unitCold(u)?1.5:.6;
// 楽曲を提供できる先輩：作曲60以上、その組のメンバーではなく、メンバーの誰よりも先に入った人
const senpaiFor=u=>{const ms=members(u);const first=Math.min(...ms.map(m=>m.joined));return S.people.filter(p=>!u.members.includes(p.id)&&p.abil.comp>=60&&p.joined<first).sort((a,b)=>b.abil.comp-a.abil.comp)[0]||null};
const EVENTS=[
  // --- 人・強制 ---
  {id:'cold',name:'風邪',t:'p',w:()=>S.season===3?3:1,text:c=>`${c.p.name}が風邪をひいてしまった。`,run:c=>{addCond(c.p,-20);return '調子−20'}},
  {id:'injury',name:'怪我',t:'p',w:c=>(['dance','stage'].includes(c.p.policy)?1.5:.4)*(has(c.p,'fragile')?4:1),text:c=>`${c.p.name}がレッスン中に足を痛めた。`,run:c=>{addCond(c.p,-30);addAbil(c.p,'dance',-3);return '調子−30、ダンス−3'}},
  {id:'hayfever',name:'花粉症',t:'p',season:[0],w:()=>1,text:c=>`${c.p.name}が花粉症に悩まされている。`,run:c=>{addCond(c.p,-10);addAbil(c.p,'sing',-1);return '調子−10、歌唱−1'}},
  {id:'heat',name:'夏バテ',t:'p',season:[1],w:()=>1.2,text:c=>`猛暑で${c.p.name}が夏バテ気味だ。`,run:c=>{addCond(c.p,-15);return '調子−15'}},
  {id:'idea',name:'ひらめき',t:'p',w:c=>c.p.abil.comp>=30?1:0,text:c=>`${c.p.name}が街角で聞いた音から新しいメロディを思いついた。`,run:c=>{addAbil(c.p,'comp',3);return '作曲+3'}},
  {id:'graduate',name:'卒業シーズン',t:'p',season:[0],w:c=>c.p.age<=22?1.2:0,text:c=>`${c.p.name}は別れの季節を経て、何かをつかんだようだ。`,run:c=>{addAbil(c.p,'expr',3);return '表現+3'}},
  {id:'art',name:'芸術の秋',t:'p',season:[2],w:()=>1,text:c=>`芸術の秋。${c.p.name}は美術館や映画から刺激を受けた。`,run:c=>{const a=pick(['expr','comp']);addAbil(c.p,a,2);return `${AB_NAME[a]}+2`}},
  {id:'letter',name:'ファンレター',t:'p',w:c=>c.u&&c.u.fans>0?1:0,text:c=>`${c.p.name}のもとに心のこもったファンレターが届いた。`,run:c=>{addCond(c.p,15);return '調子+15'}},
  {id:'bday',name:'誕生日サプライズ',t:'p',w:c=>c.u&&c.u.members.length>1?.8:0,text:c=>`メンバーが${c.p.name}の誕生日をサプライズで祝った。`,run:c=>{addCond(c.p,10);members(c.u).forEach(m=>m!==c.p&&addCompat(c.p,m,5));return '調子+10、メンバーとの相性が少し良くなった'}},
  {id:'buzz',name:'SNSでバズる',t:'p',w:c=>c.u?(has(c.p,'buzz')?3:.7):0,text:c=>`${c.p.name}の何気ない投稿がSNSで大きな話題になった。`,run:c=>`${c.u.name}のファン${fmt(addFans(c.u,.15,500))}`},
  {id:'homesick',name:'ホームシック',t:'p',w:c=>c.p.age<=20&&T()-c.p.joined<4?1:0,text:c=>`上京したばかりの${c.p.name}がホームシックにかかった。`,run:c=>{addCond(c.p,-15);return '調子−15'}},
  {id:'stimulus',name:'同世代の活躍',t:'p',w:()=>.8,text:c=>`${c.p.name}は同世代のアーティストの活躍に刺激を受けた。`,run:c=>{const a=mainAbil(c.p);addAbil(c.p,a,2);return `${AB_NAME[a]}+2`}},
  {id:'retire_force',name:'引退の決意',t:'p',season:[3],w:c=>c.p.age>=38?3:0,text:c=>`${c.p.age}歳の${c.p.name}が引退を決意した。`,run:c=>{retire(c.p);return '長いキャリアに幕を下ろした'}},
  // --- 組・強制 ---
  {id:'tv',name:'歌番組出演',t:'u',w:c=>c.u.fans>=10000?(S.season===3?2:.8):0,text:c=>`${c.u.name}が人気歌番組に出演した。`,run:c=>{const f=addFans(c.u,.08,0);members(c.u).forEach(m=>addAbil(m,'char',2));return `ファン${fmt(f)}、メンバーのカリスマ+2`}},
  {id:'magazine',name:'音楽誌の特集',t:'u',w:c=>S.chart.some(x=>x.unitId===c.u.id)?1.2:0,text:c=>`音楽誌が${c.u.name}の特集を組んだ。`,run:c=>`ファン${fmt(addFans(c.u,.05,200))}`},
  {id:'typhoon',name:'台風でライブ中止',t:'u',season:[2],w:()=>.8,text:c=>`台風の直撃で${c.u.name}のライブが中止になった。`,run:c=>{const f=addFans(c.u,-.02,0);members(c.u).forEach(m=>addCond(m,10));return `ファン${fmt(f)}、思わぬ休養で調子+10`}},
  {id:'chemistry',name:'化学反応',t:'u',w:c=>c.u.members.length>1&&unitCompat(c.u).avg>=20?1.5:0,text:c=>`${c.u.name}の息の合ったパフォーマンスが話題になった。`,run:c=>{const f=addFans(c.u,.05,200);members(c.u).forEach(m=>addCond(m,5));return `ファン${fmt(f)}、調子+5`}},
  // --- 事務所・強制 ---
  {id:'holiday',name:'年末年始の休み',t:'a',season:[3],w:()=>1,text:()=>'年末年始は事務所全体で少し長めの休みを取った。',run:()=>{S.people.forEach(p=>addCond(p,10));return '全員の調子+10'}},
  // --- 選択肢つき ---
  {id:'cm',name:'CM出演のオファー',t:'u',w:c=>c.u.fans>=5000?.8:0,text:c=>`大手飲料メーカーから${c.u.name}にCM出演の話が来た。`,choices:[
    {label:'受ける',run:c=>{const f=addFans(c.u,.1,300);members(c.u).forEach(m=>addCond(m,-10));return `ファン${fmt(f)}、忙しさで調子−10`}},
    {label:'断る',run:c=>{members(c.u).forEach(m=>addCond(m,5));return 'アーティスト性を守った。調子+5'}}]},
  {id:'request',name:'楽曲提供の依頼',t:'p',w:c=>c.p.abil.comp>=50?1:0,text:c=>`他事務所の歌手から${c.p.name}に楽曲提供の依頼が来た。`,choices:[
    {label:'引き受ける',run:c=>{addAbil(c.p,'comp',3);addCond(c.p,-10);return '作曲+3、調子−10'}},
    {label:'断る',run:c=>{addCond(c.p,5);return '調子+5'}}]},
  {id:'study',name:'短期留学の希望',t:'p',w:c=>c.p.age<=25?.7:0,text:c=>`${c.p.name}が「海外で音楽を学びたい」と相談してきた。`,choices:[
    {label:'行かせる',run:c=>{AB.forEach(([a])=>addAbil(c.p,a,2));addCond(c.p,-10);return '全能力+2、調子−10'}},
    {label:'今は見送る',run:c=>{addCond(c.p,-10);return '少し残念そうだ。調子−10'}}]},
  {id:'producer',name:'大物プロデューサー',t:'p',w:c=>ov(c.p)>=55?.8:0,text:c=>`大物プロデューサーが${c.p.name}に目を留め、指導を申し出た。`,choices:[
    {label:'指導を受ける',run:c=>{const a=topAbil(c.p);addAbil(c.p,a,5);addCond(c.p,-15);return `${AB_NAME[a]}+5、厳しい指導で調子−15`}},
    {label:'丁重に断る',run:()=>'今の育成方針を貫いた'}]},
  {id:'scandal',name:'熱愛報道',t:'p',w:c=>c.u&&c.u.fans>=3000&&c.p.age>=18?.3:0,text:c=>`週刊誌が${c.p.name}の熱愛を報じた。`,choices:[
    {label:'正直に認める',run:c=>`ファン${fmt(addFans(c.u,-.05,0))}。誠実な対応に好感の声も`},
    {label:'否定する',run:c=>Math.random()<.5?'騒ぎはすぐに収まった':`後に事実と判明し、ファン${fmt(addFans(c.u,-.12,0))}`},
    {label:'ノーコメント',run:c=>`ファン${fmt(addFans(c.u,-.03,0))}`}]},
  {id:'flame',name:'SNSで炎上',t:'p',w:c=>c.u?.5:0,text:c=>`${c.p.name}の発言がSNSで炎上してしまった。`,choices:[
    {label:'すぐに謝罪する',run:c=>{addCond(c.p,-10);return `ファン${fmt(addFans(c.u,-.03,0))}、調子−10`}},
    {label:'静観する',run:c=>`ファン${fmt(addFans(c.u,-.08,0))}`}]},
  {id:'throat',name:'喉の不調',t:'p',w:c=>c.p.abil.sing>=40&&c.p.policy!=='rest'?.8:0,text:c=>`${c.p.name}が喉の違和感を訴えている。`,choices:[
    {label:'休養させる',run:c=>{c.p.policy='rest';return '育成方針を休養に変更した'}},
    {label:'様子を見る',run:c=>{if(Math.random()<.4){addAbil(c.p,'sing',-6);addCond(c.p,-15);return '悪化してしまった。歌唱−6、調子−15'}return '大事には至らなかった'}}]},
  {id:'streetfind',name:'気になる才能',t:'a',w:()=>S.people.length<ROSTER_MAX?.8:0,text:()=>'スタッフが街で気になる人を見かけたらしい。',choices:[
    {label:'声をかける',run:()=>{const pl=pick(Object.values(PLACES));const c=genPerson(pl.bias,'街角',pl.ages);c.stars=Math.min(5,c.stars+1);S.candidates.push(c);return `${c.name}が候補に加わった（発掘タブ）`}},
    {label:'見送る',run:()=>'今回は見送った'}]},
  {id:'camp',name:'夏合宿の提案',t:'u',season:[1],w:c=>c.u.members.length>1?1:0,text:c=>`${c.u.name}のメンバーから夏合宿をしたいという声が上がった。`,choices:[
    {label:'合宿をする',run:c=>{const ms=members(c.u);ms.forEach(m=>{addCond(m,-10);addAbil(m,mainAbil(m),3)});pairs(ms).forEach(([a,b])=>addCompat(a,b,6,true));return '各自の重点能力+3、相性が深まった、調子−10'}},
    {label:'見送る',run:()=>'通常どおりの活動を続けた'}]},
  {id:'poach',name:'引き抜きの話',t:'p',w:c=>ov(c.p)>=50?.5:0,text:c=>`${S.agencyRival&&Math.random()<.5?'ライバル事務所の'+S.agencyRival.name:'他事務所'}が${c.p.name}の引き抜きを狙っているらしい。`,choices:[
    {label:'説得する',run:c=>{if(Math.random()<.6){addCond(c.p,5);return '事務所に残ってくれることになった'}leavePerson(c.p,'移籍');return `説得は届かず、${c.p.name}は他事務所へ移籍した`}},
    {label:'送り出す',run:c=>{leavePerson(c.p,'移籍');return `${c.p.name}は他事務所へ移籍した`}}]},
  {id:'retire',name:'引退の相談',t:'p',season:[3],w:c=>c.p.age>=30&&c.p.age<38?(c.p.age-29)*.6:0,text:c=>`${c.p.age}歳の${c.p.name}が引退を考えていると打ち明けてきた。`,choices:[
    {label:'引き止める',run:c=>{if(Math.random()<.5){addCond(c.p,-10);return 'もう少し続けてくれることになった（調子−10）'}retire(c.p);return '決意は固く、引退することになった'}},
    {label:'送り出す',run:c=>{retire(c.p);return '最後のステージは大きな拍手に包まれた'}}]},
  {id:'indep',name:'独立の希望',t:'p',w:c=>c.u&&c.u.fans>=30000&&T()-c.p.joined>=12?(TYPES[c.u.type].max===1?1.2:.5):0,text:c=>`${c.p.name}が独立したいと申し出てきた。`,choices:[
    {label:'認める',run:c=>{independent(c.p);return '独立後はライバルとしてチャートに現れる'}},
    {label:'引き止める',run:c=>{if(Math.random()<.5){addCond(c.p,-20);return '残留したが、わだかまりが残った（調子−20）'}independent(c.p);return '説得は届かず、独立していった'}}]},
  {id:'discord',name:'メンバーの不和',t:'u',w:c=>c.u.members.length>1&&unitCompat(c.u).avg<=-10?2*breakupF(c.u):0,text:c=>{const [a,b]=worstPair(c.u);return `${c.u.name}の空気が悪い。特に${a.name}と${b.name}がぶつかっている。`},choices:[
    {label:'話し合いの場を設ける',run:c=>{const [a,b]=worstPair(c.u);if(Math.random()<.5){addCompat(a,b,20,true);return `${a.name}と${b.name}の関係が改善した`}members(c.u).forEach(m=>addCond(m,-10));return '話し合いは平行線に終わった（調子−10）'}},
    {label:'メンバーを外す',run:c=>{const p=worstMember(c.u);removeFromUnit(p);return `${p.name}が抜けた`}},
    {label:'解散する',run:c=>{disband(c.u,'不和により解散');return `${c.u.name}は解散した`}}]},
  {id:'split',name:'解散の危機',t:'u',w:c=>c.u.members.length>1&&unitCompat(c.u).avg<=-25?3*breakupF(c.u):0,text:c=>`方向性の違いから、${c.u.name}が解散の危機を迎えている。`,choices:[
    {label:'解散する',run:c=>{disband(c.u,'方向性の違いで解散');return `${c.u.name}は解散した`}},
    {label:'活動を続ける',run:c=>{members(c.u).forEach(m=>addCond(m,-15));pairs(members(c.u)).forEach(([a,b])=>addCompat(a,b,-5));return '活動は続くが、メンバーは疲れ切っている（調子−15）'}}]},
  // ===== D56で追加 =====
  {id:'direction',name:'方向性の違い',t:'u',w:c=>c.u.members.length>1&&T()-c.u.formed>=6?1.8*breakupF(c.u)*(unitCompat(c.u).avg<0?1.5:1):0,text:c=>`${c.u.name}のメンバーの間で、これからの音楽性について意見が割れている。`,choices:[
    {label:'とことん話し合わせる',run:c=>{if(Math.random()<.6){pairs(members(c.u)).forEach(([a,b])=>addCompat(a,b,6,true));return '雨降って地固まる。メンバーの相性が少し良くなった'}const p=worstMember(c.u);removeFromUnit(p);return `${p.name}がグループを離れることになった`}},
    {label:'解散を受け入れる',run:c=>{const n=c.u.name;disband(c.u,'方向性の違いで解散');return `${n}は解散した。メンバーはそれぞれの道へ`}}]},
  {id:'solodream',name:'ソロへの思い',t:'p',w:c=>c.u&&c.u.members.length>1&&ov(c.p)>=55&&ov(c.p)>=Math.max(...members(c.u).filter(m=>m!==c.p).map(ov))+8?1.2*breakupF(c.u):0,text:c=>`${c.p.name}が「ソロでも勝負してみたい」と打ち明けてきた。`,choices:[
    {label:'背中を押す',run:c=>{const n=c.u.name;removeFromUnit(c.p);addCond(c.p,15);return `${c.p.name}は${n}を離れ、ソロの準備に入った（編成タブで組めます）`}},
    {label:'グループに残ってほしいと伝える',run:c=>{if(Math.random()<.65){addCond(c.p,-10);return '悩んだ末、グループに残ることにした（調子−10）'}removeFromUnit(c.p);return `説得はかなわず、${c.p.name}はグループを離れた`}}]},
  {id:'hiatus',name:'活動休止',t:'u',w:c=>{const ms=members(c.u);return ms.reduce((s,m)=>s+m.cond,0)/ms.length<40&&!unitHot(c.u)?1.5:0},text:c=>`疲れのたまった${c.u.name}が、しばらく活動を休むことになった。`,run:c=>{members(c.u).forEach(m=>addCond(m,25));c.u.lastRelease=T();return '全員の調子+25。次の新曲は少し先になる'}},
  {id:'cover',name:'「歌ってみた」が話題',t:'u',w:c=>c.u.songs>0?.6:0,text:c=>`ファンが投稿した${c.u.name}の曲の「歌ってみた」動画が広まっている。`,run:c=>`ファン${fmt(addFans(c.u,.06,300))}`},
  {id:'collab',name:'コラボの誘い',t:'u',w:c=>c.u.fans>=2000?.6:0,text:c=>`${S.agencyRival&&Math.random()<.5?'ライバル事務所の'+S.agencyRival.name+'から':'人気アーティストから'}、${c.u.name}にコラボの誘いが来た。`,choices:[
    {label:'受ける',run:c=>{const f=addFans(c.u,.07,400);members(c.u).forEach(m=>{addAbil(m,'expr',1);addCond(m,-8)});return `ファン${fmt(f)}、表現+1、調子−8`}},
    {label:'今回は見送る',run:()=>'自分たちの活動に集中することにした'}]},
  {id:'anniv',name:'結成記念日',t:'u',w:c=>T()-c.u.formed>=8&&(T()-c.u.formed)%4===0?1:0,text:c=>`${c.u.name}が結成${(T()-c.u.formed)/4}周年を迎えた。`,run:c=>{const f=addFans(c.u,.04,200);members(c.u).forEach(m=>addCond(m,10));return `ファン${fmt(f)}、全員の調子+10`}},
  // 先輩からの楽曲提供（F03→D60）：作曲の得意な先輩が、後輩の組に曲を書く。受け取ると次の新曲はその曲になる
  {id:'senpai',name:'先輩からの楽曲提供',t:'u',w:c=>!c.u.gift&&senpaiFor(c.u)?.7:0,text:c=>{const q=senpaiFor(c.u);c.u.giftFrom=q.id;return `作曲の得意な先輩の${q.name}が、${c.u.name}のために曲を書いてくれた。`},choices:[
    {label:'ありがたく受け取る',run:c=>{const q=person(c.u.giftFrom);if(!q)return '話は立ち消えになった';const g=Math.round(clamp(q.abil.comp*.9+q.abil.expr*.15+rnd(-5,8),20,98));c.u.gift={by:q.name,q:g};pairs([q,...members(c.u)]).forEach(([a,b])=>{if(a===q||b===q)addCompat(a,b,5,true)});return `次の新曲は${q.name}の作品（出来${g}前後）。先輩との相性も深まった`}},
    {label:'自分たちで作ると伝える',run:c=>{members(c.u).forEach(m=>addAbil(m,'comp',2));return '刺激を受けて、メンバーの作曲+2'}}]},
  {id:'mentor',name:'先輩の背中',t:'p',w:c=>c.p.age<=21&&S.people.some(q=>q!==c.p&&ov(q)>=70)?.8:0,text:c=>{const q=S.people.filter(q=>q!==c.p&&ov(q)>=70).sort((a,b)=>ov(b)-ov(a))[0];return `${c.p.name}が先輩の${q.name}のステージを袖から見て、目を輝かせていた。`},run:c=>{const a=mainAbil(c.p);addAbil(c.p,a,3);return `${AB_NAME[a]}+3`}},
];

// チャートの内部ポイント1あたりのダウンロード数
const DL_PER_PT=1000;

const KEY='musicAgencyMock_v4';

// ===== ゴール（事務所ランク・実績・殿堂） =====
// 事務所ランク：実績ポイントで上がり、下がらない。office はホームの建物の絵（images/office/、ランクごとに1枚）
const OFFICE_RANKS=[
  {name:'街角の小さな事務所',need:0,office:0},
  {name:'評判の事務所',need:30,office:1},
  {name:'注目のレーベル',need:120,office:2},
  {name:'人気レーベル',need:300,office:3},
  {name:'一流レーベル',need:600,office:4},
  {name:'名門レーベル',need:1200,office:5},
  {name:'伝説のレーベル',need:2400,office:6},
];
// 実績ポイント：累計10万DLごとに1、音楽賞、最大会場、夏フェスの最高枠、殿堂入り
const SCORE_AWARD={'年間大賞':50,'最優秀アーティスト賞':30,'最優秀新人賞':20,'最優秀作曲賞':20};
const SCORE_VENUE=[0,10,30,60];
const SCORE_FEST=[5,15,30];
const SCORE_HALL=100;
// 殿堂入り：組は年間大賞3回、人は年間大賞5回（組をまたいでもよい）
const HALL_UNIT=3,HALL_PERSON=5;
// 実績（称号）。check は毎季の終わりに判定する
const ourAwards=n=>S.awards.filter(a=>a.ours&&(!n||a.name===n));
const ourSongs=()=>S.songs.filter(s=>s.ours);
const ACHIEVEMENTS=[
  {id:'first_sign',name:'はじめの一人',desc:'最初の所属タレントを迎える',check:()=>S.people.length+S.alumni.length>0},
  {id:'debut',name:'デビュー',desc:'初めての新曲を発表する',check:()=>ourSongs().length>0},
  {id:'top10',name:'ランクイン',desc:'所属曲がチャートのトップ10に入る',check:()=>ourSongs().some(s=>s.peak&&s.peak<=10)},
  {id:'no1',name:'頂点',desc:'所属曲がチャート1位になる',check:()=>ourSongs().some(s=>s.peak===1)},
  {id:'first_award',name:'初受賞',desc:'音楽賞をどれか1つ受賞する',check:()=>ourAwards().length>0},
  {id:'grand',name:'年間大賞',desc:'年間大賞を受賞する',check:()=>ourAwards('年間大賞').length>0},
  {id:'artist',name:'今年の顔',desc:'最優秀アーティスト賞を受賞する',check:()=>ourAwards('最優秀アーティスト賞').length>0},
  {id:'rookie',name:'期待の新星',desc:'最優秀新人賞を受賞する',check:()=>ourAwards('最優秀新人賞').length>0},
  {id:'composer',name:'名作曲家',desc:'最優秀作曲賞を受賞する',check:()=>ourAwards('最優秀作曲賞').length>0},
  {id:'sweep',name:'四冠',desc:'同じ年に音楽賞4つをすべて受賞する',check:()=>{const by={};ourAwards().forEach(a=>by[a.year]=(by[a.year]||0)+1);return Object.values(by).some(n=>n>=4)}},
  {id:'threepeat',name:'三連覇',desc:'年間大賞を3年連続で受賞する',check:()=>{const ys=new Set(ourAwards('年間大賞').map(a=>a.year));return [...ys].some(y=>ys.has(y+1)&&ys.has(y+2))}},
  {id:'hall',name:'殿堂入り',desc:'初めて殿堂入りを出す',check:()=>S.hall.length>0},
  {id:'hall3',name:'名門の系譜',desc:'殿堂入りを3つ出す',check:()=>S.hall.length>=3},
  {id:'hallv',name:'ホール公演',desc:'ホールで公演する',check:()=>S.units.some(u=>u.bestVenue>=1)},
  {id:'arena',name:'アリーナ公演',desc:'アリーナで公演する',check:()=>S.units.some(u=>u.bestVenue>=2)},
  {id:'dome',name:'ドーム公演',desc:'ドームで公演する',check:()=>S.units.some(u=>u.bestVenue>=3)},
  {id:'headliner',name:'ヘッドライナー',desc:'夏フェスでヘッドライナーを務める',check:()=>S.units.some(u=>u.bestFest>=2)},
  {id:'hit',name:'ヒット曲',desc:'1曲で累計10万ダウンロード',check:()=>ourSongs().some(s=>s.dl>=100000)},
  {id:'classic',name:'不朽の名曲',desc:'1曲で累計30万ダウンロード',check:()=>ourSongs().some(s=>s.dl>=300000)},
  {id:'dl10m',name:'1000万ダウンロード',desc:'事務所の累計が1000万ダウンロード',check:()=>S.dl>=1e7},
  {id:'fans1m',name:'100万人の味方',desc:'1組のファンが100万人を超える',check:()=>S.units.some(u=>u.fans>=1e6)},
  {id:'full',name:'大所帯',desc:`所属が${ROSTER_MAX}人になる`,check:()=>S.people.length>=ROSTER_MAX},
  {id:'master',name:'極めし者',desc:'能力のどれかが100に届く人を育てる',check:()=>S.people.some(p=>AB.some(([a])=>p.abil[a]>=100))},
  {id:'awaken',name:'覚醒',desc:'ライブ本番で初めて覚醒する',check:()=>S.liveStats.awaken>0},
  {id:'legend',name:'伝説のステージ',desc:'ライブ本番で「伝説」の評価を取る',check:()=>S.liveStats.legend>0},
  {id:'awaken10',name:'覚醒の常連',desc:'ライブ本番で通算10回覚醒する',check:()=>S.liveStats.awaken>=10},
  {id:'combo',name:'息の合うふたり',desc:'ライブ本番で合体スキルを決める',check:()=>S.liveStats.combo>0},
  {id:'encore',name:'アンコール',desc:'ライブ本番でアンコールを勝ち取る',check:()=>S.liveStats.encore>0},
  {id:'breakout',name:'殻を破る',desc:'ライブ本番で、目立たなかった人が化ける',check:()=>S.liveStats.breakout>0},
  {id:'battle',name:'対バン初勝利',desc:'対バンかフェスでライバルに勝つ',check:()=>S.liveStats.battleWin>0},
  {id:'exwin',name:'巣立った者との再会',desc:'独立した元所属にライブで勝つ',check:()=>S.liveStats.exWin>0},
  {id:'yearend',name:'年の瀬の奇跡',desc:'年末の大一番で「大成功」以上',check:()=>S.liveStats.yearendGreat>0},
  {id:'dex30',name:'スキル収集家',desc:'見せ場スキル図鑑を30種埋める',check:()=>Object.keys(S.skillDex).length>=30},
  {id:'dex70',name:'見せ場の博士',desc:'見せ場スキル図鑑を70種埋める',check:()=>Object.keys(S.skillDex).length>=70},
  {id:'agencywin',name:'宿敵に勝つ',desc:'年間の事務所対決でライバル事務所に勝つ',check:()=>S.agencyRival.record.win>0},
  {id:'agency3',name:'三年連続の凱歌',desc:'事務所対決で3年連続勝つ',check:()=>S.agencyRival.streak>=3},
  {id:'agencyrank',name:'追い越した日',desc:'事務所ランクでライバル事務所を上回る',check:()=>S.rank>S.agencyRival.rank},
  {id:'longrun',name:'長い付き合い',desc:'同じ顔ぶれの組で5年活動する',check:()=>S.units.some(u=>u.active&&T()-u.formed>=20)},
];

// 自動送りの初期設定（S.auto に保存）
const AUTO_DEFAULT={rest:true,restAt:35,back:true,backAt:85,scout:'rotate',sign:true,signStars:4,wait:4,stopAward:true,stopLeave:true,stopGoal:true,stopLive:true,release:true,form:true,train:true};

// ===== ライブ本番（D48） =====
// 見せ場スキル（D52）：主な能力 × 型 × 3段階（70・85・95）。段階は強弱記号で mf → f → ff（D57）。型は人ごとに決まる「もう一つの持ち味」（主な能力以外の5つのどれか）
const SKILL_AT=[70,85,95];
const SKILL_TIER_NAME=['mf','f','ff'];
const SKILL_TIER_READ=['メゾフォルテ','フォルテ','フォルティッシモ'];
const SKILL_TREE={
  sing:{
    play:['響く弾き語り','魂の弾き語り','星を呼ぶ弾き語り'],
    comp:['即興スキャット','旋律の錬金術','天上のスキャット'],
    dance:['揺るがぬ歌声','踊りながらのロングトーン','歌姫の舞'],
    expr:['魂のハイトーン','天を衝くハイトーン','神域のハイトーン'],
    char:['シンガロング','会場を歌わせる声','五万人の大合唱'],
  },
  play:{
    sing:['歌うギター','泣きのギター','号泣のギターソロ'],
    comp:['即興セッション','炎の速弾き','伝説の速弾き'],
    dance:['跳ねるビート','鼓動を操るビート','大地を鳴らすリズム'],
    expr:['泣きのフレーズ','静寂のソロ','祈りのソロ'],
    char:['背面弾き','魅せる速弾き','雷鳴のギター'],
  },
  comp:{
    sing:['即興アレンジ','奇跡の即興曲','一夜限りの名曲'],
    play:['リフ一閃','名リフ','歴史に残るリフ'],
    dance:['ビートチェンジ','転調マジック','世界を塗り替える転調'],
    expr:['物語る編曲','涙腺崩壊アレンジ','永遠の一曲'],
    char:['仕掛けの一曲','どんでん返しの構成','魔法の構成'],
  },
  dance:{
    sing:['歌って踊れる','揺るがぬステップ','完全無欠のパフォーマンス'],
    play:['足で刻むビート','リズムブレイク','大地を揺らすステップ'],
    comp:['即興振付','振付の錬金術','伝説の振付'],
    expr:['しなやかな舞','心で踊る','魂の舞'],
    char:['ダンスブレイク','重力を忘れるダンスブレイク','神がかったダンスブレイク'],
  },
  expr:{
    sing:['涙のバラード','時を止めるバラード','永遠のバラード'],
    play:['語りかける演奏','心をほどく旋律','魂を震わす旋律'],
    comp:['物語のステージ','一幕の劇場','夢の劇場'],
    dance:['表情のダンス','感情の嵐','憑依のパフォーマンス'],
    char:['まなざしの魔法','視線で会場を掴む','一瞬で恋に落とす'],
  },
  char:{
    sing:['コール＆レスポンス','会場をひとつに','五万人の心をひとつに'],
    play:['客席ダイブ','熱狂の扇動','熱狂の支配者'],
    comp:['サプライズ発表','新曲初披露','歴史が動く夜'],
    dance:['煽りのステップ','会場を跳ねさせる','地鳴りのジャンプ'],
    expr:['心を掴むMC','涙のMC','伝説のMC'],
  },
};
// 個性の固有スキル：能力のどれかが TRAIT_SKILL_AT に届くと目覚める。どの見せ場でも覚醒できる
const TRAIT_SKILL_AT=80;
const TRAIT_SKILLS={genius:'天賦の閃き',hard:'積み重ねた一音',clutch:'土壇場の一撃',slump:'不調からの逆襲',mood:'笑顔の連鎖',late:'遅咲きの大輪',early:'早咲きの輝き',tough:'最後まで全力',sensitive:'震える心の歌',free:'予定外のアドリブ',
  perfect:'寸分違わぬ完璧',lone:'孤高のステージ',leader:'背中で魅せる',versatile:'七色のステージ',buzz:'バズる一瞬',rival:'負けられない夜',showoff:'主役は譲らない',natural:'天然の奇跡',voice:'天まで届く声',fragile:'痛みを越えて'};
const SKILL_TOTAL=6*5*3+Object.keys(TRAIT_SKILLS).length;
// 見せ場の場面と、結果の言葉（{n}は名前）
const LIVE_MOMENT={
  sing:{scene:'サビ前、{n}にスポットライト。ハイトーンの見せ場だ',ok:'{n}の声が会場の天井を突き抜けた！',ng:'{n}の高音がわずかにかすれた…'},
  play:{scene:'間奏、{n}のソロパートが回ってきた',ok:'{n}の指が走る！ 客席から歓声！',ng:'{n}の音がもつれた…'},
  comp:{scene:'{n}が目で合図した。ここでアレンジを変えられる',ok:'{n}の即興アレンジに客席がどよめく！',ng:'アレンジがかみ合わず、一瞬ばらついた…'},
  dance:{scene:'ビートが止まる。{n}のダンスブレイクだ',ok:'{n}のステップに会場が揺れる！',ng:'{n}の着地が少し乱れた…'},
  expr:{scene:'静かなパート。{n}の表現が試される',ok:'{n}の歌に、客席のあちこちで涙が光る',ng:'{n}の思いが、まだ届ききらない…'},
  char:{scene:'MC。{n}が客席に向かってマイクを掲げた',ok:'{n}の呼びかけに、会場がひとつの声で応える！',ng:'{n}の呼びかけに、反応はまばら…'},
};
// 指示：攻める（大きく狙う）・魅せる（確実に）・任せる（本人次第）
const LIVE_ORDERS=[['attack','攻める','大きく狙う。外すこともある'],['show','魅せる','確実に盛り上げる'],['trust','任せる','本人次第。個性が出る']];
// 盛り上がりの評価（下から順に判定）。mult はライブで増えるファンの倍率
const LIVE_GRADES=[
  {name:'不発',min:-999,mult:.7},{name:'まずまず',min:45,mult:1},{name:'成功',min:75,mult:1.25},
  {name:'大成功',min:100,mult:1.6},{name:'伝説',min:135,mult:2.2},
];

// ===== ライブ本番 段階2・3（D49） =====
// 合体スキル：相性◎で判明済みの2人が、それぞれ見せ場スキルを持つとき。キーは2人の能力（AB の並び順）
const COMBOS={'sing+sing':'ツインボーカル','sing+play':'魂の掛け合い','sing+comp':'その場で生まれる歌','sing+dance':'歌って踊るシンクロ','sing+expr':'響き合うハーモニー','sing+char':'ふたりのアンセム',
  'play+play':'ツインギターの応酬','play+comp':'即興セッション','play+dance':'リズムバトル','play+expr':'泣きのデュエット','play+char':'背中合わせのソロ',
  'comp+comp':'ふたりで描く新曲','comp+dance':'ビートの魔法','comp+expr':'物語る一曲','comp+char':'仕掛けられた大合唱',
  'dance+dance':'シンクロダンス','dance+expr':'ふたりの群舞','dance+char':'煽りのダンスバトル','expr+expr':'涙のハーモニー','expr+char':'心を揺らす語り','char+char':'ツートップ'};
// ハプニング（1回のライブで1つまで、2曲目のあとに起きることがある）。{n}は対象の人
const LIVE_HAPPEN=[
  {id:'trouble',w:3,text:'{n}の機材から音が消えた！',choices:[['アカペラで乗り切る','声と呼びかけで勝負。外すと冷える'],['いったん立て直す','確実だが流れが止まる']]},
  {id:'rain',w:3,fest:true,text:'雨が降り出した。客席にレインコートが広がっていく',choices:[['ずぶ濡れで続ける','タフ・本番に強い人がいると成功しやすい'],['屋根の下へ促す','安全だが少し冷める']]},
  {id:'singalong',w:2,minMeter:50,text:'サビで、客席から自然に大合唱が起きた！'},
  {id:'breakout',w:3,group:true,text:'まだ目立たない{n}に、たまたまスポットが当たった',choices:[['信じて任せる','化ければ「覚醒」。失敗もある'],['無難にこなさせる','少しだけ盛り上がる']]},
];
const LIVE_KIND_NAME={venue:'初公演',fest:'夏フェス',yearend:'年末の大一番',battle:'対バン'};

// ===== ライバル事務所（D53） =====
const AGENCY_NAMES=['ノクターン・レコーズ','スターライト芸能','アオゾラ音楽事務所','ミッドナイト・ミュージック','銀河レーベル','ブルーアワー・エンタテインメント','ひかり座ミュージック','クレセント音楽事務所'];
// 所属アーティストは2〜4組。毎年春に、空きがあれば半々で新人がデビューし、4組を超えたら一番弱い組が活動を終える
const AGENCY_UNITS=[2,4];
