// Curated CC0 Kenney geometry, baked offline. Shared meshes avoid per-instance downloads.
const B=globalThis.BABYLON;
export class WorldModels{
  constructor(host){this.host=host;this.templates=new Map();}
  async load(){
    const response=await fetch(new URL('../../../assets/trainer/kenney/models.json',import.meta.url).href+new URL(import.meta.url).search,{signal:AbortSignal.timeout(120000)});
    if(!response.ok)throw Error('Kenney model library unavailable');
    const data=await response.json();if(data.format!==1)throw Error('Unsupported model library');
    const material=new B.StandardMaterial('kenney-palette',this.host.scene);material.diffuseColor=B.Color3.White();material.specularColor=new B.Color3(.12,.12,.12);material.backFaceCulling=false;
    for(const [name,model]of Object.entries(data.models)){
      const mesh=new B.Mesh(name,this.host.scene),vertices=new B.VertexData();
      for(const key of ['positions','normals','colors','indices'])vertices[key]=model[key];vertices.applyToMesh(mesh);mesh.material=material;mesh.setEnabled(false);mesh.isPickable=false;
      this.templates.set(name,{mesh,min:model.min,max:model.max});
    }
  }
  place(key,{e,n,w,d,h,angle=0,parent=null,position=null,collision=false,tint=null}={}){
    const model=this.templates.get(key);if(!model)throw Error('Missing Kenney model: '+key);
    const {mesh,min,max}=model,g=new B.TransformNode('asset:'+key,this.host.scene);g.parent=parent||this.host.land;g.position.copyFrom(position||this.host.local(e,n));g.rotation.y=angle*Math.PI/180;
    const sx=w/(max[0]-min[0]),sy=h/(max[1]-min[1]),sz=d/(max[2]-min[2]);
    const instance=tint?mesh.clone(key+'-paint',g):mesh.createInstance(key+'-instance');instance.parent=g;instance.setEnabled(true);instance.scaling.set(sx,sy,sz);instance.position.set(-(min[0]+max[0])/2*sx,-min[1]*sy,-(min[2]+max[2])/2*sz);instance.isPickable=false;instance.receiveShadows=true;
    if(tint){instance.material=mesh.material.clone(key+'-tint');instance.material.diffuseColor=B.Color3.FromHexString(tint);}
    instance.metadata={kenney:key};g.metadata={kenney:key};this.host.shadowMeshes.push(instance);
    if(collision){const box=this.host.box('footprint:'+key,[w,h,d],[0,h/2,0],this.host.materials.wall,g,{collision:true,shadow:false});box.isVisible=false;}
    return g;
  }
}
