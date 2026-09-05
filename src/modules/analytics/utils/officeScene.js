import * as THREE from 'three';

export const deskPosition = (index) => ({ x: -8.5 + (index % 4) * 4.1, z: -6.8 + Math.floor(index / 4) * 3.55 });
const palette = ['#ec905d', '#679caf', '#b191cc', '#7da88f', '#dfb45f', '#cc8193'];

export function createOfficeScene(host, members, onSelect, onMove, onLabels) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dce4df');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor('#dce4df');
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 150);
  let angle = Math.PI / 4, distance = 38;
  const target = new THREE.Vector3(0, 0, 0);
  const cameraUpdate = () => { const d=distance*Math.max(1,1.25/camera.aspect); camera.position.set(Math.sin(angle) * d, d * .83, Math.cos(angle) * d); camera.lookAt(target); };
  cameraUpdate();
  scene.add(new THREE.HemisphereLight('#fff7df', '#80958b', 2.4));
  const sun = new THREE.DirectionalLight('#ffefce', 3.3);
  sun.position.set(-12, 24, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24 });
  sun.shadow.bias = -.001; scene.add(sun);
  const materials = new Map();
  const mat = (color) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .78 }));
    return materials.get(color);
  };
  function box(w, h, d, x, y, z, color, parent = scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function ball(r, x, y, z, color, parent = scene) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(color));
    mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  function plant(x, z, scale = 1) {
    box(.52, .65, .52, x, .34, z, '#d6b08b');
    box(.09, .85 * scale, .09, x, 1, z, '#776e48');
    ball(.65 * scale, x, 1.65 * scale, z, '#64836a');
    ball(.45 * scale, x + .25, 2.05 * scale, z, '#829b68');
  }
  // A cutaway office; lowered front walls keep every workstation visible.
  box(30, .5, 24, 1, -.3, 0, '#89998f');
  const floor = box(29.8, .12, 23.8, 1, 0, 0, '#f0eade');
  for (let z = -11; z < 12; z += 1) box(29.5, .012, .022, 1, .068, z, '#ded6c7');
  box(30, 3.2, .24, 1, 1.6, -12, '#f4f1e7');
  box(.24, 3.2, 24, -14, 1.6, 0, '#e7e6dd');
  for (let z = -8; z <= 7; z += 5) {
    box(.08, 1.9, 3.7, -13.85, 1.9, z, '#a4c7c7');
    box(.15, .08, 3.85, -13.78, 1, z, '#f8f5eb');
    box(.16, 2, .08, -13.75, 1.9, z, '#fbf8ee');
  }
  // Back wall shelving and accent artwork.
  box(5, 2.3, .22, -5, 1.8, -11.8, '#2f4e45');
  box(.2, 1.2, .09, -6.3, 1.8, -11.62, '#dfab68');
  box(1.7, .18, .09, -4.6, 1.8, -11.62, '#f3debb');
  box(1, .18, .09, -4.95, 1.38, -11.62, '#bdc9b1');
  for (let x = 4; x <= 9; x += 1) {
    box(.58, .8 + (x % 3) * .12, .4, x, 1.55, -11.5, palette[x % palette.length]);
  }
  box(6, .15, .75, 6.5, 1.02, -11.5, '#bb976e');
  const desks = [], colliders = [];
  const deskCount = Math.min(members.length, 16);
  for (let i = 0; i < deskCount; i++) {
    const p = deskPosition(i);
    box(3.05, .07, 2.7, p.x, .1, p.z + .1, i < 8 ? '#d2ddcf' : '#d9d8cd');
    const top = box(2.7, .17, 1.24, p.x, 1.23, p.z, '#cfaa7e');
    top.userData.memberId = members[i].id; desks.push(top);
    colliders.push({ x: p.x, z: p.z, w: 3.15, d: 1.7 });
    for (const dx of [-1.05, 1.05]) for (const dz of [-.4, .4]) box(.1, 1.12, .1, p.x + dx, .65, p.z + dz, '#4d6159');
    box(.09, .45, .09, p.x, 1.5, p.z - .2, '#52605c');
    box(.7, .07, .33, p.x, 1.37, p.z -.2, '#52605c');
    box(1.06, .74, .12, p.x, 1.91, p.z - .23, '#344d47');
    const screen = box(.94, .61, .02, p.x, 1.93, p.z - .155, '#779b94');
    screen.userData.owner = members[i].id;
    box(.63, .045, .21, p.x, 1.34, p.z + .29, '#edf0e7');
    box(.13, .04, .18, p.x + .58, 1.34, p.z + .29, '#47584f');
    box(.2, .22, .2, p.x + 1, 1.43, p.z + .06, palette[i % 6]);
    box(.65, .15, .65, p.x, .63, p.z + 1, '#567168');
    box(.7, .65, .14, p.x, 1, p.z + 1.3, '#567168');
    box(.12, .52, .12, p.x, .3, p.z + 1, '#52605c');
    box(.75, .08, .15, p.x, .12, p.z + 1, '#52605c');
  }
  // Glass meeting area on the right and a lounge near the entrance.
  box(5.3, .05, 7.6, 12, .13, -6.5, '#bccac3');
  box(.09, 2.6, 7, 9.35, 1.35, -6.7, '#a9bfb2');
  box(2.05, .2, 3.7, 12, 1.12, -6.5, '#d9bb91');
  colliders.push({ x: 12, z: -6.5, w: 2.5, d: 4 });
  for (const z of [-7.7, -6.4, -5.1]) for (const x of [10.5, 13.5]) {
    box(.65, .16, .7, x, .58, z, '#576f69');
    box(.12, .66, .7, x + (x < 12 ? -.28 : .28), .92, z, '#576f69');
  }
  box(4.2, .06, 4.6, 11.8, .15, 5, '#dfbe9b');
  box(1, .56, 3.7, 13.25, .48, 5, '#b67754');
  box(.22, 1, 3.7, 13.8, .7, 5, '#ad6e4c');
  box(2.1, .15, 1.25, 11.15, .65, 5, '#f0dfc5');
  colliders.push({x: 12, z: 5, w: 4.5, d: 4.4});
  box(2.4, 1.25, .7, 11.4, .7, -.2, '#c4a481');
  box(.65, .65, .48, 11.9, 1.62, -.2, '#374e47');
  for (const p of [[-12,-10],[-12,10],[7,-10],[8,9],[14,10],[14,-10]]) plant(...p);

  const avatars = new Map();
  let people = [], myId = '', selectedId = '', route = [], lastTime = performance.now(), lastPublish = 0, raf;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function avatar(memberId) {
    const index = Math.max(0, members.findIndex(m => m.id === memberId));
    const group = new THREE.Group();
    const body = box(.5, .62, .32, 0, 1.05, 0, palette[index % 6], group);
    const head=box(.37, .39, .35, 0, 1.57, 0, '#dfb18b', group);
    const hair=box(.4, .13, .38, 0, 1.81, -.015, '#4c4238', group);
    const legs = [-.16,.16].map(x => box(.18, .52, .21, x, .47, 0, '#384d4c', group));
    const arms = [-.35,.35].map(x => box(.15, .53, .19, x, 1.03, 0, palette[index % 6], group));
    const ring = new THREE.Mesh(new THREE.RingGeometry(.5,.6,32), new THREE.MeshBasicMaterial({color:'#f09b54',side:THREE.DoubleSide}));
    ring.rotation.x = -Math.PI/2; ring.position.y=.16; group.add(ring);
    group.userData.memberId=memberId;
    group.traverse(m => { m.userData.memberId=memberId; });
    scene.add(group); return {group, body, head, hair, legs, arms, ring, dest:new THREE.Vector3(), status:'available'};
  }
  const blocked = (x,z) => x < -12.5 || x > 14.5 || z < -10.5 || z > 10.5 || colliders.some(c=>Math.abs(x-c.x)<c.w/2 && Math.abs(z-c.z)<c.d/2);
  function pathTo(start, end) {
    const step = .5;
    const key=(x,z)=>`${x},${z}`;
    const sx=Math.round(start.x/step), sz=Math.round(start.z/step), ex=Math.round(end.x/step), ez=Math.round(end.z/step);
    if(blocked(ex*step,ez*step)) return [];
    const queue=[[sx,sz]], previous=new Map([[key(sx,sz),null]]);
    for(let i=0;i<queue.length && i<5000;i++) {
      const [x,z]=queue[i];
      if(x===ex && z===ez) {
        const result=[]; let at=key(x,z);
        while(previous.get(at)) { const [px,pz]=at.split(',').map(Number); result.unshift(new THREE.Vector3(px*step,0,pz*step)); at=previous.get(at); }
        return result;
      }
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=x+dx,nz=z+dz,k=key(nx,nz);
        if(!previous.has(k)&&!blocked(nx*step,nz*step)){previous.set(k,key(x,z));queue.push([nx,nz]);}
      }
    }
    return [];
  }
  function walk(x,z) { const me=avatars.get(myId); if(me) route=pathTo(me.group.position,{x,z}); }
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function click(event) {
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    ray.setFromCamera(pointer,camera);
    const hits=ray.intersectObjects([...desks,...[...avatars.values()].map(a=>a.group)],true);
    if(hits.length) { onSelect(hits[0].object.userData.memberId); return; }
    const hit=ray.intersectObject(floor)[0]; if(hit) walk(hit.point.x,hit.point.z);
  }
  renderer.domElement.addEventListener('click',click);
  const resize=new ResizeObserver(()=> {const {width,height}=host.getBoundingClientRect(); if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();cameraUpdate();}); resize.observe(host);
  const labelAt=(id,x,y,z,online)=>{const p=new THREE.Vector3(x,y,z).project(camera);return {id,x:(p.x+1)*host.clientWidth/2,y:(1-p.y)*host.clientHeight/2,online,visible:p.z<1};};
  function frame(now) {
    const dt=Math.min((now-lastTime)/1000,.05); lastTime=now;
    const labels=[];
    for(const [id,a] of avatars) {
      const isMe=id===myId;
      if(isMe && route.length) {
        const next=route[0], delta=next.clone().sub(a.group.position), distance=delta.length();
        if(distance<.08)route.shift();else {a.group.position.add(delta.normalize().multiplyScalar(Math.min(dt*3.6,distance)));a.group.rotation.y=Math.atan2(delta.x,delta.z);}
      } else if(!isMe) a.group.position.lerp(a.dest,Math.min(1,dt*8));
      const moving=isMe?route.length>0:a.group.position.distanceTo(a.dest)>.08;
      const desk=deskPosition(members.findIndex(m=>m.id===id));
      const seated=!moving&&a.status==='focus'&&Math.hypot(a.group.position.x-desk.x,a.group.position.z-desk.z-1.1)<.65;
      a.body.position.y=seated?.78:1.05;a.head.position.y=seated?1.3:1.57;a.hair.position.y=seated?1.54:1.81;
      if(seated)a.group.rotation.y=Math.PI;
      a.legs.forEach((leg,i)=>leg.rotation.x=seated?-1.25:moving&&!reduced?Math.sin(now*.013+i*Math.PI)*.5:0);
      a.arms.forEach((arm,i)=>{arm.position.y=seated?.82:1.03;arm.rotation.x=seated?-.8:moving&&!reduced?Math.sin(now*.013+i*Math.PI)*-.4:0;});
      a.ring.visible=id===selectedId||isMe;
      if(isMe && now-lastPublish>300) {onMove({x:a.group.position.x,z:a.group.position.z});lastPublish=now;}
      labels.push(labelAt(id,a.group.position.x,2.25,a.group.position.z,true));
    }
    for(let i=0;i<deskCount;i++) if(!avatars.has(members[i].id)) {const p=deskPosition(i);labels.push(labelAt(members[i].id,p.x,2.2,p.z,false));}
    onLabels(labels);renderer.render(scene,camera);raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  return {
    update(nextPeople, nextMyId, nextSelectedId) {
      people=nextPeople;myId=nextMyId;selectedId=nextSelectedId;
      const ids=new Set(people.map(p=>p.memberId));
      for(const [id,a] of avatars)if(!ids.has(id)){scene.remove(a.group);a.group.traverse(m=>m.geometry?.dispose());avatars.delete(id);}
      for(const p of people) {
        if(!avatars.has(p.memberId)){const a=avatar(p.memberId);a.group.position.set(p.x,0,p.z);avatars.set(p.memberId,a);}
        avatars.get(p.memberId).dest.set(p.x,0,p.z);
        avatars.get(p.memberId).status=p.status;
      }
    },
    walk,
    rotate(delta){angle+=delta;cameraUpdate();},
    zoom(delta){distance=Math.max(25,Math.min(56,distance+delta));cameraUpdate();},
    dispose(){cancelAnimationFrame(raf);resize.disconnect();renderer.domElement.removeEventListener('click',click);scene.traverse(m=>m.geometry?.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();},
  };
}
