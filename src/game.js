/* The current puzzle (G), its rules, and every action a player can take on it. */
import { S, saveState } from './state.js';
import { today } from './time.js';
import { count, puzzle, dict, ensureSize } from './words.js';
import { findCompletion } from './solver.js';
import { build, render, setMsg, animate, tileAt, shakeTiles, updateMeta } from './render.js';
import { confirmBox } from './ui/dialogs.js';
import { openResult } from './ui/result.js';
import { track } from './services/analytics.js';

export let G = null;
export let paused = true;

/* ---------- setup ---------- */
function emptyGrid(n,sol){const g=[];for(let i=0;i<n;i++){g.push([]);for(let j=0;j<n;j++)g[i].push(i===0?sol[0][j]:j===0?sol[0][i]:'');}return g;}
function newGame(n,mode,idx,day){
  const sol=puzzle(n,mode,idx);
  return {n,mode,idx,day:day||0,sol,grid:emptyGrid(n,sol),hinted:Array.from({length:n},()=>Array(n).fill(false)),
    status:Array(n).fill(null).map((v,i)=>i===0?'ok':null),checks:0,hints:0,state:'play',elapsed:0,last:0};
}
function pickUnlimited(n,avoid){
  const total=count(n,'unlimited');const solved=new Set(S.uniSolved[n]||[]);
  const open=[];for(let i=0;i<total;i++)if(!solved.has(i)&&i!==avoid)open.push(i);
  const list=open.length?open:[...Array(total).keys()].filter(i=>i!==avoid||total===1);
  return list[Math.floor(Math.random()*list.length)];
}
/** Restores the saved game for the current size and mode, or starts a fresh one. Data for S.size must be loaded. */
export function loadGame(){
  paused=true;
  const n=S.size;
  if(n===9){
    const saved=S.legend;
    if(saved&&saved.n===9){G=saved;G.sol=puzzle(9,'unlimited',0);}
    else{G=newGame(9,'legend',0);S.legend=G;}
  }else if(S.mode==='daily'){
    const d=today();const saved=S.daily[n];
    if(saved&&saved.day===d&&saved.n===n){G=saved;G.sol=puzzle(n,'daily',G.idx);}
    else{const idx=(d-1)%count(n,'daily');G=newGame(n,'daily',idx,d);S.daily[n]=G;}
  }else{
    const saved=S.uni[n];
    if(saved&&saved.n===n&&saved.idx<count(n,'unlimited')){G=saved;G.sol=puzzle(n,'unlimited',G.idx);}
    else{G=newGame(n,'unlimited',pickUnlimited(n,-1));S.uni[n]=G;}
  }
  G.sel=firstEmpty()||[1,1];
  saveState();
}
export function editable(r,c){return r>0&&c>0;}
function firstEmpty(){const n=G.n;for(let r=1;r<n;r++)for(let c=1;c<n;c++)if(!G.grid[r][c])return[r,c];return null;}
function cells(){const a=[];for(let r=1;r<G.n;r++)for(let c=1;c<G.n;c++)a.push([r,c]);return a;}
function tick(){G.last=Date.now();}
export function rowWord(i){return G.grid[i].join('');}

/* ---------- clock ---------- */
let clockT=Date.now();
export function startClock(){
  setInterval(()=>{const now=Date.now();const dt=Math.min(now-clockT,2000);clockT=now;
    if(G&&G.state==='play'&&!paused&&document.visibilityState==='visible'){G.elapsed=(G.elapsed||0)+dt;if(Math.floor(G.elapsed/1000)%5===0)saveState();}
    updateMeta();},1000);
  document.addEventListener('visibilitychange',()=>{clockT=Date.now();
    if(document.visibilityState==='hidden'&&G&&G.state==='play'&&!paused){paused=true;render();}
    saveState();});
}
/** Event names look like 'solve-daily-5' so the dashboard groups them by mode and size. */
const label=g=>`${g.mode}-${g.n}`;
export function startPlay(){if(!G||G.state!=='play')return;if(!G.started)track(`play-${label(G)}`,`Started ${G.mode} ${G.n}×${G.n}`);paused=false;G.started=true;markAssist();clockT=Date.now();tick();saveState();render();setMsg('');}
/** Dead-end warnings are a form of help: once they're on during a puzzle, that solve can't go on the leaderboard. */
export function markAssist(){if(G&&G.state==='play'&&S.settings.assist&&!G.assisted){G.assisted=true;saveState();}}
export function pause(){if(G&&G.state==='play'&&!paused){paused=true;saveState();render();}}

/** Tapping a square selects it; tapping it again flips between typing across and down. */
export function select(r,c){
  if(!editable(r,c)||G.state!=='play')return;
  if(G.sel&&G.sel[0]===r&&G.sel[1]===c)G.dir=G.dir==='down'?'across':'down';
  else if(c>r)G.dir='down';else if(c<r)G.dir='across';
  G.sel=[r,c];render();
}

/* ---------- typing ---------- */
function setCell(r,c,ch){
  G.grid[r][c]=ch;G.grid[c][r]=ch;G.hinted[r][c]=G.hinted[c][r]=false;
  G.typed=G.typed||Array.from({length:G.n},()=>Array(G.n).fill(false));
  G.typed[r][c]=G.typed[c][r]=!!ch;
  G.status[r]=null;G.status[c]=null;
}
function order(){const a=cells();return G.dir==='down'?a.map(([r,c])=>[c,r]):a;}
function advance(){
  const list=order();const k=list.findIndex(([r,c])=>r===G.sel[0]&&c===G.sel[1]);
  for(let s=1;s<=list.length;s++){const [r,c]=list[(k+s)%list.length];if(!G.grid[r][c]){G.sel=[r,c];return;}}
  if(k<list.length-1)G.sel=list[k+1];
}
export function type(ch){
  if(!G||G.state!=='play'||paused)return;
  const [r,c]=G.sel;tick();setCell(r,c,ch);
  render();animate([[r,c]],'pop');if(r!==c)animate([[c,r]],'reflect');
  advance();render();if(autoFinish())return;setMsg(firstEmpty()?'':'Every square is filled, but some rows aren’t words yet. Press Check to see which.');saveState();
}
export function back(){
  if(!G||G.state!=='play'||paused)return;
  let [r,c]=G.sel;
  if(!G.grid[r][c]){const list=order();const k=list.findIndex(([a,b])=>a===r&&b===c);if(k>0){[r,c]=list[k-1];G.sel=[r,c];}}
  if(G.grid[r][c])setCell(r,c,'');
  tick();setMsg('');render();saveState();
}
export function move(dr,dc){
  if(!G||G.state!=='play'||paused)return;
  G.dir=dr?'down':'across';
  let [r,c]=G.sel;r=Math.min(G.n-1,Math.max(1,r+dr));c=Math.min(G.n-1,Math.max(1,c+dc));G.sel=[r,c];render();
  tileAt(r,c).focus({preventScroll:true});
}

/* ---------- checking ---------- */
function rowsText(list){return list.length===1?`Row ${list[0]}`:`Rows ${list.slice(0,-1).join(', ')} and ${list[list.length-1]}`;}
export function check(){
  if(!G||G.state!=='play'||paused)return;
  const n=G.n,D=dict(n);let complete=true,anyFull=false;const bad=[],checked=[];
  for(let i=1;i<n;i++){const w=rowWord(i);
    if(w.length<n){complete=false;continue;}
    anyFull=true;G.status[i]=D.has(w)?'ok':'bad';if(G.status[i]==='bad')bad.push(i+1);checked.push(i);}
  if(!anyFull){setMsg('Finish a row first, then check it.');shakeTiles();return;}
  G.checks++;tick();
  const pulse=[];checked.forEach(i=>{for(let j=0;j<n;j++)if(editable(i,j)){pulse.push([i,j]);}});
  if(complete&&!bad.length){win();return;}
  render();
  pulse.forEach(([i,j])=>{tileAt(i,j).style.setProperty('--k',j);});animate(pulse,'pulse');
  if(bad.length)setMsg(`${rowsText(bad)} ${bad.length===1?'isn’t':'aren’t'} in the word list.`);
  else{const left=n-1-checked.length;setMsg(`So far so good. ${left} ${left===1?'row':'rows'} to go.`);}
  saveState();
}
function autoFinish(){
  if(!G||G.state!=='play'||firstEmpty())return false;
  const D=dict(G.n);for(let i=1;i<G.n;i++)if(!D.has(rowWord(i)))return false;
  for(let i=0;i<G.n;i++)G.status[i]='ok';
  win();return true;
}

/* ---------- hints ---------- */
function consistent(rows){for(let r=0;r<G.n;r++)for(let c=0;c<G.n;c++){const ch=G.grid[r][c];if(ch&&ch!==rows[r][c])return false;}return true;}
export function askHint(){
  if(!G||G.state!=='play'||paused)return;
  confirmBox('Fill in a word?',G.hints?`You’ve used ${G.hints} ${G.hints===1?'hint':'hints'} on this puzzle. Another one fills a word that fits the letters you already have.`:'This fills a word that fits the letters you already have. Puzzles solved with hints don’t count as clean solves.','Fill a word',hint,'Cancel');
}
function hint(){
  if(!G||G.state!=='play')return;
  if(consistent(G.sol)){fillFrom(G.sol);return;}
  const res=findCompletion(G.grid,1500);
  if(res.rows){fillFrom(res.rows);return;}
  confirmBox('No word fits',res.timedOut?'We couldn’t find a way to finish this square with the letters you have now. Want us to swap out one of your words?':'No set of real words can finish this square with the letters you have now. Want us to swap out one of your words?','Swap a word',replaceWord,'Keep playing');
}
function fillFrom(rows){
  const n=G.n;let row=-1;
  for(let i=1;i<n;i++)if(G.grid[i].some(ch=>!ch)){row=i;break;}
  if(row<0){check();return;}
  const changed=[];
  for(let j=1;j<n;j++){const ch=rows[row][j];if(G.grid[row][j]!==ch){G.grid[row][j]=G.grid[j][row]=ch;changed.push([row,j]);if(j!==row)changed.push([j,row]);
    G.hinted[row][j]=G.hinted[j][row]=true;if(G.typed){G.typed[row][j]=G.typed[j][row]=false;}}}
  G.status[row]='ok';G.hints++;tick();
  const nx=firstEmpty();if(nx)G.sel=nx;
  render();animate(changed,'reflect');
  setMsg(`Filled row ${row+1} with a word that fits your letters.`);saveState();autoFinish();
}
function replaceWord(){
  if(!G||G.state!=='play')return;
  const n=G.n,D=dict(n),cand=[];
  for(let i=1;i<n;i++){const row=G.grid[i];if(!row.slice(1).some(Boolean))continue;
    const full=row.every(Boolean);cand.push({i,s:full&&!D.has(row.join(''))?0:full?2:1});}
  cand.sort((a,b)=>a.s-b.s||b.i-a.i);
  for(const {i} of cand){
    const g=G.grid.map(r=>r.slice());for(let j=1;j<n;j++){g[i][j]='';g[j][i]='';}
    const res=findCompletion(g,500);
    if(!res.rows)continue;
    const changed=[];
    for(let j=1;j<n;j++){const ch=res.rows[i][j];if(G.grid[i][j]!==ch){changed.push([i,j]);if(j!==i)changed.push([j,i]);G.status[j]=null;G.hinted[i][j]=G.hinted[j][i]=true;if(G.typed){G.typed[i][j]=G.typed[j][i]=false;}}
      G.grid[i][j]=G.grid[j][i]=ch;}
    G.status[i]='ok';G.hints++;tick();
    const nx=firstEmpty();if(nx)G.sel=nx;
    render();animate(changed,'reflect');
    setMsg(`Swapped row ${i+1} for a word that fits the rest of your letters.`);saveState();autoFinish();return;
  }
  const keep=Array.from({length:n},(_,r)=>r===0||(G.grid[r].every(Boolean)&&D.has(G.grid[r].join(''))));
  const g2=G.grid.map((row,r)=>row.map((ch,c)=>(keep[r]||keep[c])?ch:''));
  const res2=findCompletion(g2,800);
  if(res2.rows){
    for(let r=1;r<n;r++)for(let c=1;c<n;c++)if(G.grid[r][c]&&!g2[r][c]){G.grid[r][c]='';G.hinted[r][c]=false;if(G.typed)G.typed[r][c]=false;}
    for(let r=1;r<n;r++)if(!keep[r])G.status[r]=null;
    fillFrom(res2.rows);
    if(G.state==='play')setMsg('Cleared the letters that couldn’t fit, kept your real words, and filled a row.');saveState();return;
  }
  stockHint();
}
function stockHint(){
  if(!G||G.state!=='play')return;
  const n=G.n;let row=-1;
  for(let i=1;i<n;i++){if(rowWord(i)!==G.sol[i]){row=i;break;}}
  if(row<0){check();return;}
  const changed=[];
  for(let j=1;j<n;j++){const ch=G.sol[row][j];if(G.grid[row][j]!==ch){G.grid[row][j]=G.grid[j][row]=ch;G.status[j]=null;changed.push([row,j],[j,row]);
    G.hinted[row][j]=G.hinted[j][row]=true;if(G.typed){G.typed[row][j]=G.typed[j][row]=false;}}}
  G.status[row]='ok';G.hints++;tick();
  const nx=firstEmpty();if(nx)G.sel=nx;
  render();animate(changed,'reflect');
  setMsg(`Swapped row ${row+1} for a word from our answer.`);saveState();autoFinish();
}

/* ---------- finishing ---------- */
function finishStats(won){
  const n=G.n;const st=S.stats[n]=S.stats[n]||{played:0,won:0,streak:0,best:0,lastWin:0,uniWon:0};
  if(G.mode==='daily'){
    st.played++;
    if(won){st.won++;st.streak=(st.lastWin===G.day-1)?st.streak+1:1;st.lastWin=G.day;st.best=Math.max(st.best,st.streak);}
    else{st.streak=0;}
  }else if(G.mode==='legend'){if(won){st.legendWon=(st.legendWon||0)+1;if(!G.hints)st.legendClean=(st.legendClean||0)+1;}}
  else if(won){st.uniWon++;const a=S.uniSolved[n]=S.uniSolved[n]||[];if(!a.includes(G.idx))a.push(G.idx);}
  if(won&&G.bonus)st.diag=(st.diag||0)+1;
}
function diagWord(){let w='';for(let i=0;i<G.n;i++)w+=G.grid[i][i];return w;}
function win(){
  const dw=diagWord();G.bonus=dict(G.n).has(dw)?dw:null;G.bonusShown=false;
  G.state='won';finishStats(true);saveState();render();
  track(`solve-${label(G)}${G.hints?'-hints':''}`,`Solved ${G.mode} ${G.n}×${G.n}${G.hints?' with hints':''}`);
  setMsg(G.hints?'Solved with hints.':G.checks===0?'Solved without a single check.':G.checks===1?'Solved on the first check.':'Solved.');
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sweep=still?100:G.n*90+500;
  const g=G;
  if(G.bonus){
    setTimeout(()=>{if(G!==g)return;G.bonusShown=true;saveState();render();setMsg(`Bonus! The diagonal spells ${G.bonus.toUpperCase()} too.`);},sweep);
    setTimeout(()=>{if(G===g)openResult();},still?400:sweep+G.n*120+1100);
  }else setTimeout(()=>{if(G===g)openResult();},sweep+200);
}
function reveal(){
  for(let r=0;r<G.n;r++)for(let c=0;c<G.n;c++)G.grid[r][c]=G.sol[r][c];
  G.status=G.status.map(()=>'ok');G.state='revealed';finishStats(false);saveState();render();
  track(`reveal-${label(G)}`,`Revealed ${G.mode} ${G.n}×${G.n}`);
  setMsg('Here’s our answer.');
}
export function askReveal(){
  if(!G||G.state!=='play')return;
  const text=G.mode==='daily'?'This ends today’s puzzle for this size and resets its streak.':G.mode==='legend'?'This ends the puzzle. You can start over afterward.':'This ends the puzzle. You can start a new one right after.';
  confirmBox('Show the answer?',text,'Show answer',reveal,'Keep playing');
}

/* ---------- navigation ---------- */
export function setMode(m){if(!G)return;S.mode=m;loadGame();build();render();setMsg('');saveState();}

let sizeReq=0;
/** Switching size may need to download that size's words first; only the latest click wins. */
export async function setSize(n){
  const req=++sizeReq;
  try{await ensureSize(n);}
  catch(e){if(req===sizeReq)setMsg('Couldn’t load that size. Check your connection and try again.');return;}
  if(req!==sizeReq)return;
  S.size=n;loadGame();build();render();setMsg('');saveState();
}
export function nextPuzzle(){
  if(G&&G.mode==='legend'){paused=true;G=newGame(9,'legend',0);S.legend=G;G.sel=firstEmpty()||[1,1];build();render();setMsg('');saveState();return;}
  if(!G||G.mode!=='unlimited')return;
  paused=true;G=newGame(G.n,'unlimited',pickUnlimited(G.n,G.idx));S.uni[G.n]=G;G.sel=firstEmpty()||[1,1];
  build();render();setMsg('');saveState();
}
