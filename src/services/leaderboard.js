/* Daily leaderboard backed by Firestore. Layout: boards/d{day}-{size}/times/{uid} = { name, ms, at } */
import { firebaseConfig } from './firebase-config.js';

// `npm run dev:emu` sets this so the game talks to local emulators instead of the real project.
const useEmulators=import.meta.env.VITE_USE_EMULATORS==='true';
const config=useEmulators?{apiKey:'demo-key',projectId:'demo-sator',authDomain:'localhost'}:firebaseConfig;

export const leaderboardEnabled=Boolean(config.apiKey&&config.projectId);

let client=null;
function connect(){
  client=client||import('./firebase.js').then(m=>m.connect(config,useEmulators)).catch(e=>{client=null;throw e;});
  return client;
}
const boardId=(n,day)=>`d${day}-${n}`;

/** This browser's player id, or null if the leaderboard is off or sign-in failed. */
export async function myId(){
  if(!leaderboardEnabled)return null;
  try{return await (await connect()).uid();}catch(e){return null;}
}
/** Top ten clean times for one daily board, fastest first. null means it couldn't be loaded. */
export async function fetchTop(n,day){
  if(!leaderboardEnabled)return null;
  try{
    const rows=await (await connect()).top(boardId(n,day),10);
    return rows.map(v=>({id:v.id,name:typeof v.name==='string'?v.name.slice(0,16):'',ms:v.ms}))
      .filter(e=>e.name&&typeof e.ms==='number'&&isFinite(e.ms)&&e.ms>0);
  }catch(e){return null;}
}
export async function submitTime(n,day,name,ms){
  await (await connect()).submit(boardId(n,day),{name,ms:Math.round(ms)});
}
