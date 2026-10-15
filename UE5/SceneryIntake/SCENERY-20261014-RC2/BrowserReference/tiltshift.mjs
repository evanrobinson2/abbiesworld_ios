// Isolated screen-space miniature-lens experiment. UI remains sharp outside canvas.
export function createTiltShift(T,renderer){
 const target=new T.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false});target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
 const quadScene=new T.Scene(),quadCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const material=new T.ShaderMaterial({uniforms:{colorTexture:{value:target.texture},depthTexture:{value:target.depthTexture},pixel:{value:new T.Vector2(1,1)},focusY:{value:.48},focusDistance:{value:50},nearClip:{value:.1},farClip:{value:500}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`varying vec2 vUv;uniform sampler2D colorTexture,depthTexture;uniform vec2 pixel;uniform float focusY,focusDistance,nearClip,farClip;
 float viewDepth(float d){return (nearClip*farClip)/(farClip-d*(farClip-nearClip));}
 void main(){float depth=viewDepth(texture2D(depthTexture,vUv).r);float band=smoothstep(.075,.34,abs(vUv.y-focusY));float coc=clamp(abs(depth-focusDistance)/max(depth,1.)*.18,0.,.22);float radius=band*9.+coc*3.;vec3 c=texture2D(colorTexture,vUv).rgb*.2;float total=.2;for(int i=0;i<16;i++){float fi=float(i);float angle=fi*2.399963;float r=sqrt((fi+.5)/16.)*radius;vec2 o=vec2(cos(angle),sin(angle))*pixel*r;float w=1.-.3*r/max(radius,.001);c+=texture2D(colorTexture,clamp(vUv+o,vec2(0.),vec2(1.))).rgb*w;total+=w;}gl_FragColor=vec4(c/total,1.);
 #include <tonemapping_fragment>
 ${T.ShaderChunk.colorspace_fragment?'#include <colorspace_fragment>':'#include <encodings_fragment>'}
 }`});quadScene.add(new T.Mesh(new T.PlaneGeometry(2,2),material));
 function resize(w,h){const ratio=renderer.getPixelRatio();target.setSize(Math.round(w*ratio),Math.round(h*ratio));material.uniforms.pixel.value.set(1/(w*ratio),1/(h*ratio));}resize(innerWidth,innerHeight);
 return {resize,render(scene,camera,{enabled,focus,focusDistance}){if(!enabled){renderer.setRenderTarget(null);renderer.render(scene,camera);return}material.uniforms.focusY.value=1-focus;material.uniforms.focusDistance.value=focusDistance;material.uniforms.nearClip.value=camera.near;material.uniforms.farClip.value=camera.far;renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(quadScene,quadCamera)},description:'Screen-space focus band plus scene-depth weighting,16-tap disk blur; not a full physical tilted-lens simulation'};
}
