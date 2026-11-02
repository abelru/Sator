/* End-of-puzzle dialog, statistics dialog, and the emoji share text. */
import { S } from '../state.js';
import { $ } from '../dom.js';
import { G, editable, nextPuzzle, setMode } from '../game.js';
import { puzzle } from '../words.js';
import { today, untilMidnight, fmtTime } from '../time.js';
import { openDlg, closeDlg, toast } from './dialogs.js';
import { lbOffer } from './board.js';

function shareText(g){
  const n=g.n;const head=g.mode==='daily'?`Sator daily ${g.day}, ${n}×${n}`:g.mode==='legend'?'Sator legendary 9×9':`Sator unlimited, ${n}×${n}`;
  const lines=[];
  for(let r=0;r<n;r++){let l='';for(let c=0;c<n;c++){l+=!editable(r,c)?'🟦':g.hinted[r][c]?'🟨':'🟩';}lines.push(l);}
  const tail=g.state==='won'?`${fmtTime(g.elapsed)}, ${g.checks} ${g.checks===1?'check':'checks'}, ${g.hints} ${g.hints===1?'hint':'hints'}`:'Answer revealed';
  return `${head}\n${lines.join('\n')}\n${tail}${g.state==='won'&&g.bonus?'\n✨ Diagonal bonus':''}`;
}
/** Copies the share text. If the clipboard is blocked, shows it in a textarea inside `body` instead. */
async function share(g,body){
  const text=shareText(g);
  try{await navigator.clipboard.writeText(text);toast('Copied to clipboard');}
  catch(e){const box=body.querySelector('textarea.copy')||document.createElement('textarea');box.className='copy';box.value=text;box.readOnly=true;
    body.appendChild(box);box.select();toast('Copy the text below');}
}
function miniGrid(rows){const n=rows.length;return `<div class="mini" style="grid-template-columns:repeat(${n},22px)">${rows.map(r=>[...r].map(ch=>`<div>${ch}</div>`).join('')).join('')}</div>`;}

export function openResult(){
  if(!G)return;
  const won=G.state==='won';
  $('resTitle').textContent=won?(G.hints?'Solved with hints':'Solved'):'Answer revealed';
  const differs=won&&G.grid.some((row,i)=>row.join('')!==G.sol[i]);
  let h='';
  if(won&&G.bonus)h+=`<p class="bonus-note">✨ Diagonal bonus: top-left to bottom-right spells <b>${G.bonus.toUpperCase()}</b> too.</p>`;
  if(won)h+=`<div class="res-line"><span>Time <b>${fmtTime(G.elapsed)}</b></span><span>Checks <b>${G.checks}</b></span><span>Hints <b>${G.hints}</b></span></div>`;
  if(won&&G.hints)h+=`<p class="small">You used ${G.hints} ${G.hints===1?'hint':'hints'}, so this isn’t a clean solve.</p>`;
  if(G.mode==='daily'&&won)h+='<div id="lbSlot"></div>';
  if(differs)h+=`<p class="small">Your square is different from ours. Here’s the one we had:</p>${miniGrid(G.sol)}`;
  if(!won)h+=`<p class="small">Our answer is on the board. ${G.mode==='daily'?'Your daily streak for this size starts over.':''}</p>`;
  if(G.mode==='daily')h+=statsHTML(G.n)+`<p class="small">Next daily in ${untilMidnight()}.</p>`;
  h+=`<div class="row-btns"><button class="btn primary" id="rShare">Share result</button>`;
  if(G.mode==='unlimited')h+=`<button class="btn" id="rNext">New puzzle</button>`;
  if(G.mode==='legend')h+=`<button class="btn" id="rNext">Start over</button>`;
  if(G.mode==='daily')h+=`<button class="btn" id="rUni">Play unlimited</button>`;
  h+='</div>';
  $('resBody').innerHTML=h;
  $('rShare').onclick=()=>share(G,$('resBody'));
  if($('rNext'))$('rNext').onclick=()=>{closeDlg('dlgResult');nextPuzzle();};
  if($('rUni'))$('rUni').onclick=()=>{closeDlg('dlgResult');setMode('unlimited');};
  openDlg('dlgResult');
  if($('lbSlot'))lbOffer();
}
function statsHTML(n){
  const st=S.stats[n]||{played:0,won:0,streak:0,best:0,lastWin:0,uniWon:0};
  const cur=st.lastWin>=today()-1?st.streak:0;
  const pct=st.played?Math.round(st.won/st.played*100):0;
  return `<div class="stats"><div><b>${st.played}</b><small>Played</small></div><div><b>${pct}</b><small>Solved %</small></div><div><b>${cur}</b><small>Streak</small></div><div><b>${st.best}</b><small>Best streak</small></div></div>`;
}
export function openStats(){
  const n=S.size;const st=S.stats[n]||{uniWon:0};
  let h;
  if(n===9)h=`<p>${st.legendWon?`You’ve cracked the legendary 9×9 <b>${st.legendWon}</b> ${st.legendWon===1?'time':'times'}.`:'The legendary 9×9 is still waiting for you.'}</p>`;
  else h=`<p class="small">Daily results for ${n}×${n}.</p>`+statsHTML(n)+`<p class="small">Unlimited ${n}×${n} puzzles solved: <b>${st.uniWon||0}</b></p>`;
  if(st.diag)h+=`<p class="small">✨ Diagonal bonuses at this size: <b>${st.diag}</b></p>`;
  const dg=n===9?null:S.daily[n];
  if(dg&&dg.day===today()&&dg.state!=='play')h+=`<div class="row-btns"><button class="btn primary" id="sShare">Share today’s ${n}×${n}</button></div>`;
  h+=`<p class="small" style="margin-top:12px">Next daily in ${untilMidnight()}.</p>`;
  $('statsBody').innerHTML=h;
  if($('sShare'))$('sShare').onclick=()=>{dg.sol=dg.sol||puzzle(n,'daily',dg.idx);share(dg,$('statsBody'));};
  openDlg('dlgStats');
}
