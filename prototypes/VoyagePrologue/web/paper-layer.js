// Live scene compositing: retain the source image; only remove near-white paper
// at render time. Protected portrait regions preserve eye highlights and fabric.
export function paperLayer(img, protectedAreas = []) {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  canvas.className = 'paper-art';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', img.alt);
  const shader = (type, source) => {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  try {
    const program = gl.createProgram();
    const vs=shader(gl.VERTEX_SHADER, 'attribute vec2 point; varying vec2 uv; void main(){uv=vec2((point.x+1.)*.5,1.-(point.y+1.)*.5);gl_Position=vec4(point,0.,1.);}');
    const fs=shader(gl.FRAGMENT_SHADER, `precision mediump float;
      varying vec2 uv; uniform sampler2D art; uniform vec4 protect[3];
      void main(){
        vec4 c=texture2D(art,uv);
        float low=min(c.r,min(c.g,c.b));
        float high=max(c.r,max(c.g,c.b));
        float paper=smoothstep(.82,.92,low)*(1.-smoothstep(.12,.22,high-low));
        float keep=0.;
        for(int i=0;i<3;i++){
          vec2 radius=max(protect[i].zw,vec2(.001));
          float d=length((uv-protect[i].xy)/radius);
          keep=max(keep,1.-smoothstep(.88,1.,d));
        }
        float alpha=c.a*(1.-paper*(1.-keep));
        gl_FragColor=vec4(c.rgb,alpha);
      }`);
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const point=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(point);gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const areas=[...protectedAreas];while(areas.length<3)areas.push([-5,-5,.001,.001]);
    gl.uniform4fv(gl.getUniformLocation(program,'protect[0]'),new Float32Array(areas.flat()));
    const draw=()=>{
      try {
      canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      gl.drawArrays(gl.TRIANGLES,0,6);
      canvas.classList.add('ready');img.classList.add('keyed-source');
      } catch(error) {
        // Texture upload can fail asynchronously (e.g. a restricted local origin).
        // Keep the original portrait visible instead of stranding the story.
        canvas.classList.remove('ready');img.classList.remove('keyed-source');
        console.warn('Paper texture unavailable; showing original portrait.',error);
      }
    };
    img.addEventListener('load',draw,{once:true});
    if(img.complete&&img.naturalWidth)draw();
    canvas.dispose=()=>{img.removeEventListener('load',draw);gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();};
    canvas.addEventListener('webglcontextlost',()=>{img.classList.remove('keyed-source');canvas.classList.remove('ready');});
    return canvas;
  } catch(error) { console.warn('Paper compositing unavailable; showing source artwork.',error);return null; }
}
