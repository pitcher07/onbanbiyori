// シナリオモードとニューゲーム＋（D64）
// シナリオは本編と別のセーブ枠（SC_KEY）で遊ぶ。ルールは S.scenario.id から SCENARIOS を引く
const scRule=()=>S&&S.scenario?SCENARIOS.find(x=>x.id===S.scenario.id):null;
const rosterMax=()=>{const r=scRule();return r&&r.roster||ROSTER_MAX};
const typeAllowed=k=>{const r=scRule();return !r||!r.types||r.types.includes(k)};
const scoutAllowed=()=>{const r=scRule();return !r||!r.noScout};
const scLeft=()=>S.scenario.years*4-T();

// ===== 記録（どのセーブとも別に、端末に残す） =====
function scRecords(){try{return JSON.parse(localStorage.getItem(SC_REC_KEY)||'{}')}catch(e){return {}}}
function scSaveRecord(id,stars,t){
  const rec=scRecords();const old=rec[id];
  if(!old||stars>old.stars||stars===old.stars&&t<old.t)rec[id]={stars,t};
  try{localStorage.setItem(SC_REC_KEY,JSON.stringify(rec))}catch(e){}
}
function scSaved(){try{const s=localStorage.getItem(SC_KEY);return s?JSON.parse(s):null}catch(e){return null}}

// ===== 始める・切り替える =====
function setSlot(k){slot=k;try{localStorage.setItem(SLOT_KEY,k)}catch(e){}}
function startScenario(id){
  const r=SCENARIOS.find(x=>x.id===id);
  if(autoRun)stopAuto();
  setSlot('scenario');
  newGame(r.agency);
  S.scenario={id,years:r.years};
  // 最初の候補者もシナリオのルール（人数・年齢）で選び直す
  S.candidates=[];genAudition(6);
  if(r.setup)r.setup();
  ensureGoals();
  if(r.afterGoals)r.afterGoals();
  hist(`シナリオ「${r.name}」に挑戦（目標：${r.goal}）`);
  save();
}
function switchToMain(){
  if(autoRun)stopAuto();
  setSlot('main');S=load();ensureGoals();
}
function resumeScenario(){
  if(autoRun)stopAuto();
  setSlot('scenario');S=load();ensureGoals();
}
// 起動時：前回シナリオの途中で閉じていれば、そのシナリオから
function loadStartSlot(){
  let k='main';try{k=localStorage.getItem(SLOT_KEY)||'main'}catch(e){}
  slot=k==='scenario'&&scSaved()?'scenario':'main';
  return load();
}

// ===== 毎季の判定（advanceSeason の最後） =====
function scenarioCheck(rep){
  const r=scRule();if(!r||S.scenario.result)return;
  const t=T()-1,year=Math.floor(t/4)+1;
  if(r.check()){
    const stars=year<=r.stars[0]?3:year<=r.stars[1]?2:1;
    S.scenario.result={win:true,stars,t:T(),year};
    scSaveRecord(r.id,stars,T());
    hist(`シナリオ「${r.name}」達成（${year}年目、★${stars}）`);
    rep.goal.unshift({kind:'scenario',text:`シナリオ「${r.name}」を達成した（★${stars}）`});
  }else if(scLeft()<=0){
    S.scenario.result={win:false,stars:0,t:T(),year};
    hist(`シナリオ「${r.name}」は目標に届かなかった`);
  }
  save();
}

// ===== ニューゲーム＋ =====
const canNewGamePlus=()=>!!S&&!S.scenario&&ourAwards('年間大賞').length>0;
// 伝説の先輩：殿堂入りした人 → 殿堂入りした組のメンバー → 年間大賞の多い人 の順に1人
function pickLegend(){
  const all=[...S.people,...S.alumni];
  const byId=id=>all.find(p=>p.id===id);
  let p=S.hall.filter(h=>h.kind==='person').map(h=>byId(h.id)).filter(Boolean)[0];
  if(!p){const names=S.hall.filter(h=>h.kind==='unit').flatMap(h=>h.members||[]);p=all.filter(q=>names.includes(q.name)).sort((a,b)=>ov(b)-ov(a))[0]}
  if(!p)p=[...all].sort((a,b)=>grandCount(b.awards)-grandCount(a.awards)||ov(b)-ov(a))[0];
  if(!p)return null;
  return {id:p.id,name:p.name,abil:Object.fromEntries(AB.map(([a])=>[a,Math.floor(p.abil[a])])),traits:[...p.traits],grand:grandCount(p.awards),from:S.agency,cycle:S.cycle||1};
}
function startNewGamePlus(){
  const carry={dex:S.skillDex,achv:S.achv,cycle:(S.cycle||1)+1,legend:pickLegend(),agency:S.agency};
  if(autoRun)stopAuto();
  newGame(carry.agency);
  S.cycle=carry.cycle;S.skillDex=carry.dex;S.achv=carry.achv;S.dexInit=true;S.legend=carry.legend;
  ensureGoals();
  hist(`${S.cycle}周目が始まった${S.legend?`。伝説の先輩・${S.legend.name}が見守っている`:''}`);
  save();
}
// 伝説の先輩の顔を描くための仮の人物（顔は id と名前で決まる）
const legendFace=L=>({id:L.id,name:L.name,traits:L.traits,abil:L.abil,cond:80});
const legendTop=L=>AB.map(([a])=>a).sort((a,b)=>L.abil[b]-L.abil[a])[0];
