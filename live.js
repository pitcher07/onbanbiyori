// ライブ本番（D48・D49）。大きな舞台を本番シーンとして見守り、見せ場で指示を出す
// 本番になるのは：初めての大きな会場、夏フェス（ライバルと対決）、年末の大一番、対バン（ライバルと対決）
// 段階2：合体スキル・ハプニング・アンコール・セットリスト（1曲目とここぞの1曲）。段階3：ライバルとの対決
// 見せ場スキル（D52）。型は人物のIDと能力から毎回同じ結果になる（主な能力以外の5つのどれか）
function skillStyle(p,a){
  const others=AB.map(x=>x[0]).filter(x=>x!==a);
  const h=Math.imul(p.id*31+AB.findIndex(x=>x[0]===a)*7+11,2654435761)>>>0;
  return others[h%others.length];
}
const skillTier=(p,a)=>SKILL_AT.reduce((t,at,i)=>p.abil[a]>=at?i:t,-1);
const skillName=(p,a,t)=>SKILL_TREE[a][skillStyle(p,a)][t];
const skillOf=(p,a)=>{const t=skillTier(p,a);return t<0?null:skillName(p,a,t)};
const skillsOf=p=>AB.map(([a])=>[a,skillOf(p,a),skillTier(p,a)]).filter(x=>x[1]);
// 個性の固有スキル：能力のどれかが80に届くと目覚める（個性が2つなら1つ目）
const traitSkill=p=>Math.max(...AB.map(([a])=>p.abil[a]))>=TRAIT_SKILL_AT?p.traits.map(t=>TRAIT_SKILLS[t]).find(Boolean)||null:null;
const skillTags=p=>skillsOf(p).map(([a,n,t])=>`<span class="tag skill t${t}" title="見せ場スキル（${AB_NAME[a]}・${SKILL_TIER_NAME[t]}＝${SKILL_TIER_READ[t]}）">✦ ${n}<i class="dyn d${t}">${SKILL_TIER_NAME[t]}</i></span>`).join('')+(traitSkill(p)?`<span class="tag skill trait" title="個性の固有スキル。どの見せ場でも覚醒できる">✧ ${traitSkill(p)}</span>`:'');
const liveTitle=sc=>sc.kind==='venue'?`${VENUES[sc.idx].name}初公演`:sc.kind==='fest'?`夏フェス ${FEST[sc.idx].name}`:LIVE_KIND_NAME[sc.kind];
const comboName=(a,b)=>{const [x,y]=[a,b].sort((p,q)=>AB.findIndex(z=>z[0]===p)-AB.findIndex(z=>z[0]===q));return COMBOS[x+'+'+y]||'息の合った共演'};

// ===== 本番にするライブを選ぶ（季節が進んだ直後、1季に1回まで） =====
// 対決相手：実力が近いライバル。対バンでは、独立した元所属が出てくることもある
function pickRival(u,preferEx){
  const lp=livePower(u);
  const ex=S.rivals.filter(r=>r.ex),ag=S.rivals.filter(r=>r.agency);
  if(ag.length&&Math.random()<.5){const r=pick(ag);return {name:r.name,power:r.power,ex:false,agency:true}}
  const r=preferEx&&ex.length&&Math.random()<.5?pick(ex):[...S.rivals].sort((a,b)=>Math.abs(a.power-lp)-Math.abs(b.power-lp))[Math.floor(Math.random()*3)]||S.rivals[0];
  return r?{name:r.name,power:r.power,ex:!!r.ex}:null;
}
function pickFeatured(before){
  const ours=S.units.filter(u=>u.active&&u.songs>0);
  if(!ours.length)return null;
  const ended=(S.season+3)%4;
  const nv=ours.filter(u=>u.bestVenue>=1&&u.bestVenue>(before[u.id]??-1)).sort((a,b)=>b.bestVenue-a.bestVenue||b.fans-a.fans)[0];
  if(nv)return {uid:nv.id,kind:'venue',idx:nv.bestVenue};
  if(ended===1){
    const fest=ours.map(u=>{
      const line=S.report.live.find(l=>l.startsWith(`【夏フェス】${u.name} `));
      return line?{u,idx:FEST.findIndex(f=>line.includes(f.name+'に出演'))}:null;
    }).filter(x=>x&&x.idx>=0).sort((a,b)=>b.idx-a.idx||b.u.fans-a.u.fans)[0];
    if(fest)return {uid:fest.u.id,kind:'fest',idx:fest.idx,rival:pickRival(fest.u)};
  }
  // 年末の大一番：その年いちばんファンの多い組。毎年必ず1回
  if(ended===3){const u=[...ours].sort((a,b)=>b.fans-a.fans)[0];return {uid:u.id,kind:'yearend',idx:0}}
  // 対バン：春と秋にときどき。ファンの多い組ほど呼ばれやすい
  if((ended===0||ended===2)&&Math.random()<.45){
    const tot=ours.reduce((s,u)=>s+Math.sqrt(u.fans+100),0);let r=Math.random()*tot;
    const u=ours.find(u=>(r-=Math.sqrt(u.fans+100))<0)||ours[0];
    return {uid:u.id,kind:'battle',idx:0,rival:pickRival(u,true)};
  }
  return null;
}

// ===== 進行（画面あり・なし共通の計算） =====
let L=null;
function newShow(sc){
  const u=unit(sc.uid);if(!u||!u.active)return null;
  const songs=S.songs.filter(s=>s.ours&&s.unitId===u.id).sort((a,b)=>b.q-a.q);
  const start=8+(sc.kind==='venue'||sc.kind==='fest'?sc.idx*3:sc.kind==='yearend'?6:0);
  return {sc,u,ms:members(u),songs,meter:start,rmeter:sc.rival?start:0,rival:sc.rival||null,
    awaken:0,combo:0,breakout:0,encore:false,happened:false,usedCombo:false,climax:songs[0]||null,opener:songs[1]||null,fast:false,used:{}};
}
const COVER={title:'カバー曲',q:45};
// 1曲目と「ここぞの1曲」は選べる。2曲目は残りの持ち曲の最上位。足りなければカバー曲
function setlist(){
  const climax=L.climax||COVER;
  const opener=L.opener&&L.opener!==L.climax?L.opener:L.songs.find(s=>s!==L.climax)||COVER;
  const mid=L.songs.find(s=>s!==climax&&s!==opener)||COVER;
  return [opener,mid,climax].map((s,i)=>({title:s.title,q:s.q,id:s.id,climax:i===2,moments:i===2?2:1}));
}
function encoreSong(){
  const used=setlist().map(s=>s.id);
  const s=L.songs.find(x=>!used.includes(x.id))||L.climax||COVER;
  return {title:s.title,q:s.q,id:s.id,encore:true,moments:1};
}
const songGain=sg=>(2+sg.q*.06+livePower(L.u)*.05)*(sg.climax?1.3:sg.encore?.6:1)*rnd(.9,1.1);
const addMeter=d=>{L.meter=clamp(L.meter+d,0,150)};
// ライバルは自分の実力で、曲ごとと見せ場ごとに盛り上がりを積む
function rivalSongStep(sg){if(!L.rival)return 0;const p=L.rival.power;const g=(2+p*.11)*(sg.climax?1.3:1)*rnd(.85,1.15);L.rmeter=clamp(L.rmeter+g,0,150);return g}
function rivalMomentStep(){if(!L.rival)return;L.rmeter=clamp(L.rmeter+L.rival.power/100*rnd(4,18),0,150)}
// 見せ場：相性◎の2人がスキルを持っていれば、ときどき合体の見せ場になる
function comboPair(){
  if(L.ms.length<2||L.usedCombo)return null;
  const best=p=>skillsOf(p).sort((x,y)=>p.abil[y[0]]-p.abil[x[0]])[0];
  const ps=pairs(L.ms).filter(([p,q])=>isKnown(p,q)&&compat(p,q)>=25&&best(p)&&best(q));
  if(!ps.length)return null;
  const [p,q]=pick(ps);const a=best(p)[0],b=best(q)[0];
  return {type:'combo',p,q,a,b,name:comboName(a,b)};
}
function nextMoment(sg){
  const c=comboPair();
  if(c&&Math.random()<(sg.climax?.6:.3)){L.usedCombo=true;return c}
  const keys=Object.keys(TYPES[L.u.type].w);
  const score=(p,a)=>p.abil[a]+(skillOf(p,a)?25:0)-(L.used[p.id+a]||0)*30;
  let best=null;
  for(const p of L.ms)for(const a of keys){const v=score(p,a)*rnd(.8,1.2);if(!best||v>best.v)best={p,a,v}}
  L.used[best.p.id+best.a]=(L.used[best.p.id+best.a]||0)+1;
  return {type:'solo',p:best.p,a:best.a};
}
const hasT=(p,t)=>p.traits.includes(t);
// 大きな舞台ほど難しい（ドーム・ヘッドライナーは成功しにくい）
const stageDiff=()=>L.sc.kind==='venue'||L.sc.kind==='fest'?L.sc.idx*.07:L.sc.kind==='yearend'?.07:0;
const momentSkill=m=>m.type==='combo'?m.name:skillOf(m.p,m.a)||traitSkill(m.p);
const awakenChance=(m,order)=>L.meter>=80&&order!=='show'&&!!momentSkill(m);
function judge(order,m){
  const ps=m.type==='combo'?[[m.p,m.a],[m.q,m.b]]:[[m.p,m.a]];
  const any=t=>ps.some(([p])=>hasT(p,t));
  const base=ps.reduce((s,[p,a])=>s+(p.abil[a]-55)/100+(p.cond-60)/250,0)/ps.length-stageDiff();
  let pr,up,down;
  if(order==='attack'){pr=.40+base;up=17;down=-9}
  else if(order==='show'){pr=.72+base;up=9;down=1}
  else if(any('clutch')||any('showoff')){pr=.66+base;up=15;down=-4}
  else if(any('genius')||any('natural')||any('free')){pr=.48+base;up=21;down=-5}
  else{pr=.58+base;up=12;down=-3}
  if(any('clutch'))pr+=.08;
  if(ps.some(([p,a])=>hasT(p,'sensitive')&&a==='expr'))pr+=.08;
  if(m.type==='combo'){pr+=.05;up+=6}
  // スキルの段階が高いほど、成功したときと覚醒したときの伸びが大きい
  const sk=momentSkill(m),tier=m.type==='solo'?skillTier(m.p,m.a):0;if(sk&&m.type==='solo')up+=4+Math.max(0,tier)*2;
  const ok=Math.random()<clamp(pr,.08,.95);
  const awaken=ok&&awakenChance(m,order);
  let gain=(ok?up:down)+(awaken?(m.type==='combo'?30:22+Math.max(0,tier)*4):0);
  if(L.ms.some(x=>hasT(x,'mood')))gain+=2;
  return {ok,gain,awaken,sk,combo:m.type==='combo',by:m.type==='combo'?sn(m.p)+'×'+sn(m.q):sn(m.p)};
}
function applyResult(r){addMeter(r.gain);if(r.awaken)L.awaken++;if(r.awaken&&r.combo){L.combo++;if(S.skillDex[r.sk]==null)S.skillDex[r.sk]={t:T(),by:r.by}}if(r.breakout){L.breakout++;L.awaken++}}
// ハプニング：2曲目のあとに、45%で1つ起きる
function pickHappen(){
  if(L.happened||Math.random()>=.45)return null;
  const ok=LIVE_HAPPEN.filter(h=>(!h.fest||L.sc.kind==='fest')&&(!h.group||L.ms.length>1)&&(!h.minMeter||L.meter>=h.minMeter));
  const tot=ok.reduce((s,h)=>s+h.w,0);if(!tot)return null;
  let r=Math.random()*tot;const h=ok.find(h=>(r-=h.w)<0)||ok[0];
  L.happened=true;
  const target=h.id==='breakout'?[...L.ms].sort((a,b)=>ov(a)-ov(b))[0]:pick(L.ms);
  return {...h,p:target};
}
function resolveHappen(h,i){
  const p=h.p,best=(a)=>L.ms.reduce((b,m)=>m.abil[a]>b.abil[a]?m:b,L.ms[0]);
  if(h.id==='singalong')return {ok:true,gain:12,text:'会場全体がひとつの歌になった。'};
  if(i===1)return {ok:true,gain:h.id==='breakout'?5:h.id==='rain'?3:-2,text:h.id==='trouble'?'演奏を止めて立て直した。少し間があいた。':h.id==='rain'?'客席を気づかう言葉に、温かい拍手が起きた。':`${sn(p)}は堅実にこなした。`};
  if(h.id==='trouble'){const c=best('char');const ok=Math.random()<clamp(.45+(Math.max(c.abil.char,c.abil.expr)-55)/100,.1,.9);
    return {ok,gain:ok?18:-10,text:ok?`${sn(c)}がアカペラで歌い出し、客席が大合唱で応えた！`:'声が届ききらず、会場が少し静まった…'}}
  if(h.id==='rain'){const ok=Math.random()<clamp(.5+(L.ms.some(m=>hasT(m,'tough')||hasT(m,'clutch'))?.15:0)+(livePower(L.u)-55)/150,.1,.9);
    return {ok,gain:ok?16:-6,text:ok?'雨の中のステージが、忘れられない光景になった！':'雨に体力を奪われ、動きが重くなった…'}}
  const ok=Math.random()<clamp(.5+(p.age<20?.1:0)+(hasT(p,'clutch')?.15:0)+(p.cond-60)/250-stageDiff()/2,.1,.9);
  return {ok,gain:ok?20:-6,breakout:ok,text:ok?`${sn(p)}が化けた。誰もが息をのむ一瞬だった！`:`${sn(p)}は緊張で固まってしまった…`};
}
function gradeOf(){
  let g=[...LIVE_GRADES].reverse().find(x=>L.meter>=x.min);
  if(g.name==='伝説'&&!L.awaken)g=LIVE_GRADES[3];
  return g;
}
// 結果を反映する（ファン・記録・実績）。対決は盛り上がりが上回れば勝ち
function finishShow(){
  const {u,sc,rival}=L,g=gradeOf();
  const X={venue:()=>VENUES[sc.idx].cap*.3,fest:()=>(u.fans*.05+800)*.6,yearend:()=>VENUES[Math.max(0,u.bestVenue)].cap*.3+1000,battle:()=>Math.max(800,u.fans*.04)}[sc.kind]();
  let extra=Math.round(X*(g.mult-1)),vs='';
  const st=S.liveStats;
  if(rival){
    L.win=L.meter>L.rmeter;
    if(L.win){extra+=Math.round(X*.5);st.battleWin++;if(rival.ex)st.exWin++;const r=S.rivals.find(x=>x.name===rival.name);if(r)r.power=Math.max(20,r.power-1.5)}
    else if(extra>0)extra=Math.round(extra/2);
    vs=` ／ ${rival.name}に${L.win?'勝利':'惜敗'}（${Math.round(L.meter)}対${Math.round(L.rmeter)}）`;
  }
  u.fans=Math.max(0,u.fans+extra);
  st.shows++;st.awaken+=L.awaken;st.combo+=L.combo;st.breakout+=L.breakout;
  if(L.encore)st.encore++;if(g.name==='伝説'){st.legend++;members(u).forEach(m=>m.legendLive=true)}if(sc.kind==='yearend'&&g.min>=100)st.yearendGreat++;
  const t=liveTitle(sc);
  S.report.live.unshift(`【ライブ本番】${u.name} ${t} 評価「${g.name}」 盛り上がり${Math.round(L.meter)}${L.awaken?` 覚醒${L.awaken}回`:''}${L.encore?' アンコールあり':''}${vs} ファン${fmt(extra)}`);
  if(g.min>=100||L.win&&rival.ex)hist(`${u.name}の${t}が「${g.name}」の評価に${L.awaken?`（覚醒${L.awaken}回）`:''}${vs}`);
  delete S.liveScene;
  checkGoals(S.report);
  return {g,extra};
}
// 自動送り中など、画面なしで一瞬で終える（指示はすべて order）
function autoResolveLive(order='trust'){
  L=newShow(S.liveScene);if(!L){delete S.liveScene;return}
  const play=sg=>{addMeter(songGain(sg));rivalSongStep(sg);for(let i=0;i<sg.moments;i++){applyResult(judge(order,nextMoment(sg)));rivalMomentStep()}};
  setlist().forEach((sg,i)=>{play(sg);if(i===1){const h=pickHappen();if(h)applyResult(resolveHappen(h,h.choices&&L.meter<60?1:0))}});
  if(L.meter>=100){L.encore=true;play(encoreSong())}
  finishShow();L=null;
}

// ===== 画面 =====
const sleep=ms=>new Promise(r=>setTimeout(r,L&&L.fast?0:ms));
let liveWait=null,liveDone=null;
function startLive(done){
  liveDone=done||null;
  if(document.getElementById('live'))return;
  L=newShow(S.liveScene);
  if(!L){delete S.liveScene;save();closeLive();return}
  const {u,sc,ms,rival}=L;
  const bg=sc.kind==='venue'?'v'+sc.idx:sc.kind==='fest'?'f'+sc.idx:sc.kind;
  const el=document.createElement('div');el.id='live';el.className='live k-'+sc.kind;
  el.innerHTML=`<div class="live-top"><div><small>ライブ本番${rival?' ・ 対決':''}</small><b>${esc(u.name)}</b><span>${liveTitle(sc)}${rival?` ${art('live/vs','vs-mark','VS')}<em class="vs">${esc(rival.name)}${rival.ex?'（元所属）':''}${rival.agency?'（ライバル事務所）':''}</em>`:''}</span></div><button class="btn sm" data-live="skip">おまかせで最後まで</button></div>
  <div class="stage h0">${art('live/stage_'+bg,'stage-bg')}<div class="beams">${[1,2,0,3,1].map(b=>`<i style="--b:${b}"></i>`).join('')}</div>
    <div class="band">${ms.map(p=>`<div class="mem" data-pid="${p.id}"><span class="fig-wrap">${figure(p,2,rolePose(p))}</span><small>${esc(sn(p))}</small></div>`).join('')}</div>
    <div class="crowd">${Array.from({length:96},(_,i)=>`<i style="--d:${-(Math.random()*1.2).toFixed(2)}s;--v:${i*7%6};--pc:${i%4}"></i>`).join('')}</div>
    <div class="crowd-front">${Array.from({length:16},(_,i)=>`<i style="--d:${-(Math.random()*1.2).toFixed(2)}s;--v:${i*3%4}"></i>`).join('')}</div>
    <div class="song-title"></div><div class="floats"></div></div>
  <div class="meter"><span>${rival?esc(u.name):'盛り上がり'}</span><div class="mbar"><b class="zone" title="覚醒圏（80以上）"></b><i></i></div><em>0</em></div>
  ${rival?`<div class="meter rival"><span>${esc(rival.name)}</span><div class="mbar"><i></i></div><em>0</em></div>`:''}
  <div class="live-panel"></div>
  <div class="cutin"></div>`;
  el.addEventListener('click',e=>{const b=e.target.closest('[data-live]');if(!b)return;e.stopPropagation();liveClick(b)});
  document.body.append(el);document.body.classList.add('live-open');
  liveSoundStart();setMeter();showIntro();frameTick();stageSplash();
}
// 立ち姿の2コマを、盛り上がりに合わせた速さで切り替える
function frameTick(){
  if(!L||!document.getElementById('live'))return;
  const st=$('.stage');st.classList.toggle('f1');
  const lv=L.meter<30?0:L.meter<60?1:L.meter<90?2:L.meter<120?3:4;
  L.frameTimer=setTimeout(frameTick,st.classList.contains('slow')?1400:[700,560,430,330,260][lv]);
}
// ふだんのポーズ：形態で大事な能力のうち得意なもの（歌・演奏・作曲なら楽器を持つ）
function rolePose(p){
  const keys=Object.keys(TYPES[L.u.type].w).filter(a=>['sing','play','comp'].includes(a));
  const a=keys.sort((x,y)=>p.abil[y]-p.abil[x])[0];
  return a?POSE_OF[a]:0;
}
function setPose(p,pose){const w=$(`.mem[data-pid="${p.id}"] .fig-wrap`);if(w)w.innerHTML=figure(p,2,pose)}
// キラッと光る星とドットの紙吹雪（images/live の素材）
function sparkles(x,y,n=4){
  for(let i=0;i<n;i++){const s=document.createElement('i');s.className='sparkle';s.style.cssText=`left:calc(${x}% + ${Math.round(Math.random()*80-40)}px);top:calc(${y}% + ${Math.round(Math.random()*60-30)}px);animation-delay:${i*.08}s`;$('.floats').append(s);setTimeout(()=>s.remove(),900)}
}
function liveConfetti(n=36){
  for(let i=0;i<n;i++){const s=document.createElement('i');s.className='lconf';s.style.cssText=`left:${Math.random()*100}%;--r:${i%4};--dx:${Math.round(Math.random()*80-40)}px;animation-delay:${Math.random()*.6}s,${Math.random()*.6}s;animation-duration:${1.8+Math.random()*1.2}s,.5s`;$('.floats').append(s);setTimeout(()=>s.remove(),3200)}
}
const $=s=>document.querySelector('#live '+s);
function setMeter(){
  const m=Math.round(L.meter);
  $('.mbar i').style.width=Math.min(100,m/1.5)+'%';$('.meter em').textContent=m;
  const st=$('.stage');st.className=st.className.replace(/\bh\d\b/,'')+' h'+(m<30?0:m<60?1:m<90?2:m<120?3:4);
  $('.meter').classList.toggle('hot',m>=80);
  if(L.rival){const r=Math.round(L.rmeter);$('.meter.rival .mbar i').style.width=Math.min(100,r/1.5)+'%';$('.meter.rival em').textContent=r}
  liveHype(m);
}
function panel(html){$('.live-panel').innerHTML=html}
function floatText(text,cls){
  const f=document.createElement('b');f.className='float '+(cls||'');f.textContent=text;
  $('.floats').append(f);setTimeout(()=>f.remove(),1600);
}
const INTRO={venue:'開演前の楽屋。',fest:'フェスのバックステージ。隣のステージには{r}が立つ。',yearend:'今年最後のステージ。客席には一年分の思いが詰まっている。',battle:'今夜は{r}との対バン。どちらが会場を持っていくか。'};
function showIntro(){
  const opts=L.songs.slice(0,6);
  const pickRow=(k,cur,label)=>`<div class="sub">${label}</div><div class="setlist">${opts.map(s=>`<button class="btn${s===cur?' on':''}" data-live="${k}" data-id="${s.id}">${jacket(s,20)}「${esc(s.title)}」<small>出来 ${s.q}</small></button>`).join('')}</div>`;
  panel(`<p class="narr">${esc(INTRO[L.sc.kind].replace('{r}',L.rival?L.rival.name:''))}${esc(L.u.name)}の${liveTitle(L.sc)}。セットリストを決めよう。</p>
  ${opts.length>1?pickRow('opener',L.opener,'1曲目（つかみ）'):''}${opts.length?pickRow('climax',L.climax,'ここぞの1曲（ラスト）'):'<p class="sub">持ち曲が足りないので、カバー曲で臨む。</p>'}
  <div class="row" style="justify-content:flex-end"><button class="btn pri" data-live="go">開演 ▶</button></div>`);
}
function liveClick(b){
  const k=b.dataset.live,s=L&&L.songs.find(x=>x.id===+b.dataset.id);
  if(k==='climax'&&s){L.climax=s;if(L.opener===s)L.opener=L.songs.find(x=>x!==s)||null;se('click');showIntro()}
  else if(k==='opener'&&s){L.opener=s;if(L.climax===s)L.climax=L.songs.find(x=>x!==s)||s;se('click');showIntro()}
  else if(k==='go'){se('click');runShow()}
  else if((k==='order'||k==='hap')&&liveWait){const w=liveWait;liveWait=null;w(b.dataset.o)}
  else if(k==='skip'){L.fast=true;if(liveWait){const w=liveWait;liveWait=null;w(null)}else if(!L.running)runShow()}
  else if(k==='close')closeLive();
}
function songBanner(label,title){const t=$('.song-title');t.innerHTML=`<small>${label}</small>「${esc(title)}」`;t.classList.remove('show');void t.offsetWidth;t.classList.add('show')}
async function playSong(sg,label,lead){
  if(!L.fast)panel(`<p class="narr">${lead}</p>`);
  songBanner(label,sg.title);
  liveSongPlay(sg.climax||sg.encore);await sleep(1300);
  addMeter(songGain(sg));setMeter();await sleep(900);
  for(let k=0;k<sg.moments;k++){await moment(sg);rivalMomentStep()}
  liveSongStop();cheer(.6+L.meter/150);await sleep(600);
  if(L.rival)await rivalTurn(sg);
}
// ライバルの番：向こうのステージの盛り上がりが積まれる
async function rivalTurn(sg){
  const g=rivalSongStep(sg);setMeter();
  if(L.fast)return;
  panel(`<p class="narr">${esc(L.rival.name)}のステージ。${g>12?'向こうの客席も大きく揺れている…！':'向こうの客席もわいている。'}</p>`);
  cheer(.35);await sleep(1300);
}
async function runShow(){
  if(L.running)return;L.running=true;
  const list=setlist();
  for(let i=0;i<list.length;i++){
    const sg=list[i];
    if(i===0)cheer(.8);
    await playSong(sg,sg.climax?'ここぞの1曲':i+1+'曲目',sg.climax?'ラストナンバー。':i===0?'客電が落ちる。':'次の曲へ。');
    if(i===1){const h=pickHappen();if(h)await happening(h)}
  }
  // アンコール：盛り上がり100以上で、客席が呼び戻す
  if(L.meter>=100){
    L.encore=true;
    if(!L.fast){panel('<p class="narr"><b>アンコール！</b> 客席の手拍子が鳴りやまない。もう一度ステージへ。</p>');liveChant();await sleep(2600)}
    await playSong(encoreSong(),'アンコール','もう1曲だけ。');
  }
  showFinale();
}
async function moment(sg){
  const m=nextMoment(sg),{p}=m;
  [[m.p,m.a],[m.q,m.b]].forEach(([x,a])=>{if(x)setPose(x,POSE_OF[a])});
  const spots=[m.p,m.q].filter(Boolean).map(x=>$(`.mem[data-pid="${x.id}"]`));
  document.querySelectorAll('#live .mem').forEach(x=>x.classList.toggle('dim',!spots.includes(x)));spots.forEach(x=>x.classList.add('spot'));
  let order='trust';
  if(!L.fast){
    se('moment');
    const chance=o=>awakenChance(m,o)?'<em class="chance">★ 覚醒チャンス</em>':'';
    const who=m.type==='combo'
      ?`<p class="narr"><b>合体の見せ場！</b> ${esc(sn(m.p))}と${esc(sn(m.q))}が目を合わせた。ふたりの「${esc(m.name)}」が狙える</p><div class="sub">相性◎ ・ ${AB_NAME[m.a]} ${Math.floor(m.p.abil[m.a])}／${AB_NAME[m.b]} ${Math.floor(m.q.abil[m.b])}</div>`
      :`<p class="narr"><b>見せ場！</b> ${esc(LIVE_MOMENT[m.a].scene.replace('{n}',sn(p)))}</p><div class="sub">${AB_NAME[m.a]} ${Math.floor(p.abil[m.a])} ・ 調子 ${Math.round(p.cond)} ${p.cond<35?'<span class="warn">疲れが見える</span>':''} ${momentSkill(m)?`・ ${skillOf(p,m.a)?'見せ場スキル':'固有スキル'}「${momentSkill(m)}」`:''}</div>`;
    panel(`${who}<div class="orders">${LIVE_ORDERS.map(([o,n,d])=>`<button class="btn${o==='attack'?' pri':''}" data-live="order" data-o="${o}"><b>${n}</b><small>${d}</small>${chance(o)}</button>`).join('')}</div>`);
    order=await new Promise(r=>liveWait=r)||'trust';
  }
  const r=judge(order,m);
  if(r.awaken)await cutIn(m.type==='combo'?[m.p,m.q]:[p],r.sk,m.type==='combo'?'合体':'覚醒',m.type==='combo'?['combo',m.a,m.b]:[skillOf(p,m.a)?m.a:'trait']);
  applyResult(r);setMeter();
  if(!L.fast){
    spots.forEach(x=>x.classList.add(r.ok?'hit':'miss'));
    floatText((r.gain>=0?'+':'')+r.gain,r.ok?'up':'down');
    if(r.ok&&!r.awaken){cheer(.5+r.gain/30);sparkles(50,45)}else if(!r.ok)se('miss');
    const txt=m.type==='combo'?(r.ok?`${sn(m.p)}と${sn(m.q)}の「${m.name}」が決まった！`:'ふたりの呼吸が、わずかにずれた…'):LIVE_MOMENT[m.a][r.ok?'ok':'ng'].replace('{n}',sn(p));
    panel(`<p class="narr ${r.ok?'good':'warn'}">${esc(txt)}</p>`);
  }
  await sleep(1300);
  document.querySelectorAll('#live .mem').forEach(x=>x.classList.remove('dim','spot','hit','miss'));
  [m.p,m.q].forEach(x=>{if(x)setPose(x,rolePose(x))});
}
async function happening(h){
  const p=h.p,mem=$(`.mem[data-pid="${p.id}"]`);
  let i=0;
  if(!L.fast){
    se('moment');
    if(h.id==='breakout'){document.querySelectorAll('#live .mem').forEach(x=>x.classList.toggle('dim',x!==mem));mem.classList.add('spot')}
    panel(`<p class="narr"><b>ハプニング！</b> ${esc(h.text.replace('{n}',sn(p)))}</p>${h.choices?`<div class="orders two">${h.choices.map(([n,d],k)=>`<button class="btn${k===0?' pri':''}" data-live="hap" data-o="${k}"><b>${n}</b><small>${d}</small></button>`).join('')}</div>`:''}`);
    if(h.choices)i=+(await new Promise(r=>liveWait=r)??0);else await sleep(1600);
  }else if(h.choices)i=L.meter<60?1:0;
  const r=resolveHappen(h,i);
  if(r.breakout)await cutIn([p],'殻を破る','覚醒',['expr']);
  applyResult(r);setMeter();
  if(!L.fast){
    floatText((r.gain>=0?'+':'')+r.gain,r.gain>=0?'up':'down');
    if(r.gain>8&&!r.breakout)cheer(1);else if(r.gain<0)se('miss');
    panel(`<p class="narr ${r.gain>=0?'good':'warn'}">${esc(r.text)}</p>`);
    await sleep(1500);
  }
  document.querySelectorAll('#live .mem').forEach(x=>x.classList.remove('dim','spot'));
}
// 覚醒：暗転とスローのあと、顔が切り込んで技の名前が出る。最後に客席が爆発する
// kind：[絵の種類（能力・combo・trait）, 合体なら2人の能力]。帯の背景は1枚絵、ふちは能力の色、右上に能力の印（D71）
async function cutIn(ps,sk,label,kind){
  if(L.fast)return;
  const st=$('.stage'),c=$('.cutin');
  st.classList.add('slow');liveRiser();await sleep(900);
  const [bg,a1,a2]=kind||[ps.length>1?'combo':'trait'];
  const col1=ABIL_COLOR[a1||bg],col2=ABIL_COLOR[a2||a1||bg];
  c.innerHTML=`<div class="cut-band illust${ps.length>1?' duo':''}" style="background-image:url(${illust('cutin_'+bg)});--ac:${col1};--ac2:${col2}">${ps.map(p=>portrait(p,128,'awaken',true)).join('')}<div class="cut-text"><small>${label}</small><b>${esc(sk)}</b><span>${ps.map(p=>esc(sn(p))).join(' × ')}</span></div><div class="cut-emb">${abilBadge(bg,72)}</div></div>`;
  c.classList.add('on');await sleep(1700);
  c.classList.add('flash');liveImpact();
  st.classList.remove('slow');st.classList.add('explode');
  const b=document.createElement('i');b.className='burst';$('.floats').append(b);setTimeout(()=>b.remove(),700);
  await sleep(350);c.classList.remove('on','flash');c.innerHTML='';
  liveConfetti();sparkles(50,40,8);await sleep(900);st.classList.remove('explode');
}
// 初めての大舞台（ホール・アリーナ・ドーム・ヘッドライナー）は、開演前に1枚絵を見せる（D71）
const stageIllust=sc=>sc&&STAGE_ILLUST[sc.kind]&&STAGE_ILLUST[sc.kind][sc.idx]||null;
function stageSplash(){
  const il=stageIllust(L.sc);if(!il||L.fast)return;
  const el=document.createElement('div');el.className='stage-splash';
  el.innerHTML=`<div class="splash-art" style="background-image:url(${illust(il)})"></div><div class="splash-cap"><small>${L.sc.kind==='fest'?'はじめての':'はじめての大舞台'}</small><b>${liveTitle(L.sc)}</b><span>${esc(L.u.name)}</span></div>`;
  const close=()=>{if(!el.isConnected)return;el.classList.add('out');setTimeout(()=>el.remove(),400)};
  el.addEventListener('click',close);setTimeout(close,3200);
  document.getElementById('live').append(el);
}
function showFinale(){
  const {g,extra}=finishShow();
  liveSongStop();cheer(g.min>=100||L.win?1.6:g.min>=75?1:.5);
  if(g.min>=100||L.win)setTimeout(()=>se('award'),400);else se('stamp');
  const vs=L.rival?`<div class="vs-result ${L.win?'win':'lose'}">${L.win?'勝利':'惜敗'} <span>${Math.round(L.meter)} 対 ${Math.round(L.rmeter)}</span></div>`:'';
  const il=stageIllust(L.sc);
  panel(`${il?`<div class="finale-art" style="background-image:url(${illust(il)})"></div>`:''}<div class="finale"><div class="grade g${LIVE_GRADES.indexOf(g)}"><span>評価</span><b>${g.name}</b></div>
  <div>${vs}<div>盛り上がり <b>${Math.round(L.meter)}</b>${L.awaken?` ・ 覚醒 <b>${L.awaken}</b>回`:''}${L.encore?' ・ アンコール':''}</div><div>ファン <b>${fmt(extra)}</b></div></div>
  <button class="btn pri" data-live="close">次へ ▶</button></div>`);
  const sk=$('.live-top [data-live=skip]');if(sk)sk.remove();
  save();
}
function closeLive(){
  const el=document.getElementById('live');
  if(L)clearTimeout(L.frameTimer);
  liveSoundEnd();L=null;liveWait=null;
  if(el){el.classList.add('out');setTimeout(()=>el.remove(),300)}
  document.body.classList.remove('live-open');
  const d=liveDone;liveDone=null;
  if(d)d();else render();
}
