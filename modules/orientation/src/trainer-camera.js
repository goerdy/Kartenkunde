const RAD=Math.PI/180;
// Compose a head turn in its body's frame, rather than adding global Euler angles.
// Refresh camera-up every frame so a banked vehicle cannot leave a tilted horizon on foot.
export function orientFirstPerson(camera,yaw,pitch,bodyMatrix=null){
 const B=globalThis.BABYLON,head=B.Quaternion.RotationYawPitchRoll(yaw*RAD,pitch*RAD,0);
 camera.updateUpVectorFromRotation=true;
 camera.rotationQuaternion??=new B.Quaternion();
 if(bodyMatrix){const body=B.Quaternion.FromRotationMatrix(bodyMatrix.getRotationMatrix());body.multiplyToRef(head,camera.rotationQuaternion);}
 else{camera.rotationQuaternion.copyFrom(head);camera.upVector.set(0,1,0);}
}
