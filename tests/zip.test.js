import test from 'node:test';
import assert from 'node:assert/strict';
import {createPDFArchive} from '../src/zip.js';
import {execFileSync} from 'node:child_process';
test('Exercise ZIP contains both PDFs with UTF-8 names and correct CRC, verified by Python zipfile',async()=>{
 const files=[{name:'Übung.pdf',data:new TextEncoder().encode('%PDF-1.7\nTeilnehmer')},{name:'Lösungen.pdf',data:new TextEncoder().encode('%PDF-1.7\nAntworten')}];
 const archive=createPDFArchive(files);assert.equal(archive.type,'application/zip');const input=Buffer.from(await archive.arrayBuffer());
 const result=execFileSync('python3',['-c',`import io,sys,zipfile,json
z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
assert z.testzip() is None
print(json.dumps({n:z.read(n).decode() for n in z.namelist()}))`],{input,encoding:'utf8'});
 assert.deepEqual(JSON.parse(result),{'Übung.pdf':'%PDF-1.7\nTeilnehmer','Lösungen.pdf':'%PDF-1.7\nAntworten'});
});
