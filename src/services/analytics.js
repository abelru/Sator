/* GoatCounter analytics: page views plus a few game events. No cookies, no personal data.
   Dashboard: https://abelrupertus.goatcounter.com. Skipped in `npm run dev` so testing doesn't count. */
const ENDPOINT='https://abelrupertus.goatcounter.com/count';
const enabled=import.meta.env.PROD;
const queue=[];

export function initAnalytics(){
  if(!enabled)return;
  const s=document.createElement('script');
  s.async=true;s.src='https://gc.zgo.at/count.js';s.dataset.goatcounter=ENDPOINT;
  s.onload=()=>{while(queue.length)send(queue.shift());};
  document.head.appendChild(s);
}
function send(e){try{window.goatcounter.count({path:e.path,title:e.title,event:true});}catch(err){}}

/** Counts a game event, e.g. track('solve-daily-5', 'Solved daily 5×5'). Shows under Events in the dashboard. */
export function track(path,title){
  if(!enabled)return;
  const e={path,title:title||path};
  if(window.goatcounter&&window.goatcounter.count)send(e);else queue.push(e);
}
