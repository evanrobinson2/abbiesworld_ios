import {mkdirSync,copyFileSync,cpSync} from 'node:fs';
mkdirSync('public/data',{recursive:true});
for(const path of ['index.html','api-docs.html','research-100.html','style.css','app.js','openapi.json','data/catalog.json','data/dictionary.json','data/abandonia-priority-100.json','data/abandonia-archive-index.json'])copyFileSync(path,'public/'+path);
for(const path of ['ask.html','steam.html','game.html','data/presentation-styles.json','data/repo-knowledge.json'])copyFileSync(path,'public/'+path);
for(const path of ['game-anatomy.html','anatomy.css','anatomy.js','data/game-anatomy.json','data/design-lessons.json'])copyFileSync(path,'public/'+path);
cpSync('data/anatomy','public/data/anatomy',{recursive:true});
