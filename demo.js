import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GUI} from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';

let camera, scene, renderer, controls, stats;

let mesh;
const amount = 3;
const count = Math.pow(amount, 3);

// TODO(morleyd): In future use this raycaster in order to control the rotation
// of the cube. We can use a texture to show differing arrows depending on which
// direction we are trying to rotate.
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(1, 1);
const highlight_face = {
  'check': false
};

const color = new THREE.Color();
const white = new THREE.Color().setHex(0xffffff);
let offsets = [];
init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(amount, amount, amount);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();

  const light = new THREE.HemisphereLight(0xffffff, 0x888888, 3);
  light.position.set(0, 5, 0);
  scene.add(light);
  const white = 0xffffff;
  const red = 0xff0000;
  const yellow = 0xffff00;
  const blue = 0x0000ff;
  const orange = 0xffa500;
  const green = 0x00ff00


  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = [
    new THREE.MeshPhongMaterial({color: white}),
    new THREE.MeshPhongMaterial({color: red}),
    new THREE.MeshPhongMaterial({color: yellow}),
    new THREE.MeshPhongMaterial({color: blue}),
    new THREE.MeshPhongMaterial({color: orange}),
    new THREE.MeshPhongMaterial({color: green})
  ]
  // Normal vectors are the same as the position of the cube.
  // white: 1,0,0
  // yellow: 0,1,0
  // orange: 0,0,1
  // green: 0,0,-1
  // red: -1,0,0
  // blue: 0,-1,0

  mesh = new THREE.InstancedMesh(geometry, material, count);

  let i = 0;
  const offset = (amount - 1) / 2;

  const matrix = new THREE.Matrix4();

  for (let x = 0; x < amount; x++) {
    for (let y = 0; y < amount; y++) {
      for (let z = 0; z < amount; z++) {
        // Store a map from offset to instanceId.
        matrix.setPosition(offset - x, offset - y, offset - z);
        offsets.push(
            {'x': offset - x, 'y': offset - y, 'z': offset - z, 'index': i});
        mesh.setMatrixAt(i, matrix);
        const tmp_matrix = matrix.clone();
        tmp_matrix.makeRotationFromEuler(new THREE.Euler(0, Math.PI, 1, 'XYZ'));
        mesh.setColorAt(i, color);
        i++;
      }
    }
  };
  scene.add(mesh);
  const gui = new GUI();
  let gui_dict = [];
  const moves =
      ['R', 'R*', 'G', 'G*', 'B', 'B*', 'O', 'O*', 'W', 'W*', 'Y', 'Y*'];
  for (let j = 0; j < moves.length; j++) {
    const move = moves[j];
    gui_dict[move] = function() {
      rotateStr(move)
    };
  }
  for (const [key, value] of Object.entries(gui_dict)) {
    gui.add(gui_dict, key);
  }
  gui.add({'Run': function(){Run()}}, "Run");
  gui.add({'Shuffle': function(){Shuffle()}}, "Shuffle");
 // gui.add(highlight_face, 'check').name('highlight_face');

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = true;
  controls.enablePan = false;

  stats = new Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('mousemove', onMouseMove);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
// white: 1,0,0
// yellow: 0,1,0
// orange: 0,0,1
// green: 0,0,-1
// red: -1,0,0
// blue: 0,-1,0

async function rotate(normal, clockwise, steps = 10) {
    // We can take the normal vector create a plane and find the closest
    // intersections
    let dists = new Map();
    for (let index = 0; index < 27; index++) {
      let tmp_matrix = new THREE.Matrix4();
      let offset = new THREE.Vector3();
      mesh.getMatrixAt(index, tmp_matrix);
      offset.setFromMatrixPosition(tmp_matrix);

      let dist = Math.round(
          computeDistFromPlane(normal, offset.x, offset.y, offset.z));
      if (!dists.has(dist)) {
        dists.set(dist, []);
      }
      let val = dists.get(dist);
      val.push(index);
      dists.set(dist, val);
    }
    let closest_dist = Number.MAX_SAFE_INTEGER;
    dists.forEach((_value, key) => {
      closest_dist = Math.min(key, closest_dist);
    });
    let cube_face = dists.get(closest_dist);
  for (let j = 0; j < 10; j++) {
    // Use the normal to determine the position to move to as
    // it's the same as the center face.
    for (let index = 0; index < cube_face.length; index++) {
      const face = cube_face[index];
      let matrix = new THREE.Matrix4();
      let rot_matrix = new THREE.Matrix4();
      mesh.getMatrixAt(face, matrix);
      let rot_angle = Math.PI/2/steps;
      if (clockwise) {
        rot_angle = -rot_angle;
      }
      let trans_matrix = new THREE.Matrix4();
      trans_matrix.makeTranslation(normal);
      let rev_matrix = new THREE.Matrix4();
      let rev_normal = new THREE.Vector3(-normal.x, -normal.y, -normal.z);
      rev_matrix.makeTranslation(rev_normal);

      rot_matrix.makeRotationFromEuler(new THREE.Euler(
          normal.x * rot_angle, normal.y * rot_angle, normal.z * rot_angle,
          'XYZ'));
      rev_matrix.multiply(rot_matrix).multiply(trans_matrix).multiply(matrix);
      mesh.setMatrixAt(face, rev_matrix);
      mesh.instanceMatrix.needsUpdate = true;
    }
    await sleep(10);
  }
}

async function rotateStr(str) {
  if (str == 'R') {
    await rotate(new THREE.Vector3(-1, 0, 0), true);
  } else if (str == 'R*') {
    await rotate(new THREE.Vector3(-1, 0, 0), false);
  } else if (str == 'B') {
    await rotate(new THREE.Vector3(0, -1, 0), true);
  } else if (str == 'B*') {
    await rotate(new THREE.Vector3(0, -1, 0), false);
  } else if (str == 'G') {
    await rotate(new THREE.Vector3(0, 0, -1), true);
  } else if (str == 'G*') {
    await rotate(new THREE.Vector3(0, 0, -1), false);
  } else if (str == 'O') {
    await rotate(new THREE.Vector3(0, 0, 1), true);
  } else if (str == 'O*') {
    await rotate(new THREE.Vector3(0, 0, 1), false);
  } else if (str == 'W') {
    await rotate(new THREE.Vector3(1, 0, 0), true);
  } else if (str == 'W*') {
    await rotate(new THREE.Vector3(1, 0, 0), false);
  } else if (str == 'Y') {
    await rotate(new THREE.Vector3(0, 1, 0), true);
  } else if (str == 'Y*') {
    await rotate(new THREE.Vector3(0, 1, 0), false);
  }
}

async function Run(){
  for (let i = 0; i<arr.length; i++){
    const move = arr[i];
    await rotateStr(move);
  }
}
async function Shuffle(){
  for (let i = 0; i<shuffle.length; i++){
    const move = shuffle[i];
    await rotateStr(move);
  }
}


function onMouseMove(event) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// We set a value of d so the plane is always outside the cube face
function computeDistFromPlane(normal, x, y, z) {
  let pos = new THREE.Vector3(x, y, z);
  // We just want the sign.
  let d = -1;
  for (const n in [normal.x, normal.y, normal.z]) {
    if (n != 0) {
      d = d * n;
    }
  }
  // let d = -1;
  let dist = Math.abs(pos.dot(normal) + d) / Math.sqrt(normal.dot(normal));
  return dist
}
function animate() {
  requestAnimationFrame(animate);

  controls.update();

  raycaster.setFromCamera(mouse, camera);

  const intersection = raycaster.intersectObject(mesh);
  if (intersection.length > 0) {
    const instanceId = intersection[0].instanceId;
    const normal = intersection[0].normal;
    // We can take the normal vector create a plane and find the closest
    // intersections
    let dists = new Map();
    for (let i = 0; i < offsets.length; i++) {
      let offset = offsets[i];
      let dist = computeDistFromPlane(normal, offset.x, offset.y, offset.z);
      if (!dists.has(dist)) {
        dists.set(dist, []);
      }
      let val = dists.get(dist);
      val.push(offset.index);
      dists.set(dist, val);
    }
    let closest_dist = Number.MAX_SAFE_INTEGER;
    dists.forEach((_value, key) => {
      closest_dist = Math.min(key, closest_dist);
    });

    let cube_face = dists.get(closest_dist);
    for (let i = 0; i < offsets.length; i++) {
      let index = offsets[i].index;
      mesh.setColorAt(index, new THREE.Color().setHex(0xffffff));
    }

    for (let i = 0; i < cube_face.length; i++) {
      let index = cube_face[i];
      if (highlight_face['check']) {
        mesh.setColorAt(index, new THREE.Color().setHex(0xff0000));
        mesh.instanceColor.needsUpdate = true;
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  render();

  stats.update();
}

function render() {
  renderer.render(scene, camera);
}