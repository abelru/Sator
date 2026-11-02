/* Everything the player keeps between visits lives in one localStorage entry. */
export const SIZES = [3, 4, 5, 6, 7, 8, 9];
const KEY = 'sator:v1';

function loadState(){try{const s=localStorage.getItem(KEY);return s?JSON.parse(s):null;}catch(e){return null;}}
export function saveState(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

export const S = loadState() || {};
S.settings=Object.assign({assist:true,theme:'system'},S.settings||{});
S.daily=S.daily||{}; S.uni=S.uni||{}; S.legend=S.legend||null; S.stats=S.stats||{}; S.uniSolved=S.uniSolved||{};
S.mode=S.mode==='unlimited'?'unlimited':'daily';
S.size=SIZES.includes(S.size)?S.size:5;
