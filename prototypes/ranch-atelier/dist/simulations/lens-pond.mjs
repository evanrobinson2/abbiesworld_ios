// Lens pond: a full-screen WebGL backdrop for 2D top-down games drawn in SVG above it (AW-STUDY-0047, the cell game).
// The water is painted in the shader, and every cell body is a liquid-glass lens that bends the water behind it.
// - The water: deep goo-green with soft drifting sunlight (the Tiny Glade soft-light pick from AW-STUDY-0045), a
//   painted grain and purple-tinted shade with a teal rim light (Painted Brush, `simulations/painted-brush.mjs`), giant
//   shapes drifting in the deep and motes in the middle distance, each on its own parallax layer.
// - Glow specks hold each brightness for a twelfth of a second, like Painted Brush's hand-drawn 12 fps effects.
// - Lenses: the rim profile is `lensMap()` from `simulations/liquid-glass.mjs` turned into a circle: neutral in the
//   middle, bending toward the centre within `edge` of the rim, so the water looks magnified through a thick drop.
//   The shader samples the water again at the bent position (a little apart per colour channel), so it runs on every
//   phone, not only where CSS backdrop filters can refract.
// - One game signal, `mood` (0 calm to 1 danger), cools the light and dims the sun, the way the music and the cells
//   change with it (the whole game adapts).
//   const P = lensPond(canvas, {scale: .75})
//   P.frame({cam: [x, y], zoom, time, mood, lenses: [[sx, sy, r, glow], ...], arena: [sx, sy, r], exit: [sx, sy, r]})
//     all in CSS pixels; lenses up to 12; arena is the drop's edge on the slide (dry glass beyond), exit a glowing way off
//   P.resize()   P.ok (false when WebGL is missing: the page falls back to a CSS gradient)
const MAX = 12;
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision highp float;
uniform vec2 uRes,uCam;uniform float uZoom,uTime,uMood,uDpr;uniform vec3 uArena,uExit;uniform vec4 uLens[${MAX}];uniform int uN;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return n(p)*.55+n(p*2.03+7.1)*.3+n(p*4.1+3.3)*.15;}
// Painted Brush's stroke pattern, laid in the plane: long strokes one way, short the other
float stroke(vec2 p){vec2 q=vec2(dot(p,vec2(.86,.5))*1.1,dot(p,vec2(-.5,.86))*5.5);return n(q)*.65+n(q*2.1+vec2(7.,3.))*.35;}
// soft moving sunlight on the water, the pattern a pond floor catches
float caustic(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.3+t*.7+float(i)),cos(q.x*1.1-t*.6+float(i)*1.7))*.55;c+=1./(1.+8.*abs(sin(q.x+q.y)));}return c/3.;}
vec3 water(vec2 s){
 float t=uTime;vec2 rel=(s-uRes*.5)/uZoom; // world units away from the camera centre
 vec2 w=uCam+rel;
 float mood=uMood;
 // base: deep goo green, lighter where the big noise rises
 float b=fbm(w/700.+vec2(t*.006,0.));
 vec3 col=mix(vec3(.07,.30,.25),vec3(.26,.58,.38),b);
 col=mix(col,vec3(.05,.10,.20),mood*.55);
 // the deep: giant slow shapes far below (parallax .3), lit on their sunward rim
 vec2 f=uCam*.3+rel*.8+vec2(t*4.,t*2.);
 float g=fbm(f/260.);float sh=smoothstep(.58,.63,g),rim=smoothstep(.55,.6,g)-smoothstep(.6,.66,g);
 col=mix(col,col*vec3(.55,.6,.85),sh*.55);col+=vec3(.25,.9,.75)*rim*.08;
 // painted shade: brush strokes break the light, shadows lean purple
 float st=stroke(w/60.);float light=clamp(b*1.2+(st-.5)*.22,0.,1.);
 col=mix(col*vec3(.7,.62,.98),col,smoothstep(.2,.65,light));
 // the sun from the top left, soft and moving, dimmer when danger is near
 float c=caustic(w/90.,t*.6);vec2 sd=normalize(vec2(-.6,-.8));float sunSide=.55+.45*dot(normalize(rel+vec2(1e-3)),sd)*clamp(length(rel)/600.,0.,1.);
 col+=vec3(1.,.95,.7)*pow(c,2.)*.42*sunSide*(1.-.6*mood);
 // middle distance motes (parallax .65), soft bright specks
 vec2 m=uCam*.65+rel*.92;vec2 cell=floor(m/70.),fr=m-cell*70.;vec2 o=vec2(h(cell),h(cell+3.1))*70.;float r=1.5+h(cell+9.)*2.5;
 float d=length(fr-o);col+=vec3(.6,1.,.75)*smoothstep(r+1.5,r-.5,d)*.22*(.4+.6*h(cell+5.));
 // glow specks on the near layer: each holds its brightness for a twelfth of a second
 vec2 gc=floor(w/120.),gf=w-gc*120.;vec2 go=vec2(h(gc+1.7),h(gc+8.3))*120.;float ft=floor(t*12.)/12.;
 float k=.6+.4*h(gc+vec2(ft,ft*1.3));float gd=length(gf-go);
 col+=vec3(.55,1.,.45)*smoothstep(10.,0.,gd)*.18*k*step(.55,h(gc+2.2));
 // the edge of the drop on the slide: past the meniscus is dry glass; an exit glows on the rim when it's open
 if(uArena.z>0.){
  float ad=length(s-uArena.xy*uDpr)-uArena.z*uDpr,wob=sin(atan(s.y-uArena.y*uDpr,s.x-uArena.x*uDpr)*9.+t*.8)*3.*uDpr;ad+=wob;
  vec3 glass=vec3(.62,.72,.74)+vec3(.12)*smoothstep(.4,.9,n(s/(220.*uDpr)+t*.02))-vec3(.06)*n(s/(14.*uDpr));
  glass+=vec3(.25)*smoothstep(.97,1.,sin((s.x+s.y)/(60.*uDpr)));
  col=mix(col,glass,smoothstep(0.,6.*uDpr,ad));
  col+=vec3(.75,1.,.95)*exp(-pow(ad/(5.*uDpr),2.))*.55;
  col=mix(col,col*.78,smoothstep(-40.*uDpr,0.,ad)*step(ad,0.)*.5);
  if(uExit.z>0.){float ed=length(s-uExit.xy*uDpr);float pulse=.6+.4*sin(t*5.);col+=vec3(1.,.85,.35)*exp(-pow(ed/(uExit.z*uDpr),2.))*.7*pulse;}
 }
 // a little painted grain over everything
 col*=.93+.12*n(s/(3.*uDpr));
 return col;
}
void main(){
 vec2 s=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uDpr*uDpr; // device px, top-left origin
 vec3 col=vec3(0.);bool hit=false;
 for(int i=0;i<${MAX};i++){
  if(i>=uN)break;vec4 L=uLens[i];vec2 c=L.xy*uDpr;float r=L.z*uDpr;vec2 dv=s-c;float d=length(dv);
  if(d<r){
   // liquid-glass rim: neutral in the middle, pushed toward the centre near the edge (lensMap, as a circle)
   float edge=min(r*.5,34.*uDpr),dd=r-d,m=dd<edge?pow(1.-max(dd,0.)/edge,2.):0.;vec2 nv=dv/max(d,1e-3);
   vec2 base=c+dv/1.12;float bend=m*r*.32;
   col.r=water(base-nv*bend*1.06).r;col.g=water(base-nv*bend).g;col.b=water(base-nv*bend*.94).b;
   // glass light: a bright rim toward the sun, a teal rim on the shade side, a soft inner glow from the cell
   float a=dot(nv,normalize(vec2(-.6,-.8)));
   col+=vec3(1.)*pow(m,3.)*smoothstep(.2,1.,a)*.35;
   col+=vec3(.25,.9,.83)*pow(m,2.)*smoothstep(.1,-.9,a)*.3;
   col+=vec3(.6,1.,.6)*L.w*.12*(1.-d/r);
   hit=true;break;
  }
 }
 if(!hit)col=water(s);
 gl_FragColor=vec4(col,1.);
}`;

export function lensPond(canvas, {scale = .75} = {}) {
 const gl = canvas.getContext('webgl', {antialias: false, alpha: false, powerPreference: 'high-performance'});
 if (!gl) return {ok: false, frame() {}, resize() {}};
 const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
 const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog); gl.useProgram(prog);
 const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
 const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
 const U = {}; for (const k of ['uRes', 'uCam', 'uZoom', 'uTime', 'uMood', 'uDpr', 'uLens', 'uN', 'uArena', 'uExit']) U[k] = gl.getUniformLocation(prog, k);
 const lens = new Float32Array(MAX * 4);
 let dpr = 1;
 const P = {ok: true, scale,
  resize() {
   dpr = Math.min(window.devicePixelRatio || 1, 2) * P.scale;
   canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr);
   gl.viewport(0, 0, canvas.width, canvas.height);
  },
  frame({cam = [0, 0], zoom = 1, time = 0, mood = 0, lenses = [], arena = [0, 0, 0], exit = [0, 0, 0]}) {
   const n = Math.min(MAX, lenses.length); lens.fill(0);
   for (let i = 0; i < n; i++) lens.set(lenses[i].slice(0, 4).concat([0, 0, 0, 0]).slice(0, 4), i * 4);
   gl.uniform2f(U.uRes, canvas.width, canvas.height); gl.uniform2f(U.uCam, cam[0], cam[1]);
   gl.uniform1f(U.uZoom, zoom * dpr); gl.uniform1f(U.uTime, time); gl.uniform1f(U.uMood, mood); gl.uniform1f(U.uDpr, dpr);
   gl.uniform4fv(U.uLens, lens); gl.uniform1i(U.uN, n); gl.uniform3f(U.uArena, ...arena); gl.uniform3f(U.uExit, ...exit);
   gl.drawArrays(gl.TRIANGLES, 0, 3);
  }};
 P.resize();
 return P;
}
