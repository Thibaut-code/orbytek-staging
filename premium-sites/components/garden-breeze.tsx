"use client";
import { useEffect, useRef } from "react";

// Displace only the pond and soft vegetation in the original photograph.
// Coordinates stay in image space, so the masks follow object-fit on mobile.
const fragment = `
precision mediump float;
uniform sampler2D photo;
uniform float time;
varying vec2 uv;
float patch(vec2 p, vec2 center, vec2 radius) {
  return 1.0 - smoothstep(0.25, 1.0, length((p-center)/radius));
}
void main() {
  vec2 p = vec2(uv.x, 1.0-uv.y);
  // Keep the stone coping, terrace and planted banks still.
  float pond = smoothstep(0.625,0.65,p.y)
    * smoothstep(0.63,0.68,p.x)
    * smoothstep(0.0,0.018,p.y-(0.627+max(p.x-0.77,0.0)*0.39))
    * (1.0-smoothstep(-0.02,0.0,p.y-(0.76+max(p.x-0.66,0.0)*0.39)));
  float leaves = max(patch(p,vec2(0.17,0.13),vec2(0.25,0.22)),
                     patch(p,vec2(0.53,0.10),vec2(0.18,0.15)));
  leaves = max(leaves,patch(p,vec2(0.96,0.09),vec2(0.13,0.15)));
  float grasses = max(patch(p,vec2(0.25,0.85),vec2(0.25,0.22)),
                      patch(p,vec2(0.52,0.65),vec2(0.12,0.15)));
  grasses = max(grasses,patch(p,vec2(0.92,0.59),vec2(0.12,0.07)));
  float breeze = sin(time*0.85)+0.35*sin(time*1.43+1.0);
  vec2 offset = vec2(
    pond*(sin(p.y*240.0-time*1.9)*0.0018+sin(p.y*119.0+time*1.1)*0.0009),
    pond*sin(p.x*95.0+p.y*130.0-time*1.4)*0.0007
  );
  offset.x += (leaves*0.0012+grasses*0.0022)*breeze*sin(p.y*19.0+p.x*11.0+time*0.35);
  offset.y += leaves*0.00045*sin(time*1.1+p.x*16.0);
  vec2 sampleAt = clamp(p+offset,vec2(0.001),vec2(0.999));
  gl_FragColor = texture2D(photo,vec2(sampleAt.x,1.0-sampleAt.y));
}`;

export function GardenBreeze({ paused }: { paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clock = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false });
    if (!gl) return; // The original responsive image remains underneath.
    let frame = 0;
    let ready = false;
    let visible = true;
    let disposed = false;
    let previous = 0;
    const shaders: WebGLShader[] = [];
    const compile = (type: number, code: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      shaders.push(shader);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vertex = compile(gl.VERTEX_SHADER, "attribute vec2 position; varying vec2 uv; void main(){uv=(position+1.0)*0.5;gl_Position=vec4(position,0.0,1.0);}");
    const pixel = compile(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (!vertex || !pixel || !program) {
      shaders.forEach(shader => gl.deleteShader(shader));
      if (program) gl.deleteProgram(program);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, pixel);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      shaders.forEach(shader => gl.deleteShader(shader));
      gl.deleteProgram(program);
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const time = gl.getUniformLocation(program, "time");
    const draw = (now: number) => {
      frame = 0;
      if (!ready || disposed || reduced.matches || !visible || document.hidden) return;
      // Cap at 30 fps and avoid a jump after leaving the viewport.
      if (!previous || now-previous >= 1000/30) {
        if (!paused && previous) clock.current += Math.min(now-previous, 80)/1000;
        previous = now;
        gl.uniform1f(time, clock.current);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        canvas.dataset.ready = "true";
      }
      if (!paused) frame = requestAnimationFrame(draw);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (reduced.matches) delete canvas.dataset.ready;
      if (ready && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(draw);
    };
    const image = new Image();
    image.onload = () => {
      if (disposed) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      ready = true;
      sync();
    };
    image.src = `/demos/images/garden-vision-${matchMedia("(max-width: 640px)").matches ? 960 : 1280}.webp`;
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    });
    observer.observe(canvas);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    const lost = (event: Event) => {
      event.preventDefault();
      ready = false;
      cancelAnimationFrame(frame);
      delete canvas.dataset.ready;
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("webglcontextlost", lost);
      delete canvas.dataset.ready;
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      shaders.forEach(shader => gl.deleteShader(shader));
      gl.deleteProgram(program);
    };
  }, [paused]);
  return <canvas ref={canvasRef} className="garden-breeze" aria-hidden="true" />;
}
