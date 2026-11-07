// ゲームロジック（状態・生成・評価・相性・育成・楽曲・ライブ・チャート・音楽賞・イベント・在籍・ターン進行・操作）
// ===== ユーティリティ =====
const rnd=(a,b)=>a+Math.random()*(b-a);
const ri=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rank=v=>RANKS.find(([,min])=>v>=min)[0];
const fmt=n=>(n>=0?'+':'−')+Math.abs(Math.round(n)).toLocaleString();

let S=null,tab='home',F=null;
const T=()=>(S.year-1)*4+S.season;
const dateStr=t=>`${Math.floor(t/4)+1}年目 ${SEASONS[((t%4)+4)%4]}`;
const nid=()=>S.nextId++;
const person=id=>S.people.find(p=>p.id===id)||S.alumni.find(p=>p.id===id);
const unit=id=>S.units.find(u=>u.id===id);
const members=u=>u.members.map(person).filter(Boolean);
const names=ids=>ids.map(i=>sn(person(i))).join('、');
// 画面と記録の人名は名字だけ（フルネームは所属タブと名鑑）。所属内・候補に同じ名字がいればフルネーム
const lastName=n=>String(n).split(' ')[0];
const sn=p=>{const s=lastName(p.name);return [...S.people,...S.candidates].some(q=>q.id!==p.id&&lastName(q.name)===s)?p.name:s};
const hist=text=>S.history.push({t:T(),text});
const has=(p,t)=>p.traits.includes(t);

// slot：いま遊んでいるセーブ枠。'main' は本編、'scenario' はシナリオ（D64）
let slot='main';
const slotKey=()=>slot==='scenario'?SC_KEY:KEY;
function save(){try{localStorage.setItem(slotKey(),JSON.stringify(S))}catch(e){}}
function load(){try{const s=localStorage.getItem(slotKey());return s?JSON.parse(s):null}catch(e){return null}}
// セーブの書き出し・読み込み（D62）。書き出しは目印つきのJSON、読み込みは目印なしの中身だけでも受けつける
const SAVE_TAG='onbanbiyori';
const exportText=()=>JSON.stringify({game:SAVE_TAG,v:1,at:new Date().toISOString(),save:S});
function parseSave(txt){
  let o;try{o=JSON.parse(String(txt).trim())}catch(e){return null}
  if(o&&o.game===SAVE_TAG)o=o.save;
  return o&&typeof o==='object'&&Array.isArray(o.people)&&Array.isArray(o.units)&&typeof o.year==='number'&&typeof o.agency==='string'?o:null;
}

// ===== 人物の評価 =====
// 総合値：得意な上位3能力の平均を7割、全能力の平均を3割
function ov(p){const v=AB.map(([a])=>p.abil[a]).sort((x,y)=>y-x);return Math.round((v[0]+v[1]+v[2])/3*.7+v.reduce((s,x)=>s+x,0)/6*.3)}
const topAbil=p=>AB.map(x=>x[0]).sort((x,y)=>p.abil[y]-p.abil[x])[0];
function mainAbil(p){const w=POLICIES[p.policy].w;return p.policy==='balance'||p.policy==='rest'?topAbil(p):Object.keys(w).sort((x,y)=>w[y]-w[x])[0]}
// 本人の能力だけで見た、向いている活動形態の上位2つ
function fitTypes(p){return Object.values(TYPES).map(t=>[t.name,Object.entries(t.w).reduce((s,[a,w])=>s+w*p.abil[a],0)]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0])}
const ageF=p=>p.age<20?1.15:p.age<26?1:p.age<31?.85:p.age<36?.7:.5;
function makeReview(p,scout){
  const o=ov(p);const ab=AB.map(x=>x[0]).sort((x,y)=>p.abil[y]-p.abil[x]);
  const lv=v=>v>=75?2:v>=50?1:0;
  const s=[pick(REV_TOP[ab[0]][lv(p.abil[ab[0]])])];
  if(p.abil[ab[1]]>=45)s.push(pick(REV_SECOND).replace('{a}',AB_NAME[ab[1]]));
  if(p.traits.length)s.push(REV_TRAIT[pick(p.traits)]);
  if(p.abil[ab[5]]<35&&Math.random()<.6)s.push(pick(REV_WEAK).replace('{a}',AB_NAME[ab[5]]));
  if(!scout&&p.prevOv!=null){const d=o-p.prevOv;if(d>=3)s.push(pick(REV_UP));else if(d<=-2)s.push(pick(REV_DOWN))}
  if(p.age>=32)s.push(pick(REV_VET));
  if(Math.max(...AB.map(([a])=>p.pot[a]))-o>=30)s.push(pick(REV_POT));
  s.push(pick(REV_END[o<35?0:o<50?1:o<65?2:o<80?3:4]));
  return s.join('。')+'。';
}

// ===== 生成 =====
function genName(){
  const used=new Set([...S.people,...S.alumni,...S.candidates].map(p=>p.name));
  const usedSur=new Set([...S.people,...S.candidates].map(p=>lastName(p.name)));
  let n;for(let i=0;i<30;i++){n=pick(SUR)+' '+pick(GIV);if(!used.has(n)&&!usedSur.has(lastName(n)))break}
  return n;
}
function genPerson(bias={},src='',ages=AUDITION_AGES){
  const rule=scRule();if(rule&&rule.maxAge)ages=[Math.min(ages[0],rule.maxAge-3),Math.min(ages[1],rule.maxAge)];
  const talent=rnd(40,78);const age=ri(ages[0],ages[1]);
  const p={id:nid(),name:genName(),age,abil:{},pot:{},train:{},traits:[],policy:'balance',cond:80,unitId:null,joined:null,fav:false,src,awards:[],writer:pick(WRITERS)};
  for(const [a] of AB){
    const b=bias[a]||0;
    p.pot[a]=Math.round(clamp(talent+rnd(-22,18)+b,25,99));
    p.abil[a]=clamp(rnd(10,28)+b*.8+(p.pot[a]-50)*.22+(age-18)*.5,3,60);
    p.train[a]=0;
  }
  const keys=Object.keys(TRAITS);
  p.traits.push(pick(keys));
  if(Math.random()<.35){
    const t2=pick(keys);
    if(t2!==p.traits[0]&&!TRAIT_CONFLICT.some(([x,y])=>(x===t2&&y===p.traits[0])||(y===t2&&x===p.traits[0])))p.traits.push(t2);
  }
  const avg=AB.reduce((s,[a])=>s+p.pot[a],0)/6;
  p.stars=clamp(Math.round(avg/18+rnd(-.7,.7)),1,5);
  p.hint=AB.map(x=>x[0]).sort((x,y)=>p.pot[y]-p.pot[x])[0];
  p.review=makeReview(p,true);
  p.dream=pickDream(p);
  return p;
}
// 夢（D68）：いま所属している組と、前にいた組
const unitsOf=p=>S.units.filter(u=>u.members.includes(p.id)||(u.lastMembers||[]).includes(p.name));
// まだ叶っていない夢から選ぶ。最初は小さめ〜中くらい、次は今と同じか大きいもの
function pickDream(p,min=1){
  const done=(p.dreamsDone||[]).map(d=>d.id);
  let ks=Object.keys(DREAMS).filter(k=>!done.includes(k)&&k!==p.dream&&DREAMS[k].tier>=min&&DREAMS[k].tier<=min+1&&!(S&&p.joined!=null&&DREAMS[k].check(p)));
  if(!ks.length)ks=Object.keys(DREAMS).filter(k=>!done.includes(k)&&k!==p.dream&&DREAMS[k].tier>=min&&!(S&&p.joined!=null&&DREAMS[k].check(p)));
  return ks.length?pick(ks):null;
}
function checkDreams(rep){
  rep.goal=rep.goal||[];
  S.dreamLog=S.dreamLog||[];
  for(const p of S.people){
    if(!p.dream||!DREAMS[p.dream]||!DREAMS[p.dream].check(p))continue;
    const d=DREAMS[p.dream];
    (p.dreamsDone=p.dreamsDone||[]).push({id:p.dream,t:T()});
    for(const [a] of AB)p.pot[a]=Math.min(99,p.pot[a]+DREAM_POT);
    p.cond=100;
    S.dreamLog.push({t:T(),pid:p.id,name:p.name,dream:p.dream});
    hist(`🌟 ${sn(p)}の夢「${d.name}」が叶った`);
    rep.goal.push({kind:'dream',text:`${sn(p)}の夢「${d.name}」が叶った（素質がそれぞれ+${DREAM_POT}、調子が全回復）`,pid:p.id});
    p.dream=pickDream(p,d.tier);
  }
}
function genTitle(){
  const r=Math.random();
  if(r<.18)return pick(SONG_JA_A)+pick(SONG_JA_B);
  if(r<.30)return pick(SONG_WORD);
  if(r<.44)return pick(SONG_PHRASE);
  if(r<.60)return pick(EN_ADJ)+' '+pick(EN_NOUN);
  if(r<.72)return pick(EN_PHRASE);
  if(r<.78)return `${pick(EN_NOUN)} of the ${pick(EN_NOUN)}`;
  if(r<.86)return pick(SONG_WORD)+'の'+pick(SONG_JA_B);
  if(r<.93)return pick(SONG_KATA);
  return `${pick(SONG_WORD)} (${pick(EN_ADJ)} ${pick(EN_NOUN)})`;
}
function genUnitName(){
  const r=Math.random();
  if(r<.18)return pick(UN_KATA_A)+pick(UN_KATA_B);
  if(r<.34)return 'The '+pick(EN_ADJ)+' '+pick(UN_EN_B);
  if(r<.48)return pick(UN_WORD)+(Math.random()<.4?' '+pick(['X','7','∞','Ⅱ','99','+']):'');
  if(r<.64)return pick(UN_JA_A)+pick(UN_JA_B);
  if(r<.80)return pick(UN_HIRA);
  return pick(EN_ADJ)+' '+pick(UN_EN_B);
}
function genSoloName(p,type){
  const given=p?p.name.split(' ')[1]:pick(GIV);
  if(type==='rapper')return pick(['','MC ','Lil ','Young ',''])+pick([...STAGE,given]);
  if(type==='dj')return Math.random()<.6?'DJ '+pick(STAGE):pick(STAGE)+pick([' Beats',' Lab','',' Sound']);
  const r=Math.random();
  if(r<.25&&p)return p.name;
  if(r<.45)return given;
  if(r<.8)return pick(STAGE);
  return (pick(STAGE)+' '+pick(['','& The '+pick(UN_EN_B)])).trim();
}
function suggest(){
  const solo=TYPES[F.type].max===1;
  const p=solo&&F.members.size?person([...F.members][0]):null;
  F.sugg=[...new Set(Array.from({length:6},()=>(solo?genSoloName(p,F.type):genUnitName()).trim()))];
}
// ライバルはそれぞれ実力（power）を持ち、毎年成長する。独立した元所属（ex）も同じ扱い
const newRival=(name,power,ex)=>({name,power,ex:!!ex});
function rivalSong(t=T()){
  const r=pick(S.rivals);
  let q=r.power*rnd(.8,1.1);
  if(Math.random()<.1)q+=12;
  return {id:nid(),title:genTitle(),artist:r.name,ex:r.ex,q:Math.round(clamp(q,15,98)),t,ours:false,total:0,peak:null};
}
// 毎年春：既存ライバルの成長、新人の登場、弱い組の引退
function updateRivals(){
  S.rivals.forEach(r=>{if(!r.ex)r.power=Math.min(95,r.power+rnd(-.5,3.5))});
  const n=ri(1,2);for(let i=0;i<n;i++)S.rivals.push(newRival(genUnitName(),rnd(35,62)+Math.min(S.year,15)));
  while(S.rivals.length>14){const w=S.rivals.filter(r=>!r.ex&&!r.agency).sort((a,b)=>a.power-b.power)[0];if(!w)break;S.rivals=S.rivals.filter(r=>r!==w)}
}
function genAudition(n=5){const rule=scRule();if(rule&&rule.audition!=null)n=rule.audition;for(let i=0;i<n;i++)S.candidates.push(genPerson({},'オーディション'))}

function newGame(agency){
  S={ver:3,agency,year:1,season:0,nextId:1,people:[],alumni:[],units:[],songs:[],candidates:[],scouted:false,history:[],chart:[],yearPts:{},annual:[],awards:[],compat:{},known:{},rivals:RIVALS.map(name=>newRival(name,rnd(30,58))),pending:[],popup:false,report:null,dl:0};
  for(let t=-3;t<0;t++)for(let i=0;i<5;i++)S.songs.push(rivalSong(t));
  updateChart(null);
  S.yearPts={};
  hist(`「${agency}」設立`);
  genAudition(6);
  save();
}

// ===== 相性 =====
// 相性は −60〜+60 の隠れた値。同じ組で活動するか、同じトレーニングをすると判明する
const ckey=(a,b)=>a.id<b.id?`${a.id}-${b.id}`:`${b.id}-${a.id}`;
function compat(a,b){
  const k=ckey(a,b);
  if(S.compat[k]==null){
    let v=rnd(-30,30);
    for(const x of [a,b])x.traits.forEach(t=>v+=TRAITS[t].compat||0);
    if(has(a,'showoff')&&has(b,'showoff'))v-=20;
    S.compat[k]=Math.round(clamp(v,-60,60));
  }
  return S.compat[k];
}
function addCompat(a,b,d,reveal){compat(a,b);const k=ckey(a,b);S.compat[k]=clamp(S.compat[k]+d,-60,60);if(reveal)S.known[k]=true}
const isKnown=(a,b)=>!!S.known[ckey(a,b)];
const COMPAT_LABEL=[[25,'◎','抜群'],[8,'○','良い'],[-7,'△','ふつう'],[-24,'▲','悪い'],[-999,'×','最悪']];
const compatLabel=v=>COMPAT_LABEL.find(([m])=>v>=m);
function pairs(ms){const r=[];for(let i=0;i<ms.length;i++)for(let j=i+1;j<ms.length;j++)r.push([ms[i],ms[j]]);return r}
function unitCompat(u){
  const ps=pairs(members(u));
  if(!ps.length)return {avg:0,pairs:[],known:true};
  const vs=ps.map(([a,b])=>compat(a,b));
  return {avg:vs.reduce((s,x)=>s+x,0)/vs.length,pairs:ps.map(([a,b],i)=>[a,b,vs[i]]),known:ps.every(([a,b])=>isKnown(a,b))};
}
const worstPair=u=>unitCompat(u).pairs.sort((x,y)=>x[2]-y[2])[0];
function worstMember(u){const ms=members(u);return ms.map(m=>[m,ms.reduce((s,x)=>x===m?s:s+compat(m,x),0)]).sort((a,b)=>a[1]-b[1])[0][0]}
function revealCompat(){
  S.units.filter(u=>u.active).forEach(u=>pairs(members(u)).forEach(([a,b])=>S.known[ckey(a,b)]=true));
  pairs(S.people.filter(p=>p.policy!=='rest')).forEach(([a,b])=>{if(a.policy===b.policy)S.known[ckey(a,b)]=true});
}

// ===== 能力・調子・ファンの増減 =====
function addAbil(p,a,d){
  const b=p.abil[a];p.abil[a]=clamp(b+d,1,100);
  for(const m of [60,80,90])if(b<m&&p.abil[a]>=m)hist(`${p.fav?'★':''}${sn(p)}の${AB_NAME[a]}が${m}に到達`);
}
const addCond=(p,d)=>p.cond=clamp(p.cond+d,10,100);
const buzzF=u=>members(u).some(m=>has(m,'buzz'))?1.25:1;
// ratio：現在のファン数に対する割合。増えるときは最低 min 人、話題性の補正あり
function addFans(u,ratio,min){
  let d=u.fans*ratio;
  if(ratio>0)d=Math.max(min,d)*buzzF(u);
  d=Math.round(d);u.fans=Math.max(0,u.fans+d);
  return d;
}

// ===== 育成 =====
function growPerson(p,rep){
  const pol=POLICIES[p.policy];
  const u=p.unitId?unit(p.unitId):null;
  const tenure=T()-p.joined;
  const condF=.5+p.cond/200;
  const condBefore=Math.round(p.cond);
  const gains=[],nat=[];let wall=false;
  const slump=p.policy!=='rest'&&has(p,'slump')&&Math.random()<.15;
  // 相性の良い仲間と同じトレーニングなら切磋琢磨
  const partner=p.policy!=='rest'&&S.people.find(q=>q!==p&&q.policy===p.policy&&compat(p,q)>=(has(p,'rival')?0:20));
  const track=(a,d,list)=>{const b=Math.floor(p.abil[a]);addAbil(p,a,d);const x=Math.floor(p.abil[a])-b;if(x)list.push(`${AB_NAME[a]}${x>0?'+':''}${x}`)};
  // トレーニングによる成長
  if(!slump){
    for(const [a] of AB){
      let w=pol.w[a]||0;if(!w)continue;
      if(p.policy==='stage'&&!u)w*=.5;
      let g=5*w*(.6+p.pot[a]/150)*condF*ageF(p)*rnd(.7,1.3);
      if(has(p,'genius'))g*=rnd(.9,1.7);
      if(has(p,'hard')&&p.policy!=='balance')g*=1.2;
      if(has(p,'late'))g*=tenure<8?.8:1.35;
      if(has(p,'early'))g*=tenure<8?1.3:.8;
      if(has(p,'free'))g*=.85;
      if(has(p,'versatile')&&p.policy==='balance')g*=1.4;
      if(has(p,'rival'))g*=1.1;
      if(has(p,'sensitive')&&a==='expr')g*=1.3;
      if(has(p,'showoff')&&a==='char')g*=1.3;
      if(has(p,'voice')&&a==='sing')g*=1.25;
      if(p.fav)g*=1.15;
      if(partner)g*=1.15;
      if(p.abil[a]>=p.pot[a]){g*=has(p,'hard')?.45:.2;wall=true}
      track(a,g,gains);
      p.train[a]+=w>=.9?1:w>=.4?.4:.2;
    }
  }
  // 素質による自然な伸び・衰え
  for(const [a] of AB){
    const trained=!slump&&(pol.w[a]||0)>0;
    let up=.04+Math.max(0,p.pot[a]-p.abil[a])/300;
    if(has(p,'genius'))up*=1.6;
    if(has(p,'late')&&tenure>=8)up*=1.5;
    if(has(p,'free'))up*=1.6;
    if(has(p,'voice')&&a==='sing')up*=1.25;
    if(p.fav)up*=1.3;
    if(p.age<20)up*=1.2;
    if(p.age>30)up*=.6;
    let down=(has(p,'slump')?.12:.07)+Math.max(0,p.age-30)*.015;
    if(trained)down=p.age>=33?down/2:0;
    if(p.abil[a]<p.pot[a]&&Math.random()<up)track(a,rnd(.8,2.2),nat);
    else if(p.abil[a]>35&&Math.random()<down)track(a,-rnd(.8,2.2),nat);
  }
  // 調子
  let cost=pol.cost;
  if(cost>0){
    if(u&&members(u).some(m=>m!==p&&has(m,'mood')))cost-=3;
    if(p.fav)cost-=2;
    if(has(p,'tough'))cost-=4;
    if(has(p,'sensitive'))cost+=3;
    if(has(p,'perfect'))cost+=2;
  }
  if(u&&u.members.length>1&&unitCompat(u).avg<=-15)cost+=4;
  addCond(p,-cost);
  const natStr=nat.length?` ／ 自然：${nat.join(' ')}`:'';
  const partnerStr=partner&&!slump?`（${sn(partner)}と切磋琢磨）`:'';
  if(p.policy==='rest')rep.grow.push(`${sn(p)}（休養）調子 ${condBefore}→${Math.round(p.cond)}${natStr}`);
  else if(slump)rep.event.push(`【スランプ】${sn(p)}はスランプで伸び悩んだ${natStr}`);
  else rep.grow.push(`${p.fav?'★':''}${sn(p)}（${pol.name}）${gains.join(' ')||'目立った変化なし'}${wall?' ※素質の壁':''}${partnerStr}${natStr}`);
  // 才能開花
  if(p.policy!=='balance'&&p.policy!=='rest'&&!slump&&p.cond>=50&&Math.random()<.06){
    const main=mainAbil(p);
    p.pot[main]=Math.min(99,p.pot[main]+ri(6,10));
    p.train[main]=Math.max(p.train[main],2);
    const msg=`${sn(p)}が${pol.name}で才能を開花させ、${AB_NAME[main]}の素質が伸びた！`;
    hist(msg);rep.event.push(`【才能開花】${msg}`);
  }
}

// ===== 楽曲 =====
function groupVal(ms,a){const v=ms.map(m=>m.abil[a]);return (a==='comp'||a==='char')?Math.max(...v):v.reduce((s,x)=>s+x,0)/v.length}
function songPower(u){
  const ms=members(u);
  const w=TYPES[u.type].w;let base=0;const parts=[];
  for(const a in w){const v=groupVal(ms,a);base+=w[a]*v;parts.push([a,w[a],v])}
  let bonus=0;const notes=[];
  const clutch=ms.filter(m=>has(m,'clutch')).length;
  if(clutch){bonus+=Math.min(.1,.05*clutch);notes.push('本番に強い')}
  if(ms.some(m=>has(m,'perfect'))){bonus+=.05;notes.push('完璧主義')}
  if(ms.some(m=>has(m,'sensitive'))){bonus+=.03;notes.push('繊細な感性')}
  const lone=ms.filter(m=>has(m,'lone')).length;
  if(lone){if(ms.length===1){bonus+=.06;notes.push('一匹狼')}else{bonus-=.04*lone;notes.push('一匹狼（不向き）')}}
  if(ms.length>1){
    if(ms.some(m=>has(m,'mood'))){bonus+=.04;notes.push('ムードメーカー')}
    if(ms.some(m=>has(m,'leader'))){bonus+=.04;notes.push('リーダー')}
    const c=Math.min(.1,(T()-u.formed)*.02);if(c>0){bonus+=c;notes.push(`結束+${Math.round(c*100)}%`)}
    const uc=unitCompat(u);const cb=clamp(uc.avg/250,-.15,.12);
    bonus+=cb;notes.push(uc.known?`相性${cb>=0?'+':'−'}${Math.round(Math.abs(cb)*100)}%`:'相性?');
  }
  const condAvg=ms.reduce((s,m)=>s+m.cond,0)/ms.length;
  const cf=.85+condAvg/100*.15;
  return {power:clamp(base*(1+bonus)*cf,1,100),parts,notes,condAvg};
}
const nextRelease=u=>Math.max(u.formed+1,u.lastRelease+2,T())-T();
function releaseSongs(rep){
  for(const u of S.units.filter(u=>u.active)){
    if(nextRelease(u)!==0)continue;
    const sp=songPower(u);const ms=members(u);
    let q=Math.round(clamp(sp.power*rnd(.9,1.1),1,100));
    let composer=ms.reduce((b,m)=>m.abil.comp>b.abil.comp?m:b,ms[0]).name;
    // 先輩からの楽曲提供（イベント senpai）を受け取っていれば、その曲を出す
    if(u.gift){q=Math.round(clamp(Math.max(q,u.gift.q),1,100));composer=u.gift.by;delete u.gift}
    const s={id:nid(),title:genTitle(),unitId:u.id,artist:u.name,type:u.type,members:ms.map(m=>m.name),composer,q,t:T(),ours:true,total:0,peak:null,dl:0};
    S.songs.push(s);u.lastRelease=T();u.songs++;
    if(u.debut==null)u.debut=T();
    hist(`${u.name}が新曲「${s.title}」を発表（出来 ${q}）`);
    rep.song.push(`${u.name}「${s.title}」 出来 ${q}（作曲：${lastName(composer)}）`);
  }
}

// ===== ライブ・フェス =====
function livePower(u){
  const ms=members(u);
  const v=.35*groupVal(ms,'char')+.3*groupVal(ms,'expr')+.35*Math.max(groupVal(ms,'sing'),groupVal(ms,'play'),groupVal(ms,'dance'));
  return clamp(v*(ms.some(m=>has(m,'clutch'))?1.1:1),1,100);
}
const venueIndex=u=>VENUES.reduce((r,v,i)=>u.fans>=v.need?i:r,0);
// 新曲を出さない季節は自動でライブを行う
function doLive(u,rep){
  const lp=livePower(u);const vi=venueIndex(u);const v=VENUES[vi];
  const att=Math.round(Math.min(v.cap,60+u.fans*.25*(.5+lp/100)));
  const gain=Math.round(att*(.1+lp/400)*buzzF(u));
  u.fans+=gain;u.lives++;u.attend+=att;
  members(u).forEach(m=>addCond(m,-4));
  if(vi>u.bestVenue){if(vi>0)hist(`${u.name}が初の${v.name}公演を開催（動員${att.toLocaleString()}人）`);u.bestVenue=vi}
  rep.live.push(`${u.name} ${v.name}公演 動員${att.toLocaleString()}人（${Math.round(att/v.cap*100)}%） ライブ力${Math.round(lp)} ファン+${gain.toLocaleString()}`);
}
function festival(rep){
  for(const u of S.units.filter(u=>u.active&&T()-u.formed>=1)){
    const fi=FEST.reduce((r,f,i)=>u.fans>=f.need?i:r,-1);if(fi<0)continue;
    const gain=Math.round((u.fans*.05+800)*(.5+livePower(u)/100)*buzzF(u));
    u.fans+=gain;
    if(fi>u.bestFest){hist(`${u.name}が夏フェスの${FEST[fi].name}に初出演`);u.bestFest=fi}
    rep.live.push(`【夏フェス】${u.name} ${FEST[fi].name}に出演 ファン+${gain.toLocaleString()}`);
  }
}

// ===== チャート・ダウンロード数 =====
// 内部ではポイント（pt）で計算し、画面ではダウンロード数（pt×DL_PER_PT）で表示する
function songPts(s){
  const d=[1,.8,.55,.3][T()-s.t];if(d===undefined)return 0;
  let f=1;if(s.ours){const u=unit(s.unitId);f=1+Math.log10(1+(u?u.fans:0)/1000)*.25}
  // ライバル事務所の曲にも、その事務所のファン数で同じ補正をかける（rival.js）
  else if(s.agency&&S.agencyRival)f=1+Math.log10(1+(S.agencyRival.fans||0)/1000)*.25;
  return s.q*s.q/100*d*f*rnd(.95,1.05);
}
function updateChart(rep){
  const prev={};S.chart.forEach(c=>prev[c.id]=c.rank);
  const list=S.songs.map(s=>({s,pts:songPts(s)})).filter(x=>x.pts>0).sort((a,b)=>b.pts-a.pts);
  S.chart=list.slice(0,10).map((x,i)=>({id:x.s.id,title:x.s.title,artist:x.s.artist,ours:x.s.ours,ex:x.s.ex,unitId:x.s.unitId,q:x.s.q,pts:Math.round(x.pts),dl:Math.round(x.pts*DL_PER_PT),rank:i+1,prev:prev[x.s.id]||null}));
  list.forEach((x,i)=>{
    const s=x.s,r=i+1;
    s.total+=x.pts;
    const y=S.yearPts[s.id]||(S.yearPts[s.id]={title:s.title,artist:s.artist,ours:s.ours,unitId:s.unitId,q:s.q,composer:s.composer,pts:0});
    y.pts+=x.pts;
    if(!s.ours||!rep)return;
    const u=unit(s.unitId);
    const gain=Math.round((r<=10?x.pts*(11-r)*40:x.pts*8)*(u?buzzF(u):1));
    const dl=Math.round(x.pts*DL_PER_PT);
    if(u){u.fans+=gain;u.dl+=dl}
    s.dl+=dl;S.dl+=dl;
    const old=s.peak;
    s.peak=Math.min(s.peak||999,r);
    if(r<=10&&(!old||old>10))hist(`「${s.title}」（${s.artist}）がチャート${r}位にランクイン`);
    if(r===1&&old!==1)hist(`「${s.title}」（${s.artist}）がチャート1位を獲得！`);
    rep.chart.push(`「${s.title}」（${s.artist}）${r}位${r>10?'（圏外）':''}${prev[s.id]?` ／ 前回${prev[s.id]}位`:''} ${dl.toLocaleString()}DL ファン+${gain.toLocaleString()}`);
  });
}

// ===== 年間チャート・音楽賞（冬） =====
function annual(rep){
  const ys=Object.values(S.yearPts);
  const top=[...ys].sort((a,b)=>b.pts-a.pts).slice(0,10).map((x,i)=>({...x,rank:i+1,pts:Math.round(x.pts),dl:Math.round(x.pts*DL_PER_PT)}));
  S.annual.push({year:S.year,top});
  const ours=top.filter(x=>x.ours);
  const msg=ours.length?`${S.year}年目の年間チャート：所属最高は「${ours[0].title}」（${ours[0].artist}）の${ours[0].rank}位`:`${S.year}年目の年間チャート：所属アーティストはトップ10入りならず`;
  hist(msg);rep.chart.push(msg);
  const give=(name,winner,ours,u,ps=[])=>{
    S.awards.push({year:S.year,name,winner,ours});
    rep.award.push(`${name}：${winner}${ours?' 🏆':''}`);
    if(!ours)return;
    hist(`🏆 ${S.year}年目 ${name}を受賞（${winner}）`);
    const label=`${S.year}年目 ${name}`;
    if(u){u.awards.push(label);members(u).forEach(m=>m.awards.push(label))}
    ps.forEach(p=>p.awards.push(label));
  };
  if(ys.length){
    give('年間大賞',`「${top[0].title}」${top[0].artist}`,top[0].ours,top[0].ours&&unit(top[0].unitId));
    const by={};ys.forEach(x=>{(by[x.artist]=by[x.artist]||{artist:x.artist,ours:x.ours,unitId:x.unitId,pts:0}).pts+=x.pts});
    const best=Object.values(by).sort((a,b)=>b.pts-a.pts)[0];
    give('最優秀アーティスト賞',best.artist,best.ours,best.ours&&unit(best.unitId));
    const rookies=S.units.filter(u=>u.debut!=null&&Math.floor(u.debut/4)+1===S.year).map(u=>({u,pts:(by[u.name]||{pts:0}).pts})).sort((a,b)=>b.pts-a.pts);
    if(rookies.length&&rookies[0].pts>=best.pts*.35)give('最優秀新人賞',rookies[0].u.name,true,rookies[0].u);
    else give('最優秀新人賞',genUnitName(),false);
    const bq=[...ys].sort((a,b)=>b.q-a.q)[0];
    const composer=bq.ours&&S.people.find(p=>p.name===bq.composer);
    give('最優秀作曲賞',`「${bq.title}」${bq.ours?lastName(bq.composer):bq.artist}`,bq.ours,null,composer?[composer]:[]);
  }
  S.yearPts={};
}

// ===== イベント =====
function runEvents(rep){
  // 対象ごとの重みを「条件を満たす対象の数」で割り、イベントの種類ごとの出やすさをそろえる
  const cands=[];
  for(const e of EVENTS){
    if(e.season&&!e.season.includes(S.season))continue;
    const cs=e.t==='p'?S.people.map(p=>({p,u:p.unitId?unit(p.unitId):null})):e.t==='u'?S.units.filter(u=>u.active).map(u=>({u})):[{}];
    const ok=cs.map(c=>({e,c,w:e.w(c)})).filter(x=>x.w>0);
    ok.forEach(x=>{x.w/=ok.length;cands.push(x)});
  }
  let n=1+(Math.random()<.6)+(Math.random()<.25);
  const used=new Set();
  const keys=x=>[x.e.id,x.c.p&&'p'+x.c.p.id,x.c.u&&'u'+x.c.u.id].filter(Boolean);
  while(n-->0){
    const avail=cands.filter(x=>!keys(x).some(k=>used.has(k)));
    const tot=avail.reduce((s,x)=>s+x.w,0);if(!tot)break;
    let r=Math.random()*tot;const x=avail.find(x=>(r-=x.w)<0)||avail[avail.length-1];
    keys(x).forEach(k=>used.add(k));
    if(x.c.p&&!S.people.includes(x.c.p))continue;
    if(x.c.u&&!x.c.u.active)continue;
    const text=x.e.text(x.c);
    if(x.e.choices){S.pending.push({id:x.e.id,pid:x.c.p&&x.c.p.id,uid:x.c.u&&x.c.u.id,text});continue}
    const res=x.e.run(x.c);
    rep.event.push(`【${x.e.name}】${text} → ${res}`);
    hist(`${x.e.name}：${text}${res}`);
  }
}
// 未解決の選択肢イベントのうち、まだ有効な先頭のもの
function curPending(){
  while(S.pending.length){
    const pe=S.pending[0];const ev=EVENTS.find(e=>e.id===pe.id);
    const p=pe.pid?person(pe.pid):null;
    const u=pe.uid?unit(pe.uid):(p&&p.unitId?unit(p.unitId):null);
    const c={p,u};
    const ok=ev&&(!pe.pid||S.people.includes(p))&&(!pe.uid||(u&&u.active))&&ev.w(c)>0;
    if(ok)return {pe,ev,c};
    S.pending.shift();
  }
  return null;
}
function resolveChoice(i){
  const cur=curPending();if(!cur)return '';
  S.pending.shift();
  const ch=cur.ev.choices[i];const res=ch.run(cur.c);
  S.report.event.push(`【${cur.ev.name}】${cur.pe.text} →「${ch.label}」${res}`);
  hist(`${cur.ev.name}：${cur.pe.text}「${ch.label}」→ ${res}`);
  save();
  return `「${ch.label}」→ ${res}`;
}

// ===== 在籍の変化 =====
function disband(u,reason){
  u.active=false;u.ended=T();u.lastMembers=members(u).map(m=>m.name);
  members(u).forEach(m=>{if(m.unitId===u.id)m.unitId=null});
  hist(`「${u.name}」が${reason}`);
}
function leaveUnit(p){
  const o=unit(p.unitId);if(!o)return;
  o.members=o.members.filter(x=>x!==p.id);p.unitId=null;
  if(o.members.length<TYPES[o.type].min)disband(o,'メンバー不足で活動休止');
}
function removeFromUnit(p){hist(`${sn(p)}が「${unit(p.unitId).name}」を離れた`);leaveUnit(p)}
function leavePerson(p,reason){
  if(p.unitId)removeFromUnit(p);
  p.left=T();p.leftReason=reason;
  S.people=S.people.filter(x=>x!==p);S.alumni.push(p);
  hist(`${sn(p)}が事務所を離れた（${reason}）`);
  if(S.report&&(inTurn||S.popup))S.report.leave.push(`${sn(p)}（${reason}）`);
}
const retire=p=>leavePerson(p,'引退');
function independent(p){
  const u=p.unitId?unit(p.unitId):null;
  const nm=u&&TYPES[u.type].max===1?u.name:p.name;
  const power=ov(p);
  leavePerson(p,'独立');
  S.rivals.push(newRival(nm,power,true));
  hist(`${nm}が独立し、ライバルとして活動を始めた`);
}

// ===== ターン進行 =====
let inTurn=false;
function nextTurn(){
  if(S.pending.length)return;
  inTurn=true;
  const rep={from:dateStr(T()),to:dateStr(T()+1),before:{},grow:[],event:[],song:[],live:[],chart:[],award:[],leave:[]};
  S.report=rep;
  S.people.forEach(p=>{rep.before[p.id]={ov:ov(p),abil:{...p.abil}};p.prevOv=ov(p)});
  revealCompat();
  S.people.forEach(p=>growPerson(p,rep));
  S.units.filter(u=>u.active&&T()-u.formed>=1&&nextRelease(u)!==0).forEach(u=>doLive(u,rep));
  if(S.season===1)festival(rep);
  releaseSongs(rep);
  for(let i=0;i<5;i++)S.songs.push(rivalSong());
  updateChart(rep);
  runEvents(rep);
  if(S.season===3)annual(rep);
  S.songs=S.songs.filter(s=>s.ours||T()-s.t<3);
  S.season++;
  if(S.season>3){S.season=0;S.year++;S.people.forEach(p=>p.age++);updateRivals()}
  S.candidates=[];S.scouted=false;
  if(S.season===0){genAudition();if(S.candidates.length)rep.event.push('春のオーディションが開催されています（発掘タブ）')}
  S.people.forEach(p=>p.review=makeReview(p));
  S.popup=true;inTurn=false;save();
}

// ===== 操作 =====
function sign(id){
  if(S.people.length>=rosterMax())return alert(`所属は${rosterMax()}人までです`);
  const p=S.candidates.find(c=>c.id===id);
  S.candidates=S.candidates.filter(c=>c!==p);
  p.joined=T();S.people.push(p);
  p.review=makeReview(p);
  hist(`${sn(p)}（${p.age}歳）が${p.src}から加入`);
  save();
}
function scout(k){
  if(S.scouted||!scoutAllowed())return;
  S.scouted=true;
  for(let i=0;i<2;i++)S.candidates.push(genPerson(PLACES[k].bias,PLACES[k].name,PLACES[k].ages));
  save();
}
function saveUnit(){
  const ty=TYPES[F.type];const ids=[...F.members];
  if(!typeAllowed(F.type)){alert(`このシナリオでは${ty.name}は結成できません`);return false}
  if(ids.length<ty.min||ids.length>ty.max){alert(`${ty.name}は${sizeStr(ty)}で編成してください`);return false}
  const u=F.id?unit(F.id):null;
  const name=F.name.trim()||(ty.max===1?genSoloName(person(ids[0]),F.type):genUnitName());
  ids.forEach(id=>{const p=person(id);if(p.unitId&&(!u||p.unitId!==u.id))removeFromUnit(p)});
  if(!u){
    const nu={id:nid(),name,type:F.type,members:ids,formed:T(),lastRelease:-99,debut:null,fans:0,songs:0,dl:0,lives:0,attend:0,bestVenue:-1,bestFest:-1,awards:[],active:true};
    S.units.push(nu);ids.forEach(id=>person(id).unitId=nu.id);
    hist(`${ty.name}「${name}」結成（${names(ids)}）`);
  }else{
    const removed=u.members.filter(x=>!ids.includes(x)),added=ids.filter(x=>!u.members.includes(x));
    if(removed.length)hist(`${names(removed)}が「${u.name}」を離れた`);
    if(added.length)hist(`${names(added)}が「${u.name}」に加入`);
    if(u.type!==F.type)hist(`「${u.name}」が${TYPES[u.type].name}から${ty.name}に転向`);
    if(name!==u.name)hist(`「${u.name}」が「${name}」に改名`);
    const changed=removed.length||added.length||u.type!==F.type;
    removed.forEach(id=>person(id).unitId=null);
    u.type=F.type;u.name=name;u.members=ids;
    ids.forEach(id=>person(id).unitId=u.id);
    if(changed)u.formed=T();
  }
  F=null;save();
  return true;
}
