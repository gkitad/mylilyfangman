// Griffin 3D Viewer - Black Labrador
// Variables globales
var scene, camera, renderer, controls, model, mixer;
var autoRotate = true;
var clock = new THREE.Clock();
var lightMode = 0;
var ambientLight, directionalLight, fillLight, rimLight;

// Función para convertir textura a pelaje negro
function convertToBlackFur(texture, callback) {
    var image = texture.image;
    
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = image.width || 1024;
    canvas.height = image.height || 1024;
    
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    
    for (var i = 0; i < data.length; i += 4) {
        var r = data[i];
        var g = data[i + 1];
        var b = data[i + 2];
        
        var brightness = (r + g + b) / 3;
        
        // Detectar áreas especiales a preservar
        var isPinkRed = (r > 140 && r > g * 1.3 && r > b * 1.3);
        var isVeryDark = (brightness < 45);
        var isVeryLight = (brightness > 230);
        var isAmberEye = (r > 100 && r < 200 && g > 60 && g < 140 && b < 100 && r > g && g > b * 1.2);
        
        if (isPinkRed || isVeryDark || isVeryLight || isAmberEye) {
            continue;
        } else {
            var luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            var blackValue = 15 + (luminance / 255) * 25;
            
            data[i] = blackValue;
            data[i + 1] = blackValue;
            data[i + 2] = blackValue;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    var newTexture = new THREE.CanvasTexture(canvas);
    newTexture.flipY = texture.flipY;
    newTexture.encoding = THREE.sRGBEncoding;
    newTexture.needsUpdate = true;
    
    callback(newTexture);
}

// Inicialización
function init() {
    var container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(3, 2, 5);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    
    setupLights();
    
    // Piso
    var groundGeometry = new THREE.CircleGeometry(10, 64);
    var groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.2
    });
    var ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Controles de órbita
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.target.set(0, 0.5, 0);
    controls.update();
    
    loadModel();
    
    window.addEventListener('resize', onWindowResize);
    setupControlButtons();
    
    animate();
}

function setupLights() {
    ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    directionalLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    directionalLight.position.set(5, 8, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    fillLight = new THREE.DirectionalLight(0x8ec8ff, 0.4);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);
    
    rimLight = new THREE.DirectionalLight(0xc9a227, 0.6);
    rimLight.position.set(0, 5, -8);
    scene.add(rimLight);
}

function loadModel() {
    var loader = new THREE.GLTFLoader();
    var loadingBar = document.getElementById('loadingBar');
    
    loader.load(
        'Labrador.glb',
        function(gltf) {
            model = gltf.scene;
            
            // Centrar y escalar
            var box = new THREE.Box3().setFromObject(model);
            var center = box.getCenter(new THREE.Vector3());
            var size = box.getSize(new THREE.Vector3());
            
            var maxDim = Math.max(size.x, size.y, size.z);
            var scale = 2 / maxDim;
            model.scale.setScalar(scale);
            
            model.position.x = -center.x * scale;
            model.position.y = -box.min.y * scale;
            model.position.z = -center.z * scale;
            
            // Procesar texturas
            var texturesProcessed = 0;
            var totalTextures = 0;
            
            model.traverse(function(child) {
                if (child.isMesh && child.material && child.material.map) {
                    totalTextures++;
                }
            });
            
            if (totalTextures === 0) {
                scene.add(model);
                finishLoading();
                return;
            }
            
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (child.material) {
                        child.material = child.material.clone();
                        
                        if (child.material.map) {
                            var originalTexture = child.material.map;
                            
                            var checkAndConvert = function() {
                                var img = originalTexture.image;
                                if (img && img.complete && img.width > 0) {
                                    convertToBlackFur(originalTexture, function(blackTexture) {
                                        child.material.map = blackTexture;
                                        child.material.needsUpdate = true;
                                        texturesProcessed++;
                                        
                                        if (texturesProcessed >= totalTextures) {
                                            scene.add(model);
                                            finishLoading();
                                        }
                                    });
                                } else {
                                    setTimeout(checkAndConvert, 50);
                                }
                            };
                            checkAndConvert();
                        } else {
                            texturesProcessed++;
                            if (texturesProcessed >= totalTextures) {
                                scene.add(model);
                                finishLoading();
                            }
                        }
                        
                        child.material.roughness = 0.65;
                        child.material.metalness = 0.05;
                    }
                }
            });
            
            // Animaciones
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                var action = mixer.clipAction(gltf.animations[0]);
                action.play();
            }
        },
        function(xhr) {
            if (xhr.total > 0) {
                var percent = (xhr.loaded / xhr.total) * 100;
                loadingBar.style.width = Math.min(percent, 90) + '%';
            }
        },
        function(error) {
            console.error('Error loading model:', error);
            document.querySelector('.loading-text').textContent = 'Error al cargar 😢';
        }
    );
}

function finishLoading() {
    var loadingBar = document.getElementById('loadingBar');
    loadingBar.style.width = '100%';
    setTimeout(function() {
        document.getElementById('loadingScreen').classList.add('hidden');
    }, 300);
}

function setupControlButtons() {
    document.getElementById('btnRotate').addEventListener('click', function() {
        autoRotate = !autoRotate;
        this.classList.toggle('active');
    });
    
    document.getElementById('btnReset').addEventListener('click', function() {
        camera.position.set(3, 2, 5);
        controls.target.set(0, 0.5, 0);
        controls.update();
    });
    
    document.getElementById('btnZoomIn').addEventListener('click', function() {
        camera.position.multiplyScalar(0.8);
        controls.update();
    });
    
    document.getElementById('btnZoomOut').addEventListener('click', function() {
        camera.position.multiplyScalar(1.2);
        controls.update();
    });
    
    document.getElementById('btnLight').addEventListener('click', function() {
        lightMode = (lightMode + 1) % 3;
        
        switch(lightMode) {
            case 0:
                ambientLight.intensity = 0.5;
                directionalLight.intensity = 1.2;
                directionalLight.color.setHex(0xfff5e6);
                scene.background = new THREE.Color(0x0a0a0a);
                break;
            case 1:
                ambientLight.intensity = 0.9;
                directionalLight.intensity = 1.8;
                directionalLight.color.setHex(0xffffff);
                scene.background = new THREE.Color(0x1a1a1a);
                break;
            case 2:
                ambientLight.intensity = 0.2;
                directionalLight.intensity = 1.5;
                directionalLight.color.setHex(0xffc080);
                scene.background = new THREE.Color(0x050505);
                break;
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    var delta = clock.getDelta();
    
    if (mixer) mixer.update(delta);
    if (autoRotate && model) model.rotation.y += 0.005;
    
    controls.update();
    renderer.render(scene, camera);
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
