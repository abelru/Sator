/* Leaderboard UI: the "Today's fastest" dialog and the name entry shown after a clean daily solve. */
import { S, saveState } from '../state.js';
import { $ } from '../dom.js';
import { G } from '../game.js';
import { today, fmtPrecise } from '../time.js';
import { openDlg } from './dialogs.js';
import { leaderboardEnabled, myId, fetchTop, submitTime } from '../services/leaderboard.js';

// Matches the minimum time firestore.rules accepts, so we never offer a spot the server will refuse.
const MIN_MS=1000;
const OFF='<p class="small">The leaderboard isn’t switched on for this copy of Sator.</p>';

function lbList(list,n,me){
  const wrap=document.createElement('div');
  if(!list.length){const p=document.createElement('p');p.className='small';p.textContent=`No one’s on today’s ${n}×${n} board yet.`;wrap.appendChild(p);return wrap;}
  const ol=document.createElement('ol');ol.className='lb';
  list.forEach((e,i)=>{const li=document.createElement('li');if(e.id===me)li.className='me';
    const rk=document.createElement('span');rk.className='rk';rk.textContent=i+1;
    const nm=document.createElement('span');nm.textContent=e.name+(e.id===me?' (you)':'');
    const t=document.createElement('span');t.className='t';t.textContent=fmtPrecise(e.ms);
    li.append(rk,nm,t);ol.appendChild(li);});
  wrap.appendChild(ol);return wrap;
}

export async function lbOffer(){
  const slot=$('lbSlot');if(!slot)return;const g=G;
  if(!leaderboardEnabled){slot.innerHTML=OFF;return;}
  slot.innerHTML='<p class="small">Loading today’s leaderboard…</p>';
  const [list,me]=await Promise.all([fetchTop(g.n,g.day),myId()]);
  if(!slot.isConnected||G!==g)return;
  slot.innerHTML='';
  if(!list){slot.innerHTML='<p class="small">Couldn’t load the leaderboard right now.</p>';return;}
  const mine=list.some(e=>e.id===me),clean=g.state==='won'&&!g.hints&&!g.assisted&&g.elapsed>=MIN_MS;
  const fits=list.length<10||g.elapsed<list[list.length-1].ms;
  if(clean&&!mine&&!g.lbDone&&fits&&me){
    const box=document.createElement('div');
    box.innerHTML=`<div class="lb-top">You made today’s top ten with ${fmtPrecise(g.elapsed)}! Add your first name to the board.</div><div class="namebox"><input id="lbName" maxlength="16" autocomplete="given-name" placeholder="First name" aria-label="First name"><button class="btn primary" id="lbSave">Add</button></div><p class="small" id="lbErr"></p>`;
    slot.appendChild(box);
    const inp=$('lbName');inp.value=S.lbName||'';
    $('lbSave').onclick=async()=>{
      const name=inp.value.trim().replace(/\s+/g,' ').slice(0,16);
      if(!name){$('lbErr').textContent='Type your first name first.';inp.focus();return;}
      $('lbSave').disabled=true;S.lbName=name;saveState();
      try{await submitTime(g.n,g.day,name,g.elapsed);g.lbDone=true;saveState();lbOffer();}
      catch(e){$('lbSave').disabled=false;$('lbErr').textContent='Couldn’t save your time. Try again in a moment.';}
    };
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('lbSave').click();}});
  }else if(g.state==='won'&&(g.hints||g.assisted)){slot.insertAdjacentHTML('beforeend',`<p class="small">Solves with ${g.hints?'hints':'dead-end warnings on'} don’t go on the leaderboard.</p>`);}
  else if(clean&&!mine&&!g.lbDone&&!fits){slot.insertAdjacentHTML('beforeend',`<p class="small">${fmtPrecise(g.elapsed)} wasn’t quite fast enough for today’s top ten.</p>`);}
  const h=document.createElement('p');h.innerHTML=`<b>Today’s fastest ${g.n}×${g.n}</b>`;slot.appendChild(h);
  slot.appendChild(lbList(list,g.n,me));
}

let lbSize=5;
export function openBoard(){lbSize=S.size>=3&&S.size<=8?S.size:5;openDlg('dlgBoard');renderBoard();}
async function renderBoard(){
  const body=$('boardBody'),day=today(),want=lbSize;body.innerHTML='';
  const chips=document.createElement('div');chips.className='lb-sizes';chips.setAttribute('role','group');chips.setAttribute('aria-label','Board size');
  for(let n=3;n<=8;n++){const b=document.createElement('button');b.type='button';b.textContent=n;b.setAttribute('aria-label',`${n} by ${n}`);b.setAttribute('aria-pressed',n===want);b.onclick=()=>{lbSize=n;renderBoard();};chips.appendChild(b);}
  body.appendChild(chips);
  const note=document.createElement('p');note.className='small';note.textContent=`Daily puzzle ${day}. Only solves without hints or dead-end warnings count, and a new board starts at midnight.`;body.appendChild(note);
  const slot=document.createElement('div');body.appendChild(slot);
  if(!leaderboardEnabled){slot.innerHTML=OFF;return;}
  slot.innerHTML='<p class="small">Loading…</p>';
  const [list,me]=await Promise.all([fetchTop(want,day),myId()]);
  if(want!==lbSize||!$('dlgBoard').open)return;
  slot.innerHTML='';
  if(!list){slot.innerHTML='<p class="small">Couldn’t load the leaderboard right now.</p>';return;}
  slot.appendChild(lbList(list,want,me));
}
