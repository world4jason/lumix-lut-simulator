import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const inputRoot=process.argv[2];if(!inputRoot)throw Error('Pass read-only source public/sample directory');
const destination=path.resolve('public/sample');if(path.resolve(inputRoot)===destination)throw Error('Source must be original images, not destination');
const catalog=JSON.parse(await fs.readFile('src/data/catalog.json'));const samples=JSON.parse(await fs.readFile('src/data/samples.json')).samples;
const files=samples.flatMap(s=>catalog.luts.map(l=>`${s.id}/${l.code}.webp`));
const records=[];let index=0;const quality=100;const sha=b=>createHash('sha256').update(b).digest('hex');
async function worker(){while(index<files.length){const name=files[index++];const source=await fs.readFile(path.join(inputRoot,name));const original=await sharp(source).metadata();const output=await sharp(source).webp({quality,effort:6,smartSubsample:true}).toBuffer();const use=output.length<source.length?output:source;const metadata=await sharp(use).metadata();if(metadata.width!==original.width||metadata.height!==original.height)throw Error(`Dimensions changed ${name}`);const dest=path.join(destination,name);await fs.writeFile(dest+'.tmp',use);await fs.rename(dest+'.tmp',dest);records.push({name,width:original.width,height:original.height,originalBytes:source.length,bytes:use.length,reencoded:use!==source,sourceSha256:sha(source),sha256:sha(use)});if(records.length%500===0)console.log(`${records.length}/${files.length}`);}}
await Promise.all(Array.from({length:4},()=>worker()));
records.sort((a,b)=>a.name.localeCompare(b.name));const report={quality,effort:6,smartSubsample:true,rule:'Keep original when re-encoding would be larger',count:records.length,originalBytes:records.reduce((s,r)=>s+r.originalBytes,0),bytes:records.reduce((s,r)=>s+r.bytes,0),reencoded:records.filter(r=>r.reencoded).length,records};
await fs.writeFile('docs/preview-compression.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,records:undefined}));
