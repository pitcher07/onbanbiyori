// 演出。大事な場面はレコード（針・盤・金の盤）、季節の変わり目は紙と季節の舞うもの
// 動きを減らす設定（prefers-reduced-motion）では、動く演出を省いて結果だけを見せる
const calm=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

// 「次の季節へ」：針を落として盤が回り、季節が進む。押せば飛ばせる
function needleDrop(done,quick){
  if(calm()){se('season');done();return}
  let fired=false;const go=()=>{if(fired)return;fired=true;done();el.classList.add('out');setTimeout(()=>el.remove(),260)};
  const el=document.createElement('div');el.className='needle-fx';
  el.innerHTML=`<div class="turntable"><img src="images/brand/record.png" class="pixel disc" alt=""><i class="arm"></i></div>`;
  el.addEventListener('click',go);
  document.body.append(el);se('needle');
  setTimeout(go,quick?520:950);
}

// 季節の帯に舞うもの：春は花びら、夏は光の粒（上へ）、秋は落ち葉、冬は雪
const SEASON_PARTS=[['#f5b8c6','#fbd9e0','#fff'],['#fff3b0','#ffe27a','#fff'],['#e0773f','#c4452f','#f4bd69'],['#ffffff','#e6eef5','#ffffff']];
function seasonParticles(banner,season){
  if(calm()||!banner)return;
  const box=document.createElement('div');box.className='particles p'+season;
  for(let i=0;i<16;i++){
    const s=document.createElement('i');const size=[3,4,4,5,6][i%5];
    s.style.cssText=`left:${Math.random()*100}%;width:${size}px;height:${size}px;background:${SEASON_PARTS[season][i%3]};animation-delay:${-Math.random()*6}s;animation-duration:${4+Math.random()*4}s;--drift:${Math.round(Math.random()*40-20)}px`;
    box.append(s);
  }
  banner.append(box);
}

// 数字の数え上げ（data-count-from → 中身の数字）
function countUp(root){
  if(calm())return;
  root.querySelectorAll('[data-count-from]').forEach(el=>{
    const from=+el.dataset.countFrom,to=+el.textContent;if(from===to)return;
    const t0=performance.now(),len=650;
    const step=now=>{const k=Math.min(1,(now-t0)/len);el.textContent=Math.round(from+(to-from)*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(step)};
    el.textContent=from;requestAnimationFrame(step);
  });
}

// 受賞の紙吹雪（ドットの四角）
function confetti(el){
  if(calm()||!el)return;
  const colors=['#f4bd69','#b94e39','#196459','#fff0ce'];
  for(let i=0;i<22;i++){
    const s=document.createElement('i');s.className='confetti';
    s.style.cssText=`left:${10+Math.random()*80}%;background:${colors[i%4]};animation-delay:${Math.random()*.5}s;--dx:${Math.round(Math.random()*120-60)}px;--dy:${Math.round(60+Math.random()*90)}px`;
    el.append(s);setTimeout(()=>s.remove(),2600);
  }
}

// 画面下に出る短いお知らせ（紙片）
function fxToast(msg){
  const el=document.createElement('div');el.className='toast';el.textContent=msg;el.setAttribute('role','status');
  document.body.append(el);setTimeout(()=>el.classList.add('out'),2600);setTimeout(()=>el.remove(),3000);
}

// 描画のあとに呼ぶ。季節の結果が初めて表示されたときだけ、音と演出を出す
let fxShownKey='',fxLastTab='';
function fxAfterRender(app){
  const page=app.querySelector('main.page');
  if(page&&fxLastTab&&fxLastTab!==tab)page.classList.add('page-in');
  fxLastTab=tab;
  const modal=app.querySelector('.modal.season-result');
  if(!modal||S.liveScene||showActive)return;
  seasonParticles(modal.querySelector('.season-banner'),S.season);
  const key=S.report.to+'|'+S.pending.length;
  if(key===fxShownKey)return;
  const first=!fxShownKey.startsWith(S.report.to+'|');
  fxShownKey=key;
  modal.classList.add('fresh');
  modal.querySelectorAll('.paper>*').forEach((el,i)=>el.style.setProperty('--i',Math.min(i,14)));
  countUp(modal);
  if(modal.querySelector('.event-card')){se('event');return}
  const won=modal.querySelector('.award.won');
  const goal=modal.querySelector('.goal-stamp');
  if(won){setTimeout(()=>{se('award');confetti(won.closest('.paper'))},first?500:200)}
  else if(goal){setTimeout(()=>se(modal.querySelector('.goal-stamp.g-rank')?'rank':'stamp'),350)}
  else if(first)setTimeout(()=>se('season'),150);
}
