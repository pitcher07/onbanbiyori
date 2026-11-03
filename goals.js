// ゴール（事務所ランク・実績・殿堂入り）の判定。毎季の終わり（nextTurnの直後）に呼ぶ
// 古いセーブにも後から足せるよう、必要なフィールドはここで補う
function ensureGoals(){
  if(!S)return;
  S.achv=S.achv||{};S.hall=S.hall||[];S.rank=S.rank||0;
  S.auto={...AUTO_DEFAULT,...(S.auto||{})};
  S.skillDex=S.skillDex||{};
  ensureAgency();
  // 古いセーブ：いま持っているスキルを図鑑に入れておく
  if(!S.dexInit){S.dexInit=true;S.people.forEach(p=>{skillsOf(p).forEach(([,n])=>S.skillDex[n]??={t:T(),by:p.name});const ts=traitSkill(p);if(ts)S.skillDex[ts]??={t:T(),by:p.name}})}
  S.liveStats={shows:0,awaken:0,legend:0,combo:0,encore:0,breakout:0,battleWin:0,exWin:0,yearendGreat:0,...(S.liveStats||{})};
}
function officeScore(){
  let v=Math.floor(S.dl/100000);
  ourAwards().forEach(a=>v+=SCORE_AWARD[a.name]||0);
  const venue=Math.max(-1,...S.units.map(u=>u.bestVenue));if(venue>=0)v+=SCORE_VENUE[venue];
  const fest=Math.max(-1,...S.units.map(u=>u.bestFest));if(fest>=0)v+=SCORE_FEST[fest];
  return v+S.hall.length*SCORE_HALL;
}
const rankOf=score=>OFFICE_RANKS.reduce((r,x,i)=>score>=x.need?i:r,0);
const grandCount=list=>list.filter(l=>l.endsWith('年間大賞')).length;
function checkHall(rep){
  const inHall=(kind,id)=>S.hall.some(h=>h.kind===kind&&h.id===id);
  for(const u of S.units){
    if(grandCount(u.awards)<HALL_UNIT||inHall('unit',u.id))continue;
    S.hall.push({kind:'unit',id:u.id,name:u.name,type:u.type,year:S.year,members:members(u).map(m=>m.name)});
    hist(`👑 ${u.name}が殿堂入り`);rep.goal.push({kind:'hall',text:`${u.name}が殿堂入り（年間大賞${HALL_UNIT}回）`});
  }
  for(const p of [...S.people,...S.alumni]){
    // 個人は、年間大賞を取った組が2つ以上あるときだけ（同じ組のメンバー全員が並ばないように）
    const wonUnits=S.units.filter(u=>grandCount(u.awards)>0&&(u.members.includes(p.id)||(u.lastMembers||[]).includes(p.name))).length;
    if(grandCount(p.awards)<HALL_PERSON||wonUnits<2||inHall('person',p.id))continue;
    S.hall.push({kind:'person',id:p.id,name:p.name,year:S.year});
    hist(`👑 ${p.name}が個人で殿堂入り`);rep.goal.push({kind:'hall',text:`${p.name}が個人で殿堂入り（年間大賞${HALL_PERSON}回）`});
  }
}
// 新しく達成したものを rep.goal に入れる。初の年間大賞ならエンドロールを予約する
function checkGoals(rep){
  ensureGoals();
  rep.goal=rep.goal||[];
  checkHall(rep);
  // 見せ場スキルを覚えた人（ライブ本番のあとにもう一度呼ばれるので、1季に1回だけ）
  if(!rep.skillDone&&rep.before){
    rep.skillDone=true;
    for(const p of S.people){const b=rep.before[p.id];if(!b)continue;
      const learn=(n,how)=>{const first=S.skillDex[n]==null;if(first)S.skillDex[n]={t:T(),by:p.name};hist(`${p.name}が${how}「${n}」を身につけた`);rep.goal.push({kind:'skill',text:`${p.name}が${how}「${n}」を身につけた${first?'（図鑑に登録）':''}`})};
      for(const [a] of AB)SKILL_AT.forEach((at,i)=>{if(b.abil[a]<at&&p.abil[a]>=at)learn(skillName(p,a,i),`見せ場スキル（${SKILL_TIER_NAME[i]}）`)});
      const mx=o=>Math.max(...AB.map(([a])=>o[a]));
      if(mx(b.abil)<TRAIT_SKILL_AT&&mx(p.abil)>=TRAIT_SKILL_AT&&traitSkill(p))learn(traitSkill(p),'固有スキル')}
  }
  for(const a of ACHIEVEMENTS){
    if(S.achv[a.id]!=null||!a.check())continue;
    S.achv[a.id]=T();
    hist(`実績「${a.name}」を達成`);rep.goal.push({kind:'achv',text:`実績「${a.name}」— ${a.desc}`});
    if(a.id==='grand')S.creditsPending=true;
  }
  const r=rankOf(officeScore());
  if(r>S.rank){
    S.rank=r;
    hist(`事務所ランクが「${OFFICE_RANKS[r].name}」に上がった`);
    rep.goal.unshift({kind:'rank',text:`事務所ランクが「${OFFICE_RANKS[r].name}」に上がった`});
  }
  save();
}
