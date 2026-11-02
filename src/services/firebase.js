/* The only file that talks to the Firebase SDK. It is loaded lazily (see leaderboard.js),
   so players who never open the leaderboard never download Firebase. */
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, doc, setDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

export function connect(config,useEmulators){
  const app=initializeApp(config);
  const auth=getAuth(app),db=getFirestore(app);
  if(useEmulators){
    // Ports match the "emulators" block in firebase.json.
    connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
    connectFirestoreEmulator(db,'127.0.0.1',8080);
  }
  let signingIn=null;

  // Anonymous auth gives each browser a stable id without a login screen.
  // Firestore rules use it so a player can only write their own leaderboard entry.
  async function uid(){
    await auth.authStateReady();
    if(auth.currentUser)return auth.currentUser.uid;
    signingIn=signingIn||signInAnonymously(auth).finally(()=>{signingIn=null;});
    return (await signingIn).user.uid;
  }
  async function top(board,count){
    const snap=await getDocs(query(collection(db,'boards',board,'times'),orderBy('ms','asc'),limit(count)));
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  }
  async function submit(board,entry){
    const id=await uid();
    await setDoc(doc(db,'boards',board,'times',id),{...entry,at:serverTimestamp()});
  }
  return {uid,top,submit};
}
