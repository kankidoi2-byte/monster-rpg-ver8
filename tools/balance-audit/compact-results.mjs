// Keep all numeric aggregate data while giving each array row one reviewable line.
import fs from 'node:fs';
const out=new URL('../../docs/balance-audit/',import.meta.url);
for(const file of ['results.json','comparisons.json','mechanics.json','economy.json','acquisition-candidates.json']){
 const value=JSON.parse(fs.readFileSync(new URL(file,out),'utf8'));
 const text='{\n'+Object.entries(value).map(([k,v])=>'  '+JSON.stringify(k)+': '+(Array.isArray(v)?'[\n'+v.map(row=>'    '+JSON.stringify(row)).join(',\n')+'\n  ]':JSON.stringify(v))).join(',\n')+'\n}\n';
 fs.writeFileSync(new URL(file,out),text);
}
