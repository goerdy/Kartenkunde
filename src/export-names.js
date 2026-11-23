export function exportFileNames(plan,date=new Date()){
 const name=(plan.title||'KARTENKUNDE.app').replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,70)||'KARTENKUNDE.app';
 const day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-'),exercise=`Übung-${name}-${day}`;
 return {link:`${exercise}-Link.pdf`,atlas:`Atlas-${name}-1:${Number(plan.scale)/1000}k.pdf`,exercise:`${exercise}.pdf`,solution:`${exercise}-Lösungen.pdf`,zip:`${exercise}.zip`};
}
