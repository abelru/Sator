/* Puzzle and word-list data, loaded one grid size at a time.
   Each src/data/<n>.json holds { d: daily puzzles, u: unlimited puzzles, w: every valid n-letter word },
   with puzzles and words packed end to end as one long string. */
const loaders = import.meta.glob('./data/*.json', { import: 'default' });
const DATA = {};

export async function ensureSize(n){
  if(!DATA[n])DATA[n]=await loaders[`./data/${n}.json`]();
  return DATA[n];
}
export function sizeData(n){return DATA[n];}

function pool(n,mode){return DATA[n][mode==='daily'?'d':'u'];}
export function count(n,mode){return pool(n,mode).length/(n*n);}
export function puzzle(n,mode,idx){const s=pool(n,mode),L=n*n,f=s.substr(idx*L,L),r=[];for(let i=0;i<n;i++)r.push(f.substr(i*n,n));return r;}

const known={};
/** True if this square (n×n letters, row by row) is already one of our daily or unlimited puzzles. */
export function isKnownSquare(n,flat){
  if(!known[n]){const D=DATA[n],L=n*n,st=new Set();for(const p of [D.d,D.u])for(let i=0;i<p.length;i+=L)st.add(p.substr(i,L));known[n]=st;}
  return known[n].has(flat);
}

const sets={};
export function dict(n){if(!sets[n]){const s=DATA[n].w,st=new Set();for(let i=0;i<s.length;i+=n)st.add(s.substr(i,n));sets[n]=st;}return sets[n];}

const fitCache=new Map();
/** True if some word matches the pattern. pat: array of letters or '' for unknown. */
export function fits(n,pat){
  const key=n+':'+pat.map(c=>c||'.').join('');
  if(fitCache.has(key))return fitCache.get(key);
  const s=DATA[n].w,known=[];pat.forEach((c,j)=>{if(c)known.push([j,c]);});
  let ok=false;
  outer:for(let i=0;i<s.length;i+=n){for(const[j,c]of known)if(s[i+j]!==c)continue outer;ok=true;break;}
  fitCache.set(key,ok);return ok;
}
