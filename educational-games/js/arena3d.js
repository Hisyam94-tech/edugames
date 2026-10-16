import * as THREE from '../vendor/three.module.min.js?v=e2b5ee6bccd3';
import { ModelFactory } from './models3d.js?v=a22482fe7194';

const THEMES = [
  { sky: '#c6dccc', fog: '#c6dccc', ground: '#6f8b60', stone: '#a3aa8d', trim: '#d9c89e', leaf: '#5c875e' },
  { sky: '#e1ccab', fog: '#e1ccab', ground: '#8b8254', stone: '#aa9d7e', trim: '#e9bd6b', leaf: '#c1904c' },
  { sky: '#3d465e', fog: '#3d465e', ground: '#535a70', stone: '#7b8094', trim: '#b7a8e9', leaf: '#9d87cd' },
  { sky: '#c2d9e6', fog: '#c2d9e6', ground: '#91a8ad', stone: '#b4bec1', trim: '#dfe8dc', leaf: '#d4e5e5' },
  { sky: '#515163', fog: '#515163', ground: '#5e6570', stone: '#7c7c83', trim: '#debd70', leaf: '#786783' }
];
export class Arena3D {
  constructor(host, onError) {
    this.host = host; this.onError = onError;
    this.factory = new ModelFactory();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, .1, 70);
    this.cameraState = { angle: .12, zoom: 0, shake: 0 };
    this.enabled = true; this.active = false; this.inView = true;
    this.tweens = new Set(); this.effects = new Set(); this.labels = new Set();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', '3D battle arena. Use the camera buttons to rotate the view.');
    this.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); this.failed = true; this.finishTweens(); this.renderer.setAnimationLoop(null);
      onError('The 3D graphics connection was lost. Reload the game to reconnect.');
    });
    host.append(this.canvas);
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'labels-3d'; this.labelLayer.setAttribute('aria-hidden', 'true'); host.append(this.labelLayer);
    this.scene.add(new THREE.HemisphereLight(0xf4efd7, 0x5d7666, 2.4));
    this.sun = new THREE.DirectionalLight(0xffefd2, 3.1);
    this.sun.position.set(-3, 8, 5); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -6, right: 6, top: 5, bottom: -5, near: .5, far: 20 });
    this.sun.shadow.normalBias = .035;
    this.scene.add(this.sun);
    const rim = new THREE.DirectionalLight(0xc7dffc, 1.1); rim.position.set(4, 4, -5); this.scene.add(rim);
    this.frame = this.frame.bind(this);
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(host);
    this.visibilityObserver = new IntersectionObserver(() => this.refreshVisibility()); this.visibilityObserver.observe(host);
    this.onVisibility = () => { if (document.hidden) this.finishTweens(); this.wake(); };
    document.addEventListener('visibilitychange', this.onVisibility);
    let drag = null;
    this.canvas.addEventListener('pointerdown', event => {
      drag = { x: event.clientX, angle: this.cameraState.angle };
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', event => {
      if (!drag) return;
      this.cameraState.angle = THREE.MathUtils.clamp(drag.angle + (event.clientX - drag.x) * .004, -.65, .65);
      this.render();
    });
    this.canvas.addEventListener('pointerup', () => { drag = null; });
    this.canvas.addEventListener('pointercancel', () => { drag = null; });
    this.resize();
  }
  refreshVisibility() {
    const rect = this.host.getBoundingClientRect();
    this.inView = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
    if (!this.inView) this.finishTweens();
    this.wake();
  }
  setMotion(enabled) {
    this.enabled = enabled;
    if (!enabled) this.finishTweens();
    this.wake();
  }
  setActive(active) {
    this.active = active;
    if (!active) this.finishTweens();
    this.resize(); this.wake();
  }
  rotate(amount) { this.cameraState.angle = THREE.MathUtils.clamp(this.cameraState.angle + amount, -.65, .65); this.render(); }
  resetCamera() { this.cameraState.angle = .12; this.render(); }
  resize() {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (!width || !height) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 600 ? 1.25 : 1.5));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    this.renderer.shadowMap.needsUpdate = true; this.render();
  }
  setBattle(warrior, stage, hp, enemyHp) {
    if (!this.player || this.player.id !== warrior.id) {
      if (this.player) this.scene.remove(this.player.root);
      this.player = this.factory.warrior(warrior);
      this.player.homeX = -1.9; this.player.facing = 1.05; this.scene.add(this.player.root);
    }
    if (!this.enemy || this.enemy.id !== `guardian-${stage.id}`) {
      if (this.enemy) this.scene.remove(this.enemy.root);
      this.enemy = this.factory.guardian(stage);
      this.enemy.homeX = 1.9; this.enemy.facing = -1.05; this.scene.add(this.enemy.root);
      this.buildStage(stage);
    }
    this.resetActor(this.player, hp === 0); this.resetActor(this.enemy, enemyHp === 0);
    this.canvas.setAttribute('aria-label', `${warrior.name}, ${warrior.animal} warrior, facing ${stage.enemy} in the 3D ${stage.name} arena.`);
    this.host.dataset.scene = `${warrior.id}-${stage.id}`;
    this.renderer.shadowMap.needsUpdate = true; this.render();
  }
  resetActor(actor, defeated = false) {
    Object.assign(actor.pose, this.factory.neutral());
    actor.defeated = defeated;
    if (defeated) { actor.pose.fall = actor.homeX > 0 ? -1.2 : 1.2; actor.pose.y = .12; actor.pose.armL = -.5; }
  }
  buildStage(stage) {
    if (this.environment) this.scene.remove(this.environment);
    const f = this.factory, theme = THEMES[stage.id - 1];
    this.scene.background = new THREE.Color(theme.sky);
    this.scene.fog = new THREE.Fog(theme.fog, 19, 40);
    const environment = new THREE.Group(); this.environment = environment; this.scene.add(environment);
    const floor = f.mesh(environment, 'cylinder', theme.ground, [0, -.58, 0], [6.5, .8, 6.5]); floor.castShadow = false;
    f.mesh(environment, 'cylinder', theme.stone, [0, -.15, 0], [4.9, .32, 4.1]);
    f.mesh(environment, 'cylinder', theme.trim, [0, -.035, 0], [4.88, .05, 4.08]);
    f.mesh(environment, 'cylinder', theme.stone, [0, .005, 0], [4.68, .045, 3.88]);
    for (const radius of [1.25, 3.35]) f.mesh(environment, 'ring', theme.trim, [0, .035, 0], [radius, radius, radius], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      f.mesh(environment, 'box', theme.trim, [Math.cos(angle) * 4.3, .05, Math.sin(angle) * 3.5], [.32, .06, .2], [0, -angle, 0]);
    }
    for (let i = 0; i < 7; i++) {
      const angle = Math.PI + i * Math.PI / 6;
      const x = Math.cos(angle) * 6.1, z = Math.sin(angle) * 5.5 - 1;
      if (stage.id <= 2) {
        f.mesh(environment, 'cylinder', '#7a6247', [x, .55, z], [.18, 1.45, .18]);
        f.mesh(environment, 'cone', theme.leaf, [x, 1.65, z], [.95, 2.4, .95]);
        f.mesh(environment, 'cone', theme.leaf, [x, 2.65, z], [.65, 1.8, .65]);
      } else if (stage.id === 3) {
        f.mesh(environment, 'cone', theme.leaf, [x, .75, z], [.5, 2.7, .5], [0, 0, (i % 2 ? 1 : -1) * .2], true);
        f.mesh(environment, 'cone', '#8ba8cd', [x + .4, .3, z + .25], [.35, 1.6, .35], [0, 0, -.2]);
      } else {
        f.mesh(environment, 'cylinder', theme.stone, [x, .85, z], [.36, 2.2, .36]);
        f.mesh(environment, 'box', theme.trim, [x, 2, z], [.85, .22, .85]);
        if (stage.id === 5) f.mesh(environment, 'cone', '#735e70', [x, 2.6, z], [.62, 1.2, .62]);
        else f.mesh(environment, 'ball', '#edf1e9', [x, -.1, z], [1.3, .35, .75]);
      }
    }
    if (stage.id === 5) {
      for (const x of [-1.8, 1.8]) f.mesh(environment, 'box', '#64616b', [x, 1.65, -5.2], [.65, 3.7, .7]);
      f.mesh(environment, 'box', '#b6a77b', [0, 3.4, -5.2], [4.3, .5, .8]);
    }
    // Background props receive shadows but do not multiply the shadow render cost.
    environment.traverse(node => { if (node.isMesh) node.castShadow = false; });
    this.renderer.shadowMap.needsUpdate = true;
  }
  wake() {
    if (this.failed) return;
    const live = this.active && this.inView && !document.hidden && this.enabled;
    this.renderer.setAnimationLoop(live ? this.frame : null);
    if (!live) this.render();
  }
  frame(time) {
    const interval = this.host.clientWidth < 600 ? 1000 / 30 : 1000 / 60;
    if (time - (this.lastFrame || 0) < interval - 1) return;
    this.lastFrame = time;
    for (const tween of [...this.tweens]) {
      const t = Math.min(1, (time - tween.start) / tween.duration);
      tween.apply(t);
      if (t === 1) { this.tweens.delete(tween); tween.resolve(); }
    }
    this.render(time / 1000);
  }
  render(time = performance.now() / 1000) {
    if (this.failed || !this.host.clientWidth || !this.host.clientHeight) return;
    const idle = this.enabled && this.active && this.tweens.size === 0;
    if (this.player) this.factory.apply(this.player, time, idle);
    if (this.enemy) this.factory.apply(this.enemy, time + 1.4, idle);
    const aspect = this.camera.aspect;
    const distance = 11.7 * Math.max(1, 1.12 / aspect) - this.cameraState.zoom;
    const angle = this.cameraState.angle;
    this.camera.position.set(Math.sin(angle) * distance + this.cameraState.shake, 5.8, Math.cos(angle) * distance);
    this.camera.lookAt(0, 1.3, 0);
    this.camera.updateMatrixWorld();
    for (const label of this.labels) {
      const point = label.position.clone().project(this.camera);
      label.node.style.left = `${(point.x * .5 + .5) * this.host.clientWidth}px`;
      label.node.style.top = `${(-point.y * .5 + .5) * this.host.clientHeight}px`;
    }
    if (this.tweens.size) this.renderer.shadowMap.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }
  tween(object, target, duration, update = () => {}) {
    if (this.failed || !this.enabled || !this.active || !this.inView || document.hidden) {
      Object.assign(object, target); update(1); this.render(); return Promise.resolve();
    }
    const from = Object.fromEntries(Object.keys(target).map(key => [key, object[key]]));
    return new Promise(resolve => {
      const apply = t => {
        const eased = t * t * (3 - 2 * t);
        for (const key of Object.keys(target)) object[key] = from[key] + (target[key] - from[key]) * eased;
        update(t);
      };
      this.tweens.add({ start: performance.now(), duration, apply, resolve }); this.wake();
    });
  }
  finishTweens() {
    for (const tween of [...this.tweens]) { tween.apply(1); this.tweens.delete(tween); tween.resolve(); }
  }
  point(actor, height = 1.65) { return new THREE.Vector3(actor.homeX + actor.pose.x, height + actor.pose.y, actor.pose.z); }
  effectGroup() { const group = new THREE.Group(); this.scene.add(group); this.effects.add(group); return group; }
  fxMesh(group, shape, color, scale) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false });
    const mesh = new THREE.Mesh(this.factory.geometries[shape], material); mesh.scale.set(...scale); group.add(mesh); return mesh;
  }
  removeEffect(group) { group.traverse(node => { if (node.isMesh) node.material.dispose(); }); this.scene.remove(group); this.effects.delete(group); }
  async burst(actor, color, kind = 'impact') {
    if (!this.enabled) return;
    const group = this.effectGroup(); group.position.copy(this.point(actor));
    const ring = this.fxMesh(group, 'ring', color, [.3, .3, .3]); ring.rotation.y = this.cameraState.angle;
    const particles = [];
    const count = kind === 'claw' ? 3 : 8;
    for (let i = 0; i < count; i++) {
      const mesh = this.fxMesh(group, kind === 'claw' ? 'box' : 'rock', color, kind === 'claw' ? [.04, .65, .04] : [.065, .065, .065]);
      particles.push(mesh);
    }
    const progress = { t: 0 };
    try {
      await this.tween(progress, { t: 1 }, 430, () => {
        ring.scale.setScalar(.2 + progress.t * 1.3); ring.material.opacity = 1 - progress.t;
        particles.forEach((mesh, i) => {
          const a = i * Math.PI * 2 / count;
          mesh.position.set(Math.cos(a) * progress.t * 1.1, Math.sin(a) * progress.t * .9, Math.sin(i * 2) * progress.t * .4);
          mesh.rotation.z = kind === 'claw' ? -.6 : progress.t * 4;
          mesh.material.opacity = 1 - progress.t;
        });
      });
    } finally { this.removeEffect(group); }
  }
  async label(actor, text, color = '#fff1c8', offset = 0) {
    if (!this.enabled) return;
    const node = document.createElement('span'); node.className = 'damage-3d'; node.textContent = text; node.style.color = color;
    this.labelLayer.append(node);
    const label = { node, position: this.point(actor, 2.65 + offset) }; this.labels.add(label);
    const progress = { t: 0 };
    try {
      await this.tween(progress, { t: 1 }, 650, () => { label.position.y = 2.65 + offset + progress.t * .7; node.style.opacity = String(1 - Math.max(0, (progress.t - .6) / .4)); });
    } finally { node.remove(); this.labels.delete(label); }
  }
  async projectile(from, to, color, kind) {
    if (!this.enabled) return;
    const group = this.effectGroup(); group.position.copy(this.point(from));
    this.fxMesh(group, 'rock', color, [.24, .24, .24]);
    const ring = this.fxMesh(group, 'ring', color, [.4, .4, .4]);
    if (kind === 'wave') ring.scale.set(1, .35, .5);
    const end = this.point(to);
    try { await this.tween(group.position, { x: end.x, y: end.y, z: end.z }, 400, t => { ring.rotation.x = t * 6; ring.rotation.y = t * 8; }); }
    finally { this.removeEffect(group); }
  }
  shield(actor, color) {
    if (!this.enabled) return null;
    const group = this.effectGroup(); group.position.copy(this.point(actor));
    const shell = this.fxMesh(group, 'ball', color, [.9, 1.15, .65]); shell.material.opacity = .18;
    const ring = this.fxMesh(group, 'ring', color, [.85, 1.1, .85]); ring.rotation.y = actor.facing;
    this.render(); return group;
  }
  async impact(actor, direction, guarded = false) {
    const x = actor.pose.x;
    await this.tween(actor.pose, { x: x + direction * (guarded ? .07 : .17), lean: -.14 }, 100);
    await this.tween(actor.pose, { x, lean: 0 }, 170);
  }
  async cameraHit() {
    if (!this.enabled) return;
    await this.tween(this.cameraState, { shake: .045 }, 80);
    await this.tween(this.cameraState, { shake: 0 }, 110);
  }
  clearEffects() {
    [...this.effects].forEach(group => this.removeEffect(group));
    this.labels.forEach(label => label.node.remove()); this.labels.clear();
  }
  dispose() {
    this.finishTweens(); this.clearEffects(); this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect(); this.visibilityObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.factory.dispose(); this.renderer.dispose(); this.canvas.remove(); this.labelLayer.remove();
  }
}
