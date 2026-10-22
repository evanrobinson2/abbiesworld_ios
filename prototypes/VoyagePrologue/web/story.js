'use strict';
const $=id=>document.getElementById(id), clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)), ramp=(t,a,b)=>reduced?Number(t>=b):clamp((t-a)/(b-a)), ease=x=>1-Math.pow(1-clamp(x),3);
let t=0, running=false, started=false, last=0, muted=true, reduced=matchMedia('(prefers-reduced-motion: reduce)').matches, audio, lastCue=-1;
const film=$('film'), canvas=$('petals'), ctx=canvas.getContext('2d');
const beats=[0,7,14,20,27];
const timeline=[
 {start:0,end:7,kicker:'BEFORE THE TROUBLE',title:'Just one more game.',line:'Nobody wanted to go home.'},
 {start:7,end:14,kicker:'THE WORLD WAS VERY SMALL.',title:'',line:''},
 {start:14,end:20,kicker:'THEN THE LIGHT CHANGED.',title:'',line:'',},
 {start:20,end:27,kicker:'RAZE',title:'“Move.”',line:''},
 {start:27,end:32,kicker:'BUT SOMETHING SLIPPED THROUGH.',title:'',line:''}
];
function tone(freq,duration,volume=.04,type='sine') {if(muted||!audio)return;let o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.connect(g);g.connect(audio.destination);g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(volume,audio.currentTime+.006);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);o.start();o.stop(audio.currentTime+duration+.05)}
function draw(){
 const b=timeline.find(s=>t>=s.start&&t<s.end)||timeline[4];
 $('kicker').textContent=b.kicker;$('title').innerHTML=b.title;$('line').textContent=b.line;$('line').style.display=b.line?'inline-block':'none';
 $('caption').style.opacity=t<14?1:t<20?1-ramp(t,17,19):t<27?ease(ramp(t,20.6,21.4)):1-ramp(t,28,29);
 $('caption').style.top=t>=20?'49%':t>=7&&t<14?'88%':'5%';$('caption').style.left=t>=20?'6%':'6%';
 $('title').style.fontSize=t>=20?'12cqw':'';
 const motionT=reduced?0:t;
 const scale=t<7?1.10-.08*ramp(motionT,0,7):t<14?1.02+.16*ramp(motionT,7,14):1.18;
 $('wide').style.transform=`scale(${scale})`; $('wide').style.transformOrigin='53% 68%';
 $('world').style.filter=`saturate(${1-ramp(t,14,18)*.8}) brightness(${1-ramp(t,14,19)*.55})`;
 const showInsert=ease(ramp(t,7.4,8.2))*(1-ease(ramp(t,14,14.7)));
 $('reaction').style.opacity=ease(ramp(t,9,9.5))*(1-ease(ramp(t,14,14.4)));
 $('insert').style.opacity=showInsert; $('insert').style.transform=`translate(${(1-showInsert)*-40}%,${(1-showInsert)*15}%) rotate(${-6+Math.sin(motionT)*.3}deg)`;
 $('insert').querySelector('img').style.transform=`scale(${1+ramp(motionT,8,14)*.06})`;
 const shade=ramp(t,14.4,19.5)*100;
 $('ink').style.clipPath=`polygon(0 0,${shade}% 0,${Math.max(0,shade-25)}% 100%,0 100%)`;
 const villain=ease(ramp(t,19.6,20.5));$('villain').style.opacity=villain*(1-ramp(t,27,28));
 $('villain').style.transform=`translate(${(1-villain)*110}%,0) rotate(${5-(villain*3)}deg)`;
 $('soundword').style.opacity=ramp(t,10.2,10.4)*(1-ramp(t,12.2,12.5));
 $('soundword').style.transform=`rotate(-12deg) scale(${.7+ease(ramp(t,10.2,10.7))*.3})`;
 const marbleT=ramp(t,26.3,30.5);$('marble').style.opacity=ramp(t,26.3,26.5)*(1-ramp(t,30.2,30.5));
 $('marble').style.left=`${-5+marbleT*113}%`;$('marble').style.top=`${80-Math.sin(marbleT*Math.PI)*10}%`;
 $('marble').style.transform=`rotate(${marbleT*630}deg)`;
 $('end').style.display=t>=30.5?'block':'none';$('end').style.opacity=ease(ramp(t,30.5,31.5));
 $('start').style.display=started?'none':'block';
 $('time').textContent=`00:${String(Math.floor(t)).padStart(2,'0')} / 00:32`;$('scrub').value=t;
 $('play').textContent=running?'Ⅱ':'▶';
 document.querySelectorAll('[data-time]').forEach((el,i)=>el.classList.toggle('active',t>=beats[i]&&(i===4||t<beats[i+1])));
 petals(motionT);
}
function petals(time){const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);const opacity=1-ramp(t,14,18);if(opacity<=0)return;
 for(let i=0;i<34;i++){let z=(i%4+1)/4,px=((i*137+time*24*z)%(w+90))-45,py=((i*87+time*(19+z*33))%(h+70))-35,r=(3+z*9)*w/1000;ctx.save();ctx.globalAlpha=opacity*(.5+z*.4);ctx.translate(px+Math.sin(time*.9+i)*20,py);ctx.rotate(i+time*(.2+z*.5));ctx.scale(.25+Math.abs(Math.sin(time*.8+i))*.75,1);ctx.beginPath();ctx.moveTo(-r,0);ctx.bezierCurveTo(-r,-r*1.8,r*1.4,-r*.8,r*.6,r*.6);ctx.bezierCurveTo(0,r*1.5,-r*.8,r,-r,0);let g=ctx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#fbc1a3');g.addColorStop(.55,'#dc737e');g.addColorStop(1,'#a33453');ctx.fillStyle=g;ctx.fill();ctx.restore();}}
function start(){started=true;running=true;last=performance.now();draw()}
function seek(value){t=clamp(Number(value),0,32);started=true;running=false;lastCue=Math.floor(t*2);draw()}
function frame(now){const dt=Math.min((now-last)/1000,.1);last=now;if(running&&!document.hidden){t=Math.min(32,t+dt);const beat=Math.floor(t*2);if(beat!==lastCue){lastCue=beat;if(t<14&&beat%3===0)tone([330,440,494,660][beat%4],.2,.016);if(t>10.2&&t<10.8)tone(1400,.11,.055);if(t>19.6&&t<20.2)tone(65,.7,.075,'triangle');if(t>26&&t<30)tone(700-(t-26)*80,.07,.015)}if(t>=32)running=false;}draw();requestAnimationFrame(frame)}
$('start').onclick=start;$('play').onclick=()=>{if(t>=32)t=0;started=true;running=!running;last=performance.now()};$('again').onclick=()=>{t=0;lastCue=-1;start()};$('scrub').oninput=e=>seek(e.target.value);
document.querySelectorAll('[data-time]').forEach(el=>el.onclick=()=>seek(Number(el.dataset.time)+.4));
$('sound').onclick=async()=>{muted=!muted;if(!muted){audio??=new AudioContext();await audio.resume()}$('sound').textContent=muted?'Sound off':'Sound on';$('sound').setAttribute('aria-pressed',String(!muted));};
$('motion').onclick=()=>{reduced=!reduced;$('motion').textContent=reduced?'Motion reduced':'Motion on';$('motion').setAttribute('aria-pressed',String(reduced));};
$('review').onclick=()=>{running=false;$('notes').showModal()};$('close').onclick=()=>$('notes').close();
film.onkeydown=e=>{if(e.target!==film)return;if(e.code==='Space'){e.preventDefault();$('play').click()}if(e.code==='ArrowRight')seek(t+1);if(e.code==='ArrowLeft')seek(t-1)};
new ResizeObserver(()=>{canvas.width=film.clientWidth;canvas.height=film.clientHeight;draw()}).observe(film);
const params=new URLSearchParams(location.search);if(params.has('t'))seek(params.get('t'));if(params.get('play')==='1')start();
$('motion').textContent=reduced?'Motion reduced':'Motion on';
Promise.all([...document.querySelectorAll('#film img')].map(im=>im.decode().catch(()=>{im.alt+=' — image still being prepared'}))).then(draw);
requestAnimationFrame(frame);
