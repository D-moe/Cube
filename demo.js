import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, controls, stats;

let mesh;
// const amount = parseInt( window.location.search.slice( 1 ) ) || 10;
const amount = 3;
const count = Math.pow(amount, 3);

// TODO(morleyd): In future use this raycaster in order to control the rotation of the cube.
// We can use a texture to show differing arrows depending on which direction we are trying
// to rotate.
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2( 1, 1 );
const highlight_face = {'check': false};

// Example of coloring the different cube sides: https://codepen.io/boytchev/pen/abaKwzg
// TODO(morleyd): Use this to color the relevant cubes

const color = new THREE.Color();
const white = new THREE.Color().setHex( 0xffffff );
let offsets = [];
init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
  camera.position.set( amount, amount, amount );
  camera.lookAt( 0, 0, 0 );

  scene = new THREE.Scene();

  const light = new THREE.HemisphereLight( 0xffffff, 0x888888, 3 );
  light.position.set( 0, 1, 0 );
  scene.add( light );
  const white = 0xffffff;
  const red = 0xff0000;
  const yellow = 0xffff00;
  const blue = 0x0000ff;
  const orange = 0xffa500;
  const green = 0x00ff00


  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material =
    [new THREE.MeshPhongMaterial( { color:  white }),
    new THREE.MeshPhongMaterial( { color: red }),
    new THREE.MeshPhongMaterial( { color: yellow }),
    new THREE.MeshPhongMaterial( { color: blue }),
    new THREE.MeshPhongMaterial( { color: orange }),
    new THREE.MeshPhongMaterial( { color: green })]

    // white: 1,0,0
    // yellow: 0,1,0
    // orange: 0,0,1
    // green: 0,0,-1
    // red: -1,0,0
    // blue: 0,-1,0

  // We know the normal vector for each colored face
//  const material = new THREE.MeshPhongMaterial( {color: 0xffffff});

  mesh = new THREE.InstancedMesh( geometry, material, count );

  let i = 0;
  const offset = ( amount - 1 ) / 2;

  const matrix = new THREE.Matrix4();

  for ( let x = 0; x < amount; x ++ ) {

    for ( let y = 0; y < amount; y ++ ) {
      for ( let z = 0; z < amount; z ++ ) {
        // Store a map from offset to instanceId.
        matrix.setPosition( offset - x, offset - y, offset - z );
        offsets.push({"x": offset -x, "y": offset -y, "z": offset -z, "index": i});
        mesh.setMatrixAt( i, matrix );
        const tmp_matrix = matrix.clone();
        tmp_matrix.makeRotationFromEuler(new THREE.Euler( 0, Math.PI, 1, 'XYZ' ));
        mesh.setColorAt( i, color );

        i ++;

      }
    }
  };
  console.log(offsets);
  scene.add( mesh );
  const gui = new GUI();
  // TODO(morleyd): Write this as a loop with a one line function.
  const red_c = {'R': function(){rotateRed(true)}};
  const green_c = {'G': function(){rotateGreen(true)}};
  const blue_c = {'B': function(){rotateBlue(true)}};
  const orange_c = {'O': function(){rotateOrange(true)}};
  const white_c = {'W': function(){rotateWhite(true)}};
  const yellow_c = {'Y': function(){rotateYellow(true)}};
  const red_cc = {'R*': function(){rotateRed(false)}};
  const green_cc = {'G*': function(){rotateGreen(false)}};
  const blue_cc = {'B*': function(){rotateBlue(false)}};
  const orange_cc = {'O*': function(){rotateOrange(false)}};
  const white_cc = {'W*': function(){rotateWhite(false)}};
  const yellow_cc = {'Y*': function(){rotateYellow(false)}};
  gui.add( mesh, 'count', 0, count );
  gui.add(red_c, 'R');
  gui.add(green_c, 'G');
  gui.add(blue_c, 'B');
  gui.add(orange_c, 'O');
  gui.add(white_c, 'W');
  gui.add(yellow_c, 'Y');
  gui.add(red_cc, 'R*');
  gui.add(green_cc, 'G*');
  gui.add(blue_cc, 'B*');
  gui.add(orange_cc, 'O*');
  gui.add(white_cc, 'W*');
  gui.add(yellow_cc, 'Y*');
  gui.add(highlight_face, 'check').name('highlight_face');

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  controls = new OrbitControls( camera, renderer.domElement );
  controls.enableDamping = true;
  controls.enableZoom = true;
  controls.enablePan = false;

  stats = new Stats();
  document.body.appendChild( stats.dom );

  window.addEventListener( 'resize', onWindowResize );
  document.addEventListener( 'mousemove', onMouseMove );

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
// white: 1,0,0
// yellow: 0,1,0
// orange: 0,0,1
// green: 0,0,-1
// red: -1,0,0
// blue: 0,-1,0

function rotate(normal, clockwise, angle = Math.PI/2){
  console.log('rotate');
  // We can take the normal vector create a plane and find the closest intersections
  let dists = new Map();
  // TODO(morleyd): Offsets is not an accurate measure of position after a single rotation.
  // TODO(morleyd): For some reason this causing crash

  for (let index = 0; index<27; index++){
    let tmp_matrix = new THREE.Matrix4();
    let offset = new THREE.Vector3();
    mesh.getMatrixAt(index, tmp_matrix);
    offset.setFromMatrixPosition(tmp_matrix);

    let dist = computeDistFromPlane(normal, offset.x, offset.y, offset.z);
    if (!dists.has(dist)){
      dists.set(dist, []);
    }
    let val = dists.get(dist);
    val.push(index);
    dists.set(dist, val);
  }
  let closest_dist = Number.MAX_SAFE_INTEGER;
  console.log(dists);
  dists.forEach((_value, key)=>{
    closest_dist = Math.min(key, closest_dist);
  });
  let cube_face = dists.get(closest_dist);
  console.log("Faces: "+cube_face);
  for (let index = 0; index <cube_face.length; index++){
    const face = cube_face[index];
    console.log("face is "+face);
    let matrix = new THREE.Matrix4();
    let rot_matrix = new THREE.Matrix4();
    mesh.getMatrixAt(face, matrix);
    let rot_angle = angle;
    if (clockwise){
      rot_angle = -rot_angle;
    }
    // TODO(morleyd): Fix direction of rotation so we can show smooth animation.
    rot_matrix.makeRotationFromEuler(new THREE.Euler( normal.x*rot_angle, normal.y * rot_angle, normal.z*rot_angle, 'XYZ' ));
    rot_matrix.multiply(matrix);
    mesh.setMatrixAt(face, rot_matrix);
   // mesh.setColorAt(face, new THREE.Color().setHex(0xa020f0));
    mesh.instanceMatrix.needsUpdate = true;
   // mesh.instanceColor.needsUpdate = true;

  }
}
// TODO(morleyd): specify the other directions as well as clockwise/counterclockwise
async function rotateRed(clockwise){
  //for (let i = 0; i<20; i++){
  rotate(new THREE.Vector3(-1,0,0), clockwise, Math.PI/40);
//  await sleep(10);
//  }
}
function rotateBlue(clockwise){
  rotate(new THREE.Vector3(0,-1, 0), clockwise);
}
function rotateGreen(clockwise){
  rotate(new THREE.Vector3(0,0, -1), clockwise);
}
function rotateWhite(clockwise){
  rotate(new THREE.Vector3(1,0,0), clockwise);
}
function rotateYellow(clockwise){
  rotate(new THREE.Vector3(0,1,0), clockwise);
}
function rotateOrange(clockwise){
  rotate(new THREE.Vector3(0,0,1), clockwise);
}

function onMouseMove( event ) {

  event.preventDefault();

  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

// We set a value of d so the plane is always outside the cube face
function computeDistFromPlane(normal, x,y,z){
  let pos = new THREE.Vector3(x,y,z);
  // We just want the sign.
  let d = -1;
  for (const n in [normal.x,normal.y,normal.z]){
    if (n!=0){
      d = d*n;
    }
  }
  //let d = -1;
  let dist = Math.abs(pos.dot(normal) + d)/ Math.sqrt(normal.dot(normal));
  return dist
}
function animate() {

  requestAnimationFrame( animate );

  controls.update();

  raycaster.setFromCamera( mouse, camera );

  const intersection = raycaster.intersectObject( mesh );
  if ( intersection.length > 0 ) {

    const instanceId = intersection[ 0 ].instanceId;
    const normal = intersection[0].normal;
    // TODO(morleyd): Combine this with the other function
    // We can take the normal vector create a plane and find the closest intersections
    let dists = new Map();
    for (let i = 0; i<offsets.length; i++){
      let offset = offsets[i];
      //console.log("The normal is "+normal.x+","+normal.y+","+normal.z);
      let dist = computeDistFromPlane(normal, offset.x, offset.y, offset.z);
      if (!dists.has(dist)){
        dists.set(dist, []);
      }
      let val = dists.get(dist);
      val.push(offset.index);
      dists.set(dist, val);
    }
    let closest_dist = Number.MAX_SAFE_INTEGER;
    dists.forEach((_value, key)=>{
      closest_dist = Math.min(key, closest_dist);
    });

    let cube_face = dists.get(closest_dist);
    for (let i = 0; i<offsets.length; i++){
      let index = offsets[i].index;
      mesh.setColorAt(index, new THREE.Color().setHex(0xffffff));
    }

    for (let i = 0; i<cube_face.length; i++){
    //  console.log("Selected face "+cube_face);
      let index = cube_face[i];
      if (highlight_face['check']){
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

  renderer.render( scene, camera );

}