/* One shared WebGL mesh. Glass, its liquid and the droplets are shaded in 3D;
 * the caller schedules draws and provides the live backdrop under the alpha surface. */
(() => {
  'use strict';
  const vertex=`
    precision mediump float;
    attribute vec3 aUnit;
    uniform vec2 uLook, uDent;
    uniform float uPressure, uTime, uRippleTime, uRippleForce;
    varying vec3 vPoint, vNormal;
    vec3 membrane(vec3 s) {
      float rim=smoothstep(.33,.96,length(s.xy));
      float lobe=cos(5.0*atan(s.y,s.x+.0001)+.43)*.034*rim;
      float breath=cos(s.x*3.0+s.y*2.7+uTime*2.5)*.010;
      vec3 p=s*(1.0+lobe+breath);
      p.x*=1.0-.065*s.y;
      p*=vec3(1.0,.70,.79);
      vec3 direction=normalize(vec3(uDent,.12));
      float facing=clamp(dot(s,direction),-1.0,1.0);
      float contact=pow(max(0.0,facing),5.0);
      float displacement=contact*uPressure*.185;
      if(uRippleTime>=0.0) {
        float arc=acos(facing);
        float age=max(0.0,uRippleTime-arc*.051);
        float spread=.74+.26*facing;
        displacement=uRippleForce*spread*.267*sin(age*23.0)*exp(-age*5.8);
      }
      p-=normalize(p)*displacement;
      p+=vec3(-uDent.y,uDent.x,0.0)*displacement*.135;
      float a=uLook.x*.31,b=uLook.y*.24;
      p.xz=mat2(cos(a),sin(a),-sin(a),cos(a))*p.xz;
      p.yz=mat2(cos(b),sin(b),-sin(b),cos(b))*p.yz;
      return p;
    }
    void main() {
      vec3 p=membrane(aUnit);
      vec3 tangent=normalize(cross(abs(aUnit.y)<.96?vec3(0,1,0):vec3(1,0,0),aUnit));
      vec3 bitangent=cross(aUnit,tangent);
      vec3 tu=membrane(normalize(aUnit+tangent*.014))-p;
      vec3 tv=membrane(normalize(aUnit+bitangent*.014))-p;
      vPoint=p;vNormal=normalize(cross(tu,tv));
      gl_Position=vec4(p.xy*vec2(.908,1.121),-p.z*.48,1.0);
    }`;
  const fragment=`
    precision mediump float;
    uniform vec3 uGlow;
    uniform vec2 uLook, uDent;
    uniform float uPressure, uTime;
    varying vec3 vPoint, vNormal;
    const vec3 eye=vec3(0,0,1);
    const vec3 key=vec3(-.46,.72,.52);
    const vec3 fill=vec3(.76,-.45,.47);

    vec4 bead(vec3 ro,vec3 rd,vec3 center,float radius) {
      vec3 fromCenter=ro-center;
      float along=dot(fromCenter,rd);
      float h=along*along-dot(fromCenter,fromCenter)+radius*radius;
      if(h<=0.0||along>=0.0)return vec4(0.0);
      vec3 normal=normalize(ro+rd*(-along-sqrt(h))-center);
      float shade=max(0.0,dot(normal,key));
      float rim=pow(1.0-max(0.0,-dot(rd,normal)),2.7);
      float gloss=pow(max(0.0,dot(reflect(rd,normal),key)),15.0);
      float body=.15+shade*.37+rim*.34;
      return vec4(mix(uGlow,vec3(.88,.98,1),body)+gloss*.73, clamp(.22+shade*.3+rim*.41+gloss*.39,0.0,.94));
    }
    void main(){
      vec3 n=normalize(vNormal);
      float ndv=max(0.0,dot(n,eye)),grazing=1.0-ndv;
      float fresnel=.028+.972*pow(grazing,3.4);
      vec3 reflected=reflect(-eye,n);
      vec3 ray=refract(-eye,n,.751);
      vec3 ro=vPoint+ray*.016;
      float phase=sin(uTime*2.3);
      vec3 drift=vec3(-uLook.x*.17+phase*.027, uLook.y*.11-uPressure*uDent.y*.105, .018*phase);
      vec3 basin=vec3(.0,-.29,-.12)+drift;
      vec3 toCore=ro-basin;
      float at=max(0.0,-dot(toCore,ray));
      vec3 coreOffset=(toCore+ray*at)*vec3(1.0,1.37,.56);
      float fog=exp(-dot(coreOffset,coreOffset)*6.2)*(1.0-exp(-at*3.8));
      vec3 rippleN=normalize(vec3(uLook.x*.19+phase*.046-uDent.x*uPressure*.17,1.0,.19));
      float below=dot(rippleN,vPoint-vec3(drift.x,-.20+drift.y,-.09));
      float liquid=(1.0-smoothstep(-.14,.18,below))*(1.0-fresnel)*.72;
      float meniscus=exp(-abs(below)*41.0)*liquid*smoothstep(.24,.78,ndv);

      vec3 film=.59+.41*cos(vec3(-.16,.82,2.42)+grazing*6.6+vPoint.x*.7-vPoint.y*.85);
      vec3 inside=mix(vec3(.38,.31,.66),uGlow,.48);
      vec3 glass=mix(inside,film,.32+fresnel*.56);
      glass=mix(glass,uGlow,.22*liquid+.51*fog);
      glass+=uGlow*(fog*.25+meniscus*.30)*vec3(.76,.92,1.0);
      float alpha=.117+.19*liquid+.36*fog+.61*fresnel;
      vec4 back=bead(ro,ray,vec3(.36,.26,-.31)+drift*.45,.075);
      vec4 amber=bead(ro,ray,vec3(-.58,-.04,-.12)+drift*.70,.101);
      vec4 front=bead(ro,ray,vec3(.45,-.29,.21)+drift*.77,.080);
      glass=mix(glass,back.rgb,back.a*.70);
      glass=mix(glass,amber.rgb,amber.a*.85);
      glass=mix(glass,front.rgb,front.a);
      alpha+=back.a*.32+amber.a*.37+front.a*.40;

      float top=pow(max(0.0,dot(reflected,key)),9.0)*.31;
      vec3 d=reflected-key;
      float strip=exp(-d.y*d.y*165.0-d.x*d.x*14.0-d.z*d.z*20.0)*.65;
      float glint=pow(max(0.0,dot(reflected,normalize(vec3(-.72,.55,.40)))),135.0)*.69;
      float lower=pow(max(0.0,dot(reflected,fill)),17.0)*.44;
      float outer=pow(grazing,10.0)*.31;
      glass=mix(glass,vec3(.95,.96,1),min(.92,top+strip+glint));
      glass+=vec3(.48,.52,.97)*lower+film*outer;
      alpha+=top+strip*.82+glint+lower*.73+outer;
      gl_FragColor=vec4(clamp(glass,0.0,1.0),clamp(alpha,0.0,.95));
    }`;

  const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
  const finite=(x,fallback=0)=>Number.isFinite(x)?x:fallback;
  let surface,renderer,unavailable=false;
  function shader(gl,type,code){
    const unit=gl.createShader(type);
    gl.shaderSource(unit,code);gl.compileShader(unit);
    if(!gl.getShaderParameter(unit,gl.COMPILE_STATUS)){gl.deleteShader(unit);return null;}
    return unit;
  }
  function setup(){
    if(unavailable)return null;if(renderer)return renderer;
    if(!surface){
      surface=document.createElement('canvas');
      surface.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer=null;unavailable=true;});
      surface.addEventListener('webglcontextrestored',()=>{renderer=null;unavailable=false;});
    }
    let gl;
    try{
      gl=surface.getContext('webgl',{alpha:true,antialias:true,depth:true,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
    }catch(_){gl=null;}
    if(!gl){unavailable=true;return null;}
    const v=shader(gl,gl.VERTEX_SHADER,vertex),f=shader(gl,gl.FRAGMENT_SHADER,fragment);
    if(!v||!f){if(v)gl.deleteShader(v);if(f)gl.deleteShader(f);unavailable=true;return null;}
    const program=gl.createProgram();
    gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);unavailable=true;return null;}
    const longitude=52,latitude=34,vertices=[],indices=[];
    for(let y=0;y<=latitude;y++){
      const theta=y*Math.PI/latitude;
      for(let x=0;x<=longitude;x++){
        const phi=x*2*Math.PI/longitude;
        vertices.push(Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi));
        if(x<longitude&&y<latitude){
          const a=y*(longitude+1)+x,b=a+longitude+1;
          indices.push(a,a+1,b,a+1,b+1,b);
        }
      }
    }
    const mesh=gl.createBuffer(),faces=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,faces);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    const unit=gl.getAttribLocation(program,'aUnit');
    const names=['uLook','uDent','uPressure','uTime','uRippleTime','uRippleForce','uGlow'];
    const uniforms=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]));
    renderer={gl,program,mesh,faces,unit,uniforms,count:indices.length};
    return renderer;
  }
  let previousGlow,previousRgb=[.57,.79,1];
  function color(glow){
    if(glow===previousGlow)return previousRgb;
    previousGlow=glow;
    const text=typeof glow==='string'?glow.trim():'';
    const hex=text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if(hex){
      const bits=hex[1].length===3?hex[1].replace(/./g,c=>c+c):hex[1];
      previousRgb=[0,2,4].map(offset=>parseInt(bits.slice(offset,offset+2),16)/255);
      return previousRgb;
    }
    const channels=text.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/i);
    previousRgb=channels?channels.slice(1,4).map(value=>clamp(Number(value)/255,0,1)):[.57,.79,1];
    return previousRgb;
  }
  function draw(canvas,{glow,angleX,angleY,dentX,dentY,pressure,time,rippleTime,rippleForce}={}){
    if(!canvas||canvas.width<=0||canvas.height<=0)return false;
    try{
      const stage=setup();if(!stage)return false;
      const out=canvas.getContext('2d');if(!out)return false;
      const {gl,program,mesh,faces,unit,uniforms,count}=stage;
      if(gl.isContextLost())return false;
      const limit=Math.min(1,272/Math.max(canvas.width,canvas.height));
      const width=Math.max(1,Math.round(canvas.width*limit)),height=Math.max(1,Math.round(canvas.height*limit));
      if(surface.width!==width)surface.width=width;if(surface.height!==height)surface.height=height;
      gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clearDepth(1);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh);gl.enableVertexAttribArray(unit);gl.vertexAttribPointer(unit,3,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,faces);
      gl.uniform2f(uniforms.uLook,clamp(finite(angleX),-1,1),clamp(finite(angleY),-1,1));
      gl.uniform2f(uniforms.uDent,clamp(finite(dentX),-1,1),-clamp(finite(dentY,-1),-1,1));
      gl.uniform1f(uniforms.uPressure,clamp(finite(pressure),-1,1));
      gl.uniform1f(uniforms.uTime,finite(time)%160);
      gl.uniform1f(uniforms.uRippleTime,clamp(finite(rippleTime,-1),-1,2));
      gl.uniform1f(uniforms.uRippleForce,clamp(finite(rippleForce),0,1.25));
      gl.uniform3fv(uniforms.uGlow,color(glow));
      gl.drawElements(gl.TRIANGLES,count,gl.UNSIGNED_SHORT,0);
      out.clearRect(0,0,canvas.width,canvas.height);out.drawImage(surface,0,0,canvas.width,canvas.height);
      return true;
    }catch(_){return false;}
  }
  window.exstraNimbThreeV223=Object.freeze({draw});
})();
