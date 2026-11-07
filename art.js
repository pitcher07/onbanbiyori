// 表示用の素材。ゲーム内乱数や保存形式は使用しない。
const art=(path,cls='',alt='')=>`<img src="images/${path}.png" class="pixel ${cls}" alt="${alt}">`;
const icon=(group,key)=>art('icons/'+group+'/'+key,'ico');
// 画面の小さな記号（D58）：絵文字の代わりのドット絵。12×12のマス目を文字で描き、文字色で塗る
const UI_ICONS={
  gear:['.....##.....','..#.####.#..','..########..','.####..####.','..##....##..','###......###','###......###','..##....##..','.####..####.','..########..','..#.####.#..','.....##.....'],
  ff:['............','#.....#.....','##....##....','###...###...','####..####..','#####.#####.','#####.#####.','####..####..','###...###...','##....##....','#.....#.....','............'],
  stop:['............','............','..########..','..########..','..########..','..########..','..########..','..########..','..########..','..########..','............','............'],
  help:['...######...','..##....##..','..##....##..','........##..','.......##...','.....###....','.....##.....','.....##.....','............','.....##.....','.....##.....','............'],
  bulb:['....####....','...#....#...','..#......#..','..#......#..','..#..##..#..','...#.##.#...','....#..#....','....####....','....####....','.....##.....','............','............'],
  crown:['............','#....##....#','##...##...##','###.####.###','############','############','.##########.','.##########.','............','.##########.','............','............'],
  tired:['............','.....##.....','....####....','....#..#....','...##..##...','...##..##...','..###..###..','..########..','.####..####.','.##########.','############','............'],
  disk:['##########..','#..######.#.','#..######..#','#..######..#','#..........#','#..........#','#.########.#','#.#......#.#','#.#......#.#','#.#......#.#','#.#......#.#','############'],
  dice:['############','#..........#','#.##....##.#','#.##....##.#','#..........#','#....##....#','#....##....#','#..........#','#.##....##.#','#.##....##.#','#..........#','############'],
};
function uiIcon(name,cls=''){
  let r='';UI_ICONS[name].forEach((row,y)=>{for(const m of row.matchAll(/#+/g))r+=`<rect x="${m.index}" y="${y}" width="${m[0].length}" height="1"/>`});
  return `<svg class="ui-ic ${cls}" viewBox="0 0 12 12" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">${r}</svg>`;
}
// 記録の文に入っている絵文字（🏆・👑）を、ドット絵に置き換えて表示する（保存データはそのまま）
const pix=s=>esc(s).replace(/ ?🏆/g,' '+art('live/trophy','ico trophy','受賞')).replace(/👑 ?/g,uiIcon('crown','gold')+' ');
// 顔パーツの選び方：人物のIDと名前から毎回同じ結果になる。[部位, 列数, 色の行, 形の列]
function faceParts(p){
  let seed=2166136261;
  for(const ch of p.id+'|'+p.name)seed=Math.imul(seed^ch.charCodeAt(0),16777619);
  const pick=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n)};
  // 肌の色は5段階（上ほど明るい）。日本の事務所なので明るめが多くなるよう重みを付ける
  const hair=pick(8),sk=pick(100),skin=sk<42?0:sk<78?1:sk<93?2:sk<98?3:4,coat=pick(6);
  const layers=[['back',10,hair],['skin',3,skin],['coat',10,coat],['eyes',12,0],['brow',6,0],['mouth',8,0],['front',12,hair],['extra',9,0]].map(([k,n,c])=>[k,n,c,pick(n)]);
  const swatch=['#eed7b8','#c4dbcb','#dfcce0','#f0c9b8','#c6d9e7'][pick(5)];
  return {layers,skin,coat,swatch,blink:-(seed%6000)/1000};
}
// 64ピクセル版（faces64）は目が13列（12列目が覚醒の目）、口が9列（8列目が叫ぶ口）
const FACE64_COLS={eyes:13,mouth:9};
function faceCell(key,count,color,x,size,hi,extra=''){
  const cols=hi?FACE64_COLS[key]||count:count;
  return `<i class="f-${key}" style="background-image:url('images/${hi?'faces64':'faces'}/${key}.png');background-position:-${x*size}px -${color*size}px;background-size:${cols*size}px auto${extra}"></i>`;
}
// mood：happy（笑顔）・tired（疲れた目）・awaken（覚醒の目と叫ぶ口。64ピクセル版のみ）。hi で64ピクセル版を使う
function portrait(p,size=48,mood='',hi=false){
  const f=faceParts(p);
  const cells=f.layers.map(([key,count,color,x])=>{
    if(key==='mouth'&&mood==='happy')x=3;
    if(key==='eyes'&&mood==='tired')x=7;
    if(hi&&mood==='awaken'){if(key==='eyes')x=12;if(key==='mouth')x=8}
    return faceCell(key,count,color,x,size,hi);
  }).join('');
  return `<span class="portrait${mood==='tired'?' tired':''}" aria-hidden="true" style="--size:${size}px;--swatch:${f.swatch};--blink:${f.blink}s">${cells}</span>`;
}
// ステージの全身像（32×64を scale 倍）。体は images/live/body_*.png、頭は顔パーツから服を除いたもの
// pose：0立ち 1歌唱 2演奏 3作曲 4ダンス 5表現 6カリスマ。2コマは .f1 クラスで切り替える
const POSE_OF={sing:1,play:2,comp:3,dance:4,expr:5,char:6};
function figure(p,s=2,pose=0){
  const f=faceParts(p),W=32*s;
  const coatX=f.layers.find(l=>l[0]==='coat')[3];
  const row={skin:f.skin,outfit:6*(coatX%3)+f.coat,item:0};
  const body=k=>{const x0=-(pose*2)*W,x1=-(pose*2+1)*W;
    return `<i class="b-${k}" style="top:${24*s}px;height:${40*s}px;background-image:url('images/live/body_${k}.png');background-size:${448*s}px auto;--x0:${x0}px;--x1:${x1}px;--y:${-row[k]*40*s}px"></i>`};
  const head=f.layers.filter(l=>l[0]!=='coat').map(([key,count,color,x])=>faceCell(key,count,color,x,W,false,';height:'+W+'px')).join('');
  return `<span class="fig" aria-hidden="true" style="width:${W}px;height:${64*s}px">${body('skin')}${body('outfit')}<span class="fig-head" style="--blink:${f.blink}s">${head}</span>${body('item')}</span>`;
}
function awardIcon(name){
  const i=['年間大賞','最優秀アーティスト賞','最優秀新人賞','最優秀作曲賞'].findIndex(n=>name.includes(n));
  return icon('award',Math.max(0,i));
}
function gigSection(lines){
  if(!lines.length)return '';
  return '<h3>ライブ・フェス</h3>'+lines.map(line=>{
    const fi=FEST.findIndex(f=>line.includes(f.name+'に出演'));
    const vi=VENUES.findIndex(v=>line.includes(v.name+'公演'));
    const key=fi>=0?'f'+fi:vi>=0?'v'+vi:null;
    return `<div class="gig">${key?art('venues/'+key):''}<span>${pix(line)}</span></div>`;
  }).join('');
}
const screenNames={home:'事務所だより',people:'所属名鑑',training:'練習スタジオ',units:'アーティスト編成',scout:'才能を発掘',chart:'音楽チャート',history:'事務所の年鑑'};
const screenNotes={home:'今季の活動を見渡そう。',people:'一人ひとりの個性と成長の記録。',training:'今日も、それぞれの部屋から音がする。',units:'声と個性を組み合わせて、新しい音を。',scout:'まだ知られていない、あの人の音を探して。',chart:'この季節、街でいちばん聴かれた曲。',history:'出会いも、晴れ舞台も、この一冊に。'};
function pageHeading(k){

  return `<section class="page-head${k==='home'?' no-thumb':''}"><div><h2>${screenNames[k]}</h2><p>${screenNotes[k]}</p></div>${k==='home'?'':art('pages/'+k,'office-thumb')}</section>`;
}
const eventImages={
  cold:'events/tea',injury:'events/kit',hayfever:'events/tea',heat:'events/tea',
  idea:'events/idea',graduate:'events/gift',art:'events/idea',letter:'events/letter',bday:'events/gift',
  buzz:'events/social',homesick:'events/letter',stimulus:'events/record',retire_force:'events/record',
  tv:'events/camera',magazine:'events/camera',typhoon:'events/rain',chemistry:'events/studio',holiday:'rooms/rest',
  cm:'events/camera',request:'events/idea',study:'events/trip',producer:'events/studio',scandal:'events/camera',
  flame:'events/social',throat:'events/tea',streetfind:'scout/street',camp:'events/trip',poach:'events/contract',
  retire:'events/record',indep:'events/contract',discord:'events/chairs',split:'events/chairs',
  direction:'events/chairs',solodream:'events/letter',hiatus:'rooms/rest',cover:'events/social',collab:'events/studio',anniv:'events/gift',mentor:'events/record',senpai:'events/studio',
  legendlesson:'events/record',legendgift:'events/studio',legendcheer:'events/letter'
};
function eventSection(lines){
  if(!lines.length)return '';
  return '<h3>出来事</h3>'+lines.map(line=>{
    const ev=EVENTS.find(e=>line.startsWith('【'+e.name+'】'));
    return `<div class="gig">${ev?art(eventImages[ev.id]):''}<span>${pix(line)}</span></div>`;
  }).join('');
}
const compatMark=v=>{
  const mark=compatLabel(v)[1], key={'◎':'best','○':'good','△':'neutral','▲':'poor','×':'bad'}[mark];
  return key?art('icons/mark/'+key,'ico',mark):esc(mark);
};

// ===== ドット絵の動き（D67）：今ある素材（全身の立ち姿・事務所の建物）を動かす =====
// 事務所の前の通り：所属の人が行き来したり、事務所に入っていく。季節で空と天気が変わる
function officeStreet(){
  const office=OFFICE_RANKS[S.rank||0].office;
  // 毎季入れ替わるが、同じ季節のうちは同じ顔ぶれ（再描画で入れ替わらないように）
  const ps=[...S.people].sort((a,b)=>(a.id*31+T()*7)%17-(b.id*31+T()*7)%17).slice(0,4);
  const walkers=ps.map((p,i)=>`<span class="walker ${['w-right','w-left','w-in','w-out'][i]}" style="--d:${-i*2.7}s;--t:${12+i*1.5}s;--fd:${-(p.id%5)*.13}s">${figure(p,1,0)}</span>`).join('');
  return `<div class="street sky${S.season}" aria-hidden="true"><div class="weather w${S.season}">${'<i></i>'.repeat(14)}</div>${art('office/'+office,'street-office')}<div class="street-road"></div>${walkers}</div>`;
}
// トレーニング部屋：その部屋の練習をする全身の姿（休養は座って休む）
const ROOM_POSE={voice:1,play:2,comp:3,dance:4,stage:6,rest:0};
function roomPose(p,k){
  if(k==='balance')return [1,2,4,5][p.id%4];
  return ROOM_POSE[k]??0;
}

// ===== 新曲のジャケット（D67） =====
// 曲名とアーティストから決まるドットの絵柄。素材を使わず12×12のマスで描く
const JACKET_PALS=[['#1c4c49','#f4bd69','#fff0ce','#d3674d'],['#243444','#77a19a','#faf0d2','#f2b754'],['#3b3547','#d3674d','#edcc98','#acccb1'],['#923f43','#f2b754','#fff4d9','#2e4e4f'],['#2e4e4f','#acccb1','#fff0ce','#b94e39'],['#756886','#ffc463','#faf0d2','#243444'],['#fff0ce','#1c4c49','#d3674d','#f4bd69'],['#edcc98','#3b3547','#b94e39','#fff4d9']];
function jacket(s,size=22){
  let seed=2166136261;
  for(const ch of s.title+'|'+s.artist)seed=Math.imul(seed^ch.charCodeAt(0),16777619);
  const r=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n)};
  const [bg,a,b,c]=JACKET_PALS[r(JACKET_PALS.length)];
  let px='';const dot=(x,y,col)=>{px+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${col}"/>`};
  const kind=r(5);
  if(kind===0){ // 左右対称のモザイク
    for(let y=1;y<11;y++)for(let x=1;x<6;x++){const v=r(6);if(v<3){const col=[a,b,c][v];dot(x,y,col);dot(11-x,y,col)}}
  }else if(kind===1){ // レコード盤
    const o=r(3)-1;
    for(let y=0;y<12;y++)for(let x=0;x<12;x++){const d=Math.hypot(x-5.5-o,y-5.5);if(d<5.3)dot(x,y,d<1.2?b:d<2.3?c:Math.round(d*1.6)%2?'#161616':'#2a2a2a')}
  }else if(kind===2){ // 太陽と地平線
    const sx=2+r(6);
    for(let y=2;y<7;y++)for(let x=sx;x<sx+4;x++)if(!((y===2||y===6)&&(x===sx||x===sx+3)))dot(x,y,c);
    for(let y=7;y<12;y++)for(let x=0;x<12;x++)if(y>7||x%2)dot(x,y,y>9?b:a);
  }else if(kind===3){ // 斜めの帯と星
    const w=r(2)+2;
    for(let y=0;y<12;y++)for(let x=0;x<12;x++)if((x+y)%6<w)dot(x,y,a);
    for(let i=0;i<5;i++)dot(r(12),r(12),c);
  }else{ // 大きな頭文字ふうの図形
    const g=[[0,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]][r(1)];
    const shapes=[[[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0]],[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],[[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],[[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]],g];
    const sh=shapes[r(shapes.length)];
    for(let y=0;y<5;y++)for(let x=0;x<5;x++)if(sh[y][x]){dot(1+x*2,1+y*2,a);dot(2+x*2,1+y*2,a);dot(1+x*2,2+y*2,b);dot(2+x*2,2+y*2,a)}
  }
  return `<svg class="jacket" viewBox="0 0 12 12" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true"><rect width="12" height="12" fill="${bg}"/>${px}<rect width="12" height="1" fill="#ffffff26"/><rect y="11" width="12" height="1" fill="#00000026"/></svg>`;
}

// ===== 能力の印と1枚絵（D71） =====
const illust=n=>`images/illust/${n}.jpg`;
// 能力の印：丸い枠を能力の色で。印の画像が使える能力は画像、ほかはドット絵のアイコン
function abilBadge(k,size=56){
  const inner=EMBLEM_PNG.includes(k)?`<img src="images/illust/emblem_${k}.png" alt="">`:k==='combo'?icon('mark','best'):k==='trait'?icon('mark','star'):icon('ability',k);
  return `<span class="emb${EMBLEM_PNG.includes(k)?' png':''}" style="--ac:${ABIL_COLOR[k]};--es:${size}px" aria-hidden="true">${inner}</span>`;
}
