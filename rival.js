// ライバル事務所（D53）。自分の事務所と同じくらいの勢いで育ち、チャート・音楽賞・対バンで競い合う
// 所属アーティストは S.rivals に agency:true で入れる（エンジンのチャートと音楽賞にそのまま参加する）
// 勢い（factor）は 0.75〜1.25 をゆらぎ、所属アーティストの実力は「自分の最近の一番良い曲の出来 × 勢い」に寄っていく
const isAgencyUnit=name=>!!(S&&S.agencyRival&&S.agencyRival.units.includes(name));
function ensureAgency(){
  if(S.agencyRival)return;
  const names=AGENCY_NAMES.filter(n=>n!==S.agency);
  S.agencyRival={name:pick(names),factor:rnd(.85,1.02),rank:0,score:0,units:[],record:{win:0,lose:0},streak:0,results:[]};
  for(let i=0;i<AGENCY_UNITS[0];i++)agencyDebut();
  agencyTune();
}
function agencyDebut(rep){
  const A=S.agencyRival;
  let name;for(let i=0;i<20;i++){name=genUnitName();if(!S.rivals.some(r=>r.name===name)&&!S.units.some(u=>u.name===name)&&name!==S.agency)break}
  const r=newRival(name,30);r.agency=true;r.type=pick(Object.keys(TYPES));
  S.rivals.push(r);A.units.push(name);
  if(rep){rep.event.push(`【ライバル事務所】${A.name}から${TYPES[r.type].name}「${name}」がデビュー`);hist(`ライバル事務所「${A.name}」から「${name}」がデビュー`)}
}
// 実力を自分の事務所の水準に寄せる。看板の組が一番強く、ほかは少し下がる
function agencyTune(){
  const A=S.agencyRival;
  const recent=S.songs.filter(s=>s.ours&&T()-s.t<8).map(s=>s.q);
  const ref=recent.length?Math.max(...recent):30+S.year*3;
  // 序盤は控えめ：1年目は0.85倍、4年目で等倍
  const rule=scRule();const ramp=rule&&rule.agencyHard?1:Math.min(1,.8+S.year*.05);
  S.rivals.filter(r=>r.agency).sort((a,b)=>b.power-a.power).forEach((r,i)=>{
    const target=ref*A.factor*ramp*(1-i*.06);
    r.power=clamp(r.power+(target-r.power)*.5,25,97);
  });
  // ファン数は、自分の一番人気の組と同じくらいを勢いで上下させる
  A.fans=Math.round(Math.max(1000,...S.units.filter(u=>u.active).map(u=>u.fans))*A.factor*.7*ramp);
  A.score=Math.round(officeScore()*A.factor);
  A.rank=Math.max(A.rank,rankOf(A.score));
}
// 季節が進む直前：勢いのゆらぎと実力の調整。チャートに出やすいよう、毎季1曲を足す
function agencyBefore(){
  const A=S.agencyRival;
  A.factor=clamp(A.factor+rnd(-.06,.06)+(A.factor<.85?.02:A.factor>1.05?-.02:0),.72,1.15);
  agencyTune();
  // 毎季2曲（看板の組と、ほかのどれか）
  const us=S.rivals.filter(x=>x.agency).sort((a,b)=>b.power-a.power);
  for(const r of [us[0],pick(us)])if(r)S.songs.push({id:nid(),title:genTitle(),artist:r.name,ex:false,agency:true,q:Math.round(clamp(r.power*rnd(.85,1.1),15,98)),t:T(),ours:false,total:0,peak:null});
}
// 季節が進んだあと：春は新人のデビューと入れ替わり、冬が終わったら1年の事務所対決
function agencyAfter(rep){
  const A=S.agencyRival;
  if(S.season===0){
    const units=S.rivals.filter(r=>r.agency);
    if(units.length<AGENCY_UNITS[1]&&Math.random()<.5)agencyDebut(rep);
    else if(units.length>=AGENCY_UNITS[1]){
      const w=units.sort((a,b)=>a.power-b.power)[0];
      S.rivals=S.rivals.filter(r=>r!==w);A.units=A.units.filter(n=>n!==w.name);
      rep.event.push(`【ライバル事務所】${A.name}の「${w.name}」が活動を終えた`);
      agencyDebut(rep);
    }
    yearMatch(rep);
  }
  // ライバル事務所の受賞は、季節の結果にも載せる
  for(const a of rep.award)if(A.units.some(n=>a.includes(n)))rep.event.push(`【ライバル事務所】${A.name}が${a.split('：')[0]}を受賞`);
}
// 事務所対決：その年の年間チャート（トップ10）に入った曲のうち、それぞれ上位3曲のダウンロード数の合計で比べる（組の数が多いだけでは勝てない）。同じなら受賞数
function yearMatch(rep){
  const A=S.agencyRival,last=S.annual[S.annual.length-1];
  if(!last)return;
  const sum=f=>last.top.filter(f).slice(0,3).reduce((s,x)=>s+x.dl,0);
  const ours=sum(x=>x.ours),theirs=sum(x=>A.units.includes(x.artist));
  const aw=f=>S.awards.filter(a=>a.year===last.year&&f(a)).length;
  const oa=aw(a=>a.ours),ta=aw(a=>A.units.some(n=>a.winner.includes(n)));
  const win=ours>theirs||ours===theirs&&oa>ta;
  if(win){A.record.win++;A.streak=(A.streak||0)+1}else{A.record.lose++;A.streak=0}
  A.results.push({year:last.year,ours,theirs,win});
  const line=`${last.year}年目の事務所対決：${S.agency} ${ours.toLocaleString()}DL 対 ${A.name} ${theirs.toLocaleString()}DL → ${win?'勝利！':'敗北'}（通算${A.record.win}勝${A.record.lose}敗）`;
  rep.chart.push(line);hist(line);
}
