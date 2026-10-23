import * as T from 'three';
// One screen pass: depth curvature picks out silhouettes and construction edges.
// Unlike mesh inflation, this works on merged tiles without cracks or x-ray lines.
export function createContours(renderer,render,{samples=4}={}){
 // Half-float keeps night gradients and lamp glows from banding before the grade.
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthTexture:new T.DepthTexture(1,1,T.UnsignedIntType)});
 target.samples=samples;
 target.texture.minFilter=target.texture.magFilter=T.LinearFilter;
 const uniforms={image:{value:target.texture},depth:{value:target.depthTexture},pixel:{value:new T.Vector2()},near:{value:.1},far:{value:500},orthographic:{value:0},grade:{value:0},focus:{value:10},planar:{value:0},eyeLevel:{value:0},look:{value:new T.Vector3(1,1,1)}};
 const material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms,
 vertexShader:'varying vec2 vUV;void main(){vUV=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`varying vec2 vUV;uniform sampler2D image,depth;uniform vec2 pixel;uniform float near,far,orthographic,grade,focus,planar,eyeLevel;uniform vec3 look;
 float distanceAt(vec2 uv){float d=texture2D(depth,uv).x;return mix(near*far/(far-d*(far-near)),near+d*(far-near),orthographic);}
 void main(){vec4 sampleColor=texture2D(image,vUV);vec3 color=sampleColor.rgb;float c=distanceAt(vUV);
 float l=distanceAt(vUV-vec2(pixel.x,0.)),r=distanceAt(vUV+vec2(pixel.x,0.));
 float b=distanceAt(vUV-vec2(0.,pixel.y)),t=distanceAt(vUV+vec2(0.,pixel.y));
 float curve=max(abs(l+r-2.*c),abs(b+t-2.*c))/max(c,.1);
 // On open land, measure curvature in 1/distance, which is flat for any plane: a slope seen at a grazing angle
 // (eye level) stays clean. Soft creases between the land's big cells are taken off too, or they ink the ground in
 // stripes when you stand on it; silhouettes (trees against land, ridges against sky) still ink (AW-STUDY-0018).
 curve=mix(curve,max(0.,max(abs(1./l+1./r-2./c),abs(1./b+1./t-2./c))*c-60.*c/(near*65536.)),planar);
 float edge=smoothstep(.0015,.008,curve);
 // Lens pass on graded boards: one 12-tap spiral gathers both a focus blur away from the orbit target
 // and a glow from anything brighter than white (lamps, lit windows, sun-struck roofs).
 float blurAmount=0.;
 if(grade>0.){
  vec2 unit=pixel/1.5;blurAmount=grade*look.x*(1.-eyeLevel)*smoothstep(0.,.35,clamp((abs(c-focus)/max(focus,.1)-.1)*2.2,0.,1.));
  vec3 blurred=vec3(0.),glow=vec3(0.);
  for(int i=0;i<12;i++){float a=float(i)*2.39996,radius=sqrt(float(i)+.5)/3.5;vec2 o=vec2(cos(a),sin(a))*radius;
   blurred+=texture2D(image,vUV+o*unit*blurAmount*5.5).rgb;glow+=max(texture2D(image,vUV+o*unit*16.).rgb-vec3(1.),vec3(0.));}
  color=mix(color,blurred/12.,blurAmount)+glow*(.07*grade*look.y);
 }
 // Lift chroma while preserving luminance and near-neutral surfaces.
 float chroma=max(color.r,max(color.g,color.b))-min(color.r,min(color.g,color.b));
 float luma=dot(color,vec3(.2126,.7152,.0722));
 float richness=smoothstep(.045,.16,chroma);
 color=max(vec3(0.),mix(vec3(luma),color,1.+.38*richness));
 // Preserve quiet background; ink belongs to the nearer surface edge.
 float foreground=step(c,min(min(l,r),min(b,t))+.025*c);
 float inkMask=min(sampleColor.a,min(min(texture2D(image,vUV-vec2(pixel.x,0.)).a,texture2D(image,vUV+vec2(pixel.x,0.)).a),min(texture2D(image,vUV-vec2(0.,pixel.y)).a,texture2D(image,vUV+vec2(0.,pixel.y)).a)));
 edge*=foreground*clamp(inkMask,0.,1.)*(1.-blurAmount);
 color=mix(color,vec3(.025,.03,.022),edge*.68);
 // Storybook grade: cool shade, warm light, and a soft lens falloff toward the corners.
 float graded=dot(color,vec3(.2126,.7152,.0722));
 color*=mix(vec3(1.),mix(vec3(.93,.98,1.08),vec3(1.05,1.,.92),smoothstep(.04,.5,graded)),grade*look.z);
 color*=1.-grade*look.z*.3*smoothstep(.42,1.,length((vUV-.5)*vec2(1.,.82))*1.32);
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const scene=new T.Scene(),camera=new T.Camera();scene.add(new T.Mesh(new T.PlaneGeometry(2,2),material));
 const size=new T.Vector2();
 return {draw(world,view){
  renderer.getDrawingBufferSize(size);if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);
  uniforms.pixel.value.set(1.5*renderer.getPixelRatio()/size.x,1.5*renderer.getPixelRatio()/size.y);
  uniforms.near.value=view.near;uniforms.far.value=view.far;uniforms.orthographic.value=view.isOrthographicCamera?1:0;
  renderer.setRenderTarget(target);render(world,view);const stats={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};renderer.setRenderTarget(null);render(scene,camera);return {...stats,postPasses:1};
 },setGrade(amount){uniforms.grade.value=amount;},setFocus(distance){uniforms.focus.value=distance;},setLand({planar=false,eyeLevel=false}={}){uniforms.planar.value=planar?1:0;uniforms.eyeLevel.value=eyeLevel?1:0;},setLook({tiltShift,glow,grade}){uniforms.look.value.set(tiltShift?1:0,glow?1:0,grade?1:0);},dispose(){target.dispose();material.dispose();scene.children[0].geometry.dispose();}};
}
