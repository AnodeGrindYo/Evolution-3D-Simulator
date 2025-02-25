export class TerrainGenerator {
    constructor(scene) {
        this.scene = scene;
        this.size = 40; // Size of terrain
        this.terrain = null;
        this.water = null;
        this.decorations = [];
    }
    
    setSize(size) {
        this.size = size;
    }
    
    generateTerrain() {
        this.clearTerrain(); // Clear existing terrain
        
        // Create base terrain plane
        const geometry = new THREE.PlaneGeometry(this.size, this.size, 32, 32);
        
        // Rotate to be horizontal
        geometry.rotateX(-Math.PI / 2);
        
        // Create a nice material for the terrain
        const material = new THREE.MeshStandardMaterial({
            color: 0x8BC34A,
            flatShading: true,
            side: THREE.DoubleSide
        });
        
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.receiveShadow = true;
        this.scene.add(this.terrain);
        
        // Add water around the terrain
        this.addWater();
        
        // Add decorative elements
        this.addTrees();
        this.addRocks();
    }
    
    clearTerrain() {
        // Remove previous terrain elements
        if (this.terrain) {
            this.scene.remove(this.terrain);
            this.terrain.geometry.dispose();
            this.terrain.material.dispose();
        }
        
        if (this.water) {
            this.scene.remove(this.water);
            this.water.geometry.dispose();
            this.water.material.dispose();
        }
        
        // Remove decorations
        this.decorations.forEach(decoration => {
            this.scene.remove(decoration);
            if (decoration.geometry) decoration.geometry.dispose();
            if (decoration.material) decoration.material.dispose();
        });
        
        this.decorations = [];
    }
    
    regenerateTerrain() {
        this.generateTerrain();
    }
    
    addWater() {
        const waterSize = this.size * 1.5;
        const waterGeometry = new THREE.PlaneGeometry(waterSize, waterSize);
        waterGeometry.rotateX(-Math.PI / 2);
        
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x4FC3F7,
            transparent: true,
            opacity: 0.7
        });
        
        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.position.y = -0.2; // Slightly below the terrain
        this.scene.add(this.water);
    }
    
    addTrees() {
        const treeCount = Math.floor(this.size / 4);
        
        for (let i = 0; i < treeCount; i++) {
            const position = this.getRandomPositionInBounds(this.size / 2.5);
            this.createTree(position.x, 0, position.z);
        }
    }
    
    createTree(x, y, z) {
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1, 6);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x, y + 0.5, z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.scene.add(trunk);
        this.decorations.push(trunk);
        
        // Tree top
        const topGeometry = new THREE.ConeGeometry(1, 2, 6);
        const topMaterial = new THREE.MeshStandardMaterial({ color: 0x2E7D32 });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.set(x, y + 2, z);
        top.castShadow = true;
        top.receiveShadow = true;
        this.scene.add(top);
        this.decorations.push(top);
        
        // Add tree as an obstacle in the world
        const tree = new THREE.Group();
        tree.add(trunk.clone());
        tree.add(top.clone());
        tree.position.set(x, y, z);
        
        // Add tree data for collision detection
        tree.userData = {
            type: 'tree',
            boundingRadius: 0.5,
            position: { x, y, z }
        };
        
        // Add to world obstacles if simulation is initialized
        if (this.scene.userData.world && this.scene.userData.world.simulation) {
            this.scene.userData.world.addObstacle(tree);
        }
    }
    
    addRocks() {
        const rockCount = Math.floor(this.size / 3);
        
        for (let i = 0; i < rockCount; i++) {
            const position = this.getRandomPositionInBounds(this.size / 2.2);
            this.createRock(position.x, 0, position.z);
        }
    }
    
    createRock(x, y, z) {
        const size = 0.2 + Math.random() * 0.3;
        const geometry = new THREE.DodecahedronGeometry(size, 0);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x9E9E9E,
            flatShading: true
        });
        
        const rock = new THREE.Mesh(geometry, material);
        rock.position.set(x, y + size / 2, z);
        rock.rotation.y = Math.random() * Math.PI;
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.scene.add(rock);
        this.decorations.push(rock);
        
        // Add rock data for collision detection
        rock.userData = {
            type: 'rock',
            boundingRadius: size,
            position: { x, y, z }
        };
        
        // Add to world obstacles if simulation is initialized
        if (this.scene.userData.world && this.scene.userData.world.simulation) {
            this.scene.userData.world.addObstacle(rock);
        }
    }
    
    getRandomPositionInBounds(bound = this.size / 2) {
        return {
            x: (Math.random() * 2 - 1) * bound,
            z: (Math.random() * 2 - 1) * bound
        };
    }
    
    getRandomPosition() {
        const pos = this.getRandomPositionInBounds(this.size / 2.5);
        return { x: pos.x, y: 0, z: pos.z };
    }
}