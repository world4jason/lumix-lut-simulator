import sharp from 'sharp';
import fs from 'node:fs/promises';
const catalog=JSON.parse(await fs.readFile('src/data/catalog.json'));
const samples=JSON.parse(await fs.readFile('src/data/samples.json')).samples;
const codes=['lut_0197','lut_0096',...['VLOG','LMONOD','CNED2','VIVD'].map(style=>catalog.luts.find(l=>l.photoStyle===style).code)];
const qualities=[100,98,96,94,92,90];
const totals=Object.fromEntries(qualities.map(q=>[q,0]));let originalBytes=0;const records=[];
for(const s of samples)for(const code of codes){
 const name=`${s.id}/${code}.webp`;const src=await fs.readFile(`public/sample/${name}`);originalBytes+=src.length;
 const row={name,originalBytes:src.length,qualities:{}};
 for(const quality of qualities){const out=await sharp(src).webp({quality,effort:6,smartSubsample:true}).toBuffer();totals[quality]+=out.length;row.qualities[quality]=out.length;
 if(['vlog-portrait','scooter','harbour','reference'].includes(s.id)&&code===codes[0]){await fs.writeFile(`.compression-cache/${s.id}-q${quality}.webp`,out);await fs.writeFile(`.compression-cache/${s.id}-original.webp`,src);}
 }
 records.push(row);
}
const report={codes,count:records.length,originalBytes,totals,ratios:Object.fromEntries(qualities.map(q=>[q,totals[q]/originalBytes])),records};
await fs.writeFile('docs/compression-trial.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,records:undefined},null,2));
