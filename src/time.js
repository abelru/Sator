const LAUNCH_UTC = Date.UTC(2026, 9, 29);

/** Daily puzzle number: 1 on launch day, counted in the player's local calendar. */
export function today(){const d=new Date();return Math.max(1,Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-LAUNCH_UTC)/864e5)+1);}
export function untilMidnight(){const d=new Date();const m=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);const ms=m-d;const h=Math.floor(ms/36e5),mi=Math.floor(ms%36e5/6e4);return `${h}h ${mi}m`;}
export function fmtTime(ms){const s=Math.round(ms/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
export function fmtPrecise(ms){const t=Math.max(0,Math.round(ms/100));const s=Math.floor(t/10);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}.${t%10}`;}
