import * as THREE from 'three';
import { createCassette } from './cassette/cassette.js';
import { createEnvironments } from './cassette/env.js';

export function initMusicCassette(host, initialTrack) {
  const noop = { update() {}, setActive() {}, destroy() {} };
  if (!host) return noop;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { host.textContent = '当前浏览器无法展示三维磁带'; return noop; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  const environments = createEnvironments(renderer);
  scene.environment = environments.studio;
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  const labelOptions = track => ({ title: '', labelTitle: track?.name || '', titleLimit: 36, artist: '', album: '', minutes: '90' });
  const model = createCassette(labelOptions(initialTrack));
  model.update(0);
  const pivot = new THREE.Group();
  // The source model lies in X/Z. Turn its printed face toward the viewer.
  model.root.rotation.x = Math.PI / 2;
  pivot.add(model.root); scene.add(pivot);
  scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x776754, 1.5));
  const key = new THREE.DirectionalLight(0xfff4df, 2.2); key.position.set(-5, 7, 9); scene.add(key);
  const fill = new THREE.DirectionalLight(0xadc9ef, 1.4); fill.position.set(7, 0, 5); scene.add(fill);
  let destroyed = false, visible = false, frame = 0, currentTrack = initialTrack;
  let yaw = -.18, pitch = -.12, drag = null, last = 0;
  const abort = new AbortController();
  const listen = (type, fn) => host.addEventListener(type, fn, { signal: abort.signal });
  function update(track) {
    if (!track || destroyed || (track.id === currentTrack?.id && track.name === currentTrack?.name)) return;
    currentTrack = track;
    const { old } = model.setLabel(labelOptions(track));
    model.commitLabel(); model.warmLabel(false);
    old.forEach(texture => texture.dispose());
    model.st.playing = false;
    model.setProgress(0); model.update(0); draw();
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    camera.aspect = Math.max(1, width) / Math.max(1, height);
    // Fit a bounding sphere, so all rotations remain inside the drawing area.
    const limitingFov = Math.min(THREE.MathUtils.degToRad(camera.fov), 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    const distance = 6.3 / Math.sin(limitingFov / 2);
    camera.position.set(0, 0, distance); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); draw();
  }
  function draw() { if (!destroyed) { pivot.rotation.set(pitch, yaw, -.08); renderer.render(scene, camera); } }
  const observer = new ResizeObserver(resize); observer.observe(host); resize(); update(initialTrack);
  listen('pointerdown', event => { if (event.button !== 0) return; drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch }; host.setPointerCapture(event.pointerId); host.classList.add('is-dragging'); });
  listen('pointermove', event => { if (!drag || event.pointerId !== drag.id) return; yaw = drag.yaw + (event.clientX - drag.x) * .01; pitch = drag.pitch + (event.clientY - drag.y) * .01; draw(); });
  const end = () => { drag = null; host.classList.remove('is-dragging'); };
  listen('pointerup', end); listen('pointercancel', end); listen('lostpointercapture', end);
  function animate(now) {
    if (destroyed || !visible) return;
    const dt = Math.min((now - (last || now)) / 1000, .04); last = now;
    const audio = document.querySelector('#music-audio');
    const matching = audio?.dataset.track === currentTrack?.id;
    model.st.playing = Boolean(matching && !audio.paused && !audio.ended && audio.readyState >= 2);
    // The audio clock drives both hubs and tape packs, including paused seeks.
    if (matching && Number.isFinite(audio.duration) && audio.duration > 0) model.setProgress(audio.currentTime / audio.duration);
    model.update(dt); draw(); frame = requestAnimationFrame(animate);
  }
  return { update,
    setActive(value) { visible = value; cancelAnimationFrame(frame); last = 0; if (visible) { resize(); frame = requestAnimationFrame(animate); } },
    destroy() {
      destroyed = true; abort.abort(); observer.disconnect(); cancelAnimationFrame(frame);
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); for (const material of (Array.isArray(object.material) ? object.material : [object.material])) if (material) materials.add(material); });
      Object.values(model.materials).forEach(item => { if (item.isTexture) textures.add(item); else if (item.isMaterial) materials.add(item); });
      model.headMaterials.forEach(item => materials.add(item));
      materials.forEach(material => { Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); }); material.dispose(); });
      geometries.forEach(item => item.dispose()); textures.forEach(item => item.dispose()); Object.values(environments).forEach(item => item.dispose());
      renderer.dispose(); host.replaceChildren();
    }
  };
}
