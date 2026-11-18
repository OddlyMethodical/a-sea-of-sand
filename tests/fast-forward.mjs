import assert from 'node:assert/strict';
import {FIELD_SIZE,SandField,REPOSE,transportForcing} from '../app/sediment.ts';
const referenceVolume=new SandField().volume();
for(const [strength,maxStep,variable,size=256,sandPercent=100] of [
 [1,50,false],[2,50/transportForcing(2),false],[1,10,true],
 [1,125,false,128,50],[1,125,false],[2,125/transportForcing(2),true,128,150],
 [1,62.5,false,512,150],[1,16,true,256,50]
]){
 const f=new SandField(size,FIELD_SIZE/size,true,sandPercent);
 assert.equal(f.size*f.cell,FIELD_SIZE);
 assert.ok(Math.abs(f.initialVolume/referenceVolume-sandPercent/100)<.002,'grid spacing preserves physical volume and starting sand scales it');let time=0;
 while(time<600){const dt=Math.min(maxStep,600-time);f.step(strength,variable?60+55*Math.sin((time+dt/2)*2*Math.PI/240):60,dt);time+=dt;}
 let excess=0;for(let z=0;z<f.size;z++)for(let x=0;x<f.size;x++){
  const h=f.height[z*f.size+x];assert.ok(Number.isFinite(h)&&h>=-1e-10);
  for(const [dx,dz] of [[1,0],[0,1],[1,1],[-1,1]])excess=Math.max(excess,Math.abs(h-f.height[((z+dz)%f.size)*f.size+(x+dx+f.size)%f.size])-f.cell*Math.hypot(dx,dz)*REPOSE);
 }
 assert.ok(excess<.02,`repose residual ${excess}`);assert.ok(Math.abs(f.stats().balanceError)<f.initialVolume*1e-10);assert.ok(Math.abs(f.cycles-600)<1e-8);
 console.log({strength,maxStep,variable,size,sandPercent,reposeResidualM:excess,relativeMassError:f.stats().balanceError/f.initialVolume});
}
const slow=new SandField(),fast=new SandField();slow.step(1,60);fast.step(1,60,50);
function change(f){let square=0;for(let i=0;i<f.height.length;i++)square+=(f.height[i]-f.initialHeight[i])**2;return Math.sqrt(square/f.height.length);}
assert.ok(change(fast)>change(slow)*5,'fast forward must actually change the sand, not just the clock');
console.log('PASS: faster sand evolution, mass conservation, nonnegative sand and repose under steady, strong and changing winds.');
