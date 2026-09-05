const KEY='supersus.office.session.v1';
export function readOfficeSession(storage){
  try{const value=JSON.parse(storage.getItem(KEY));return value&&typeof value.token==='string'&&/^[a-f0-9]{48}$/.test(value.token)&&typeof value.memberId==='string'?value:null;}catch{return null;}
}
export function saveOfficeSession(storage,value){try{if(value)storage.setItem(KEY,JSON.stringify({token:value.token,memberId:value.memberId}));else storage.removeItem(KEY);}catch{/* Private storage unavailable: presence still works until refresh. */}}
