import * as THREE from '../vendor/three.module.min.js?v=e2b5ee6bccd3';

// Shared low-poly geometry/materials keep GPU allocations bounded across retries.
export class ModelFactory {
  constructor() {
    this.geometries = {
      box: new THREE.BoxGeometry(1, 1, 1),
      ball: new THREE.SphereGeometry(1, 10, 8),
      rock: new THREE.IcosahedronGeometry(1, 0),
      cone: new THREE.ConeGeometry(1, 1, 8),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
      ring: new THREE.TorusGeometry(1, .035, 5, 48)
    };
    this.materials = new Map();
  }
  material(color, glow = false) {
    const key = `${color}:${glow}`;
    if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({
      color, flatShading: true, roughness: .8, metalness: .12,
      emissive: glow ? color : 0x000000, emissiveIntensity: glow ? .65 : 0
    }));
    return this.materials.get(key);
  }
  mesh(parent, shape, color, xyz, scale, rotation = [0, 0, 0], glow = false) {
    const mesh = new THREE.Mesh(this.geometries[shape], this.material(color, glow));
    mesh.position.set(...xyz); mesh.scale.set(...scale); mesh.rotation.set(...rotation);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
    return mesh;
  }
  group(parent, xyz = [0, 0, 0]) {
    const group = new THREE.Group(); group.position.set(...xyz); parent.add(group); return group;
  }
  rig(color, guardian = false) {
    const root = new THREE.Group();
    const torso = this.group(root, [0, 1.35, 0]);
    const metal = guardian ? '#526967' : '#334b49';
    this.mesh(torso, 'box', metal, [0, 0, 0], [1.02, .92, .63]);
    this.mesh(torso, 'box', color, [0, .06, .34], [.72, .65, .11]);
    this.mesh(torso, 'rock', '#f3d789', [0, .13, .44], [.15, .18, .07]);
    this.mesh(torso, 'box', '#243a35', [0, -.39, .02], [1.06, .15, .7]);
    this.mesh(torso, 'box', '#dcb970', [0, -.39, .41], [.21, .2, .08]);
    const head = this.group(torso, [0, .98, 0]);
    const leftArm = this.group(torso, [-.67, .32, 0]);
    const rightArm = this.group(torso, [.67, .32, 0]);
    const elbows = [];
    for (const arm of [leftArm, rightArm]) {
      this.mesh(arm, 'rock', color, [0, -.07, 0], [.29, .29, .31]);
      this.mesh(arm, 'box', metal, [0, -.31, 0], [.29, .39, .3]);
      const elbow = this.group(arm, [0, -.5, 0]);
      this.mesh(elbow, 'box', guardian ? color : '#91a594', [0, -.14, 0], [.29, .35, .32]);
      this.mesh(elbow, 'ball', guardian ? metal : '#c3b393', [0, -.36, .02], [.19, .18, .19]);
      elbows.push(elbow);
    }
    const leftLeg = this.group(root, [-.27, .94, 0]);
    const rightLeg = this.group(root, [.27, .94, 0]);
    for (const leg of [leftLeg, rightLeg]) {
      this.mesh(leg, 'box', metal, [0, -.27, 0], [.38, .54, .39]);
      this.mesh(leg, 'rock', color, [0, -.32, .23], [.18, .2, .1]);
      this.mesh(leg, 'box', guardian ? color : '#273a36', [0, -.73, .14], [.43, .3, .64]);
    }
    const weapon = this.group(elbows[1], [0, -.35, .12]);
    if (guardian) {
      this.mesh(weapon, 'rock', color, [0, .01, 0], [.38, .35, .38]);
    } else {
      this.mesh(weapon, 'cylinder', '#79563d', [0, .1, 0], [.075, .3, .075]);
      this.mesh(weapon, 'box', '#e7c77c', [0, .26, 0], [.48, .1, .15]);
      this.mesh(weapon, 'box', '#e0e9e3', [0, .72, 0], [.16, .85, .055]);
      this.mesh(weapon, 'cone', '#f4f6db', [0, 1.21, 0], [.09, .2, .04]);
      this.mesh(weapon, 'rock', '#efcc72', [0, -.06, 0], [.1, .1, .1]);
    }
    const shield = this.group(elbows[0], [0, -.26, .18]);
    if (!guardian) {
      this.mesh(shield, 'cylinder', '#e7cc89', [0, 0, .03], [.4, .12, .47], [Math.PI / 2, 0, 0]);
      this.mesh(shield, 'cylinder', color, [0, 0, .11], [.34, .09, .4], [Math.PI / 2, 0, 0]);
      this.mesh(shield, 'rock', '#f1dfa8', [0, 0, .2], [.13, .2, .07]);
    }
    const tail = this.group(torso, [0, -.25, -.34]);
    return { root, torso, head, leftArm, rightArm, leftElbow: elbows[0], rightElbow: elbows[1], leftLeg, rightLeg, weapon, shield, tail,
      pose: this.neutral(), homeX: 0, facing: 0, defeated: false };
  }
  neutral() { return { x: 0, y: 0, z: 0, turn: 0, lean: 0, twist: 0, armL: -.15, armR: -.2, elbowL: -.12, elbowR: -.1, legL: 0, legR: 0, head: 0, tail: 0, fall: 0 }; }
  warrior(warrior) {
    const rig = this.rig(warrior.color);
    const { head, tail } = rig;
    const colors = { lion: '#e4ae58', tiger: '#ef9549', wolf: '#a4b4bd', bear: '#926545', fox: '#de8244', eagle: '#efe9d7', panther: '#353449', rhino: '#94a5a4', crocodile: '#6fa366', rabbit: '#dfd8cd' };
    const fur = colors[warrior.id];
    const dark = '#27312e', cream = warrior.id === 'panther' ? '#746b83' : '#f0d8ae';
    if (warrior.id === 'lion') {
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        this.mesh(head, 'rock', i % 2 ? '#a86b32' : '#b47a37', [Math.cos(a) * .56, Math.sin(a) * .55, -.08], [.27, .28, .26]);
      }
    }
    this.mesh(head, 'ball', fur, [0, 0, 0], warrior.id === 'rhino' ? [.62, .53, .55] : [.54, .53, .47]);
    const pointed = ['wolf', 'fox', 'panther'].includes(warrior.id);
    for (const side of [-1, 1]) {
      if (warrior.id === 'rabbit') {
        this.mesh(head, 'ball', fur, [side * .27, .78, 0], [.17, .64, .16], [0, 0, side * -.13]);
        this.mesh(head, 'ball', '#d999a6', [side * .27, .79, .14], [.085, .44, .025], [0, 0, side * -.13]);
      } else if (warrior.id !== 'eagle' && warrior.id !== 'crocodile') {
        this.mesh(head, pointed ? 'cone' : 'ball', fur, [side * .42, .43, 0], pointed ? [.22, .54, .18] : [.2, .23, .15], [0, 0, side * -.15]);
        this.mesh(head, pointed ? 'cone' : 'ball', cream, [side * .42, .46, .13], pointed ? [.11, .3, .035] : [.11, .13, .035], [0, 0, side * -.15]);
      }
    }
    if (warrior.id === 'eagle') {
      this.mesh(head, 'cone', '#eab74b', [0, -.08, .58], [.21, .54, .2], [Math.PI / 2, 0, 0]);
      for (const arm of [rig.leftArm, rig.rightArm]) for (let i = 0; i < 3; i++) {
        this.mesh(arm, 'box', i % 2 ? '#9d7c51' : '#c7b188', [0, -.2 - i * .13, -.2 - i * .06], [.46, .55, .12], [-.4, 0, .1]);
      }
    } else if (warrior.id === 'crocodile') {
      this.mesh(head, 'box', '#8db873', [0, -.15, .58], [.72, .3, .9]);
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) this.mesh(head, 'cone', '#eee4c2', [side * .3, -.33, .43 + i * .18], [.055, .15, .055], [Math.PI, 0, 0]);
      for (let i = 0; i < 4; i++) this.mesh(head, 'cone', '#487749', [0, .5 - i * .05, .08 - i * .2], [.12, .22, .12]);
    } else {
      const long = ['wolf', 'fox', 'rhino'].includes(warrior.id);
      for (const side of [-1, 1]) this.mesh(head, 'ball', cream, [side * .16, -.17, long ? .47 : .39], [.24, .2, long ? .34 : .21]);
      this.mesh(head, 'ball', dark, [0, -.1, long ? .76 : .59], [.13, .1, .09]);
      if (warrior.id === 'rhino') this.mesh(head, 'cone', '#e8dec6', [0, .13, .59], [.16, .66, .17], [.35, 0, 0]);
      if (warrior.id === 'rabbit') for (const side of [-1, 1]) this.mesh(head, 'box', '#fff8df', [side * .065, -.33, .55], [.09, .14, .04]);
    }
    for (const side of [-1, 1]) {
      const eyeY = warrior.id === 'crocodile' ? .23 : .09;
      this.mesh(head, 'ball', warrior.id === 'panther' ? '#f4d56d' : '#f5edce', [side * .23, eyeY, .41], [.115, .14, .075]);
      this.mesh(head, 'ball', '#1e2a27', [side * .23, eyeY, .48], [.045, .075, .033]);
      this.mesh(head, 'box', warrior.id === 'eagle' ? '#7c694b' : fur, [side * .23, eyeY + .13, .45], [.23, .065, .08], [0, 0, side * .17]);
    }
    if (warrior.id === 'tiger') for (const side of [-1, 1]) for (let i = 0; i < 3; i++) this.mesh(head, 'box', '#49382b', [side * .45, .22 - i * .17, .23], [.13, .055, .25], [0, side * .5, side * -.25]);
    if (warrior.id === 'rabbit') this.mesh(tail, 'ball', '#eee7db', [0, 0, -.12], [.22, .22, .22]);
    else if (warrior.id !== 'eagle' && warrior.id !== 'rhino' && warrior.id !== 'bear') {
      const fluffy = ['fox', 'wolf'].includes(warrior.id);
      this.mesh(tail, 'cone', fur, [0, -.05, -.45], [fluffy ? .27 : .13, 1, fluffy ? .25 : .12], [-Math.PI / 2 - .35, 0, 0]);
      this.mesh(tail, 'ball', warrior.id === 'lion' ? '#9e652f' : cream, [0, -.22, -.83], [fluffy ? .19 : .12, .17, .22]);
    }
    // Short cape behind the armour, separate from the moving head and limbs.
    this.mesh(rig.torso, 'box', warrior.color, [0, -.09, -.45], [.88, 1.08, .07], [-.1, 0, 0]);
    rig.id = warrior.id;
    return rig;
  }
  guardian(stage) {
    const rig = this.rig(stage.color, true);
    const { head } = rig;
    this.mesh(head, 'rock', '#718582', [0, 0, 0], [.65, .57, .52]);
    for (const side of [-1, 1]) {
      this.mesh(head, 'box', '#ffe68f', [side * .25, .07, .46], [.24, .12, .075], [0, 0, side * -.12], true);
      this.mesh(rig.torso, 'rock', stage.color, [side * .64, .5, -.03], [.35, .33, .37]);
    }
    this.mesh(head, 'box', '#263f3a', [0, -.23, .43], [.34, .06, .06]);
    this.mesh(rig.torso, 'rock', stage.color, [0, .1, .47], [.25, .31, .1], [0, 0, .15], true);
    if (stage.id === 1 || stage.id === 2) for (const side of [-1, 1]) {
      this.mesh(head, 'cone', stage.id === 1 ? '#63874f' : '#936d40', [side * .4, .5, 0], [.18, .46, .18], [0, 0, side * -.3]);
      this.mesh(rig.torso, 'rock', '#6f9759', [side * .57, .39, .27], [.22, .15, .18]);
    }
    if (stage.id === 3) for (const side of [-1, 1]) for (let i = 0; i < 2; i++) this.mesh(rig.torso, 'cone', '#b5a5ed', [side * (.6 + i * .14), .75, 0], [.15, .75 - i * .15, .15], [0, 0, side * -.3], true);
    if (stage.id === 4) {
      this.mesh(head, 'ring', '#b0ddf3', [0, .6, 0], [.56, .56, .56], [Math.PI / 2, 0, 0], true);
      for (const side of [-1, 1]) this.mesh(rig.torso, 'cone', '#d8e4e4', [side * .8, .5, -.08], [.27, .75, .2], [0, 0, side * -.6]);
    }
    if (stage.id === 5) {
      this.mesh(head, 'cylinder', '#d9ad53', [0, .44, 0], [.57, .15, .48]);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        this.mesh(head, 'cone', '#efca6c', [Math.cos(a) * .48, .7, Math.sin(a) * .4], [.13, .48, .13]);
      }
      this.mesh(rig.torso, 'box', '#63466d', [0, -.15, -.47], [1.05, 1.35, .09], [-.12, 0, 0]);
    }
    rig.root.scale.setScalar(stage.id === 5 ? 1.12 : 1.05);
    rig.id = `guardian-${stage.id}`;
    return rig;
  }
  apply(rig, time = 0, idle = false) {
    const p = rig.pose;
    const breath = idle && !rig.defeated ? Math.sin(time * 2.2 + rig.homeX) * .025 : 0;
    rig.root.position.set(rig.homeX + p.x, p.y, p.z);
    rig.root.rotation.set(0, rig.facing + p.turn, p.fall);
    rig.torso.position.y = 1.35 + breath;
    rig.torso.rotation.set(p.lean, p.twist, 0);
    rig.head.rotation.y = p.head + (idle ? Math.sin(time * .8) * .035 : 0);
    rig.leftArm.rotation.set(p.armL + breath, 0, .12);
    rig.rightArm.rotation.set(p.armR - breath, 0, -.12);
    rig.leftElbow.rotation.x = p.elbowL;
    rig.rightElbow.rotation.x = p.elbowR;
    rig.leftLeg.rotation.x = p.legL;
    rig.rightLeg.rotation.x = p.legR;
    rig.tail.rotation.y = p.tail + (idle ? Math.sin(time * 1.6) * .1 : 0);
  }
  dispose() {
    Object.values(this.geometries).forEach(geometry => geometry.dispose());
    this.materials.forEach(material => material.dispose());
  }
}
