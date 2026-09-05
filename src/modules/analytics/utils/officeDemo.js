export function avatarTraits(label='') {
  const name=label.toLowerCase().trim();
  return {beard:/^(vasya|вася)$/.test(name), bald:/^(gem|гем|гема)$/.test(name), glasses:/^(gem|гем|гема)$/.test(name), hookah:name==='иванов', asian:name==='китаец'};
}
export const activityNames={work:'Работает',eat:'Обедает',sleep:'Спит',rest:'Отдыхает',meeting:'В переговорке',walk:'Гуляет',hookah:'Отдыхает у кальяна'};
// Pure, local-only animation data. Never submitted to the presence API.
export function demoPeople(members,seconds) {
  return members.slice(0,16).map((m,i)=>{
    const traits=avatarTraits(m.data.label);
    let activity=['work','eat','sleep','rest','meeting','walk','work','meeting'][i%8];
    if(Math.floor(seconds/45)%2 && ['work','eat'].includes(activity))activity=activity==='work'?'eat':'work';
    if(traits.hookah)activity='hookah';
    let x=-8.5+(i%4)*4.1,z=-6.8+Math.floor(i/4)*3.55+1.1,y=0, facing=Math.PI;
    if(activity==='meeting'){x=i%2?13.5:10.5;z=-7.7+Math.floor(i/8)*1.3;facing=x>12?-Math.PI/2:Math.PI/2;}
    if(activity==='sleep'||activity==='rest'){x=13.2;z=3.7+(i%8===3?2.4:0);y=.65;facing=Math.PI/2; if(i>=8){x=i%8===3?12:9;z=8.7;}}
    if(activity==='hookah'){x=10;z=3.4;facing=.6;}
    if(activity==='walk'){
      const t=(seconds*.7+i*2)%20;
      x=7.3+(i>=8?1:0);z=t<10?-9+t:11-t;facing=t<10?0:Math.PI;
    }
    return {memberId:m.id,demo:true,activity,x,z,y,facing,status:activity==='work'?'focus':activity==='meeting'?'meeting':'break',task:activityNames[activity]};
  });
}
