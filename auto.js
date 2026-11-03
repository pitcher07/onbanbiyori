// 自動管理（休養の出し入れ・発掘・迎え入れ）と自動送り（季節を自動で進める）
// 自動管理は、手で「次の季節へ」を押したときも、設定がオンなら毎季行う
function applyAuto(){
  const A=S.auto,done=[];
  // 自動送り中の入れ替え・編成・トレーニング見直し（D55）。手で進めるときはしない
  const turnover=autoRun&&A.release;
  if(A.scout!=='off'&&!S.scouted&&(S.people.length<ROSTER_MAX||turnover)){
    const keys=Object.keys(PLACES);
    const k=A.scout==='rotate'?keys[T()%keys.length]:A.scout;
    if(PLACES[k]){scout(k);done.push(`${PLACES[k].name}で発掘した`)}
  }
  if(turnover)autoTurnover(done);
  if(A.sign){
    [...S.candidates].sort((a,b)=>b.stars-a.stars||ov(b)-ov(a)).forEach(c=>{
      if(c.stars<A.signStars||S.people.length>=ROSTER_MAX)return;
      sign(c.id);done.push(`${c.name}（見込み${'★'.repeat(c.stars)}）を迎え入れた`);
    });
  }
  for(const p of S.people){
    if(A.rest&&p.policy!=='rest'&&p.cond<A.restAt){
      p.autoPrev=p.policy;p.policy='rest';done.push(`${p.name}を休養へ（調子${Math.round(p.cond)}）`);
    }else if(A.back&&p.policy==='rest'&&p.cond>=A.backAt){
      p.policy=p.autoPrev&&p.autoPrev!=='rest'?p.autoPrev:'balance';delete p.autoPrev;
      done.push(`${p.name}を${POLICIES[p.policy].name}へ戻した（調子${Math.round(p.cond)}）`);
    }
  }
  if(autoRun&&A.train)autoTrain(done);
  if(autoRun&&A.form)autoForm(done);
  return done;
}

// ===== 自動送り中の「雑な」判断（D55） =====
// どれも最適解は狙わない。見立てにブレをのせ、ときどき様子見で何もしない。手動の7割くらいの精度が目安
// 将来性の見立て：総合＋伸びしろ×若さ−年齢による衰えの見込み。伸びしろは本当の素質にブレをのせて見積もる（候補者はブレが大きい）
function prospect(p,noise){
  const room=AB.reduce((s,[a])=>s+Math.max(0,p.pot[a]-p.abil[a]),0)/6;
  const young=p.age<22?1:p.age<27?.7:p.age<31?.4:.15;
  return ov(p)+room*young*.8-Math.max(0,p.age-30)*3+rnd(-noise,noise);
}
// 入れ替え：今季の候補者に、所属で一番見込みの低い人よりはっきり良い人がいれば、契約を終えて迎え入れる（1季に1人まで）
function autoTurnover(done){
  if(S.people.length<ROSTER_MAX-1||!S.candidates.length||Math.random()<.3)return;
  const best=S.candidates.map(c=>({c,v:prospect(c,12)})).sort((a,b)=>b.v-a.v)[0];
  const hallUnits=new Set(S.hall.filter(h=>h.kind==='unit').map(h=>h.id));
  // 推し・殿堂の組・入って1年未満の人は外さない。活躍中の組の人は外しにくくする
  const keep=p=>p.fav||hallUnits.has(p.unitId)||T()-p.joined<4;
  const worst=S.people.filter(p=>!keep(p)).map(p=>{const u=p.unitId&&unit(p.unitId);return {p,v:prospect(p,8)+(u&&u.songs>0?10:0)}}).sort((a,b)=>a.v-b.v)[0];
  if(!worst||best.v<worst.v+8)return;
  const p=worst.p;
  leavePerson(p,'契約終了');
  done.push(`${p.name}（${p.age}歳・総合${ov(p)}）との契約を終えた（伸びしろが少ないと判断）`);
  if(S.people.length<ROSTER_MAX&&S.candidates.includes(best.c)){sign(best.c.id);done.push(`代わりに${best.c.name}（見込み${'★'.repeat(best.c.stars)}）を迎え入れた`)}
}
// 形態の向き不向き（本人の能力だけで見た楽曲力）
const typeFit=(p,k)=>Object.entries(TYPES[k].w).reduce((s,[a,w])=>s+w*p.abil[a],0);
// 編成：まだ組のない人（入って1季以上）で、1季に1組まで組む。形態は向いている形態の多数決（ときどき2番目を選ぶ）
function autoForm(done){
  const ready=S.people.filter(p=>!p.unitId&&T()-p.joined>=1);
  if(!ready.length||Math.random()<.25)return;
  const votes={};
  // 2人以上いるときは、たいていグループの形態から選ぶ（ソロばかり増えないように）
  const group=ready.length>=2&&Math.random()<.8;
  const pool=Object.keys(TYPES).filter(k=>!group||TYPES[k].min>=2&&TYPES[k].min<=ready.length);
  ready.forEach(p=>{const f=pool.sort((a,b)=>typeFit(p,b)-typeFit(p,a));const k=Math.random()<.7||!f[1]?f[0]:f[1];votes[k]=(votes[k]||0)+1});
  let type=Object.entries(votes).sort((a,b)=>b[1]-a[1])[0][0];
  if(ready.length<TYPES[type].min){
    // 人数が足りない：ひとりで1年待った人は、向いているソロ形態でデビューさせる
    const lone=ready.find(p=>T()-p.joined>=4);if(!lone)return;
    type=Object.keys(TYPES).filter(k=>TYPES[k].max===1).sort((a,b)=>typeFit(lone,b)-typeFit(lone,a))[0];
  }
  const ty=TYPES[type];
  const size=Math.min(ready.length,ty.max,ty.min+Math.floor(Math.random()*(ty.max-ty.min+1)));
  const ms=[...ready].sort((a,b)=>typeFit(b,type)*rnd(.85,1.15)-typeFit(a,type)*rnd(.85,1.15)).slice(0,size);
  const keepF=F;
  F={id:null,type,name:'',members:new Set(ms.map(p=>p.id))};
  F.name=ty.max===1?genSoloName(ms[0],type):genUnitName();
  const name=F.name;const ok=saveUnit();F=keepF;
  if(ok)done.push(`${ty.name}「${name}」を結成した（${ms.map(p=>p.name).join('、')}）`);
}
// トレーニングの見直し：毎季3割くらいの人だけ見直す。組の形態で大事な能力のうち低いほうを伸ばす。2割はバランス
const POLICY_OF={sing:'voice',play:'play',comp:'comp',dance:'dance',expr:'stage',char:'stage'};
function autoTrain(done){
  let n=0;
  for(const p of S.people){
    if(p.policy==='rest'||Math.random()>=.3)continue;
    const u=p.unitId&&unit(p.unitId);
    let a;
    if(u){const ws=Object.entries(TYPES[u.type].w).sort((x,y)=>y[1]-x[1]).slice(0,2).map(x=>x[0]);a=ws.sort((x,y)=>p.abil[x]-p.abil[y])[0]}
    else a=AB.map(x=>x[0]).sort((x,y)=>p.abil[y]+rnd(0,15)-p.abil[x]-rnd(0,15))[0];
    const pol=Math.random()<.2?'balance':POLICY_OF[a];
    if(pol!==p.policy){p.policy=pol;n++}
  }
  if(n)done.push(`${n}人のトレーニングを見直した`);
}
// 1季進める（手動・自動送り共通）。自動管理の結果は季節の結果に載せる
function advanceSeason(){
  ensureGoals();
  const done=applyAuto();
  const before={};S.units.forEach(u=>before[u.id]=u.bestVenue);
  agencyBefore();
  nextTurn();
  S.report.auto=done;
  agencyAfter(S.report);
  // 初めての大きな会場か夏フェスなら、ライブ本番シーンにする。自動送り中はおまかせで一瞬で終える
  const sc=pickFeatured(before);if(sc)S.liveScene=sc;
  if(S.liveScene&&autoRun&&!S.auto.stopLive)autoResolveLive();
  checkGoals(S.report);
}

// ===== 自動送り =====
let autoRun=false,autoTimer=null,autoLeft=0,autoNote='';
function autoStopReason(r){
  const A=S.auto;
  if(S.pending.length)return '選択が必要なイベントがあります';
  if(S.creditsPending)return '初めての年間大賞です';
  if(A.stopAward&&r.award.some(a=>a.includes('🏆')))return '音楽賞を受賞しました';
  if(A.stopLeave&&r.leave.length)return '事務所を離れた人がいます';
  if(A.stopGoal&&(r.goal||[]).some(g=>g.kind!=='skill'))return '事務所ランク・実績・殿堂に動きがありました';
  return '';
}
function startAuto(){
  if(autoRun)return;
  autoRun=true;autoNote='';
  if(S.popup&&S.pending.length){stopAuto('選択が必要なイベントがあります');return}
  S.popup=false;autoStep();
}
function stopAuto(note){
  autoRun=false;clearInterval(autoTimer);autoTimer=null;
  if(note){autoNote=note;fxToast('自動送りを止めました：'+note)}
  render();
}
function autoStep(){
  if(!autoRun)return;
  needleDrop(()=>{
    if(!autoRun)return;
    advanceSeason();tab='home';F=null;selPid=null;lastResult='';
    render();
    if(S.liveScene){stopAuto('ライブ本番です');afterSeason();return}
    const why=autoStopReason(S.report);
    if(why){stopAuto(why);return}
    autoLeft=S.auto.wait;updateAutoBar();
    autoTimer=setInterval(()=>{
      autoLeft--;updateAutoBar();
      if(autoLeft>0)return;
      clearInterval(autoTimer);autoTimer=null;
      if(!autoRun)return;
      S.popup=false;save();autoStep();
    },1000);
  },true);
}
function updateAutoBar(){const el=document.querySelector('.auto-bar b');if(el)el.textContent=autoLeft}
