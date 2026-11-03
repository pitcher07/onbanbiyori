// 音（BGMと効果音）。音源ファイルは使わず、Web Audio でその場で合成する
// BGM：喫茶店でレコードが流れているような、ゆったりしたジャズ（エレピ・ウッドベース・ブラシ・針のノイズ）
// 設定は端末ごとの好みなので、ゲームのセーブとは別に保存する
const SOUND_KEY='onbanbiyori_sound';
const snd={bgm:true,se:true,bgmVol:.5,seVol:.6};
try{Object.assign(snd,JSON.parse(localStorage.getItem(SOUND_KEY)||'{}'))}catch(e){}
function saveSound(){try{localStorage.setItem(SOUND_KEY,JSON.stringify(snd))}catch(e){}}

let ac=null,master,bgmBus,seBus,wow,noiseBuf;
function audioInit(){
  if(ac)return ac;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  ac=new AC();
  master=ac.createGain();master.gain.value=.9;master.connect(ac.destination);
  // こもった音にして、古いレコードらしさを出す
  const warm=ac.createBiquadFilter();warm.type='lowpass';warm.frequency.value=2400;warm.Q.value=.4;warm.connect(master);
  bgmBus=ac.createGain();bgmBus.gain.value=0;bgmBus.connect(warm);
  seBus=ac.createGain();seBus.gain.value=snd.seVol*.8;seBus.connect(master);
  // 回転むら：BGMの楽器のピッチをゆっくり揺らす
  wow=ac.createGain();wow.gain.value=6;
  const lfo=ac.createOscillator();lfo.frequency.value=.5;lfo.connect(wow);lfo.start();
  noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);
  const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return ac;
}
const mtof=m=>440*Math.pow(2,(m-69)/12);
// 1音。f2 があれば音程を滑らせる
function tone(bus,{f,t,dur,type='sine',gain=.1,a=.005,f2=0,shake=true}){
  const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  if(shake)wow.connect(o.detune);
  const g=ac.createGain();
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+dur);
  o.connect(g);g.connect(bus);o.start(t);o.stop(t+a+dur+.05);
  o.onended=()=>{try{if(shake)wow.disconnect(o.detune)}catch(e){}g.disconnect()};
}
// ノイズの粒（ブラシ、ハイハット、針のプチプチ、紙の音）
function noise(bus,{t,dur,gain=.05,type='bandpass',freq=2500,q=.8,a=.003}){
  const s=ac.createBufferSource();s.buffer=noiseBuf;
  const f=ac.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
  const g=ac.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+dur);
  s.connect(f);f.connect(g);g.connect(bus);s.start(t,Math.random()*Math.max(0,1.9-a-dur));s.stop(t+a+dur+.05);
  s.onended=()=>g.disconnect();
}

// ===== BGM =====
const ep=(m,t,dur,v)=>{const f=mtof(m);tone(bgmBus,{f,t,dur,gain:.055*v,a:.006});tone(bgmBus,{f:f*2,t,dur:dur*.5,gain:.014*v});tone(bgmBus,{f:f*4.01,t,dur:.12,gain:.008*v})};
const bass=(m,t,dur)=>{tone(bgmBus,{f:mtof(m),t,dur,type:'triangle',gain:.13,a:.012});tone(bgmBus,{f:mtof(m),t,dur:dur*.7,gain:.09,a:.01})};
const vibe=(m,t)=>{const f=mtof(m);tone(bgmBus,{f,t,dur:1.6,gain:.04,a:.01});tone(bgmBus,{f:f*4,t,dur:.35,gain:.008})};
const kick=(t,v=1)=>tone(bgmBus,{f:110,f2:42,t,dur:.22,gain:.22*v,shake:false});
const brush=t=>noise(bgmBus,{t,dur:.22,gain:.035,freq:2600,q:.7,a:.02});
const hat=(t,v)=>noise(bgmBus,{t,dur:.045,gain:.018*v,type:'highpass',freq:7000});
const crackle=t=>noise(bgmBus,{t,dur:.004+Math.random()*.006,gain:.02+Math.random()*.05,type:'highpass',freq:1800,a:.001});
// コード進行：[ベースの音, 和音の音]。A A B A の32小節をくり返す
const BGM_A=[[41,[57,60,64,67]],[40,[55,59,62,66]],[38,[53,57,60,64]],[36,[52,55,59,62]]];
const BGM_B=[[38,[53,57,60,64]],[43,[53,57,59,64]],[36,[52,55,59,62]],[45,[55,58,61,64]]];
const BGM_SONG=[...BGM_A,...BGM_A,...BGM_B,...BGM_A];
const BPM=72,BEAT=60/BPM,SWING=BEAT*.64;
let bgmPlaying=false,bgmBar=0,bgmNext=0,bgmTimer=null,hissNode=null;
function bgmScheduleBar(t,i){
  const [root,vo]=BGM_SONG[i%BGM_SONG.length];const next=BGM_SONG[(i+1)%BGM_SONG.length][0];
  const strum=(tt,v,len)=>vo.forEach((m,k)=>ep(m,tt+k*.02+Math.random()*.012,len,v));
  strum(t,1,BEAT*2.8);
  const r=Math.random();
  if(r<.5)strum(t+BEAT*2+SWING,.5,BEAT*1.1);else if(r<.75)strum(t+BEAT+SWING,.45,BEAT);
  bass(root,t,BEAT*1.7);
  bass(Math.random()<.6?root+7:root+12,t+BEAT*2,BEAT*.95);
  if(Math.random()<.45)bass(next+(Math.random()<.5?-1:1),t+BEAT*3+SWING,BEAT*.35);
  // 16小節ごとに1小節だけ太鼓を抜いて、息つぎを作る
  if(i%16!==15){
    kick(t);if(Math.random()<.55)kick(t+BEAT*2+SWING,.7);
    brush(t+BEAT);brush(t+BEAT*3);
    for(let b=0;b<4;b++){hat(t+b*BEAT,.9);hat(t+b*BEAT+SWING,.5+Math.random()*.3)}
  }
  // ときどき、ヴィブラフォンが短いフレーズを弾く
  if(i%2===1?Math.random()<.7:Math.random()<.2){
    const pool=vo.map(m=>m+12).concat(vo.map(m=>m+24)).filter(m=>m>=67&&m<=84);
    let pos=[0,1,1.64,2,2.64,3][Math.floor(Math.random()*3)];
    for(let k=0,n=1+Math.floor(Math.random()*3);k<n&&pos<4;k++){vibe(pool[Math.floor(Math.random()*pool.length)],t+pos*BEAT);pos+=[.64,1,1.36][Math.floor(Math.random()*3)]}
  }
  for(let k=0,n=4+Math.floor(Math.random()*7);k<n;k++)crackle(t+Math.random()*BEAT*4);
}
function bgmTick(){while(bgmNext<ac.currentTime+1.2){bgmScheduleBar(bgmNext,bgmBar++);bgmNext+=BEAT*4}}
function bgmStart(){
  if(!audioInit()||bgmPlaying)return;
  ac.resume();bgmPlaying=true;
  bgmBus.gain.cancelScheduledValues(ac.currentTime);
  bgmBus.gain.setTargetAtTime(snd.bgmVol*.9,ac.currentTime,.8);
  // 盤面のサーッというノイズ
  hissNode=ac.createBufferSource();hissNode.buffer=noiseBuf;hissNode.loop=true;
  const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=4500;f.Q.value=.5;
  const g=ac.createGain();g.gain.value=.012;hissNode.connect(f);f.connect(g);g.connect(bgmBus);hissNode.start();
  bgmNext=ac.currentTime+.3;bgmTick();bgmTimer=setInterval(bgmTick,250);
  document.body.classList.add('bgm-on');
}
function bgmStop(){
  if(!bgmPlaying)return;
  bgmPlaying=false;clearInterval(bgmTimer);
  bgmBus.gain.cancelScheduledValues(ac.currentTime);bgmBus.gain.setTargetAtTime(0,ac.currentTime,.3);
  const h=hissNode;setTimeout(()=>{try{h.stop()}catch(e){}},1500);
  document.body.classList.remove('bgm-on');
}
function setBgmVol(v){snd.bgmVol=v;saveSound();if(ac&&bgmPlaying)bgmBus.gain.setTargetAtTime(v*.9,ac.currentTime,.1)}
function setSeVol(v){snd.seVol=v;saveSound();if(ac)seBus.gain.setTargetAtTime(v*.8,ac.currentTime,.05)}
// ブラウザは操作があるまで音を出せないので、最初の操作でBGMを始める
function soundUnlock(){if(snd.bgm)bgmStart();else audioInit()}
document.addEventListener('pointerdown',soundUnlock,{once:true});
document.addEventListener('keydown',soundUnlock,{once:true});
// 別のタブに移ったら止め、戻ったら続きから流す
document.addEventListener('visibilitychange',()=>{if(!ac)return;document.hidden?ac.suspend():ac.resume()});

// ===== 効果音（派手にしない） =====
const bell=(m,t,gain=.045,dur=1.3)=>{const f=mtof(m);tone(seBus,{f,t,dur,gain,a:.004,shake:false});tone(seBus,{f:f*2.76,t,dur:dur*.35,gain:gain*.25,shake:false})};
function se(name){
  if(!snd.se||!audioInit())return;
  if(ac.state==='suspended')ac.resume();
  const t=ac.currentTime+.01;
  switch(name){
    case 'click':tone(seBus,{f:880,f2:660,t,dur:.05,gain:.04,shake:false});break;
    case 'tab':noise(seBus,{t,dur:.08,gain:.05,freq:3200,q:1.2,a:.01});break;
    case 'needle':
      noise(seBus,{t,dur:.05,gain:.12,type:'lowpass',freq:500,q:.5});
      tone(seBus,{f:75,f2:55,t:t+.02,dur:.18,gain:.12,shake:false});
      for(let k=0;k<7;k++)noise(seBus,{t:t+.1+Math.random()*.6,dur:.005,gain:.04+Math.random()*.05,type:'highpass',freq:1800,a:.001});
      noise(seBus,{t:t+.1,dur:.7,gain:.025,freq:4500,q:.5,a:.2});break;
    case 'season':[76,79,84].forEach((m,i)=>bell(m,t+i*.11,.035));break;
    case 'event':bell(72,t,.04,.6);bell(77,t+.12,.04,.9);break;
    case 'sign':[60,64,67,71].forEach((m,i)=>tone(seBus,{f:mtof(m),t:t+i*.025,dur:.7,type:'triangle',gain:.035,shake:false}));break;
    case 'stamp':tone(seBus,{f:170,f2:70,t,dur:.14,gain:.16,shake:false});noise(seBus,{t,dur:.06,gain:.06,type:'lowpass',freq:900});break;
    case 'award':[65,69,72,77,81].forEach((m,i)=>bell(m,t+i*.12,.045,1.8));noise(seBus,{t:t+.5,dur:1.2,gain:.01,type:'highpass',freq:8000,a:.3});break;
    case 'moment':noise(seBus,{t,dur:.5,gain:.05,type:'highpass',freq:3000,a:.35});bell(79,t+.3,.035,.8);break;
    case 'miss':tone(seBus,{f:330,f2:220,t,dur:.35,type:'triangle',gain:.04,shake:false});break;
    case 'drumroll':for(let k=0;k<26;k++)noise(seBus,{t:t+k*.05,dur:.05,gain:.02+k*.0025,freq:1900,q:.7,a:.002});noise(seBus,{t:t+1.32,dur:.9,gain:.05,type:'highpass',freq:6000,a:.005});break;
    case 'rank':se('stamp');[72,76,79,84].forEach((m,i)=>bell(m,t+.25+i*.1,.04,1.4));break;
  }
}

// ===== ライブ本番の音（D48） =====
// バンドの演奏（BGMの設定に従う）と、客席の歓声・手拍子（効果音の設定に従う）。盛り上がりで音が開いていく
let liveBus=null,crowdBus=null,crowdGain=null,crowdSrc=null,liveTimer=null,liveNext=0,liveBar=0,liveHypeV=0,liveClimax=false,bgmWasOn=false;
const LIVE_BPM=128,LB=60/LIVE_BPM;
const LIVE_ROOTS=[40,47,49,45];
function liveSoundStart(){
  if(!audioInit())return;
  ac.resume();bgmWasOn=bgmPlaying;if(bgmPlaying)bgmStop();
  liveBus=ac.createGain();liveBus.gain.value=snd.bgm?snd.bgmVol*1.2:0;liveBus.connect(master);
  crowdBus=ac.createGain();crowdBus.gain.value=snd.se?snd.seVol*1.3:0;crowdBus.connect(master);
  crowdSrc=ac.createBufferSource();crowdSrc.buffer=noiseBuf;crowdSrc.loop=true;
  const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=950;f.Q.value=.6;
  crowdGain=ac.createGain();crowdGain.gain.value=.0001;
  crowdSrc.connect(f);f.connect(crowdGain);crowdGain.connect(crowdBus);crowdSrc.start();
  crowdGain.gain.setTargetAtTime(.03,ac.currentTime,.8);
}
function liveHype(h){liveHypeV=h;if(crowdGain)crowdGain.gain.setTargetAtTime(.025+Math.min(h,150)/150*.09,ac.currentTime,.4)}
function cheer(k=1){
  if(!crowdBus)return;
  const t=ac.currentTime+.02;
  noise(crowdBus,{t,dur:1.3*k,gain:.1*k,freq:1100,q:.5,a:.15});
  noise(crowdBus,{t:t+.05,dur:1.1*k,gain:.05*k,freq:2600,q:.7,a:.2});
}
function liveBarAt(t,i){
  const h=liveHypeV,root=LIVE_ROOTS[i%4];
  const cut=500+Math.min(h,150)*24;
  const stab=(tt)=>[12,19,24].forEach(d=>{
    const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=mtof(root+d);
    const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=cut;
    const g=ac.createGain();g.gain.setValueAtTime(.0001,tt);g.gain.linearRampToValueAtTime(.022,tt+.01);g.gain.exponentialRampToValueAtTime(.0001,tt+LB*.9);
    o.connect(f);f.connect(g);g.connect(liveBus);o.start(tt);o.stop(tt+LB);o.onended=()=>g.disconnect();
  });
  for(let b=0;b<4;b++){
    const tb=t+b*LB;
    if(b%2===0)tone(liveBus,{f:120,f2:40,t:tb,dur:.25,gain:.32,shake:false});
    else{noise(liveBus,{t:tb,dur:.14,gain:.09,freq:1800,q:.6});tone(liveBus,{f:190,f2:140,t:tb,dur:.08,gain:.05,shake:false});
      if(h>=60)[0,.012].forEach(d=>noise(crowdBus,{t:tb+d,dur:.03,gain:.05,freq:1500,q:1}))}
    for(let k=0;k<(h>90?4:2);k++)noise(liveBus,{t:tb+k*LB/(h>90?4:2),dur:.03,gain:.018,type:'highpass',freq:7500});
    for(let k=0;k<2;k++)tone(liveBus,{f:mtof(root),t:tb+k*LB/2,dur:LB*.4,type:'triangle',gain:.13,shake:false});
  }
  stab(t);stab(t+LB*1.5);stab(t+LB*3.5);
  if(h>=60)tone(liveBus,{f:120,f2:40,t:t+LB*2.5,dur:.2,gain:.22,shake:false});
  // 盛り上がりが高いとき、ラストナンバーではリードが歌い上げる
  if(h>=100||liveClimax&&h>=70)[0,1,2,3].forEach(k=>tone(liveBus,{f:mtof(root+[24,28,31,28][k]+(k===2&&h>=120?5:0)),t:t+k*LB,dur:LB*.95,type:'square',gain:.012,a:.02,shake:false}));
}
function liveSongPlay(climax){
  if(!liveBus)return;
  liveClimax=!!climax;clearInterval(liveTimer);
  liveNext=ac.currentTime+.1;liveBar=0;
  const tick=()=>{while(liveNext<ac.currentTime+.6){liveBarAt(liveNext,liveBar++);liveNext+=LB*4}};
  tick();liveTimer=setInterval(tick,150);
}
function liveSongStop(){clearInterval(liveTimer);liveTimer=null}
// 覚醒の前のせり上がりと、決まった瞬間の衝撃
function liveRiser(){
  if(!crowdBus)return;
  const t=ac.currentTime,s=ac.createBufferSource();s.buffer=noiseBuf;
  const f=ac.createBiquadFilter();f.type='bandpass';f.Q.value=1.5;f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(7000,t+1.1);
  const g=ac.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.15,t+1.1);g.gain.exponentialRampToValueAtTime(.0001,t+1.3);
  s.connect(f);f.connect(g);g.connect(crowdBus);s.start(t);s.stop(t+1.4);
  if(liveBus)liveBus.gain.setTargetAtTime(snd.bgm?snd.bgmVol*.4:0,t,.2);
}
function liveImpact(){
  if(!crowdBus)return;
  const t=ac.currentTime+.01;
  tone(crowdBus,{f:95,f2:32,t,dur:.8,gain:.45,shake:false});
  [64,68,71,76,80].forEach((m,i)=>bell(m,t+i*.04,.05,2));
  cheer(1.8);
  if(liveBus)liveBus.gain.setTargetAtTime(snd.bgm?snd.bgmVol*1.3:0,t+.1,.1);
}
function liveSoundEnd(){
  if(!liveBus)return;
  liveSongStop();
  const t=ac.currentTime,cs=crowdSrc,lb=liveBus,cb=crowdBus;
  crowdGain.gain.setTargetAtTime(.0001,t,.5);
  setTimeout(()=>{try{cs.stop()}catch(e){}lb.disconnect();cb.disconnect()},2500);
  liveBus=crowdBus=crowdGain=crowdSrc=null;
  if(snd.bgm&&bgmWasOn)setTimeout(bgmStart,1200);
}

// アンコールを求める手拍子（3つ打ちを3回）と歓声
function liveChant(){
  if(!crowdBus)return;
  const t=ac.currentTime+.05;
  for(let r=0;r<3;r++)for(let k=0;k<3;k++){const tt=t+r*.8+k*.18;[0,.01,.02].forEach(d=>noise(crowdBus,{t:tt+d,dur:.04,gain:.07,freq:1400,q:.9}))}
  setTimeout(()=>cheer(1.3),2300);
}
