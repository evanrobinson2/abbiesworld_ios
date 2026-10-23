#!/usr/bin/env node
// Launch-day load test for Abbie's World (docs/launch/SURGE.md).
//
// 1. Capture: opens each page in a real browser (Playwright) and records every GET a first-time visitor makes, with
//    its size. That list is "one visit", including the game's models, textures and sounds.
// 2. Replay: many virtual visitors fetch that list at once, six requests at a time each, like a browser.
// 3. Report: speed (p50/p95), errors, CDN cache hits, bytes per visitor, and what a surge day would cost on Vercel.
//
// It never spends AI money: only GETs are replayed, and /api/ calls are dropped except a short allowlist of free reads.
//
//   node tools/surge/loadtest.mjs --url https://ranch.abbies.world --pages /,/sandbox --visitors 100 --concurrency 25
//   node tools/surge/loadtest.mjs --visit visit.json ...   (skip capture and replay a saved visit)
import {writeFileSync,readFileSync,appendFileSync} from 'node:fs';

const args=Object.fromEntries(process.argv.slice(2).reduce((out,a,i,all)=>{if(a.startsWith('--'))out.push([a.slice(2),all[i+1]?.startsWith('--')||all[i+1]==null?'true':all[i+1]]);return out;},[]));
const BASE=(args.url||'https://ranch.abbies.world').replace(/\/$/,'');
const PAGES=(args.pages||'/,/sandbox').split(',').map(s=>s.trim()).filter(Boolean);
const VISITORS=+args.visitors||50,CONCURRENCY=+args.concurrency||25,PER_VISITOR=+args.parallel||6;
const MAX_GB=+args['max-gb']||20,SETTLE_MS=+args.settle||12000,OUT=args.out||'surge-report';
const FREE_API=[/^\/api\/me$/,/^\/api\/links$/,/^\/api\/support$/,/^\/api\/models(\?|$)/,/^\/api\/sounds(\?|$)/,/^\/api\/library(\?|$)/];

// Vercel Pro list prices (check vercel.com/pricing before relying on them): 1 TB of Fast Data Transfer and 10M edge
// requests a month are included; beyond that about $0.15/GB and $2 per million requests.
const PRICE={includedGB:1000,perGB:0.15,includedRequests:10e6,perMillionRequests:2};

async function capture(){
 const {chromium}=await import('playwright');
 const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const seen=new Map();
 for(const page of PAGES){
  const ctx=await browser.newContext({viewport:{width:1280,height:800}});const tab=await ctx.newPage();
  tab.on('requestfinished',async r=>{
   if(r.method()!=='GET')return;const u=new URL(r.url());if(u.origin!==new URL(BASE).origin)return;
   const path=u.pathname+u.search;if(path.startsWith('/api/')&&!FREE_API.some(re=>re.test(path)))return;
   const sizes=await r.sizes().catch(()=>null);
   seen.set(path,{path,bytes:sizes?sizes.responseBodySize+sizes.responseHeadersSize:0,type:r.resourceType(),page});
  });
  try{await tab.goto(BASE+page,{waitUntil:'load',timeout:90000});}catch(e){console.error(`capture ${page}: ${e.message}`);}
  await tab.waitForTimeout(SETTLE_MS);await ctx.close();
 }
 await browser.close();
 return [...seen.values()];
}

async function visit(list,stats){
 let next=0;
 const worker=async()=>{while(next<list.length){const item=list[next++],t=performance.now();
  try{const r=await fetch(BASE+item.path,{headers:{'user-agent':'abbies-world-surge-test/1','accept-encoding':'gzip, br'}});
   const body=await r.arrayBuffer(),ms=performance.now()-t;
   stats.times.push(ms);stats.bytes+=body.byteLength;stats.requests++;
   const cache=r.headers.get('x-vercel-cache')||'none';stats.cache[cache]=(stats.cache[cache]||0)+1;
   if(r.status>=400){stats.errors++;stats.byStatus[r.status]=(stats.byStatus[r.status]||0)+1;stats.failed[item.path]=r.status;}
   if(ms>(stats.slowest.ms||0))stats.slowest={path:item.path,ms:Math.round(ms)};
  }catch(e){stats.errors++;stats.requests++;stats.byStatus.network=(stats.byStatus.network||0)+1;stats.failed[item.path]=e.message;}
 }};
 await Promise.all(Array.from({length:PER_VISITOR},worker));
}

const pct=(xs,p)=>{if(!xs.length)return 0;const s=[...xs].sort((a,b)=>a-b);return Math.round(s[Math.min(s.length-1,Math.floor(p/100*s.length))]);};
const gb=b=>b/1e9;
const cost=(visitors,bytesPerVisit,requestsPerVisit)=>{
 const g=gb(visitors*bytesPerVisit),r=visitors*requestsPerVisit;
 return Math.max(0,g-PRICE.includedGB)*PRICE.perGB+Math.max(0,r-PRICE.includedRequests)/1e6*PRICE.perMillionRequests;
};

const list=args.visit?JSON.parse(readFileSync(args.visit,'utf8')):await capture();
if(!list.length){console.error('Nothing captured: is the URL reachable?');process.exit(1);}
writeFileSync(`${OUT}-visit.json`,JSON.stringify(list,null,1));
const visitBytes=list.reduce((n,x)=>n+x.bytes,0);
if(gb(visitBytes*VISITORS)>MAX_GB){console.error(`That would move ${gb(visitBytes*VISITORS).toFixed(1)} GB; the limit is ${MAX_GB} GB (--max-gb).`);process.exit(1);}

const stats={times:[],bytes:0,requests:0,errors:0,cache:{},byStatus:{},failed:{},slowest:{}};
const started=performance.now();let launched=0;
const runner=async()=>{while(launched<VISITORS){launched++;await visit(list,stats);}};
await Promise.all(Array.from({length:Math.min(CONCURRENCY,VISITORS)},runner));
const seconds=(performance.now()-started)/1000;

// Cost uses the captured visit (what a real browser downloads); replayed bytes shrink when requests fail.
const bytesPerVisitor=visitBytes,requestsPerVisitor=list.length,replayedMbPerVisitor=+(stats.bytes/VISITORS/1e6).toFixed(1);
const failedBy={};for(const [path,why] of Object.entries(stats.failed)){const key=`${why} ${path.split('/').slice(0,3).join('/')}`;failedBy[key]=(failedBy[key]||0)+1;}
const hits=(stats.cache.HIT||0)+(stats.cache.STALE||0)+(stats.cache.PRERENDER||0);
const report={
 url:BASE,pages:PAGES,visitors:VISITORS,concurrency:CONCURRENCY,seconds:Math.round(seconds),
 requests:stats.requests,requestsPerSecond:Math.round(stats.requests/seconds),errors:stats.errors,errorRate:+(stats.errors/stats.requests*100).toFixed(2),
 p50ms:pct(stats.times,50),p95ms:pct(stats.times,95),p99ms:pct(stats.times,99),slowest:stats.slowest,
 cacheHitRate:+(hits/stats.requests*100).toFixed(1),cache:stats.cache,byStatus:stats.byStatus,failed:Object.fromEntries(Object.entries(stats.failed).slice(0,20)),
 mbPerVisitor:+(bytesPerVisitor/1e6).toFixed(1),replayedMbPerVisitor,requestsPerVisitor:Math.round(requestsPerVisitor),failedBy,
 surgeDayCost:Object.fromEntries([10e3,50e3,100e3,250e3,500e3].map(v=>[v,Math.round(cost(v,bytesPerVisitor,requestsPerVisitor))])),
 visitorsBefore1000:Math.floor((1000/PRICE.perGB+PRICE.includedGB)/gb(bytesPerVisitor)),
 largest:[...list].sort((a,b)=>b.bytes-a.bytes).slice(0,10).map(x=>({path:x.path,mb:+(x.bytes/1e6).toFixed(2)}))
};
writeFileSync(`${OUT}.json`,JSON.stringify(report,null,1));
const md=`## Surge test: ${BASE}
${VISITORS} visitors, ${CONCURRENCY} at once, ${report.seconds}s. ${report.requests} requests (${report.requestsPerSecond}/s), ${report.errors} errors (${report.errorRate}%).

| | |
|---|---|
| Speed p50 / p95 / p99 | ${report.p50ms} / ${report.p95ms} / ${report.p99ms} ms |
| CDN cache hits | ${report.cacheHitRate}% |
| One visit (browser) | ${report.mbPerVisitor} MB, ${report.requestsPerVisitor} requests |
| Errors by status | ${Object.entries(report.byStatus).map(([k,v])=>`${k}: ${v}`).join(', ')||'none'} |
| Visitors before $1,000 of Vercel transfer | about ${report.visitorsBefore1000.toLocaleString()} |
${Object.entries(report.surgeDayCost).map(([v,c])=>`| Cost of a ${(+v).toLocaleString()}-visitor day | $${c} |`).join('\n')}

Failing files by status and folder: ${Object.entries(report.failedBy).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>`${k} (${v})`).join(', ')||'none'}

Largest files: ${report.largest.map(x=>`${x.path} (${x.mb} MB)`).join(', ')}
`;
console.log(md);if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
