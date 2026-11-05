/* Backtracking search used by hints: finds real words that complete a partly filled square. */
import { sizeData } from './words.js';

const tries={};
function trieFor(n){
  if(tries[n])return tries[n];
  const D=sizeData(n),s=D.w,cnt=s.length/n,W=new Array(cnt);
  for(let i=0;i<cnt;i++)W[i]=s.substr(i*n,n);
  // Words that appear in our own puzzles are tried first, so hints favor everyday words.
  const pref=new Set();for(const k of ['d','u']){const p=D[k];for(let i=0;i<p.length;i+=n)pref.add(p.substr(i,n));}
  const ids=[];for(let i=0;i<cnt;i++)if(pref.has(W[i]))ids.push(i);for(let i=0;i<cnt;i++)if(!pref.has(W[i]))ids.push(i);
  // lists[0] (the root) holds every word, so a search can also start from a blank first row (free play).
  const ch=[new Int32Array(26).fill(-1)],lists=[ids.slice()];
  for(const id of ids){const w=W[id];let u=0;for(let k=0;k<n;k++){const x=w.charCodeAt(k)-97;let v=ch[u][x];if(v<0){v=ch.length;ch.push(new Int32Array(26).fill(-1));lists.push([]);ch[u][x]=v;}u=v;lists[u].push(id);}}
  return tries[n]={W,ch,lists,pref};
}

/** Returns { rows, timedOut }. rows is null when nothing fits within `budget` ms. */
export function findCompletion(grid,budget){
  const n=grid.length,{W,ch,lists,pref}=trieFor(n),t0=performance.now();
  let steps=0,timedOut=false,sols=0,best=null,bestSc=-1;const cp=new Array(n),rows=new Array(n);
  // With row 0 filled (normal play) search starts at row 1; with it blank or partial (free play) at row 0.
  const s=grid[0].every(Boolean)?1:0;
  let target=s;for(let i=s;i<n;i++)if(grid[i].some(c=>!c)){target=i;break;}
  const maxSc=n-s+3;
  if(s){rows[0]=grid[0].join('');for(let j=0;j<n;j++){cp[j]=ch[0][grid[0][j].charCodeAt(0)-97];if(cp[j]<0)return{rows:null,timedOut:false};}}
  else cp.fill(0);
  function rec(k){
    if(k===n){let sc=0;for(let i=s;i<n;i++)if(pref.has(rows[i]))sc+=i===target?4:1;
      if(sc>bestSc){bestSc=sc;best=rows.slice();}
      return ++sols>=40||bestSc>=maxSc||performance.now()-t0>budget;}
    const L=lists[cp[k]],g=grid[k],saved=cp.slice();
    for(let t=0;t<L.length;t++){
      if((++steps&511)===0&&performance.now()-t0>budget){timedOut=true;return true;}
      const w=W[L[t]];let ok=true;
      for(let j=k;j<n;j++)if(g[j]&&g[j]!==w[j]){ok=false;break;}
      if(!ok)continue;
      for(let j=k+1;j<n;j++){const v=ch[cp[j]][w.charCodeAt(j)-97];if(v<0){ok=false;break;}cp[j]=v;}
      if(ok){rows[k]=w;if(rec(k+1))return true;}
      for(let j=k+1;j<n;j++)cp[j]=saved[j];
    }
    return false;
  }
  rec(s);
  return best?{rows:best,timedOut:false}:{rows:null,timedOut};
}
