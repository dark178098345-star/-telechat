/* One shared WebGL mesh and a refracted view of liquid in microgravity.
 * The caller schedules draws and provides the live backdrop under the alpha surface. */
(() => {
  'use strict';
  const vertex=`
    precision mediump float;
    attribute vec3 aUnit;
    uniform vec2 uLook, uDent, uDrift;
    uniform float uPressure, uTime, uRippleTime, uRippleForce;
    varying vec3 vPoint, vNormal;
    vec3 membrane(vec3 s) {
      float phase=uTime*.0785398163;
      // A weak, rotating quadrupole changes shape without gaining volume.
      vec3 axis=normalize(vec3(cos(phase*5.0+.55),sin(phase*5.0+.55),.42*sin(phase*3.0+.4)));
      float along=dot(s,axis);
      float tension=(along*along-.3333)*(.105+.053*sin(phase*4.0));
      float lobe=.014*sin(s.x*3.2+s.z*2.6+phase*8.0)*cos(s.y*4.0-phase*7.0);
      vec3 p=s*(1.0+tension+lobe);
      p*=vec3(.969,.749,.819);
      p.xy+=uDrift*.036*(.5-dot(s.xy,s.xy));
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
    uniform vec2 uLook, uDent, uDrift;
    uniform float uPressure, uTime;
    varying vec3 vPoint, vNormal;
    const vec3 eye=vec3(0,0,1);
    const vec3 key=vec3(-.46,.72,.52);
    const vec3 fill=vec3(.76,-.45,.47);

    vec4 bead(vec3 ro,vec3 rd,vec3 center,float radius,out float depth) {
      depth=3.0;
      vec3 fromCenter=ro-center;
      float along=dot(fromCenter,rd);
      float h=along*along-dot(fromCenter,fromCenter)+radius*radius;
      if(h<=0.0||along>=0.0)return vec4(0.0);
      depth=max(0.0,-along-sqrt(h));
      vec3 normal=normalize(ro+rd*depth-center);
      float shade=max(0.0,dot(normal,key));
      float rim=pow(1.0-max(0.0,-dot(rd,normal)),2.7);
      float gloss=pow(max(0.0,dot(reflect(rd,normal),key)),15.0);
      float body=.15+shade*.37+rim*.34;
      return vec4(mix(uGlow,vec3(.88,.98,1),body)+gloss*.73, clamp(.22+shade*.3+rim*.41+gloss*.39,0.0,.94));
    }
    float weld(float a,float b) {
      float blend=max(0.0,.166-abs(a-b));
      return min(a,b)-blend*blend*1.506024;
    }
    float water(vec3 p,vec3 a,vec3 b,vec3 c) {
      return weld(weld(length(p-a)-.254,length(p-b)-.197),length(p-c)-.171);
    }
    vec4 floatingWater(vec3 ro,vec3 ray,vec3 center,float phase,out float depth) {
      depth=3.0;
      vec3 a=center+.054*vec3(cos(phase*4.0),sin(phase*5.0),cos(phase*6.0));
      vec3 b=center+.315*vec3(cos(phase*6.0+.26),.67*sin(phase*6.0+.26),.57*sin(phase*7.0+.48));
      vec3 c=center+.283*vec3(cos(phase*5.0+2.95),.73*sin(phase*5.0+2.95),.69*sin(phase*4.0+2.57));
      vec3 offset=ro-center;
      float along=-dot(offset,ray);
      float limit=along*along-dot(offset,offset)+.3869;
      if(limit<=0.0)return vec4(0.0);
      float halfChord=sqrt(limit),at=max(0.0,along-halfChord),exit=along+halfChord;
      if(exit<=0.0)return vec4(0.0);
      // One bounded SDF trace, only for refracted rays that intersect the core's volume.
      for(int i=0;i<11;i++) {
        vec3 p=ro+ray*at;
        float distance=water(p,a,b,c);
        if(distance<.013) {
          depth=at;
          vec3 normal=normalize(vec3(
            water(p+vec3(.012,0,0),a,b,c),
            water(p+vec3(0,.012,0),a,b,c),
            water(p+vec3(0,0,.012),a,b,c)
          )-distance);
          float edge=pow(1.0-max(0.0,-dot(ray,normal)),2.1);
          float shine=pow(max(0.0,dot(reflect(ray,normal),key)),26.0);
          float curl=pow(max(0.0,dot(reflect(ray,normal),fill)),8.0);
          float deep=smoothstep(.004,.114,-water(p+ray*.172,a,b,c));
          float softLight=.27+.48*max(dot(normal,key),0.0)+.25*deep;
          vec3 clearWater=mix(vec3(.26,.29,.57),uGlow,.62+.23*softLight);
          clearWater=mix(clearWater,vec3(.8,.94,1.0),.66*shine+.18*curl);
          return vec4(clearWater,.23+.255*deep+.20*edge+.22*shine);
        }
        at+=max(.015,distance*.93);
        if(at>exit)break;
      }
      return vec4(0.0);
    }
    void main(){
      vec3 n=normalize(vNormal);
      float ndv=max(0.0,dot(n,eye)),grazing=1.0-ndv;
      float fresnel=.028+.972*pow(grazing,3.4);
      vec3 reflected=reflect(-eye,n);
      vec3 ray=refract(-eye,n,.751);
      vec3 ro=vPoint+ray*.016;
      float phase=uTime*.0785398163;
      vec3 pull=vec3(uDrift*.125+vec2(-uLook.x*.079,uLook.y*.063)-uPressure*uDent*.085,0.0);
      vec3 drift=vec3(.081*cos(phase*4.0+.3),.079*sin(phase*5.0+.3),.076*cos(phase*6.0)) +pull;
      vec3 center=vec3(0.0,.008,-.087)+drift;
      vec3 toCore=ro-center;
      float at=max(0.0,-dot(toCore,ray));
      vec3 coreOffset=(toCore+ray*at)*vec3(1.0,1.05,.77);
      float fog=exp(-dot(coreOffset,coreOffset)*6.4)*(1.0-exp(-at*3.8));

      vec3 film=.59+.41*cos(vec3(-.16,.82,2.42)+grazing*6.6+vPoint.x*.7-vPoint.y*.85);
      vec3 tint=mix(vec3(.38,.31,.66),uGlow,.47);
      vec3 glass=mix(tint,film,.31+fresnel*.56);
      glass=mix(glass,uGlow,.43*fog);
      glass+=uGlow*fog*vec3(.12,.19,.24);
      float alpha=.097+.102*fog+.68*fresnel;
      float poolDepth,d0,d1,d2,d3;
      vec4 pool=floatingWater(ro,ray,center,phase,poolDepth);
      // Independently inclined and phased ellipses: the drops orbit on different planes.
      float orbit0=phase*7.0+.54,orbit1=phase*9.0+2.78,orbit2=phase*6.0+4.34,orbit3=phase*11.0+1.72;
      vec4 a=bead(ro,ray,vec3(.51*cos(orbit0),.36*sin(orbit0),-.24+.26*sin(orbit0))+pull*.42,.087,d0);
      vec4 b=bead(ro,ray,vec3(.53*cos(orbit1),.30*sin(orbit1)+.088*cos(orbit1),.32*sin(orbit1)+.096)+pull*.68,.105,d1);
      vec4 c=bead(ro,ray,vec3(.58*cos(orbit2),.353*sin(orbit2),-.125+.24*cos(orbit2))+pull*.53,.072,d2);
      vec4 d=bead(ro,ray,vec3(.43*sin(orbit3),.390*cos(orbit3),.30*cos(orbit3))+pull*.81,.055,d3);
      vec4 droplets=a;
      float nearest=d0;
      if(d1<nearest){nearest=d1;droplets=b;}
      if(d2<nearest){nearest=d2;droplets=c;}
      if(d3<nearest){nearest=d3;droplets=d;}
      if(nearest<poolDepth) {
        glass=mix(glass,pool.rgb,pool.a);
        glass=mix(glass,droplets.rgb,droplets.a*.86);
      } else {
        glass=mix(glass,droplets.rgb,droplets.a*.76);
        glass=mix(glass,pool.rgb,pool.a);
      }
      alpha+=.42*pool.a+.49*droplets.a;

      float top=pow(max(0.0,dot(reflected,key)),9.0)*.31;
      vec3 streak=reflected-key;
      float strip=exp(-streak.y*streak.y*165.0-streak.x*streak.x*14.0-streak.z*streak.z*20.0)*.65;
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
    const names=['uLook','uDent','uDrift','uPressure','uTime','uRippleTime','uRippleForce','uGlow'];
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
  function draw(canvas,{glow,angleX,angleY,dentX,dentY,pressure,time,rippleTime,rippleForce,driftX,driftY}={}){
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
      gl.uniform2f(uniforms.uDrift,clamp(finite(driftX),-1,1),-clamp(finite(driftY),-1,1));
      gl.uniform1f(uniforms.uPressure,clamp(finite(pressure),-1,1));
      gl.uniform1f(uniforms.uTime,finite(time)%80);
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
