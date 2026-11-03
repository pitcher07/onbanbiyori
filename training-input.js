// 名前札と部屋の人物にだけドラッグを許可する。タップ、スクロール、長押しを区別する。
(()=>{
  let drag=null,hold=null,ghost=null,room=null,frame=0,lastDragAt=-Infinity;
  const source=target=>target.closest('[data-drag-person]');
  function highlight(x,y){
    const next=document.elementFromPoint(x,y)?.closest('[data-room]')||null;
    if(next!==room){room?.classList.remove('drop-target');room=next;room?.classList.add('drop-target')}
  }
  function clearHold(){if(hold)clearTimeout(hold.timer);hold=null}
  function finish(){
    clearHold();if(frame)cancelAnimationFrame(frame);frame=0;
    room?.classList.remove('drop-target');room=null;ghost?.remove();ghost=null;
    if(drag)lastDragAt=performance.now();
    drag=null;document.body.classList.remove('moving-person');
  }
  function drop(target){
    const changed=target&&drag&&moveTrainee(drag.id,target.dataset.room);
    finish();if(changed)render();
  }
  document.addEventListener('dragstart',e=>{
    if(hold){e.preventDefault();return}
    const el=source(e.target);if(!el)return;
    drag={id:Number(el.dataset.dragPerson)};e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain',String(drag.id));document.body.classList.add('moving-person');
  });
  document.addEventListener('dragover',e=>{
    if(!drag||ghost)return;
    highlight(e.clientX,e.clientY);if(room){e.preventDefault();e.dataTransfer.dropEffect='move'}
  });
  document.addEventListener('drop',e=>{if(!drag||ghost)return;e.preventDefault();drop(e.target.closest('[data-room]'))});
  document.addEventListener('dragend',finish);
  function trackFinger(){
    if(!ghost)return;
    const {x,y}=drag;
    ghost.style.transform=`translate3d(${x+8}px,${y-42}px,0)`;
    const top=document.querySelector('header')?.getBoundingClientRect().bottom||0;
    const speed=y<top+40?-Math.min(14,(top+40-y)/3):y>innerHeight-58?Math.min(14,(y-innerHeight+58)/3):0;
    if(speed)window.scrollBy(0,speed);
    highlight(x,y);frame=requestAnimationFrame(trackFinger);
  }
  document.addEventListener('touchstart',e=>{
    if(e.touches.length!==1){finish();return}
    const el=source(e.target);if(!el)return;
    const t=e.touches[0],id=Number(el.dataset.dragPerson);
    hold={x:t.clientX,y:t.clientY,finger:t.identifier,timer:setTimeout(()=>{
      drag={id,x:hold.x,y:hold.y};ghost=document.createElement('div');
      ghost.className='drag-ghost';ghost.textContent='↔ '+person(id).name;
      document.body.append(ghost);document.body.classList.add('moving-person');trackFinger();
    },380)};
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!hold)return;
    const t=Array.from(e.touches).find(t=>t.identifier===hold.finger);if(!t)return;
    if(!ghost){if(Math.hypot(t.clientX-hold.x,t.clientY-hold.y)>8)clearHold();return}
    e.preventDefault();drag.x=t.clientX;drag.y=t.clientY;
  },{passive:false});
  document.addEventListener('touchend',e=>{
    if(!ghost){clearHold();return}
    const t=Array.from(e.changedTouches).find(t=>t.identifier===hold.finger);
    if(t){e.preventDefault();highlight(t.clientX,t.clientY);drop(room)}
  },{passive:false});
  document.addEventListener('touchcancel',finish);
  document.addEventListener('contextmenu',e=>{if(source(e.target))e.preventDefault()});
  document.addEventListener('click',e=>{
    if(performance.now()-lastDragAt<300&&source(e.target)){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag)finish()});
  window.addEventListener('blur',finish);
})();
