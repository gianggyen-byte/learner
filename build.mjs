import {existsSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
if(!existsSync('public/index.html'))throw Error('Thiếu public/index.html');
for(const name of readdirSync('public'))if(statSync(join('public',name)).size>25*1024*1024)throw Error('Tệp vượt giới hạn 25 MiB của Pages: '+name);
console.log('Ready: static website + Pages Functions + D1, no Gemini key in build configuration.');
