/* Entry point: loads styles, wires up the buttons, then starts the saved or daily puzzle. */
import './styles/base.css';
import './styles/controls.css';
import './styles/board.css';
import './styles/keyboard.css';
import './styles/dialogs.css';
import './styles/responsive.css';

import { S, SIZES, saveState } from './state.js';
import { $ } from './dom.js';
import { ensureSize } from './words.js';
import { loadGame, startClock, startPlay, pause, setMode, setSize, nextPuzzle, askHint, askReveal, markAssist } from './game.js';
import { build, render, layout, setMsg } from './render.js';
import { initDialogs, openDlg } from './ui/dialogs.js';
import { buildKb, bindKeys } from './ui/keyboard.js';
import { openResult, openStats } from './ui/result.js';
import { openBoard } from './ui/board.js';
import { initAnalytics } from './services/analytics.js';

function applyTheme(){const t=S.settings.theme;if(t==='system')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',t);}

function wire(){
  SIZES.forEach(n=>{const b=document.createElement('button');b.type='button';b.dataset.n=n;b.setAttribute('role','radio');b.setAttribute('aria-label',`${n} by ${n}`);
    b.innerHTML=`${n}<span class="tick"></span>`;b.onclick=()=>setSize(n);$('sizes').appendChild(b);});
  $('tabDaily').onclick=()=>setMode('daily');$('tabUni').onclick=()=>setMode('unlimited');
  $('btnHelp').onclick=()=>openDlg('dlgHelp');$('btnStats').onclick=openStats;$('btnBoard').onclick=openBoard;$('btnPlay').onclick=startPlay;
  $('btnPause').onclick=pause;$('btnSettings').onclick=()=>openDlg('dlgSettings');
  $('btnHint').onclick=askHint;$('btnNext').onclick=nextPuzzle;$('btnResult').onclick=openResult;$('btnReveal').onclick=askReveal;
  $('optAssist').checked=S.settings.assist;$('optAssist').onchange=e=>{S.settings.assist=e.target.checked;markAssist();saveState();render();};
  $('optTheme').value=S.settings.theme;$('optTheme').onchange=e=>{S.settings.theme=e.target.value;applyTheme();saveState();};
  // Mobile browsers fire resize whenever the address bar slides in or out while scrolling.
  // Only re-fit the board for real size changes (rotation, desktop window resize).
  let lastW=window.innerWidth,lastH=window.innerHeight;
  window.addEventListener('resize',()=>{
    const w=window.innerWidth,h=window.innerHeight;
    if(w===lastW&&Math.abs(h-lastH)<200)return;
    lastW=w;lastH=h;layout();
  });
}

async function boot(){
  initAnalytics();applyTheme();initDialogs();buildKb();bindKeys();wire();render();
  if(!S.seenHelp)openDlg('dlgHelp');
  try{await ensureSize(S.size);}
  catch(e){setMsg('Couldn’t load the puzzles. Check your connection and reload.');return;}
  loadGame();build();render();startClock();
}
boot();
