import * as T from 'three';
// One screen pass: depth curvature picks out silhouettes and construction edges.
// Unlike mesh inflation, this works on merged tiles without cracks or x-ray lines.
export function createContours(renderer,render,{samples=4}={}){
 const target=new T.WebGLRenderTarget(1,1,{depthTexture:new T.DepthTexture(1,1,T.UnsignedIntType)});
 target.samples=samples;
 target.texture.minFilter=target.texture.magFilter=T.LinearFilter;
 const uniforms={image:{value:target.texture},depth:{value:target.depthTexture},pixel:{value:new T.Vector2()},near:{value:.1},far:{value:500},orthographic:{value:0}};
 const material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms,
 vertexShader:'varying vec2 vUV;void main(){vUV=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`varying vec2 vUV;uniform sampler2D image,depth;uniform vec2 pixel;uniform float near,far,orthographic;
 float distanceAt(vec2 uv){float d=texture2D(depth,uv).x;return mix(near*far/(far-d*(far-near)),near+d*(far-near),orthographic);}
 void main(){vec4 sampleColor=texture2D(image,vUV);vec3 color=sampleColor.rgb;float c=distanceAt(vUV);
 float l=distanceAt(vUV-vec2(pixel.x,0.)),r=distanceAt(vUV+vec2(pixel.x,0.));
 float b=distanceAt(vUV-vec2(0.,pixel.y)),t=distanceAt(vUV+vec2(0.,pixel.y));
 float curve=max(abs(l+r-2.*c),abs(b+t-2.*c))/max(c,.1);
 float edge=smoothstep(.0015,.008,curve);
 // Preserve quiet background; ink belongs to the nearer surface edge.
 float foreground=step(c,min(min(l,r),min(b,t))+.025*c);
 edge*=foreground*clamp(sampleColor.a,0.,1.);
 color=mix(color,color*vec3(.48,.53,.48),edge*.48);
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
 }`});
 const scene=new T.Scene(),camera=new T.Camera();scene.add(new T.Mesh(new T.PlaneGeometry(2,2),material));
 const size=new T.Vector2();
 return {draw(world,view){
  renderer.getDrawingBufferSize(size);if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);
  uniforms.pixel.value.set(1.25*renderer.getPixelRatio()/size.x,1.25*renderer.getPixelRatio()/size.y);
  uniforms.near.value=view.near;uniforms.far.value=view.far;uniforms.orthographic.value=view.isOrthographicCamera?1:0;
  renderer.setRenderTarget(target);render(world,view);const stats={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};renderer.setRenderTarget(null);render(scene,camera);return {...stats,postPasses:1};
 },dispose(){target.dispose();material.dispose();scene.children[0].geometry.dispose();}};
}
