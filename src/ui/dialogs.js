import { S, saveState } from '../state.js';
import { $ } from '../dom.js';

export function openDlg(id){const d=$(id);if(!d.open)d.showModal();}
export function closeDlg(id){const d=$(id);if(d.open)d.close();}
export function anyOpen(){return [...document.querySelectorAll('dialog')].some(d=>d.open);}

let cfAction=null;
/** Yes/no prompt. `fn` runs only if the player picks the `yes` button. */
export function confirmBox(title,text,yes,fn,no){$('cfTitle').textContent=title;$('cfText').textContent=text;$('cfYes').textContent=yes;$('dlgConfirm').querySelector('[data-close]').textContent=no||'Cancel';cfAction=fn;openDlg('dlgConfirm');}

export function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>el.classList.remove('show'),1600);}

export function initDialogs(){
  document.querySelectorAll('dialog').forEach(d=>{
    d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-close]'))d.close();});
    d.addEventListener('close',()=>{if(d.id==='dlgHelp'){S.seenHelp=true;saveState();}});
  });
  $('cfYes').onclick=()=>{const f=cfAction;cfAction=null;closeDlg('dlgConfirm');if(f)f();};
}
