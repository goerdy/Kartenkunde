export function interiorMaterials(view,prefix){
 const dash=view.mat(prefix+'-soft-dashboard','#171d24',{roughness:.94}),trim=view.mat(prefix+'-satin-trim','#53616a',{metallic:.55,roughness:.42}),seat=view.mat(prefix+'-woven-seats','#28323b',{roughness:1});
 dash.albedoTexture=view.procedural(prefix+'-dashboard-grain','#20272d',(c,random)=>{for(let i=0;i<12000;i++){c.fillStyle=random()>.5?'#293037':'#151c23';c.fillRect(random()*512,random()*512,1,1);}});
 seat.albedoTexture=view.procedural(prefix+'-seat-weave','#28323b',c=>{c.strokeStyle='#35424c';c.lineWidth=1;for(let i=0;i<512;i+=6){c.beginPath();c.moveTo(i,0);c.lineTo(i,512);c.stroke();c.beginPath();c.moveTo(0,i);c.lineTo(512,i);c.stroke();}});
 dash.albedoColor.set(1,1,1);seat.albedoColor.set(1,1,1);
 return {dash,trim,seat,rubber:view.mat(prefix+'-rubber','#11161a',{roughness:1}),light:view.mat(prefix+'-stitching','#84949a',{roughness:.8})};
}
export function cockpitPanel(view,name,size,position,material,parent,corner=.035){
 const B=globalThis.BABYLON,[w,h,d]=size,r=Math.min(corner,w/4,h/4);
 const outline=[[-w/2+r,-h/2],[w/2-r,-h/2],[w/2,-h/2+r],[w/2,h/2-r],[w/2-r,h/2],[-w/2+r,h/2],[-w/2,h/2-r],[-w/2,-h/2+r]],positions=[],indices=[],uvs=[];
 for(const z of [-d/2,d/2])for(const [x,y]of outline){positions.push(x,y,z);uvs.push(x/w+.5,y/h+.5);}
 for(let i=1;i<7;i++)indices.push(0,i+1,i,8,8+i,8+i+1);
 for(let i=0;i<8;i++){const j=(i+1)%8;indices.push(i,j,j+8,i,j+8,i+8);}
 const mesh=new B.Mesh(name,view.scene),data=new B.VertexData();data.positions=positions;data.indices=indices;data.uvs=uvs;data.normals=[];B.VertexData.ComputeNormals(positions,indices,data.normals);data.applyToMesh(mesh);mesh.convertToFlatShadedMesh();mesh.position.set(...position);mesh.parent=parent;mesh.material=material;mesh.receiveShadows=true;return mesh;
}
export function cockpitVent(view,parent,x,y,z,width,material){
 cockpitPanel(view,'recessed-air-vent',[width,.065,.018],[x,y,z],view.materials.dark,parent,.012);
 for(let i=0;i<4;i++)view.box('air-vent-louvre',[width-.018,.005,.007],[x,y-.023+i*.015,z-.012],material,parent,{shadow:false});
}
export function cockpitKnob(view,parent,x,y,z,radius,material){
 const knob=view.cylinder('knurled-control-knob',radius*2,radius*2,.022,[x,y,z],material,parent,20);knob.rotation.x=Math.PI/2;
 view.box('knob-index',[.003,radius*.65,.003],[x,y+radius*.48,z-.013],view.materials.roadPaint,parent,{shadow:false});return knob;
}
