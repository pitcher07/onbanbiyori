// 画面描画と入力処理
// ===== 部品 =====
function abilRows(p,showPot){
  return AB.map(([a,n])=>{
    const v=Math.floor(p.abil[a]);const known=showPot&&p.train[a]>=2;
    return `<div class="abil"><span>${icon("ability",a)}${n}</span><div class="bar"><i style="width:${v}%"></i>${known?`<b style="left:${p.pot[a]}%"></b>`:''}</div><span class="num">${v}</span><span class="pot" title="素質ランク S〜D（Sが最高）。重点的に育てると判明">${known?rank(p.pot[a]):'?'}</span></div>`;
  }).join('');
}
const traitTags=p=>p.traits.map(t=>`<span class="tag" title="${TRAITS[t].desc}">${icon("trait",t)}${TRAITS[t].name}</span>`).join('');
const ovBox=p=>`<div class="ovbox"><span class="sub">総合</span><b>${ov(p)}</b><span class="sub">向いている形態：${fitTypes(p).join('・')}</span></div>`;
const reviewBox=(p,by)=>`<div class="review">『${esc(p.review)}』<span class="sub">— ${by}</span></div>`;
function compatLine(p){
  const ks=S.people.filter(q=>q!==p&&isKnown(p,q)).map(q=>[q,compat(p,q)]).sort((a,b)=>b[1]-a[1]);
  if(!ks.length)return '';
  const show=[...ks.filter(x=>x[1]>=8).slice(0,3),...ks.filter(x=>x[1]<=-8).slice(-3)];
  return `<div class="sub">相性：${show.map(([q,v])=>`${compatMark(v)}${esc(sn(q))}`).join(' ')||'目立った相手はいない'}</div>`;
}
const sec=(t,a)=>a&&a.length?`<h3>${t}</h3><ul class="log">${a.map(x=>`<li>${pix(x)}</li>`).join('')}</ul>`:'';
// 受賞のまとめ：賞ごとの回数（例：年間大賞×3、最優秀作曲賞）
const awardSum=list=>{const c={};list.forEach(l=>{const n=l.split(' ')[1]||l;c[n]=(c[n]||0)+1});return Object.entries(c).map(([n,k])=>`${n}${k>1?'×'+k:''}`).join('、')};

// 季節の結果（ポップアップとホームで共用）
function summaryHtml(r,home=false){
  const rows=S.people.filter(p=>r.before[p.id]).map(p=>{
    const b=r.before[p.id];const d=ov(p)-b.ov;
    const ch=AB.map(([a,n])=>{const x=Math.floor(p.abil[a])-Math.floor(b.abil[a]);return x?`<span class="${x>0?'good':'warn'}">${n}${x>0?'+':'−'}${Math.abs(x)}</span>`:''}).filter(Boolean).join(' ');
    return {p,d,html:`<tr><td class="nm">${faceButton(p,32,p.cond<35?'tired':d>0?'happy':'')}${p.fav?'★':''}${esc(sn(p))}</td><td class="num">${b.ov}→<b data-count-from="${b.ov}">${ov(p)}</b></td><td class="num ${d>0?'good':d<0?'warn':''}">${d>0?'+'+d:d<0?'−'+(-d):'±0'}</td><td class="sub">${ch||'変化なし'}</td></tr>`};
  }).sort((a,b)=>b.p.fav-a.p.fav||b.d-a.d);
  const goals=(r.goal||[]).map(g=>`<div class="goal-stamp g-${g.kind}"><span class="seal">${g.kind==='rank'?'昇格':g.kind==='hall'?'殿堂':g.kind==='skill'?'習得':g.kind==='dream'?'夢':'達成'}</span>${esc(g.text)}</div>`).join('');
  const hallArt=(r.goal||[]).some(g=>g.kind==='hall')?`<div class="goal-art" style="background-image:url(${illust('hall_of_fame')})"></div>`:'';
  return `<div class="paper">${goals?`<h3>事務所の歩み</h3>${hallArt}${goals}`:''}${rows.length?`${home?'<details class="home-growth"><summary>':'<h3>'}能力の推移${home?` <span class="sub">（${rows.length}人。伸びた人 ${rows.filter(x=>x.d>0).length}人）</span></summary>`:'</h3>'}<div class="tbl"><table class="grow-tbl"><tr><th>名前</th><th class="num">総合</th><th class="num">増減</th><th>能力の変化</th></tr>${rows.map(x=>x.html).join('')}</table></div>${home?'</details>':''}`:''}
  ${eventSection(r.event)}${sec('事務所を離れた人',r.leave)}${sec('新曲',r.song)}${gigSection(r.live)}${sec('チャート・ダウンロード',r.chart)} ${r.award.length?`<h3>音楽賞</h3>${r.award.map(a=>`<div class="award${a.includes('🏆')?' won':''}">${awardIcon(a)}${pix(a)}</div>`).join('')}`:''}${sec('自動で行ったこと',r.auto)}
  ${r.grow.length?`<details><summary>育成の詳細</summary><ul class="log">${r.grow.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:''}</div>`;
}

// ===== 各タブ =====
// ホーム：ライバル事務所。今年のチャートのダウンロード数を並べて比べる
function rivalCard(){
  const A=S.agencyRival;if(!A)return '';
  const yp=Object.values(S.yearPts);
  const ours=Math.round(yp.filter(y=>y.ours).reduce((s,y)=>s+y.pts,0)*DL_PER_PT),theirs=Math.round(yp.filter(y=>isAgencyUnit(y.artist)).reduce((s,y)=>s+y.pts,0)*DL_PER_PT);
  const pct=ours+theirs?Math.round(ours/(ours+theirs)*100):50;
  const units=S.rivals.filter(r=>r.agency);
  return `<div class="card rival-card"><div class="row between"><div><span class="sub">ライバル事務所</span><h2 class="rank-name">${esc(A.name)}</h2><span class="sub">${OFFICE_RANKS[A.rank].name}（ランク${A.rank+1}）${S.rank>A.rank?' ・ こちらが上':S.rank<A.rank?' ・ 相手が上':' ・ 互角'}</span></div>
  <div class="vsbox">${art('live/vs','vs-mark','VS')}<div><span class="sub">事務所対決</span><b>${A.record.win}勝${A.record.lose}敗</b>${A.streak>=2?`<span class="sub">${A.streak}連勝中</span>`:''}</div></div></div>
  <div class="sub" style="margin-top:8px">今年のチャートのダウンロード数（冬に決着）</div>
  ${ours+theirs?`<div class="duel"><span>${esc(S.agency)} <b>${ours.toLocaleString()}</b></span><div class="duel-bar"><i style="width:${pct}%"></i></div><span><b>${theirs.toLocaleString()}</b> ${esc(A.name)}</span></div>`:'<div class="sub">今年はまだ、どちらの曲もチャートに入っていません。</div>'}
  <div class="chips rival-units">${units.map(r=>`<span class="tag">${icon('type',r.type)}${esc(r.name)}</span>`).join('')}</div></div>`;
}
function viewHome(){
  const active=S.units.filter(u=>u.active);
  const fans=S.units.reduce((s,u)=>s+u.fans,0);
  const best=S.chart.filter(c=>c.ours)[0];
  const r=S.report;
  const hints=[];
  if(!S.people.length)hints.push('まずは「発掘」タブで人材を迎えましょう。');
  else if(!active.length)hints.push('「編成」タブでソロやグループを組むと、楽曲が作られるようになります。');
  const rk=S.rank||0,score=officeScore(),nx=OFFICE_RANKS[rk+1];
  const pct=nx?Math.round((score-OFFICE_RANKS[rk].need)/(nx.need-OFFICE_RANKS[rk].need)*100):100;
  const stats=`<div class="card"><div class="stats">
    <div class="stat"><span class="sub">所属</span><b>${S.people.length} / ${rosterMax()}人</b></div>
    <div class="stat"><span class="sub">活動中</span><b>${active.length}組</b></div>
    <div class="stat"><span class="sub">総ファン数</span><b>${fans.toLocaleString()}</b></div>
    <div class="stat"><span class="sub">累計ダウンロード</span><b>${S.dl.toLocaleString()}</b></div>
    <div class="stat"><span class="sub">今季の最高位</span><b>${best?best.rank+'位':'—'}</b></div>
    <div class="stat"><span class="sub">受賞</span><b>${S.awards.filter(a=>a.ours).length}回</b></div>
  </div></div>`;
  return `
  <div class="card street-card">${officeStreet()}</div>
  ${stats}
  <div class="card rank-card"><div class="row between"><div><span class="sub">事務所ランク ${rk+1} / ${OFFICE_RANKS.length}</span><h2 class="rank-name">${OFFICE_RANKS[rk].name}</h2></div><span class="sub">実績ポイント ${score.toLocaleString()}${nx?` ／ 次の「${nx.name}」まで ${(nx.need-score).toLocaleString()}`:' ／ 最高ランク'}</span></div><div class="bar rank-bar"><i style="width:${Math.max(0,Math.min(100,pct))}%"></i></div><div class="sub">実績 ${Object.keys(S.achv).length} / ${ACHIEVEMENTS.length} ・ 殿堂入り ${S.hall.length}</div></div>
  ${rivalCard()}
  ${legendCard()}
  ${hints.length?`<div class="card">${hints.map(h=>`<div class="hint">${uiIcon('bulb','gold')}${h}</div>`).join('')}</div>`:''}
  <div class="card">${r?`<div class="row between"><h2>${esc(r.from)}の結果</h2><button class="btn sm" data-act="showreport">ポップアップで見る</button></div>${summaryHtml(r,true)}`:`<h2>ようこそ</h2><p>「${esc(S.agency)}」の歴史が始まります。育成方針を決めて「次の季節へ」を押すと時間が進みます。分からないことは右上の歯車から開けるヘルプへ。</p>`}</div>`;
}
function viewPeople(){
  if(!S.people.length)return `<div class="card">所属している人はいません。「発掘」タブから迎えましょう。</div>`;
  const list=[...S.people].sort((a,b)=>b.fav-a.fav);
  return `<div class="grid">${list.map(p=>{const u=p.unitId?unit(p.unitId):null;return `<div class="card">
    <div class="row between"><h3 class="identity">${portrait(p,64)}${p.fav?icon('mark','fav'):''}${esc(p.name)}</h3><button class="btn sm" data-act="fav" data-id="${p.id}">${p.fav?'推し解除':'推しにする'}</button></div>
    <div class="sub">${p.age}歳 ・ ${u?`${TYPES[u.type].name}「${esc(u.name)}」`:'研修生（未編成）'} ・ 所属${T()-p.joined}季 ・ ${esc(p.src)}出身</div>
    ${ovBox(p)}
    <div>${traitTags(p)}${skillTags(p)}</div>
    <div class="now-line"><span>${POLICIES[p.policy].name}</span><span class="${p.cond<35?'warn':''}">調子 <b>${Math.round(p.cond)}</b>${p.cond<35?' '+uiIcon('tired','warn'):''}</span></div>
    ${dreamLine(p)}
    <details class="dossier" data-person="${p.id}"><summary>能力・評価・育成設定</summary>${abilRows(p,true)}
    ${reviewBox(p,`音楽ライター ${esc(p.writer)}`)}
    ${compatLine(p)}
    ${p.awards.length?`<div class="sub">${art('live/trophy','ico trophy','受賞')} ${awardSum(p.awards)}</div>`:''}
    <div class="row" style="margin-top:8px"><span class="sub">トレーニング</span><select data-act="policy" data-id="${p.id}">${Object.entries(POLICIES).map(([k,v])=>`<option value="${k}" ${k===p.policy?'selected':''}>${v.name}</option>`).join('')}</select></div>
    <div class="row between" style="margin-top:6px"><span class="sub">調子 <b class="${p.cond<35?'warn':''}">${Math.round(p.cond)}</b></span><button class="btn sm" data-act="release" data-id="${p.id}">契約終了</button></div></details>
  </div>`}).join('')}</div>`;
}
function faceButton(p,size,mood=''){
  return `<button type="button" class="face-link" data-act="profile" data-id="${p.id}" aria-label="${esc(p.name)}の名鑑を開く">${portrait(p,size,mood)}</button>`;
}
function openProfile(id){
  const p=person(id)||S.candidates.find(c=>c.id===id);
  if(!p)return;
  const candidate=S.candidates.includes(p),u=p.unitId&&unit(p.unitId);
  const dialog=document.createElement('dialog');
  dialog.className='profile-dialog';
  dialog.setAttribute('aria-label',p.name+'の名鑑');
  dialog.innerHTML=`<div class="profile-top"><b>${candidate?'候補者名鑑':'所属名鑑'}</b><form method="dialog"><button autofocus class="btn sm">閉じる</button></form></div>
    <h2 class="identity">${portrait(p,64)}${p.fav?icon('mark','fav'):''}${esc(p.name)}</h2>
    <div class="sub">${p.age}歳 ・ ${esc(p.src)}出身 ・ ${candidate?'契約前':u?esc(u.name):'研修生'}${candidate?'':' ・ 所属'+(T()-p.joined)+'季'}</div>
    ${ovBox(p)}${traitTags(p)}${candidate?'':skillTags(p)}${dreamLine(p,true)}${abilRows(p,!candidate)}
    ${candidate?`<div>見込み ${'★'.repeat(p.stars)} ・ ${AB_NAME[p.hint]}に光るものがある</div>`:`<p>調子 ${Math.round(p.cond)} ・ ${POLICIES[p.policy].name}</p>${compatLine(p)}${p.awards.length?`<p>${art('live/trophy','ico trophy','受賞')} ${awardSum(p.awards)}</p>`:''}`}
    ${reviewBox(p,candidate?'スカウト担当のメモ':'音楽ライター '+esc(p.writer))}`;
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
  document.body.append(dialog);dialog.showModal();
}
let selPid=null;
function moveTrainee(id,policy){
  const p=S.people.find(p=>p.id===id);
  if(!p||!Object.hasOwn(POLICIES,policy)||p.policy===policy)return false;
  p.policy=policy;selPid=null;save();return true;
}
function viewTraining(){
  const sel=selPid&&S.people.find(p=>p.id===selPid);
  return `<div class="grid">${Object.entries(POLICIES).map(([k,v])=>{
    const ps=S.people.filter(p=>p.policy===k);
    const duo=pairs(ps).filter(([a,b])=>isKnown(a,b)&&compat(a,b)>=20);
    return `<div class="card room room-${k}" data-room="${k}"><div class="room-scene">${art('rooms/'+k,'room-bg')}<div class="occupants">${ps.map(p=>`<button title="${esc(p.name)}" aria-label="${esc(p.name)}の名鑑を開く" draggable="true" data-drag-person="${p.id}" data-act="profile" data-id="${p.id}" class="occupant figo pose-${k} ${p.id===selPid?'selected':''}" style="--d:${-(p.id%7)*.37}s">${figure(p,1,roomPose(p,k))}${k==='rest'?'<span class="zz" aria-hidden="true">z</span>':''}</button>`).join('')}</div></div><div class="row between"><h3>${v.name}</h3><span class="sub">${ps.length}人</span></div>
    <div class="sub">${v.desc} ・ 調子${v.cost>0?'−'+v.cost:'+'+(-v.cost)}</div>
    <div class="chips">${ps.map(p=>`<button class="chip${p.id===selPid?' on':''}${p.cond<35?' tired':''}" data-act="selp" draggable="true" data-drag-person="${p.id}" aria-pressed="${p.id===selPid}" data-id="${p.id}"><span class="chip-name"><i aria-hidden="true">⠿</i>${p.fav?'★':''}${esc(sn(p))}</span><small>総合${ov(p)}・調子${Math.round(p.cond)}${p.cond<35?` ${uiIcon('tired','warn')}疲労`:''}</small></button>`).join('')||'<span class="sub">だれもいません</span>'}</div>
    ${duo.length?`<div class="sub good">切磋琢磨：${duo.map(([a,b])=>esc(sn(a))+'×'+esc(sn(b))).join('、')}</div>`:''}
    <button class="btn sm room-move" data-act="movep" data-k="${k}" ${sel&&sel.policy!==k?'':'disabled'}>ここへ移動</button></div>`;
  }).join('')}</div>`;
}
function viewUnits(){
  if(F)return viewForm();
  const active=S.units.filter(u=>u.active);
  return `<div class="row" style="margin-bottom:12px;justify-content:flex-end"><button class="btn pri" data-act="newunit" ${S.people.length?'':'disabled'}>＋ 結成する</button></div>
  ${active.length?`<div class="grid">${active.map(u=>{const sp=songPower(u);const n=nextRelease(u);const uc=unitCompat(u);return `<div class="card unit-card">
    <div class="unit-jacket">${art('types/'+u.type,'type-photo')}<div><span class="type-label">${TYPES[u.type].name}</span><h3 class="unit-name">${esc(u.name)}</h3></div></div>
    <div class="sub">${members(u).map(m=>`<span class="member">${faceButton(m,32)}${esc(sn(m))}</span>`).join(' ')}</div>
    <div class="sub">ファン ${u.fans.toLocaleString()} ・ 楽曲 ${u.songs}曲 ・ 累計 ${u.dl.toLocaleString()}DL</div>
    <div class="sub">ライブ ${u.lives}回（最大会場：${u.bestVenue>=0?VENUES[u.bestVenue].name:'—'}）・ 夏フェス：${u.bestFest>=0?FEST[u.bestFest].name:'—'}</div>
    ${u.members.length>1?`<div class="sub">メンバーの相性：${uc.known?`${compatMark(uc.avg)} ${compatLabel(uc.avg)[2]}`:'?（一緒に活動すると判明）'}</div>`:''}
    ${u.awards.length?`<div class="sub">${art('live/trophy','ico trophy','受賞')} ${awardSum(u.awards)}</div>`:''}
    <div style="margin:8px 0 4px"><b>楽曲力 ${Math.round(sp.power)}</b> ・ ライブ力 ${Math.round(livePower(u))} <span class="sub">${n===0?'今季の終わりに新曲を発表':`${n}季後に新曲`}</span></div>
    <details class="power-detail"><summary>楽曲力の内訳</summary><div class="sub">${sp.parts.map(([a,w,v])=>`${AB_NAME[a]}${Math.round(v)}×${Math.round(w*100)}%`).join(' ／ ')}</div>
    <div class="sub">${sp.notes.length?'補正：'+sp.notes.join('、')+' ／ ':''}平均調子 ${Math.round(sp.condAvg)}</div></details>
    <div class="row" style="margin-top:8px"><button class="btn sm" data-act="editunit" data-id="${u.id}">編成・転向</button><button class="btn sm" data-act="disband" data-id="${u.id}">解散</button></div>
  </div>`}).join('')}</div>`:'<div class="card">活動中のアーティストはいません。</div>'}`;
}
function viewForm(){
  const ty=TYPES[F.type];
  const selected=[...F.members].map(person);
  return `<div class="card"><h2>${F.id?'編成・転向':'新しく結成'}</h2>
  <div class="row">${art('types/'+F.type,'form-type-photo')}<span class="sub">${icon("type",F.type)}活動形態</span><select data-act="ftype">${Object.entries(TYPES).filter(([k])=>typeAllowed(k)).map(([k,v])=>`<option value="${k}" ${k===F.type?'selected':''}>${v.name}（${sizeStr(v)}）</option>`).join('')}</select></div>
  <div class="sub">楽曲で重視される能力：${Object.entries(ty.w).map(([a,w])=>AB_NAME[a]+Math.round(w*100)+'%').join('・')}</div>
  <div class="row" style="margin-top:10px"><span class="sub">名前</span><input type="text" data-act="fname" value="${esc(F.name)}" placeholder="候補から選ぶか、自由に入力"></div>
  <div class="row" style="margin-top:6px">${F.sugg.map((s,i)=>`<button class="btn sm" data-act="pickname" data-i="${i}">${esc(s)}</button>`).join('')}<button class="btn sm pri" data-act="reroll">${uiIcon('dice')} 別の候補</button></div>
  <h3 style="margin-top:12px">メンバー（${F.members.size}人選択中 ／ ${sizeStr(ty)}）</h3>
  ${S.people.map(p=>{
    const u=p.unitId&&p.unitId!==F.id?unit(p.unitId):null;
    const cs=selected.filter(q=>q!==p&&isKnown(p,q)).map(q=>`${compatMark(compat(p,q))}${esc(sn(q))}`).join(' ');
    return `<div class="check">${faceButton(p,32)}<label><input type="checkbox" data-act="fmem" data-id="${p.id}" ${F.members.has(p.id)?'checked':''}> ${esc(sn(p))} <span class="sub">${p.age}歳 総合${ov(p)} ／ ${AB.map(([a,n])=>n+Math.floor(p.abil[a])).join(' ')}${cs?` ／ 相性 ${cs}`:''}${u?` ／ 現在「${esc(u.name)}」から移籍`:''}</span></label></div>`;
  }).join('')}
  <div class="row" style="margin-top:12px"><button class="btn pri" data-act="saveunit">決定</button><button class="btn" data-act="cancel">やめる</button></div></div>`;
}
// 夢の1行（D68）。名鑑では叶えた夢も並べる
function dreamLine(p,full=false){
  const done=p.dreamsDone||[];
  const now=p.dream&&DREAMS[p.dream]?`<span class="dream-tag">夢</span>${DREAMS[p.dream].name}`:'<span class="dream-tag">夢</span>夢はすべて叶えた';
  const past=full&&done.length?`<ul class="dream-done">${done.map(d=>`<li>${icon('mark','star')}${DREAMS[d.id].name}<span class="sub">　${dateStr(d.t-1)}に叶えた</span></li>`).join('')}</ul>`:'';
  return `<div class="dream-line">${now}${!full&&done.length?`<span class="sub">（叶えた夢 ${done.length}）</span>`:''}</div>${past}`;
}
function candCard(c){
  return `<div class="card">
    <div class="row between"><h3 class="identity">${faceButton(c,64)}${esc(sn(c))}</h3><span class="sub">${c.age}歳 ・ ${esc(c.src)}</span></div>
    ${ovBox(c)}
    <div>${traitTags(c)}</div>
    ${dreamLine(c)}
    ${abilRows(c,false)}
    <div class="sub" style="margin-top:6px">見込み ${'★'.repeat(c.stars)}${'☆'.repeat(5-c.stars)}（推定） ・ ${AB_NAME[c.hint]}に光るものがある</div>
    ${reviewBox(c,'スカウト担当のメモ')}
    <button class="btn pri sm" style="margin-top:8px" data-act="sign" data-id="${c.id}" ${S.people.length>=rosterMax()?'disabled':''}>迎え入れる</button>
  </div>`;
}
function viewScout(){
  const aud=S.candidates.filter(c=>c.src==='オーディション'),sc=S.candidates.filter(c=>c.src!=='オーディション');
  const rule=scRule();
  if(rule&&rule.noScout&&!S.candidates.length)return '<div class="card">このシナリオでは発掘をしません。いまの所属で目標を目指しましょう。</div>';
  return `<h2>オーディション</h2>
  ${rule&&rule.audition===0?'<div class="card">このシナリオではオーディションはありません。</div>':S.season===0?(aud.length?`<div class="grid">${aud.map(candCard).join('')}</div>`:'<div class="card">今回の候補者はもういません。</div>'):'<div class="card">オーディションは毎年春に開催されます。</div>'}
  <h2 style="margin-top:18px">スカウト <span class="sub">（1季に1か所）</span></h2>
  ${!scoutAllowed()?'<div class="card">このシナリオではスカウトはできません。</div>':''}<div class="grid"${scoutAllowed()?'':' hidden'}>${Object.entries(PLACES).map(([k,v])=>`<div class="card place">${art('scout/'+k,'place-photo')}<h3>${v.name}</h3><div class="sub">${v.desc}</div><button class="btn sm" style="margin-top:6px" data-act="scout" data-k="${k}" ${S.scouted?'disabled':''}>ここで探す</button></div>`).join('')}</div>
  ${sc.length?`<div class="grid" style="margin-top:12px">${sc.map(candCard).join('')}</div>`:''}`;
}
function chartMove(c){
  const d=c.prev-c.rank;
  const [kind,label]=!c.prev?['new','New']:d>0?['up','↗ '+d+' UP']:d<0?['down','↘ '+(-d)+' DOWN']:['flat','→ KEEP'];
  return `<span class="chart-move ${kind}">${label}</span>`;
}
function viewChart(){
  const row=c=>`<tr class="${c.ours?'ours':''}"><td class="num">${c.rank}</td><td class="song-cell">${jacket(c)}${esc(c.title)}</td><td>${esc(c.artist)}${c.ex?' <span class="tag">元所属</span>':''}${isAgencyUnit(c.artist)?' <span class="tag ag">ライバル事務所</span>':''}</td><td class="num">${c.dl.toLocaleString()}</td><td class="sub">${chartMove(c)}</td></tr>`;
  const last=S.annual[S.annual.length-1];
  const lastAwards=last?S.awards.filter(a=>a.year===last.year):[];
  const units=[...S.units].sort((a,b)=>b.fans-a.fans);
  const ours=S.songs.filter(s=>s.ours).sort((a,b)=>b.total-a.total).slice(0,10);
  return `<div class="card"><h2>今季のチャート</h2><div class="tbl"><table><tr><th>順位</th><th>曲名</th><th>アーティスト</th><th class="num">DL数</th><th>変動</th></tr>${S.chart.map(row).join('')}</table></div><div class="sub" style="margin-top:6px">色付きの行が所属アーティストの曲です。</div></div>
  ${last?`<div class="card"><h2>${last.year}年目 年間チャート</h2><div class="tbl"><table><tr><th>順位</th><th>曲名</th><th>アーティスト</th><th class="num">年間DL数</th></tr>${last.top.map(c=>`<tr class="${c.ours?'ours':''}"><td class="num">${c.rank}</td><td class="song-cell">${jacket(c)}${esc(c.title)}</td><td>${esc(c.artist)}</td><td class="num">${c.dl.toLocaleString()}</td></tr>`).join('')}</table></div>
  ${lastAwards.length?`<h3 style="margin-top:12px">${last.year}年目 音楽賞</h3><ul class="log">${lastAwards.map(a=>`<li>${awardIcon(a.name)}${a.name}：${esc(a.winner)}${a.ours?' '+art('live/trophy','ico trophy','受賞'):''}</li>`).join('')}</ul>`:''}</div>`:''}
  <div class="card"><h2>所属アーティスト</h2>${units.length?`<div class="tbl"><table><tr><th>#</th><th>名前</th><th>形態</th><th class="num">ファン</th><th class="num">累計DL</th><th class="num">曲数</th><th>最大会場</th></tr>${units.map((u,i)=>`<tr><td class="num">${i+1}</td><td>${esc(u.name)}${u.active?'':' <span class="sub">（活動終了）</span>'}</td><td>${TYPES[u.type].name}</td><td class="num">${u.fans.toLocaleString()}</td><td class="num">${u.dl.toLocaleString()}</td><td class="num">${u.songs}</td><td>${u.bestVenue>=0?VENUES[u.bestVenue].name:'—'}</td></tr>`).join('')}</table></div>`:'<div class="sub">まだいません。</div>'}</div>
  <div class="card"><h2>所属楽曲 歴代ベスト</h2>${ours.length?`<div class="tbl"><table><tr><th>#</th><th>曲名</th><th>アーティスト</th><th class="num">出来</th><th class="num">最高位</th><th class="num">累計DL</th><th>発表</th></tr>${ours.map((s,i)=>`<tr><td class="num">${i+1}</td><td class="song-cell">${jacket(s)}${esc(s.title)}</td><td>${esc(s.artist)}</td><td class="num">${s.q}</td><td class="num">${s.peak||'—'}</td><td class="num">${s.dl.toLocaleString()}</td><td class="sub">${dateStr(s.t)}</td></tr>`).join('')}</table></div>`:'<div class="sub">まだありません。</div>'}</div>`;
}
// 殿堂入りのカード：受賞・代表曲・数字の実績を書き込む
function hallCard(h){
  const line=(k,v)=>v?`<div class="hall-row"><span>${k}</span><div>${v}</div></div>`:'';
  const grandYears=list=>list.filter(l=>l.endsWith('年間大賞')).map(l=>l.split(' ')[0]).join('・');
  const others=list=>{const c={};list.filter(l=>!l.endsWith('年間大賞')).forEach(l=>{const n=l.split(' ')[1];c[n]=(c[n]||0)+1});return Object.entries(c).map(([n,k])=>`${n}${k>1?'×'+k:''}`).join('、')};
  if(h.kind==='person'){
    const p=person(h.id);if(!p)return '';
    const units=S.units.filter(u=>u.members.includes(p.id)||(u.lastMembers||[]).includes(p.name)).map(u=>esc(u.name));
    const top=AB.map(([a,n])=>[n,Math.floor(p.abil[a])]).sort((x,y)=>y[1]-x[1]).slice(0,2).map(([n,v])=>n+v).join('・');
    return `<div class="sleeve-card"><div class="hall-head">${portrait(p,48)}<div><b>${esc(p.name)}</b><span class="sub">個人 ・ ${h.year}年目に殿堂入り</span></div></div>
    ${line('年間大賞',`${grandCount(p.awards)}回（${grandYears(p.awards)}）`)}${line('ほかの受賞',others(p.awards))}${line('所属した組',units.join('、'))}
    ${line('得意',top)}${line('見せ場',skillsOf(p).map(x=>x[1]).join('、'))}${line('いま',S.people.includes(p)?`所属中 ・ ${p.age}歳`:`${esc(p.leftReason||'契約終了')}（${dateStr(p.left)}）`)}</div>`;
  }
  const u=unit(h.id);if(!u)return '';
  const songs=S.songs.filter(s=>s.ours&&s.unitId===u.id).sort((a,b)=>b.dl-a.dl).slice(0,3);
  const ms=(u.active?members(u).map(m=>m.name):u.lastMembers||h.members||[]).map(n=>esc(lastName(n))).join('、');
  return `<div class="sleeve-card"><div class="hall-head">${art('types/'+u.type,'type-photo')}<div><b>${esc(u.name)}</b><span class="sub">${TYPES[u.type].name} ・ ${h.year}年目に殿堂入り</span></div></div>
  ${line('年間大賞',`${grandCount(u.awards)}回（${grandYears(u.awards)}）`)}${line('ほかの受賞',others(u.awards))}
  ${line('代表曲',songs.map(s=>`「${esc(s.title)}」<span class="sub">${s.peak?s.peak+'位':''} ${s.dl.toLocaleString()}DL</span>`).join('<br>'))}
  ${line('記録',`ファン ${u.fans.toLocaleString()} ・ 累計 ${u.dl.toLocaleString()}DL ・ ${u.songs}曲`)}
  ${line('ステージ',`${u.bestVenue>=0?VENUES[u.bestVenue].name:'—'}${u.bestFest>=0?' ・ 夏フェス '+FEST[u.bestFest].name:''} ・ ライブ${u.lives}回`)}
  ${line('メンバー',ms)}${line('活動',`${dateStr(u.debut??u.formed)}〜${u.active?'活動中':dateStr(u.ended)}`)}</div>`;
}
// ===== 歴史：目次と各ページ（D57） =====
let histSec=null,dexCat='sing';
// 見せ場スキル図鑑の全項目（番号つき）。能力スキル90 → 固有20 → 合体21 の順
function dexEntries(){
  const out=[];let no=1;
  for(const [a] of AB)for(const [st,names] of Object.entries(SKILL_TREE[a]))names.forEach((n,t)=>out.push({no:no++,n,cat:a,a,st,t,kind:'ab'}));
  for(const [tr,n] of Object.entries(TRAIT_SKILLS))out.push({no:no++,n,cat:'trait',tr,kind:'trait'});
  for(const [k,n] of Object.entries(COMBOS)){const [x,y]=k.split('+');out.push({no:no++,n,cat:'combo',a:x,b:y,kind:'combo'})}
  return out;
}
// 図鑑の記録は、古いセーブでは通算季数だけ、新しいものは {t, by}
const dexRec=n=>{const v=S.skillDex[n];return v==null?null:typeof v==='number'?{t:v}:v};
const DEX_CATS=[...AB.map(([a,n])=>[a,n]),['trait','固有'],['combo','合体']];
function dexDesc(e){
  if(e.kind==='ab')return `${AB_NAME[e.a]}が${SKILL_AT[e.t]}に届くと目覚める、${AB_NAME[e.st]}型の${SKILL_TIER_NAME[e.t]}。見せ場で成功すると盛り上がり+${4+e.t*2}、覚醒で+${22+e.t*4}。`;
  if(e.kind==='trait')return `「${TRAITS[e.tr].name}」の人が、能力のどれかが${TRAIT_SKILL_AT}に届くと目覚める固有スキル。どの見せ場でも覚醒できる。`;
  return `相性◎の2人が、${AB_NAME[e.a]}と${AB_NAME[e.b]}のスキルを持つと狙える合体スキル。成功しやすく、覚醒で+30。`;
}
function dexCardHtml(e){
  const r=dexRec(e.n),no='No.'+String(e.no).padStart(3,'0');
  const ec=ABIL_COLOR[e.kind==='trait'?'trait':e.a];
  const emblem=e.kind==='ab'?abilBadge(e.a,52):e.kind==='trait'?icon('trait',e.tr):icon('ability',e.a)+icon('ability',e.b);
  const tier=e.kind==='ab'?`<span class="dyn d${e.t}" title="${SKILL_TIER_READ[e.t]}">${SKILL_TIER_NAME[e.t]}</span>`:e.kind==='trait'?'<span class="dyn dt">固有</span>':'<span class="dyn dc">合体</span>';
  const kind=e.kind==='ab'?`${AB_NAME[e.a]} ・ ${AB_NAME[e.st]}型`:e.kind==='trait'?`個性「${TRAITS[e.tr].name}」`:`${AB_NAME[e.a]} × ${AB_NAME[e.b]}`;
  if(!r)return `<div class="dex-card lock"><div class="dex-top"><span>${no}</span>${tier}</div><div class="dex-emblem">${emblem}</div><b class="dex-name">？？？</b><span class="dex-kind">${kind}</span></div>`;
  return `<div class="dex-card got k-${e.kind} t${e.kind==='ab'?e.t:'x'}"><div class="dex-top"><span>${no}</span>${tier}</div><div class="dex-emblem" style="--ac:${ec}">${emblem}</div><b class="dex-name">${esc(e.n)}</b><span class="dex-kind">${kind}</span><p class="dex-desc">${dexDesc(e)}</p><span class="dex-first">${r.by?`初めて：${esc(r.by)}`:'登録済み'} ・ ${dateStr(r.t)}</span></div>`;
}
function viewDex(){
  const all=dexEntries(),got=all.filter(e=>dexRec(e.n)).length,pct=Math.round(got/all.length*100);
  const cats=DEX_CATS.map(([k,n])=>{const es=all.filter(e=>e.cat===k);const g=es.filter(e=>dexRec(e.n)).length;
    return `<button class="dex-tab${dexCat===k?' on':''}${g===es.length?' full':''}" data-act="dexcat" data-k="${k}">${k==='trait'?icon('mark','star'):k==='combo'?icon('mark','best'):icon('ability',k)}<span>${n}</span><small>${g}/${es.length}</small></button>`}).join('');
  const es=all.filter(e=>e.cat===dexCat);
  // 能力スキルは型ごとに1行（mf→f→ff）。固有と合体は並べるだけ
  const body=dexCat==='trait'||dexCat==='combo'
    ?`<div class="dex-grid">${es.map(dexCardHtml).join('')}</div>`
    :Object.keys(SKILL_TREE[dexCat]).map(st=>`<div class="dex-line"><div class="dex-line-head">${icon('ability',st)}${AB_NAME[st]}型</div><div class="dex-grid three">${es.filter(e=>e.st===st).map(dexCardHtml).join('<i class="dex-arrow">▶</i>')}</div></div>`).join('');
  return `<div class="card dex-book"><div class="dex-cover"><div><small>SKILL ENCYCLOPEDIA</small><h2>見せ場スキル図鑑</h2><p class="sub">ライブ本番の見せ場で輝く技の記録。覚えた技が、ここに綴じられていく。</p></div>
  <div class="dex-progress"><b>${got}<small> / ${all.length}</small></b><div class="bar"><i style="width:${pct}%"></i></div><span class="sub">収録率 ${pct}%</span></div></div>
  <div class="dex-tabs">${cats}</div>${body}</div>`;
}
function viewHistory(){
  const won=S.awards.filter(a=>a.ours);
  const ended=S.units.filter(u=>!u.active);
  const A=S.agencyRival;
  const dexGot=Object.keys(S.skillDex).length,dexAll=SKILL_TOTAL+Object.keys(COMBOS).length;
  const secs=[
    ['hall','殿堂',icon('mark','star'),`${S.hall.length}組・人`,S.hall.length?S.hall.slice(-2).map(h=>esc(h.name)).join('、'):'年間大賞3回で殿堂入り'],
    ['achv','実績',icon('mark','best'),`${Object.keys(S.achv).length} / ${ACHIEVEMENTS.length}`,'事務所の歩みの記録'],
    ['dex','見せ場スキル図鑑',icon('ability','sing'),`${dexGot} / ${dexAll}`,'覚えた技の図鑑'],
    ['awards','受賞歴',awardIcon('年間大賞'),`${won.length}回`,won.length?`最新：${won[won.length-1].year}年目 ${won[won.length-1].name}`:'まだ受賞はありません'],
    ['rival','事務所対決',art('live/vs','ico'),A?`${A.record.win}勝${A.record.lose}敗`:'—',A?`相手：${esc(A.name)}`:''],
    ['dreams','叶った夢',icon('mark','star'),`${(S.dreamLog||[]).length}個`,(S.dreamLog||[]).length?`最新：${esc(lastName(S.dreamLog[S.dreamLog.length-1].name))}「${DREAMS[S.dreamLog[S.dreamLog.length-1].dream].name}」`:'所属の人の夢が叶うと、ここに残ります'],
    ['timeline','年表',icon('nav','history'),`${S.history.length}件`,`${S.year}年目まで`],
    ['ended','活動を終えた組',icon('nav','units'),`${ended.length}組`,''],
    ['alumni','事務所を離れた人',icon('nav','people'),`${S.alumni.length}人`,''],
  ];
  if(!histSec)return `<div class="hist-index">${secs.map(([k,n,ic,c,d])=>`<button class="hist-sec" data-act="hsec" data-k="${k}"><span class="hist-ic">${ic}</span><span class="hist-txt"><b>${n}</b><small>${d}</small></span><span class="hist-count">${c}</span></button>`).join('')}</div>`;
  const title=secs.find(x=>x[0]===histSec)[1];
  const back=`<div class="hist-back"><button class="btn sm" data-act="hsec" data-k="">◀ 歴史の目次</button><h2>${title}</h2></div>`;
  const by={};S.history.forEach(h=>{const y=Math.floor(h.t/4)+1;(by[y]=by[y]||[]).push(h)});
  const body={
    hall:()=>`<div class="hall-art" style="background-image:url(${illust('hall_of_fame')})"></div>`+(S.hall.length?`<div class="card hall"><div class="hall-shelf">${S.hall.map(hallCard).join('')}</div></div>`:'<div class="card sub">まだ殿堂入りはいません。年間大賞を3回取った組、または年間大賞を取った組が2つ以上ある人が通算5回取ると殿堂入りします。</div>'),
    achv:()=>`<div class="card"><div class="achv-list">${ACHIEVEMENTS.map(a=>{const t=S.achv[a.id];return `<div class="achv${t!=null?' got':''}"><span class="seal">${t!=null?'達成':'未'}</span><div><b>${a.name}</b><div class="sub">${a.desc}${t!=null?` ・ ${dateStr(t)}`:''}</div></div></div>`}).join('')}</div></div>`,
    dex:viewDex,
    dreams:()=>`<div class="card">${(S.dreamLog||[]).length?[...S.dreamLog].reverse().map(d=>{const p=[...S.people,...S.alumni].find(x=>x.id===d.pid);return `<div class="hist-row">${p?portrait(p,32):''}<b>${esc(d.name)}</b> <span>「${DREAMS[d.dream].name}」</span> <span class="sub">${dateStr(d.t-1)}</span></div>`}).join(''):'<p class="sub">まだ叶った夢はありません。所属の人はそれぞれ夢を持っています（所属タブ・名鑑で見られます）。</p>'}</div>`,
    awards:()=>`<div class="card">${won.length?`<ul class="log">${[...won].reverse().map(a=>`<li>${awardIcon(a.name)}${a.year}年目 ${a.name}：${pix(a.winner)}</li>`).join('')}</ul>`:'<p class="sub">まだ受賞はありません。</p>'}</div>`,
    rival:()=>A?`<div class="card"><p>${esc(S.agency)} 対 ${esc(A.name)}：<b>${A.record.win}勝${A.record.lose}敗</b>${A.streak>=2?`（${A.streak}連勝中）`:''}</p>${A.results.length?`<div class="tbl"><table><tr><th>年</th><th class="num">${esc(S.agency)}</th><th class="num">${esc(A.name)}</th><th>結果</th></tr>${[...A.results].reverse().map(r=>`<tr class="${r.win?'ours':''}"><td>${r.year}年目</td><td class="num">${r.ours.toLocaleString()}DL</td><td class="num">${r.theirs.toLocaleString()}DL</td><td>${r.win?'勝利':'敗北'}</td></tr>`).join('')}</table></div>`:'<p class="sub">最初の決着は1年目の冬です。</p>'}</div>`:'',
    timeline:()=>`<div class="card">${Object.keys(by).sort((a,b)=>b-a).map(y=>`<div class="year">${y}年目</div><ul class="log">${by[y].slice().reverse().map(h=>`<li><span class="sub">${SEASONS[h.t%4]}</span> ${pix(h.text)}</li>`).join('')}</ul>`).join('')}</div>`,
    ended:()=>`<div class="card">${ended.length?ended.map(u=>`<div class="hist-row"><b>${esc(u.name)}</b> <span class="sub">${TYPES[u.type].name} ・ ${dateStr(u.formed)}〜${dateStr(u.ended)} ・ ${(u.lastMembers||[]).map(n=>esc(lastName(n))).join('、')} ・ ${u.songs}曲 ・ ファン${u.fans.toLocaleString()}</span></div>`).join(''):'<p class="sub">まだいません。</p>'}</div>`,
    alumni:()=>`<div class="card">${S.alumni.length?[...S.alumni].reverse().map(p=>`<div class="hist-row">${portrait(p,32)}<b>${esc(p.name)}</b> <span class="sub">${esc(p.leftReason||'契約終了')} ・ ${dateStr(p.joined)}〜${dateStr(p.left)} ・ ${p.age}歳 ・ 総合${ov(p)}${p.awards.length?` ・ ${art('live/trophy','ico trophy','受賞')}${p.awards.length}`:''}</span></div>`).join(''):'<p class="sub">まだいません。</p>'}</div>`,
  }[histSec];
  return back+body();
}

// ===== ヘルプ =====
// メニューの「ヘルプ」タブの中身（D65）
function helpBody(){
  const sc=(t,b)=>`<details><summary>${t}</summary><div class="help-body">${b}</div></details>`;
  const tbl=(head,rows)=>`<div class="tbl"><table><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table></div>`;
  const wStr=w=>Object.entries(w).sort((a,b)=>b[1]-a[1]).map(([a,v])=>AB_NAME[a]+Math.round(v*100)+'%').join('・');
  return `<p class="sub">見出しを押すと開きます。</p>
  ${sc('ゲームの流れ','<p>1ターン＝1季節（春・夏・秋・冬）。トレーニング・編成・発掘を決めて「次の季節へ」を押すと、成長→ライブ（夏はフェスも）→新曲の発表→チャート→イベントの順に進み、結果がポップアップで表示されます。冬には年間チャートと音楽賞が決まります。終わりはなく、ブラウザに自動保存されます。</p>')}
  ${sc('能力と素質ランク（S〜D）',`<p>能力は6種類（${AB.map(x=>x[1]).join('・')}）で、1〜100の値です。</p><p>能力ごとに隠れた<b>素質</b>があり、伸びやすさと伸びの限界の目安になります。素質は5段階のランクで表示され、Sが最高です。</p>${tbl(['ランク','素質の値','目安'],RANKS.map(([r,min],i)=>[`<b>${r}</b>`,i===0?`${min}以上`:`${min}〜${RANKS[i-1][1]-1}`,RANK_NOTE[r]]))}<p>最初は「?」と表示されます。その能力を重点的に育てると判明し、能力バーの縦線で素質の位置が分かります。能力が素質を超えると成長が鈍りますが、止まりはしません。まれに「才能開花」で素質そのものが伸びます。</p>`)}
  ${sc('総合値と向いている形態','<p><b>総合</b>は、得意な上位3能力の平均を7割、全能力の平均を3割として計算した総合力です。<b>向いている形態</b>は、本人の能力だけで見たときに楽曲力が高くなる活動形態の上位2つです。</p>')}
  ${sc('トレーニング',tbl(['部屋','伸びる能力','調子'],Object.values(POLICIES).map(p=>[p.name,p.desc,p.cost>0?`−${p.cost}`:`+${-p.cost}`]))+'<p class="sub">◎よく伸びる ○そこそこ △少し。「トレーニング」タブで部屋ごとに誰がいるかを見ながら移動できます。顔や名前札を別の部屋へドラッグ（スマホは長押ししてから）するか、名前札を押して移動先の「ここへ移動」を押します。顔を押すと名鑑が開きます。</p>')}
  ${sc('自然な成長と衰え','<p>トレーニングしなくても、素質に余裕がある能力は自然に伸びることがあります。その季節にトレーニングしていない能力は、たまに少し下がります。</p>')}
  ${sc('年齢','<p>毎年春に1歳ずつ年を取ります。若いほど伸びやすく（20歳未満は+15%）、26歳から少しずつ伸びにくくなり、31歳を過ぎると衰えやすくなります。30歳を過ぎると、冬に引退の相談が来ることがあります。</p>')}
  ${sc('調子','<p>トレーニングやライブで減り、休養で大きく回復します（10〜100）。調子が低いと成長しにくくなり、楽曲の出来も少し下がります。35未満の人が休養以外の部屋にいると、トレーニングタブに「!」が付きます（タブを開くとその季節は消えます）。</p>')}
  ${sc('個性',tbl(['個性','効果'],Object.values(TRAITS).map(t=>[t.name,t.desc])))}
  ${sc('相性',`<p>人と人の間には隠れた相性があり、同じ組で活動するか、同じトレーニングの部屋で過ごすと判明します。</p>${tbl(['表示','意味'],COMPAT_LABEL.map(([,m,n])=>[m,n]))}<p>組のメンバーの相性は楽曲の出来に影響し、悪いと調子も減りやすくなります。相性が悪すぎると、不和や解散の危機が起きます。相性の良い人（◎）と同じ部屋でトレーニングすると、伸びが15%良くなります（切磋琢磨）。</p>`)}
  ${sc('推し',`<p>最大${FAV_MAX}人まで指名できます。トレーニング効果+15%、自然に伸びやすい、調子が減りにくい、の効果があります。一覧の先頭に並び、年表に★付きで残ります。</p>`)}
  ${sc('評価コメント','<p>所属している人には、音楽ライターの評価コメントが付きます。能力・個性・最近の成長ぶり・年齢などから、季節ごとに書き直されます。候補者にはスカウト担当のメモが付きます。</p>')}
  ${sc('発掘',`<p><b>オーディション</b>：毎年春に開催。候補は5人（${AUDITION_AGES[0]}〜${AUDITION_AGES[1]}歳）です。<br><b>スカウト</b>：毎季1回、場所を選んで候補2人と出会えます。</p>${tbl(['場所','傾向'],Object.values(PLACES).map(p=>[p.name,p.desc]))}<p>候補者はその季節の間だけ迎え入れられます。所属は${ROSTER_MAX}人まで。見込み★は推定なので、ずれることがあります。</p>`)}
  ${sc('活動形態と編成',tbl(['形態','人数','楽曲で重視する能力'],Object.values(TYPES).map(t=>[t.name,sizeStr(t),wStr(t.w)]))+'<p>1人が所属できるのは1組までです。メンバーや形態を変えると結束ボーナスがリセットされ、その季節は新曲が出ません（改名だけなら影響なし）。</p>')}
  ${sc('楽曲','<p>結成の次の季節に1曲目を発表し、その後は2季節ごとに自動で発表します。出来は「形態ごとに重視する能力 × メンバーの能力」で決まります。作曲とカリスマはメンバーの最高値、ほかは平均値を使います。個性・結束・相性による補正があり、内訳は編成タブで見られます。</p>')}
  ${sc('ライブ・夏フェス',`<p>新曲を出さない季節は、自動でライブを行います。会場はファン数で決まり、動員とファンの増え方はライブ力（カリスマ・表現・歌唱/演奏/ダンスの最高値）で変わります。</p>${tbl(['会場','収容','必要ファン数'],VENUES.map(v=>[v.name,v.cap.toLocaleString()+'人',v.need.toLocaleString()]))}<p>夏はファン数に応じて夏フェスに出演します。</p>${tbl(['出演枠','必要ファン数'],FEST.map(f=>[f.name,f.need.toLocaleString()]))}`)}
  ${sc('チャート・ダウンロード数・音楽賞','<p>毎季、架空のライバルの曲と競うトップ10チャートが発表されます。順位はその季節のダウンロード数で決まります。曲は発表から4季節チャートに残り、だんだん勢いが落ちます。順位が高いほどファンが増え、ファンが多いほど次の曲がダウンロードされやすくなります。ダウンロード数は曲・アーティスト・事務所ごとに累計されます。</p><p>冬には音楽賞（年間大賞・最優秀アーティスト賞・最優秀新人賞・最優秀作曲賞）が決まります。</p>')}
  ${sc('イベント','<p>毎季1〜3件のイベントがランダムに起きます。季節限定のもの（春の花粉症、夏バテ、芸術の秋、年末年始の休みなど）もあります。選択肢のあるイベントは、季節の結果の前にどうするかを選びます。</p>')}
  ${sc('事務所ランク・実績・殿堂',`<p>実績ポイントがたまると<b>事務所ランク</b>が上がり、ホームの建物も育ちます（下がることはありません）。</p>${tbl(['ランク','必要ポイント'],OFFICE_RANKS.map((r,i)=>[`${i+1}. ${r.name}`,r.need.toLocaleString()]))}<p>実績ポイント：累計10万ダウンロードごとに1、音楽賞（${Object.entries(SCORE_AWARD).map(([n,v])=>n+v).join('・')}）、最大会場（${VENUES.slice(1).map((v,i)=>v.name+SCORE_VENUE[i+1]).join('・')}）、夏フェスの最高枠（${FEST.map((f,i)=>f.name+SCORE_FEST[i]).join('・')}）、殿堂入り1つにつき${SCORE_HALL}。</p><p><b>実績</b>は${ACHIEVEMENTS.length}種類。歴史タブで一覧できます。</p><p><b>殿堂入り</b>：年間大賞を${HALL_UNIT}回取った組、または組をまたいで${HALL_PERSON}回取った人が殿堂入りします。初めて年間大賞を取ったときは、エンドロールが流れます。</p>`)}
  ${sc('ライブ本番・見せ場スキル',`<p>次のときは<b>ライブ本番</b>になります（1季に1回まで、上ほど優先）。</p><ul><li>初めてホール・アリーナ・ドームで公演するとき</li><li>夏フェス（隣のステージのライバルと対決）</li><li>冬の<b>年末の大一番</b>（その年いちばんファンの多い組。毎年1回）</li><li>春と秋にときどき<b>対バン</b>（ライバルと対決。独立した元所属が相手のことも）</li></ul><p>開演前に「1曲目」と「ここぞの1曲」を選びます。3曲の間に<b>見せ場</b>が4回来るので、<b>攻める</b>（大きく狙う。外すこともある）・<b>魅せる</b>（確実に盛り上げる）・<b>任せる</b>（本人次第。「本番に強い」「天然」などの個性が出る）から指示します。成否は、その能力・調子・個性で決まります。</p><p>能力が${SKILL_AT[0]}に届くと<b>見せ場スキル</b>を覚え、${SKILL_AT[1]}で上位版、${SKILL_AT[2]}で最上位版になります。段階は強弱記号で <b>mf</b>（メゾフォルテ）→ <b>f</b>（フォルテ）→ <b>ff</b>（フォルティッシモ）と表します。同じ能力でも、人ごとに決まった<b>型</b>（もう一つの持ち味）でスキルが変わります。能力6つ×型5つ×3段階で90種あります。段階が高いほど、成功したときと覚醒したときの伸びが大きくなります。</p><p>能力のどれかが${TRAIT_SKILL_AT}に届くと、個性の<b>固有スキル</b>（20種）にも目覚めます。固有スキルは、どの見せ場でも覚醒できます。</p><p>盛り上がりが80以上のときに、スキルを持つ見せ場で「攻める」か「任せる」が決まると<b>覚醒</b>します。覚えたスキルと決めた合体スキルは、歴史タブの<b>見せ場スキル図鑑</b>に、最初に覚えた人と時期つきで登録されます。</p>${tbl(['評価','盛り上がり','ライブで増えるファン'],LIVE_GRADES.slice(1).map(g=>[g.name,g.min+'以上',`×${g.mult}`]).concat([['不発','それ未満','×0.7']]))}<p><b>合体スキル</b>：相性◎と分かっている2人がどちらも見せ場スキルを持っていると、ふたりの見せ場が来ることがあります（成功しやすく、覚醒すると大きい）。</p><p><b>ハプニング</b>：2曲目のあとに、機材トラブル・雨（フェスのみ）・客席の大合唱・目立たない人にスポットが当たる、のどれかが起きることがあります。目立たない人が化けると「殻を破る」の覚醒になります。</p><p><b>アンコール</b>：3曲を終えて盛り上がりが100以上なら、もう1曲。</p><p><b>対決</b>：ライバルも曲と見せ場ごとに盛り上がりを積みます。最後に上回れば勝ちで、ファンがさらに増えます。負けると増え方が半分になります。</p><p class="sub">「伝説」は覚醒が1回以上あるときだけ。所属曲が3位以内に入った季節はチャート発表、冬は音楽賞の授賞式が、季節の結果の前に入ります（押せば飛ばせます）。自動モード中も、ライブ本番では止まって指示できます。</p>`)}
  ${sc('ライバル事務所',`<p>あなたの事務所と同じくらいの勢いで育つ<b>ライバル事務所</b>があります。所属アーティストは2〜4組で、毎年春に新人がデビューしたり、入れ替わったりします。</p><p>ライバル事務所の曲は毎季チャートに出て、音楽賞も争います。対バンや夏フェスの対決相手になることもあります。チャートと授賞式では、ライバル事務所の曲に印が付きます。</p><p><b>事務所対決</b>：毎年、年間チャートのトップ10に入った曲のうち、それぞれ上位3曲のダウンロード数の合計で勝ち負けが決まります（同じなら受賞数）。結果は冬の結果に出て、ホームで通算成績と今年の途中経過が見られます。</p><p class="sub">ライバル事務所の勢いは季節ごとに上下し、あなたが強くなると向こうも強くなります。</p>`)}
  ${sc('夢',`<p>所属の人は、迎え入れる前から一人ひとつ<b>夢</b>を持っています（所属タブ・名鑑・候補者カードで見られます）。夢が叶うと、その人のすべての素質が+${DREAM_POT}（上限99）、調子が全回復し、次の夢（今と同じか、もっと大きな夢）を持ちます。叶った夢は歴史タブの「叶った夢」と名鑑に残ります。</p>${tbl(['夢','大きさ'],Object.values(DREAMS).map(d=>[d.name,'★'.repeat(d.tier)]))}`)}
  ${sc('自動モード',`<p><b>自動モード</b>をオンにすると、季節が自動で進み、事務所の運営もおまかせになります。画面上の「自動」ボタンか、メニューの「設定」でオン・オフします。オフのときは、休養や発掘も含めてすべて自分で決めます。</p><p>おまかせでやること（行ったことは季節の結果の「自動で行ったこと」に載ります）：</p><ul><li><b>休養</b>：調子が${AUTO_DEFAULT.restAt}未満になった人を休養へ。${AUTO_DEFAULT.backAt}以上に戻ったら元のトレーニングへ</li><li><b>発掘</b>：毎季スカウトする（4か所を順番に）。見込み★${AUTO_DEFAULT.signStars}以上の候補者を、空きがあれば迎え入れる</li><li><b>トレーニングの見直し</b>：毎季3割くらいの人について、組の形態で大事な能力のうち低いほうを伸ばすトレーニングに変える（2割はバランス）</li><li><b>編成</b>：組のない人（入って1季以上）で、向いている形態を多数決して1季に1組まで組む。ひとりで1年待った人はソロでデビュー</li><li><b>入れ替え</b>：所属がほぼ満員のとき、今季の候補者に、所属で一番見込みの低い人よりはっきり良い人がいれば、契約を終えて迎え入れる（1季に1人まで。推し・殿堂入りの組・入って1年未満の人は外さない）</li></ul><p>どれも最適解は狙わず、見立てにブレがあり、ときどき様子見もする「手で遊ぶときの7割くらい」の精度です。季節の結果を${AUTO_DEFAULT.wait}秒見せてから次へ進みます。</p><p><b>止まるとき</b>：選択肢のあるイベント、ライブ本番（自分で指示するか「おまかせで最後まで」）、音楽賞の受賞、初めての年間大賞、誰かが事務所を離れた、ランク・実績・殿堂に動きがあった、シナリオの結果が出た。自動モード中は、チャート発表と授賞式の演出は出しません。</p>`)}
  ${sc('音',`<p>BGMと効果音は、メニュー（歯車）の「設定」でオン・オフと音量を変えられます。ブラウザの決まりで、最初に画面を操作したときから鳴り始めます。別のタブに移ると止まります。</p>`)}
  ${sc('シナリオ・ニューゲーム＋',`<p><b>タイトル画面</b>：起動したときの画面です。「つづきから」「はじめから」「シナリオ」「ロード」を選べます。遊んでいる途中は、メニューの「タイトル画面へ」か、画面いちばん上の「音盤日和」を押すと戻れます。</p><p><b>シナリオ</b>：メニューの「モード」タブかタイトル画面の「シナリオに挑戦」から。条件つきの短い挑戦（1本20〜30分）で、本編とは別に保存されます。目標を早く達成するほど★が増え、いちばん良い記録が残ります。</p>${tbl(['シナリオ','目標','ルール'],SCENARIOS.map(r=>[r.name,r.goal,r.desc]))}<p><b>ニューゲーム＋</b>：本編で年間大賞を取ると、メニューから選べます。事務所名・見せ場スキル図鑑・実績を引き継いで、新しい周を始めます。前の周の殿堂入り（いなければ年間大賞の多い人）が「伝説の先輩」として登場し、ときどき指導・楽曲提供・激励に来てくれます。</p>`)}
  ${sc('セーブ・ロード・アプリとして使う','<p>進み具合は、操作するたびに遊んでいるブラウザへ自動でセーブされます。スマートフォンとパソコンなど別の端末で続きを遊ぶときは、メニュー（歯車）の「セーブ」タブでファイルか文字にセーブし、もう一方の端末でロードします。タイトル画面の「ロード」からもロードできます。</p><p>公開ページをスマートフォンのホーム画面に追加すると、アプリのように開けます（iPhoneはSafariの共有ボタン→「ホーム画面に追加」、Androidはメニュー→「ホーム画面に追加」）。一度開いたあとは、電波がなくても遊べます。</p>')}
  ${sc('引退・独立・移籍','<p>年齢を重ねると引退の相談が来ます（38歳以上は本人が決意することも）。人気が出て長く在籍すると、独立を申し出ることがあります。独立した人はライバルとしてチャートに登場します。他事務所からの引き抜きもあります。離れた人の記録は歴史タブに残ります。</p>')}`;
}

// ===== メニュー（設定・ヘルプ・モード・セーブのタブ：D65・D66） =====
let settingsOpen=false,menuTab='settings';
const MENU_TABS=[['settings','設定','gear'],['help','ヘルプ','help'],['mode','モード','crown'],['data','セーブ','disk']];
function viewSettings(){
  const body={settings:menuSettings,help:helpBody,mode:menuMode,data:menuData}[menuTab]||menuSettings;
  return `<div class="overlay" data-act="closesettings"><div class="modal settings menu" data-act="noop" role="dialog" aria-label="メニュー">
  <div class="row between menu-head"><h2>メニュー</h2><div class="row"><button class="btn sm" data-act="totop">タイトル画面へ</button><button class="btn sm" data-act="closesettings">閉じる</button></div></div>
  <div class="menu-tabs" role="tablist">${MENU_TABS.map(([k,n,ic])=>`<button role="tab" class="${menuTab===k?'on':''}" aria-selected="${menuTab===k}" data-act="mtab" data-k="${k}">${uiIcon(ic)}${n}</button>`).join('')}</div>
  <div class="menu-body">${body()}</div>
  </div></div>`;
}
// 音はステレオの操作盤ふうに：ランプつきのスイッチと、レコードのつまみの音量（D66）
const sndSwitch=(on,act,k,label)=>`<button class="sw${on?' on':''}" data-act="${act}"${k?` data-k="${k}"`:''} aria-pressed="${on}" aria-label="${label}">${on?'ON':'OFF'}</button>`;
const sndVol=(k,v,label)=>`<input type="range" class="vol" min="0" max="100" value="${v}" style="--v:${v}%" data-act="snd" data-k="${k}" aria-label="${label}">`;
function menuSettings(){
  const bv=Math.round(snd.bgmVol*100),sv=Math.round(snd.seVol*100);
  return `<div class="deck">
    <div class="deck-title">SOUND</div>
    <div class="deck-row"><span class="deck-name">BGM</span>${sndSwitch(snd.bgm,'sndsw','bgm','BGM')}${sndVol('bgmVol',bv,'BGMの音量')}</div>
    <div class="deck-row"><span class="deck-name">効果音</span>${sndSwitch(snd.se,'sndsw','se','効果音')}${sndVol('seVol',sv,'効果音の音量')}</div>
  </div>
  <div class="deck">
    <div class="deck-title">AUTO</div>
    <div class="deck-row"><span class="deck-name">自動モード</span>${sndSwitch(autoRun,'auto','','自動モード')}<span class="deck-note">季節が自動で進み、運営もおまかせ</span></div>
  </div>
  <p class="sub">自動モードは、画面上の「自動」ボタンでもオン・オフできます。おまかせで何をするかは「ヘルプ」の「自動モード」にあります。</p>`;
}
function menuMode(){
  return `<h3>シナリオ</h3>
  <div class="set-row"><button class="btn" data-act="scopen">${S.scenario?'シナリオ一覧・本編に戻る':'シナリオに挑戦'}</button></div>
  <p class="sub">条件つきの短い挑戦です。本編とは別にセーブされます。</p>
  ${S.scenario?'':`<h3>ニューゲーム＋</h3>
  <div class="set-row"><button class="btn" data-act="ngplus" ${canNewGamePlus()?'':'disabled'}>ニューゲーム＋を始める</button></div>
  <p class="sub">年間大賞を取ったあとに選べます。図鑑と実績を引き継ぎ、前の周の殿堂入りが「伝説の先輩」として登場します。</p>`}`;
}
const menuData=()=>saveIOBody();

// ===== セーブ・ロード（D62・D66） =====
// ふだんは自動セーブ。ここは別の端末へ持っていくためのセーブ（ファイル・文字）とロード
let ioOpen=false,ioMsg='',ioDump='';
// タイトル画面ではモーダルで、メニューでは「セーブ」タブの中に出す
function viewSaveIO(){
  return `<div class="overlay" data-act="ioclose"><div class="modal settings saveio" data-act="noop" role="dialog" aria-label="ロード">
  <div class="row between"><h2>ロード</h2><button class="btn sm" data-act="ioclose">閉じる</button></div>
  ${saveIOBody()}
  </div></div>`;
}
function saveIOBody(){
  return `<p class="io-auto">${uiIcon('disk')} 進み具合は、操作するたびに自動でセーブされます。</p>
  <p class="sub">別の端末で続きを遊ぶときは、ここでセーブしたファイル（または文字）を、もう一方の端末でロードします。</p>
  ${S?`<h3>セーブ <span class="sub">${esc(S.agency)} ・ ${dateStr(T())}</span></h3>
  <div class="set-row"><button class="btn pri" data-act="iofile">ファイルにセーブ</button><button class="btn" data-act="iocopy">文字でコピー</button></div>
  ${ioDump?`<p class="sub">自動でコピーできませんでした。下の欄の文字を全部選んでコピーしてください。</p><textarea class="io-text" readonly>${esc(ioDump)}</textarea>`:''}`:''}
  <h3>ロード <span class="sub">${S?'いまの進み具合と入れ替わります':''}</span></h3>
  <div class="set-row"><label class="btn io-pick">ファイルからロード<input type="file" accept=".json,.txt,application/json,text/plain" data-act="iopick" hidden></label></div>
  <details class="io-paste"${ioMsg?' open':''}><summary>コピーした文字からロード</summary>
  <textarea class="io-text" id="ioText" placeholder="コピーした文字をここに貼り付け"></textarea>
  <div class="set-row"><button class="btn" data-act="iopaste">貼り付けた文字をロード</button></div></details>
  ${ioMsg?`<p class="warn">${esc(ioMsg)}</p>`:''}`;
}
function saveFileName(){return `onbanbiyori_${S.agency}_${dateStr(T()).replace(/\s/g,'')}.json`.replace(/[\\/:*?"<>|]/g,'_')}
function downloadSave(){
  const url=URL.createObjectURL(new Blob([exportText()],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=saveFileName();document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);fxToast('ファイルにセーブしました');
}
function copySave(){
  const t=exportText();
  const fail=()=>{ioDump=t;render();const el=document.querySelector('.io-text[readonly]');if(el){el.focus();el.select()}};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(()=>{ioDump='';fxToast('セーブの文字をコピーしました。もう一方の端末でロードしてください')},fail);else fail();
}
function importSave(txt){
  const o=parseSave(txt);
  if(!o){ioMsg='ロードできませんでした。音盤日和でセーブしたファイル（または文字）か確かめてください。';render();return}
  if(!confirm(`「${o.agency}」${dateStr(o.year*4-4+(o.season||0))}のセーブをロードします。${S?'いまの進み具合と入れ替わります。':''}よろしいですか？`))return;
  if(autoRun)stopAuto();
  setSlot(o.scenario?'scenario':'main');
  S=o;ensureGoals();save();
  ioOpen=false;ioMsg='';ioDump='';settingsOpen=false;atTop=false;tab='home';F=null;selPid=null;lastResult='';
  render();fxToast('ロードしました');
  if(S.liveScene){showActive=true;startLive(()=>{showActive=false;render()})}
}

// ===== シナリオ・ニューゲーム＋（D64） =====
let scOpen=false;
// モードを切り替えたあとの画面の後始末
function afterModeChange(t){
  scOpen=false;settingsOpen=false;ioOpen=false;atTop=false;tab=t;F=null;selPid=null;lastResult='';
  if(S&&S.liveScene){render();showActive=true;startLive(()=>{showActive=false;render()})}
}
const scStars=n=>'★'.repeat(n)+'☆'.repeat(3-n);
function viewScenarios(){
  const rec=scRecords();
  const cur=slot==='main'?scSaved():null;const curR=cur&&cur.scenario&&!cur.scenario.result&&SCENARIOS.find(x=>x.id===cur.scenario.id);
  return `<div class="overlay" data-act="scclose"><div class="modal settings scenarios" data-act="noop" role="dialog" aria-label="シナリオ">
  <div class="row between"><h2>シナリオに挑戦</h2><button class="btn sm" data-act="scclose">閉じる</button></div>
  <p class="sub">条件つきの短い挑戦です。本編とは別に保存されるので、本編の進み具合は消えません。挑戦中のシナリオは1つだけです。</p>
  ${S&&S.scenario?'<div class="set-row"><button class="btn" data-act="tomain">本編に戻る</button><span class="sub">このシナリオは保存しておき、あとで続きから遊べます</span></div>':''}
  ${curR?`<div class="set-row"><button class="btn pri" data-act="scresume">続きから：${esc(curR.name)}（${dateStr((cur.year-1)*4+cur.season)}）</button></div>`:''}
  <div class="sc-list">${SCENARIOS.map(r=>{const b=rec[r.id];return `<div class="sc-card"><div class="row between"><b>${esc(r.name)}</b><span class="sc-stars${b?'':' none'}">${b?scStars(b.stars):'未達成'}</span></div>
    <div class="sc-goal">目標：${r.goal}<span class="sc-diff d${r.diff}">${['','やさしめ','ふつう','むずかしい'][r.diff]}</span></div><p class="sub">${r.desc}</p>
    <div class="sub">★3：${r.stars[0]}年目までに${r.stars[1]>r.stars[0]?` ・ ★2：${r.stars[1]}年目までに`:''} ・ 期限：${r.years}年</div>
    <button class="btn sm" data-act="scstart" data-k="${r.id}">挑戦する</button></div>`}).join('')}</div>
  </div></div>`;
}
const scResultShow=()=>S&&S.scenario&&S.scenario.result&&!S.scenario.result.seen&&!S.popup&&!showActive;
function viewScResult(){
  const r=scRule(),res=S.scenario.result;
  return `<div class="overlay"><div class="modal sc-result ${res.win?'win':'lose'}" role="dialog" aria-label="シナリオの結果">
  <small>シナリオ「${esc(r.name)}」</small><h2>${res.win?'達成！':'期限切れ'}</h2>
  ${res.win?`<div class="sc-stars big">${scStars(res.stars)}</div><p>${res.year}年目に「${r.goal}」を達成しました。</p>`:`<p>${r.years}年が過ぎ、「${r.goal}」には届きませんでした。</p>`}
  <div class="sc-btns"><button class="btn pri" data-act="scretry">もう一度挑戦</button><button class="btn" data-act="sclist">ほかのシナリオ</button><button class="btn" data-act="tomain">本編に戻る</button><button class="btn sm" data-act="sckeep">このまま遊び続ける</button></div>
  </div></div>`;
}
function scBand(){
  if(S.scenario){
    const r=scRule(),res=S.scenario.result;
    return `<div class="sc-band"><b>シナリオ「${esc(r.name)}」</b><span>${r.goal}</span><span class="sc-left">${res?(res.win?'達成 '+scStars(res.stars):'期限切れ'):`残り${scLeft()}季`}</span></div>`;
  }
  if(S.cycle>1)return `<div class="sc-band ng"><b>${S.cycle}周目</b>${S.legend?`<span>伝説の先輩：${esc(sn(S.legend))}</span>`:''}</div>`;
  return '';
}
const legendCard=()=>{
  const L=S.legend;if(!L)return '';const a=legendTop(L);
  return `<div class="card legend-card"><div class="hall-head">${portrait(legendFace(L),48)}<div><span class="sub">伝説の先輩（${L.cycle}周目「${esc(L.from)}」）</span><b>${esc(L.name)}</b><span class="sub">${AB_NAME[a]} ${L.abil[a]} ・ 年間大賞${L.grand}回 ・ ときどき事務所に顔を出す</span></div></div></div>`;
};

// ===== 初めての年間大賞のエンドロール =====
let creditsOpen=false;
function viewCredits(){
  const grand=S.awards.find(a=>a.ours&&a.name==='年間大賞');
  const units=S.units.filter(u=>u.songs>0);
  const songs=S.songs.filter(s=>s.ours).sort((a,b)=>b.dl-a.dl).slice(0,5);
  const ppl=[...S.people,...S.alumni];
  const block=(h,lines)=>lines.length?`<div class="cr-block"><small>${h}</small>${lines.map(l=>`<div>${l}</div>`).join('')}</div>`:'';
  return `<div class="overlay credits" role="dialog" aria-label="エンドロール"><div class="cr-roll"><div class="cr-inner">
    <div class="cr-art" style="background-image:url(${illust('ending')})"></div>
    <img src="images/live/gold_record.png" class="pixel gold-disc" alt="">
    <div class="cr-title">音盤日和</div>
    <div class="cr-block"><small>${esc(S.agency)}</small><div>${grand.year}年目　年間大賞</div><div class="cr-big">${esc(grand.winner)}</div></div>
    ${block('アーティスト',units.map(u=>`${esc(u.name)}<span class="sub">　${TYPES[u.type].name}</span>`))}
    ${block('名曲',songs.map(s=>`「${esc(s.title)}」<span class="sub">　${esc(s.artist)}</span>`))}
    ${block('ともに歩んだ人たち',ppl.map(p=>esc(p.name)))}
    ${block('プロデューサー',['あなた'])}
    <div class="cr-end">そして、物語は続く。</div>
    <div class="cr-block"><small>メニューの「ニューゲーム＋」で、新しい周も始められます</small></div>
  </div></div><button class="btn pri cr-btn" data-act="closecredits">これからも続ける ▶</button></div>`;
}

// ===== 季節の結果ポップアップ =====
let lastResult='';
function viewTurnPopup(){
  const r=S.report;const cur=curPending();
  const banner=`<div class="season-banner s${S.season}"><div class="season-label"><small>季節の便り</small><b>${icon("season",S.season)}${esc(r.to)}</b><div class="sub">${esc(r.from)}が終わりました</div></div></div>`;
  const res=lastResult?`<div class="result">${esc(lastResult)}</div>`:'';
  const body=cur
    ?`${banner}${res}<div class="event-card">${art(eventImages[cur.ev.id],'event-illustration')}${cur.c.p?faceButton(cur.c.p,48):''}<span class="tag">イベント・残り${S.pending.length}件</span><h2>${esc(cur.ev.name)}</h2><p>${esc(cur.pe.text)}</p><div class="row">${cur.ev.choices.map((ch,i)=>`<button class="btn pri" data-act="choose" data-i="${i}">${esc(ch.label)}</button>`).join('')}</div></div>`
    :`${banner}${res}${summaryHtml(r)}<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn pri" data-act="closepopup">${esc(r.to)}へ</button></div>`;
  const bar=autoRun&&!cur?`<div class="auto-bar">${uiIcon('ff')} 自動モード ・ 次の季節まで <b>${autoLeft}</b> 秒<button class="btn sm" data-act="auto">止める</button></div>`:'';
  return `<div class="overlay"><div class="modal season-result" data-act="noop" role="dialog" aria-label="季節の結果">${bar}${body}</div></div>`;
}

// ===== タイトル画面（D65・D66） =====
// 起動したときと、メニュー・題字から戻ったときに出す。「つづきから」「はじめから」「シナリオ」「ロード」
let atTop=true,topNew=false;
function peekSave(k){try{const s=localStorage.getItem(k);return s?JSON.parse(s):null}catch(e){return null}}
function viewTop(){
  const main=S&&slot==='main'?S:peekSave(KEY);
  const sc=S&&slot==='scenario'?S:scSaved();
  const scR=sc&&sc.scenario&&!sc.scenario.result&&SCENARIOS.find(x=>x.id===sc.scenario.id);
  const when=o=>dateStr((o.year-1)*4+o.season);
  // セーブがなければ「はじめから」を開いた状態で出す
  const showNew=topNew||!main;
  return `<header class="welcome-head"><div class="masthead">音盤日和</div></header><main class="cover"><section class="sleeve"><div class="cover-art">${art('office/'+(main?OFFICE_RANKS[main.rank||0].office:0),'cover-img','レコードの看板を掲げた街角の音楽事務所')}<span class="catalog">創刊号　◆　第一盤</span></div><div class="cover-copy"><div class="eyebrow">音楽事務所 育成シミュレーション</div><h1><img src="images/brand/logo.svg" class="wordmark" alt="音盤日和"></h1>
  <div class="top-menu">
  ${main?`<button class="top-item pri" data-act="topmain"><span class="top-label">つづきから</span><span class="top-info"><b>${esc(main.agency)}</b>${when(main)}${main.cycle>1?` ・ ${main.cycle}周目`:''}</span><i>▶</i></button>`:'<button class="top-item" disabled><span class="top-label">つづきから</span><span class="top-info">セーブがありません</span></button>'}
  ${scR?`<button class="top-item sc" data-act="topsc"><span class="top-label">シナリオのつづき</span><span class="top-info"><b>${esc(scR.name)}</b>${when(sc)}</span><i>▶</i></button>`:''}
  <button class="top-item${main?'':' pri'}${showNew?' open':''}" data-act="topnew" aria-expanded="${showNew}"><span class="top-label">はじめから</span><span class="top-info">新しく事務所を設立する</span><i>${showNew?'▲':'▼'}</i></button>
  ${showNew?`<div class="top-new">${main?'<p class="warn">いまの本編のセーブは消えます（シナリオのセーブは残ります）。</p>':'<p>この街で、まだ誰も知らない才能と出会う。<br>あなたの事務所から、最初の一曲を。</p>'}<label for="agency">事務所の名前</label><input type="text" id="agency" placeholder="事務所名" value="ミライ音楽事務所"><button class="btn pri" data-act="start">事務所を設立する　▶</button></div>`:''}
  <div class="top-sub"><button class="top-item" data-act="scopen"><span class="top-label">シナリオ</span><span class="top-info">条件つきの短い挑戦</span></button><button class="top-item" data-act="ioopen"><span class="top-label">ロード</span><span class="top-info">別の端末のセーブ</span></button></div>
  </div>
  <div class="cover-foot">春・夏・秋・冬　／　進み具合は自動でセーブ</div></div></section></main>${scOpen?viewScenarios():ioOpen?viewSaveIO():''}`;
}

// ===== 全体 =====
const TABS=[['home','ホーム'],['people','所属'],['training','トレーニング'],['units','編成'],['scout','発掘'],['chart','チャート'],['history','歴史']];
function render(){
  const app=document.getElementById('app');
  const opened=tab==='people'?[...app.querySelectorAll('.dossier[open]')].map(el=>el.dataset.person):[];
  if(!S||atTop){app.innerHTML=viewTop();return}
  if(tab==='scout'&&!S.popup&&S.scoutSeenTurn!==T()){S.scoutSeenTurn=T();save()}
  if(tab==='training'&&!S.popup&&S.trainSeenTurn!==T()){S.trainSeenTurn=T();save()}
  const badge=S.people.length<rosterMax()&&(S.candidates.length>0||!S.scouted&&scoutAllowed())&&S.scoutSeenTurn!==T();
  const tiredBadge=S.people.some(p=>p.cond<35&&p.policy!=='rest')&&S.trainSeenTurn!==T();
  const badges={scout:badge&&'今季の発掘は未確認',training:tiredBadge&&'調子が下がっている人がいます'};
  const views={home:viewHome,people:viewPeople,training:viewTraining,units:viewUnits,scout:viewScout,chart:viewChart,history:viewHistory};
  app.innerHTML=`<header><a href="#" class="masthead" data-act="totop" title="タイトル画面へ">音盤日和</a><div class="top"><h1>${art("brand/record","head-disc")}${esc(S.agency)}</h1><span class="date">${icon("season",S.season)} ${dateStr(T())}</span><button class="btn icon-btn" data-act="settings" aria-label="メニュー（ヘルプ・設定）" title="メニュー（ヘルプ・設定）">${uiIcon('gear')}</button><button class="btn auto-btn${autoRun?' running':''}" data-act="auto" title="${autoRun?'自動モードを止める':'自動モード（季節が自動で進み、運営もおまかせ）'}">${autoRun?uiIcon('stop')+'<span class="lbl"> 止める</span>':uiIcon('ff')+'<span class="lbl"> 自動</span>'}</button><button class="btn pri" data-act="next" ${autoRun?'disabled':''}>次の季節へ ▶</button></div>${scBand()}
  <nav>${TABS.map(([k,n])=>`<button class="${tab===k?'on':''}" data-act="tab" data-k="${k}" aria-current="${tab===k?'page':'false'}">${icon("nav",k)}${n}${badges[k]?`<span class="action-badge" aria-label="${badges[k]}" title="${badges[k]}">!</span>`:''}</button>`).join('')}</nav></header>
  <main class="page page-${tab}">${pageHeading(tab)}${views[tab]()}</main>${creditsOpen?viewCredits():S.popup&&S.report?viewTurnPopup():scOpen?viewScenarios():scResultShow()?viewScResult():ioOpen?viewSaveIO():settingsOpen?viewSettings():''}`;
  if(opened.length)lockCardHeight(app.querySelector('.grid'));
  for(const id of opened){const detail=app.querySelector(`.dossier[data-person="${id}"]`);if(detail)detail.open=true}
  fxAfterRender(app);
}

// 所属カードの詳細を開く前に、閉じた状態の枠の高さを記録する。開いた枠だけが下へ伸び、ほかの枠はこの高さのまま
function lockCardHeight(grid){
  if(!grid||grid.querySelector('.dossier[open]'))return;
  const c=grid.querySelector('.card');if(c)grid.style.setProperty('--card-h',c.offsetHeight+'px');
}
document.addEventListener('click',e=>{const s=e.target.closest('.dossier>summary');if(s)lockCardHeight(s.closest('.grid'))},true);
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT')return;
  const id=+b.dataset.id,act=b.dataset.act;
  if(!['next','noop','sign','auto','profile','closepopup','closecredits'].includes(act)&&!(act==='closesettings'&&b.classList.contains('overlay')))se(act==='tab'?'tab':'click');
  switch(act){
    case 'start':{
      if(peekSave(KEY)&&!confirm('いまの本編のセーブを消して、新しく事務所を始めますか？'))return;
      if(autoRun)stopAuto();setSlot('main');
      newGame(document.getElementById('agency').value.trim()||'ミライ音楽事務所');ensureGoals();save();afterModeChange('scout');break}
    case 'next':if(S.pending.length){S.popup=true;break}if(autoRun)return;needleDrop(()=>{advanceSeason();tab='home';F=null;selPid=null;lastResult='';window.scrollTo(0,0);render();afterSeason()});return;
    case 'auto':settingsOpen=false;autoRun?stopAuto():startAuto();return;
    case 'sndsw':{const k=b.dataset.k;snd[k]=!snd[k];saveSound();if(k==='bgm')snd.bgm?bgmStart():bgmStop();else if(snd.se)se('click');break}
    case 'settings':settingsOpen=true;break;
    case 'closesettings':settingsOpen=false;break;
    case 'closecredits':creditsOpen=false;break;
    case 'tab':tab=b.dataset.k;selPid=null;F=null;histSec=null;window.scrollTo(0,0);break;
    case 'hsec':histSec=b.dataset.k||null;window.scrollTo(0,0);break;
    case 'dexcat':dexCat=b.dataset.k;break;
    case 'fav':{const p=person(id);if(!p.fav&&S.people.filter(x=>x.fav).length>=FAV_MAX)return alert(`推しは${FAV_MAX}人までです`);p.fav=!p.fav;if(p.fav)hist(`★${sn(p)}を推しに指名`);save();break}
    case 'release':{const p=person(id);if(!confirm(`${sn(p)}との契約を終了しますか？（これまでの記録は歴史に残ります）`))return;leavePerson(p,'契約終了');save();break}
    case 'sign':{const c=S.candidates.find(x=>x.id===id);if(S.people.length<rosterMax()&&c){se('sign');fxToast(`${sn(c)}が加入しました`)}sign(id);break}
    case 'scout':scout(b.dataset.k);break;
    case 'profile':e.preventDefault();openProfile(id);return;
    case 'selp':selPid=selPid===id?null:id;break;
    case 'movep':moveTrainee(selPid,b.dataset.k);break;
    case 'newunit':F={id:null,type:Object.keys(TYPES).find(typeAllowed),name:'',members:new Set()};suggest();break;
    case 'editunit':{const u=unit(id);F={id,type:u.type,name:u.name,members:new Set(u.members)};suggest();break}
    case 'reroll':suggest();break;
    case 'pickname':F.name=F.sugg[+b.dataset.i];break;
    case 'disband':{const u=unit(id);if(!confirm(`「${u.name}」を解散しますか？（記録は歴史に残ります）`))return;disband(u,'解散');save();break}
    case 'saveunit':saveUnit();break;
    case 'cancel':F=null;break;
    case 'help':settingsOpen=true;menuTab='help';break;
    case 'mtab':menuTab=b.dataset.k;ioMsg='';ioDump='';break;
    case 'totop':e.preventDefault();if(autoRun)stopAuto();save();atTop=true;topNew=false;settingsOpen=false;scOpen=false;ioOpen=false;window.scrollTo(0,0);break;
    case 'topnew':topNew=!topNew;break;
    case 'topmain':if(slot!=='main')switchToMain();afterModeChange('home');break;
    case 'topsc':resumeScenario();afterModeChange('home');break;
    case 'choose':lastResult=resolveChoice(+b.dataset.i);break;
    case 'closepopup':
      if(autoRun){clearInterval(autoTimer);autoTimer=null;S.popup=false;save();autoStep();return}
      S.popup=false;lastResult='';se('click');
      if(S.creditsPending){S.creditsPending=false;creditsOpen=true}
      save();break;
    case 'showreport':S.popup=true;lastResult='';break;
    case 'noop':return;
    case 'ioopen':ioOpen=true;ioMsg='';ioDump='';break;
    case 'scopen':scOpen=true;settingsOpen=false;break;
    case 'scclose':scOpen=false;break;
    case 'scstart':{
      const cur=slot==='scenario'&&S?S:scSaved();
      if(cur&&cur.scenario&&!cur.scenario.result&&!confirm(`挑戦中のシナリオ「${SCENARIOS.find(x=>x.id===cur.scenario.id).name}」は消えます。新しく始めますか？`))return;
      startScenario(b.dataset.k);afterModeChange(S.candidates.length?'scout':'home');fxToast('シナリオ開始：'+scRule().name);break}
    case 'scresume':resumeScenario();afterModeChange('home');break;
    case 'tomain':if(S&&S.scenario){if(S.scenario.result)S.scenario.result.seen=true;save()}switchToMain();afterModeChange('home');break;
    case 'scretry':{const id=S.scenario.id;startScenario(id);afterModeChange(S.candidates.length?'scout':'home');fxToast('シナリオ開始：'+scRule().name);break}
    case 'sclist':S.scenario.result.seen=true;save();scOpen=true;break;
    case 'sckeep':S.scenario.result.seen=true;save();break;
    case 'ngplus':if(!canNewGamePlus())return;if(!confirm(`ニューゲーム＋を始めます。いまの本編のセーブは${(S.cycle||1)+1}周目で上書きされます（見せ場スキル図鑑と実績は引き継ぎます）。残しておきたいときは、先にメニューの「データ」タブで書き出してください。よろしいですか？`))return;
      startNewGamePlus();afterModeChange('scout');fxToast(`${S.cycle}周目を始めました`);break;
    case 'ioclose':ioOpen=false;ioMsg='';ioDump='';break;
    case 'iofile':downloadSave();return;
    case 'iocopy':copySave();return;
    case 'iopaste':{const v=(document.getElementById('ioText')||{}).value||'';if(!v.trim()){ioMsg='貼り付け欄が空です。';break}importSave(v);return}
    case 'reset':e.preventDefault();
      if(S&&S.scenario){if(!confirm('このシナリオをやめて、本編に戻りますか？（シナリオのセーブは消えます）'))return;try{localStorage.removeItem(SC_KEY)}catch(_){}switchToMain();afterModeChange('home');break}
      if(!confirm('セーブを消して最初からやり直しますか？'))return;try{localStorage.removeItem(KEY)}catch(_){}if(autoRun)stopAuto();S=null;tab='home';F=null;break;
    default:return;
  }
  render();
});
document.addEventListener('change',e=>{
  const t=e.target,act=t.dataset.act;
  if(act==='policy'){person(+t.dataset.id).policy=t.value;save();render()}
  if(act==='iopick'&&t.files&&t.files[0]){const r=new FileReader();r.onload=()=>importSave(r.result);r.onerror=()=>{ioMsg='ファイルを開けませんでした。';render()};r.readAsText(t.files[0]);t.value=''}
  if(act==='snd'){
    const k=t.dataset.k;
    if(k==='bgm'){snd.bgm=t.checked;saveSound();t.checked?bgmStart():bgmStop()}
    if(k==='se'){snd.se=t.checked;saveSound();if(t.checked)se('click')}
    if(k==='bgmVol')setBgmVol(+t.value/100);
    if(k==='seVol'){setSeVol(+t.value/100);se('click')}
  }
  if(act==='autoset'){const k=t.dataset.k;S.auto[k]=t.type==='checkbox'?t.checked:isNaN(+t.value)?t.value:+t.value;save()}
  if(act==='ftype'){F.type=t.value;suggest();render()}
  if(act==='fmem'){t.checked?F.members.add(+t.dataset.id):F.members.delete(+t.dataset.id);if(TYPES[F.type].max===1)suggest();render()}
});
document.addEventListener('input',e=>{if(e.target.dataset.act==='fname')F.name=e.target.value;if(e.target.classList.contains('vol'))e.target.style.setProperty('--v',e.target.value+'%')});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='agency'){document.querySelector('[data-act=start]').click();return}if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&(settingsOpen||ioOpen||scOpen)){if(ioOpen)ioOpen=false;else if(scOpen)scOpen=false;else settingsOpen=false;render()}});

// 起動するとタイトル画面から。ライブ本番の途中で閉じていたら、続きから入ったときに最初からやり直す（afterModeChange）
S=loadStartSlot();ensureGoals();render();
