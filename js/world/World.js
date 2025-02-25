import { TerrainGenerator } from './TerrainGenerator.js';
import { EntityFactory } from '../entities/EntityFactory.js';

export class World {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.entities = [];
        this.foods = [];
        this.obstacles = [];
        this.placementMode = false;
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.setupRenderer();
        this.setupControls();
        
        // Generate the terrain
        this.terrain = new TerrainGenerator(this.scene);
        this.terrain.generateTerrain();
        
        // Entity factory for creating organisms
        this.entityFactory = new EntityFactory(this.scene);
        
        // Set up raycaster for placement mode
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Event listeners for placement mode
        this.setupPlacementModeListeners();
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xb8d0ff);
        
        // Add fog for depth perception
        this.scene.fog = new THREE.FogExp2(0xb8d0ff, 0.02);
    }
    
    setupCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        
        // Set up isometric view
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);
    }
    
    setupLights() {
        // Main directional light for shadows
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(50, 50, 50);
        this.directionalLight.castShadow = true;
        
        // Configure shadow properties
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -30;
        this.directionalLight.shadow.camera.right = 30;
        this.directionalLight.shadow.camera.top = 30;
        this.directionalLight.shadow.camera.bottom = -30;
        
        this.scene.add(this.directionalLight);
        
        // Ambient light for the scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.container.appendChild(this.renderer.domElement);
    }
    
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI / 2;
        
        // Limit zoom
        this.controls.minDistance = 10;
        this.controls.maxDistance = 50;
    }
    
    setupPlacementModeListeners() {
        // Store the handler so we can remove it later
        this.clickHandler = this.handlePlacementClick.bind(this);
        this.mouseMoveHandler = this.handleMouseMove.bind(this);
        
        // Ghost/preview object for placement
        this.ghostObject = null;
    }
    
    activatePlacementMode(itemType, options = {}) {
        this.placementMode = true;
        this.placementItemType = itemType;
        this.placementOptions = options;
        
        // Enable controls for placing objects
        document.getElementById('placement-controls').classList.remove('hidden');
        
        // Add click event listener for placement
        this.renderer.domElement.addEventListener('click', this.clickHandler);
        this.renderer.domElement.addEventListener('mousemove', this.mouseMoveHandler);
        
        // Disable orbit controls during placement mode
        this.controls.enabled = false;
        
        // Create ghost object
        this.createGhostObject();
    }
    
    deactivatePlacementMode() {
        this.placementMode = false;
        
        // Hide placement controls
        document.getElementById('placement-controls').classList.add('hidden');
        
        // Remove event listeners
        this.renderer.domElement.removeEventListener('click', this.clickHandler);
        this.renderer.domElement.removeEventListener('mousemove', this.mouseMoveHandler);
        
        // Re-enable orbit controls
        this.controls.enabled = true;
        
        // Remove ghost object if it exists
        if (this.ghostObject) {
            this.scene.remove(this.ghostObject);
            this.ghostObject = null;
        }
    }
    
    createGhostObject() {
        // Remove existing ghost object if it exists
        if (this.ghostObject) {
            this.scene.remove(this.ghostObject);
            this.ghostObject = null;
        }
        
        const position = { x: 0, y: 0, z: 0 };
        
        switch (this.placementItemType) {
            case 'organism':
                const organism = this.entityFactory.createOrganism(
                    this.placementOptions.behaviorType || 'random', 
                    position
                );
                this.ghostObject = organism.mesh;
                // Make semi-transparent
                this.makeObjectTransparent(this.ghostObject);
                break;
                
            case 'food':
                const food = this.entityFactory.createFood(
                    this.placementOptions.foodType || 'apple', 
                    position
                );
                this.ghostObject = food.mesh;
                this.makeObjectTransparent(this.ghostObject);
                break;
                
            case 'tree':
                this.ghostObject = this.entityFactory.createTree(position);
                this.makeObjectTransparent(this.ghostObject);
                break;
                
            case 'rock':
                this.ghostObject = this.entityFactory.createRock(position);
                this.makeObjectTransparent(this.ghostObject);
                break;
        }
        
        if (this.ghostObject) {
            this.scene.add(this.ghostObject);
        }
    }
    
    makeObjectTransparent(object) {
        object.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        mat.transparent = true;
                        mat.opacity = 0.5;
                    });
                } else {
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                }
            }
        });
    }
    
    handlePlacementClick(event) {
        // Calculate mouse position
        this.calculateMousePosition(event);
        
        // Raycast to terrain
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.terrain.terrain, false);
        
        if (intersects.length > 0) {
            const point = intersects[0].point;
            
            // Place the object at the clicked position
            switch (this.placementItemType) {
                case 'organism':
                    this.simulation.addOrganismAt(
                        this.placementOptions.behaviorType || 'random', 
                        { x: point.x, y: 0, z: point.z }
                    );
                    break;
                    
                case 'food':
                    this.simulation.addFoodAt(
                        this.placementOptions.foodType || 'apple', 
                        { x: point.x, y: 0, z: point.z }
                    );
                    break;
                    
                case 'tree':
                    this.simulation.addObstacleAt(
                        'tree', 
                        { x: point.x, y: 0, z: point.z }
                    );
                    break;
                    
                case 'rock':
                    this.simulation.addObstacleAt(
                        'rock', 
                        { x: point.x, y: 0, z: point.z }
                    );
                    break;
            }
        }
    }
    
    handleMouseMove(event) {
        // Only update ghost position if in placement mode
        if (!this.placementMode || !this.ghostObject) return;
        
        // Calculate mouse position
        this.calculateMousePosition(event);
        
        // Raycast to terrain
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.terrain.terrain, false);
        
        if (intersects.length > 0) {
            const point = intersects[0].point;
            
            // Update ghost position
            this.ghostObject.position.set(point.x, point.y, point.z);
        }
    }
    
    calculateMousePosition(event) {
        // Calculate normalized mouse position
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    onResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    addEntity(entity) {
        this.entities.push(entity);
        this.scene.add(entity.mesh);
        return entity;
    }
    
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
            this.scene.remove(entity.mesh);
        }
    }
    
    addFood(food) {
        this.foods.push(food);
        this.scene.add(food.mesh);
        return food;
    }
    
    removeFood(food) {
        const index = this.foods.indexOf(food);
        if (index > -1) {
            this.foods.splice(index, 1);
            this.scene.remove(food.mesh);
        }
    }
    
    addObstacle(obstacle) {
        this.obstacles.push(obstacle);
        this.scene.add(obstacle);
        return obstacle;
    }
    
    removeObstacle(obstacle) {
        const index = this.obstacles.indexOf(obstacle);
        if (index > -1) {
            this.obstacles.splice(index, 1);
            this.scene.remove(obstacle);
        }
    }
    
    getEntities() {
        return this.entities;
    }
    
    getFoodItems() {
        return this.foods;
    }
    
    getObstacles() {
        return this.obstacles;
    }
    
    getRandomPosition() {
        if (!this.terrain) {
            this.terrain = new TerrainGenerator(this.scene);
        }
        return this.terrain.getRandomPosition();
    }
    
    render() {
        if (!this.controls || !this.renderer || !this.scene || !this.camera) return;
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    reset() {
        // Remove all entities
        while (this.entities.length > 0) {
            this.removeEntity(this.entities[0]);
        }
        
        // Remove all food
        while (this.foods.length > 0) {
            this.removeFood(this.foods[0]);
        }
        
        // Remove all obstacles
        while (this.obstacles.length > 0) {
            this.removeObstacle(this.obstacles[0]);
        }
    }
    
    // Camera control methods
    setCameraDistance(distance) {
        if (!this.controls || !this.camera) return;
        
        // Update orbit controls limits
        this.controls.minDistance = Math.min(distance - 5, 5);
        this.controls.maxDistance = distance + 5;
        
        // Set camera position to new distance
        const direction = new THREE.Vector3();
        direction.subVectors(this.camera.position, this.controls.target).normalize();
        direction.multiplyScalar(distance);
        this.camera.position.copy(direction.add(this.controls.target));
    }
    
    getCameraDistance() {
        if (!this.camera || !this.controls) return 20;
        
        const cameraPosition = new THREE.Vector3();
        this.camera.getWorldPosition(cameraPosition);
        
        const controlsTarget = this.controls.target;
        return cameraPosition.distanceTo(controlsTarget);
    }
}