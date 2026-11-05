/* Draws the board and the controls around it from the current game state. */
import { S } from './state.js';
import { $ } from './dom.js';
import { G, paused, editable, select, lo } from './game.js';
import { count, fits } from './words.js';
import { today, fmtTime } from './time.js';

const TIER={3:'everyday words',4:'everyday words',5:'everyday words',6:'everyday words',7:'harder words',8:'rare words',9:'one legendary square'};
const tilesEl=$('tiles'),markersEl=$('markers'),cmarkersEl=$('cmarkers');
let tileEls=[];

export function tileAt(r,c){return tileEls[r]?.[c];}
export function updateMeta(){if(!G)return;$('mTime').textContent=fmtTime(G.elapsed||0);$('mChecks').textContent=G.checks||0;}

/* Height of the screen with the browser's toolbars showing (CSS svh). On iPhone Safari this
   excludes the address bar and bottom toolbar, and it doesn't change while scrolling. */
let probe=null;
function visibleHeight(){
  if(!probe){probe=document.createElement('div');probe.style.cssText='position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';document.body.appendChild(probe);}
  return Math.min(probe.offsetHeight||window.innerHeight,window.innerHeight);
}
/** Sizes the tiles so the whole game (header, board, buttons, keyboard) fits on one screen. */
export function layout(){
  if(!G)return;
  const n=G.n;const g=n<=5?7:n<=7?6:5;
  // Everything on the page except the tiles themselves, measured rather than guessed.
  const root=getComputedStyle(document.documentElement);
  const chrome=document.querySelector('.bar').offsetHeight+document.querySelector('main').offsetHeight-tilesEl.offsetHeight
    +parseFloat(root.paddingTop)+parseFloat(root.paddingBottom);
  const availW=Math.min(window.innerWidth-80,460);
  const availH=Math.max(180,visibleHeight()-chrome);
  const side=Math.min(availW,availH,n*66+(n-1)*g);
  const t=Math.floor((side-(n-1)*g)/n);
  const real=t*n+g*(n-1);
  tilesEl.style.setProperty('--n',n);tilesEl.style.setProperty('--t',t+'px');tilesEl.style.setProperty('--g',g+'px');
  tilesEl.style.setProperty('--side',real+'px');tilesEl.style.setProperty('--fs',Math.round(t*.5)+'px');
  markersEl.style.setProperty('--t',t+'px');markersEl.style.setProperty('--g',g+'px');
  cmarkersEl.style.setProperty('--n',n);cmarkersEl.style.setProperty('--t',t+'px');cmarkersEl.style.setProperty('--g',g+'px');
}
/** Creates the tile buttons and row/column markers. Call when the puzzle changes. */
export function build(){
  tilesEl.innerHTML='';markersEl.innerHTML='';cmarkersEl.innerHTML='';tileEls=[];
  if(!G)return;
  const n=G.n;
  for(let r=0;r<n;r++){tileEls.push([]);for(let c=0;c<n;c++){
    const b=document.createElement('button');b.className='tile';b.type='button';
    if(!editable(r,c)){b.classList.add('locked');b.tabIndex=-1;}
    if(r===c)b.classList.add('diag');
    b.style.setProperty('--d',Math.abs(r-c));b.style.setProperty('--i',r);
    b.addEventListener('click',()=>select(r,c));
    tilesEl.appendChild(b);tileEls[r].push(b);
  }
  const m=document.createElement('div');m.className='mk';m.innerHTML='<span></span>';markersEl.appendChild(m);cmarkersEl.appendChild(m.cloneNode(true));}
  renderChrome(); // chrome (mode tabs, caption) must be current before layout() measures it
  layout();
}
function deadRows(){
  const out=Array(G.n).fill(false);
  if(!S.settings.assist||G.state!=='play')return out;
  for(let i=lo();i<G.n;i++){if(G.status[i])continue;const row=G.grid[i];const filled=row.filter(Boolean).length;
    if(filled>=2&&filled<G.n&&!fits(G.n,row))out[i]=true;}
  return out;
}
/** Syncs every tile, marker and button with G. Cheap enough to call after any change. */
export function render(){
  renderChrome();
  if(!G){$('msg').textContent='';return;}
  const n=G.n;const [sr,sc]=G.sel||[0,0];const play=G.state==='play';const wi=G.dir==='down'?sc:sr;
  // Selection highlights only while actively playing; drawn under the paused cover they blur into a glowing box.
  const live=play&&!paused;
  const dead=deadRows();
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const b=tileEls[r][c];const ch=G.grid[r][c];
    b.textContent=ch;
    const locked=!editable(r,c);
    b.classList.toggle('filled',!!ch&&!locked);
    b.classList.toggle('sel',live&&r===sr&&c===sc);
    b.classList.toggle('mirror',live&&r===sc&&c===sr&&sr!==sc);
    b.classList.toggle('word',live&&!locked&&(r===wi||c===wi));
    const good=G.status[r]==='ok'&&G.status[c]==='ok';
    b.classList.toggle('good',!locked&&good&&G.state!=='revealed');
    b.classList.toggle('bad',!locked&&(G.status[r]==='bad'||G.status[c]==='bad'));
    b.classList.toggle('hinted',!locked&&G.hinted[r][c]&&G.state!=='won');
    b.classList.toggle('solved',G.state==='won');
    b.classList.toggle('bonus',G.state==='won'&&!!G.bonusShown&&r===c);
    b.classList.toggle('revealed',G.state==='revealed'&&!G.typed?.[r]?.[c]);
    b.setAttribute('aria-label',`Row ${r+1}, column ${c+1}${ch?', '+ch.toUpperCase():', empty'}${locked?', given':''}`);
    if(!locked)b.tabIndex=(r===sr&&c===sc)?0:-1;
  }
  [...markersEl.children,...cmarkersEl.children].forEach((m,k)=>{
    const i=k%n;const st=G.status[i];const isDead=dead[i];
    m.className='mk'+(st==='ok'?' ok':st==='bad'?' bad':isDead?' dead':'');
    m.firstChild.textContent=st==='ok'?'✓':st==='bad'?'×':isDead?'!':'';
  });
  const cover=play&&paused;
  $('stage').classList.toggle('blurred',cover);$('cover').hidden=!cover;
  if(cover){const begun=G.started||G.last;$('btnPlay').textContent=begun?'Resume':'Play';
    $('coverText').textContent=begun?'Paused. The clock is stopped until you resume.':'';$('coverText').hidden=!begun;}
  $('btnPause').style.visibility=play&&!paused?'visible':'hidden';
  $('btnHint').disabled=!play||paused;$('btnReveal').hidden=!play||paused;
  const legend=G.mode==='legend';
  $('btnNext').hidden=legend?play:G.mode!=='unlimited'&&G.mode!=='free';
  $('btnNext').textContent=legend?'Start over':'New puzzle';
  $('btnResult').hidden=play;
  $('kb').style.opacity=play&&!paused?'1':'.5';
  updateMeta();
}
function renderChrome(){
  $('modes').hidden=S.size===9||S.free;
  $('tabDaily').setAttribute('aria-selected',S.mode==='daily');$('tabUni').setAttribute('aria-selected',S.mode==='unlimited');
  const d=today(),st9=S.stats[9]||{};
  // Green tick = today's daily solved at that size (yellow if hints were used). Never shown in free play.
  const done=n=>{if(S.free)return null;const dg=S.daily[n];
    if(n===9)return st9.legendWon?(st9.legendClean?'clean':'assist'):null;
    return S.mode==='daily'&&dg&&dg.day===d&&dg.state==='won'?(dg.hints>0?'assist':'clean'):null;};
  $('sizes').querySelectorAll('button[data-n]').forEach(b=>{const n=+b.dataset.n,dn=done(n);b.setAttribute('aria-checked',n===S.size);
    b.classList.toggle('done',!!dn);b.classList.toggle('assist',dn==='assist');});
  $('btnFree').setAttribute('aria-pressed',S.free);
  const ex=$('selExpert');ex.value=S.size>=7?String(S.size):'';ex.parentElement.classList.toggle('on',S.size>=7);
  [...ex.options].forEach(o=>{if(!o.value)return;const n=+o.value;o.textContent=`${n}×${n}${done(n)?' ✓':''}`;});
  let cap='';
  if(G){
    if(G.mode==='free')cap=`Free play ${G.n}×${G.n}: no starting word, any square counts`;
    else if(G.mode==='legend')cap='One legendary square, built from rare dictionary words';
    else if(G.mode==='daily')cap=`Daily puzzle ${G.day}, ${G.n}×${G.n}, ${TIER[G.n]}`;
    else cap=`Unlimited puzzle ${G.idx+1} of ${count(G.n,'unlimited')}, ${TIER[G.n]}`;
  }
  $('caption').textContent=cap;
}
export function setMsg(t){$('msg').textContent=t;}
/** Restarts a CSS animation class on the given [row, col] tiles. */
export function animate(list,cls){list.forEach(([r,c])=>{const b=tileEls[r]?.[c];if(!b)return;b.classList.remove(cls);void b.offsetWidth;b.classList.add(cls);});}
export function shakeTiles(){tilesEl.classList.remove('shake');void tilesEl.offsetWidth;tilesEl.classList.add('shake');}
