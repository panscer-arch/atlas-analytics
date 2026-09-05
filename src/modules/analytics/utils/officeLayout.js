export const deskPosition=index=>({x:-8.5+(index%4)*4.1,z:-6.8+Math.floor(index/4)*3.55});
export function actionTarget(activity,index){
  if(activity==='meeting')return {x:index%2?13.5:10.5,z:-7.7+(index%3)*1.3};
  if(activity==='rest')return {x:index%2?12:9,z:9.8};
  const desk=deskPosition(index);return {x:desk.x,z:Number((desk.z+1.1).toFixed(2))};
}
export function poseAt(activity,position,index){
  const target=actionTarget(activity,index);
  return Math.hypot(position.x-target.x,position.z-target.z)<.65?activity:'idle';
}
export const isOfficeBlocked=(x,z,colliders)=>!Number.isFinite(x)||!Number.isFinite(z)||x< -12.5||x>14.5||z< -10.5||z>10.5||colliders.some(c=>Math.abs(x-c.x)<c.w/2&&Math.abs(z-c.z)<c.d/2);
export function findOfficePath(start,end,colliders){
  const step=.5,key=(x,z)=>`${x},${z}`;
  const sx=Math.round(start.x/step),sz=Math.round(start.z/step),ex=Math.round(end.x/step),ez=Math.round(end.z/step);
  if(isOfficeBlocked(ex*step,ez*step,colliders))return [];
  const queue=[[sx,sz]],previous=new Map([[key(sx,sz),null]]);
  for(let i=0;i<queue.length&&i<5000;i++){
    const [x,z]=queue[i];
    if(x===ex&&z===ez){const result=[];let at=key(x,z);while(previous.get(at)){const [px,pz]=at.split(',').map(Number);result.unshift({x:px*step,z:pz*step});at=previous.get(at);}return result;}
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!previous.has(k)&&!isOfficeBlocked(nx*step,nz*step,colliders)){previous.set(k,key(x,z));queue.push([nx,nz]);}}
  }
  return [];
}
