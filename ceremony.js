// 発表のショー（D49）：季節が進んだあと、ライブ本番 → チャート発表 → 音楽賞の授賞式 → 季節の結果、の順に見せる
// チャート発表は所属曲が3位以内に入った季節だけ、授賞式は毎年冬。どれも押せば飛ばせる。自動送り中は出さない
let showActive=false;
function afterSeason(){
  const q=[];
  if(S.liveScene)q.push(startLive);
  if(!autoRun&&S.chart.some(c=>c.ours&&c.rank<=3))q.push(chartCountdown);
  if(!autoRun&&S.report.award.length)q.push(awardCeremony);
  if(!q.length)return;
  showActive=true;render();
  const step=()=>{const f=q.shift();if(f){f(step);return}showActive=false;render()};
  step();
}
// 発表用の幕（#show）。飛ばすと残りをすぐに出す
let showFast=false;
const showSleep=ms=>new Promise(r=>setTimeout(r,showFast?0:ms));
function openShow(html,done){
  showFast=calm();
  const el=document.createElement('div');el.id='show';el.className='show';
  el.innerHTML=`<div class="show-box">${html}<div class="show-foot"><button class="btn sm" data-show="skip">飛ばす</button></div></div>`;
  el.addEventListener('click',e=>{const b=e.target.closest('[data-show]');if(!b)return;e.stopPropagation();
    if(b.dataset.show==='skip'){showFast=true;b.remove()}
    if(b.dataset.show==='next'){se('click');el.classList.add('out');setTimeout(()=>el.remove(),250);done()}});
  document.body.append(el);
  return el;
}
function showNext(el,label){const f=el.querySelector('.show-foot');f.innerHTML=`<button class="btn pri" data-show="next">${label} ▶</button>`}

// チャート発表：10位から順にめくり、1位は太鼓のあとで
async function chartCountdown(done){
  const el=openShow(`<small class="show-eyebrow">${esc(S.report.from)}</small><h2 class="show-title">今季のチャート発表</h2><ol class="countdown"></ol>`,done);
  const ol=el.querySelector('.countdown');
  for(const c of [...S.chart].reverse()){
    if(c.rank<=3){if(c.rank===1){se('drumroll');await showSleep(1500)}else await showSleep(700)}
    const li=document.createElement('li');li.className='cd-row'+(c.ours?' ours':'')+(isAgencyUnit(c.artist)?' ag':'')+(c.rank===1?' top':'');
    li.innerHTML=`<b class="cd-rank">${c.rank}</b>${jacket(c,34)}<span class="cd-title">「${esc(c.title)}」<small>${esc(c.artist)}${isAgencyUnit(c.artist)?' ・ ライバル事務所':''}</small></span><span class="cd-dl">${c.dl.toLocaleString()}DL</span>`;
    ol.prepend(li);
    if(c.ours){se(c.rank===1?'award':'stamp');if(c.rank===1)confetti(el.querySelector('.show-box'))}else if(!showFast)se('tab');
    await showSleep(c.rank<=3?500:330);
  }
  showNext(el,'次へ');
}

// 授賞式：賞ごとにノミネートを並べ、太鼓のあとで受賞者を発表する
function nominees(a){
  const top=(S.annual[S.annual.length-1]||{top:[]}).top;
  let list;
  if(a.name==='年間大賞')list=top.slice(0,3).map(x=>`「${x.title}」${x.artist}`);
  else if(a.name==='最優秀アーティスト賞')list=[...new Set(top.map(x=>x.artist))].slice(0,3);
  else if(a.name==='最優秀作曲賞')list=[...top].sort((x,y)=>y.q-x.q).slice(0,3).map(x=>`「${x.title}」${x.ours?lastName(x.composer):x.artist}`);
  else list=[...new Set(S.rivals.filter(r=>!r.ex).map(r=>r.name).sort(()=>Math.random()-.5))].slice(0,2);
  if(!list.includes(a.winner))list=[...list.slice(0,2),a.winner];
  return list.sort(()=>Math.random()-.5);
}
async function awardCeremony(done){
  const year=S.awards[S.awards.length-1].year;
  const el=openShow(`<small class="show-eyebrow">${year}年目</small><h2 class="show-title">音楽賞 授賞式</h2><div class="ceremony"></div>`,done);
  // 1枚絵（D71）：授賞式の会場。年間大賞を取ったら、発表の瞬間の絵に替える
  el.classList.add('award-show');el.style.setProperty('--art',`url(${illust('award_hall')})`);
  const box=el.querySelector('.ceremony');
  for(const a of S.awards.filter(x=>x.year===year)){
    const noms=nominees(a);
    const card=document.createElement('div');card.className='award-card';
    card.innerHTML=`<h3>${awardIcon(a.name)}${esc(a.name)}</h3><ul>${noms.map(n=>`<li class="nom${S.agencyRival&&S.agencyRival.units.some(u=>n.includes(u))?' ag':''}">${esc(n)}</li>`).join('')}</ul>`;
    box.append(card);card.scrollIntoView({block:'nearest'});
    const lis=[...card.querySelectorAll('.nom')];
    // ルーレットのように候補を順に照らしてから決める
    if(!showFast){se('drumroll');for(let k=0;k<9;k++){lis.forEach((li,i)=>li.classList.toggle('lit',i===k%lis.length));await showSleep(130+k*12)}}
    const env=document.createElement('i');env.className='envelope';card.append(env);
    if(!showFast){await showSleep(350);env.classList.add('open');await showSleep(350)}
    env.remove();
    lis.forEach(li=>{const w=li.textContent===a.winner;li.classList.remove('lit');li.classList.add(w?'win':'out');if(w&&a.ours)li.classList.add('ours')});
    card.classList.add('decided');
    if(a.ours){se('award');confetti(card)}else se('click');
    if(a.ours&&a.name==='年間大賞'){el.style.setProperty('--art',`url(${illust('award_grand')})`);el.classList.add('grand')}
    await showSleep(a.ours?1400:800);
  }
  showNext(el,'季節の結果へ');
}
