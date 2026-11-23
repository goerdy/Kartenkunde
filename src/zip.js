// ZIP STORE: PDFs are already compressed. UTF-8 names, CRC-32, no server needed.
const zipCRCTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function createPDFArchive(files,date=new Date()){
 const parts=[],directory=[];let offset=0;
 const stamp=((date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1)),day=(((Math.max(1980,date.getFullYear())-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate());
 for(const file of files){const name=new TextEncoder().encode(file.name),data=new Uint8Array(file.data);if(name.length>65535||offset+data.length>0xffffffff)throw Error('ZIP size limit exceeded');let crc=0xffffffff;for(const byte of data)crc=zipCRCTable[(crc^byte)&255]^(crc>>>8);crc=(crc^0xffffffff)>>>0;
 const header=new Uint8Array(30+name.length),v=new DataView(header.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(10,stamp,true);v.setUint16(12,day,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);header.set(name,30);parts.push(header,data);
 const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(12,stamp,true);c.setUint16(14,day,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);directory.push(central);offset+=header.length+data.length;
 }
 const length=directory.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,length,true);e.setUint32(16,offset,true);
 return new Blob([...parts,...directory,end],{type:'application/zip'});
}
