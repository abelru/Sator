/* On-screen keyboard plus physical keyboard shortcuts. */
import { $ } from '../dom.js';
import { G, paused, type, back, check, move, startPlay } from '../game.js';
import { anyOpen } from './dialogs.js';

export function buildKb(){
  const rows=['qwertyuiop','asdfghjkl','>zxcvbnm<'];
  const kb=$('kb');
  rows.forEach((r,ri)=>{const row=document.createElement('div');row.className='row';
    if(ri===1){const s=document.createElement('div');s.className='spacer';row.appendChild(s);}
    for(const ch of r){const b=document.createElement('button');b.type='button';
      if(ch==='>'){b.textContent='Check';b.className='wide check';b.onclick=check;}
      else if(ch==='<'){b.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H9l-6 7 6 7h12z"/><path d="M17 9l-6 6M11 9l6 6"/></svg>';b.className='wide';b.setAttribute('aria-label','Delete');b.onclick=back;}
      else{b.textContent=ch;b.onclick=()=>type(ch);}
      row.appendChild(b);}
    if(ri===1){const s=document.createElement('div');s.className='spacer';row.appendChild(s);}
    kb.appendChild(row);});
}

export function bindKeys(){
  document.addEventListener('keydown',e=>{
    if(anyOpen()||e.metaKey||e.ctrlKey||e.altKey)return;
    const k=e.key;
    if(G&&G.state==='play'&&paused){if(k==='Enter'||k===' '){startPlay();e.preventDefault();}return;}
    if(/^[a-zA-Z]$/.test(k)){type(k.toLowerCase());e.preventDefault();}
    else if(k==='Backspace'||k==='Delete'){back();e.preventDefault();}
    else if(k==='Enter'){check();e.preventDefault();}
    else if(k==='ArrowLeft'){move(0,-1);e.preventDefault();}
    else if(k==='ArrowRight'){move(0,1);e.preventDefault();}
    else if(k==='ArrowUp'){move(-1,0);e.preventDefault();}
    else if(k==='ArrowDown'){move(1,0);e.preventDefault();}
  });
}
