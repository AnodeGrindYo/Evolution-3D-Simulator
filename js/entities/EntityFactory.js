import { Organism } from './Organism.js';
import { Food } from './Food.js';
import { BehaviorFactory } from '../behaviors/BehaviorFactory.js';

export class EntityFactory {
    constructor(scene) {
        this.scene = scene;
        this.behaviorFactory = new BehaviorFactory();
    }
    
    createOrganism(type = 'random', position = null, stats = null) {
        // Create a behavior based on the type
        const behavior = this.behaviorFactory.createBehavior(type);
        
        // Generate random stats for the organism if not provided
        if (!stats) {
            stats = {
                energy: 50 + Math.random() * 50,
                speed: 0.5 + Math.random() * 1.5,
                size: 0.5 + Math.random() * 0.5,
                lifespan: 20 + Math.random() * 80,
                reproductionRate: 0.001 + Math.random() * 0.009
            };
        }
        
        // Create the organism with the specified behavior and stats
        return new Organism(stats, behavior, position);
    }
    
    createRandomOrganism(position = null, stats = null) {
        const behaviorTypes = [
            'aggressive',
            'altruistic',
            'titfortat',
            'cooperative',
            'selfish'
        ];
        
        const randomType = behaviorTypes[Math.floor(Math.random() * behaviorTypes.length)];
        return this.createOrganism(randomType, position, stats);
    }
    
    createFood(type = 'apple', position = null, energyValue = 20) {
        const foodTypes = ['apple', 'orange', 'berry', 'banana'];
        
        if (type === 'random') {
            type = foodTypes[Math.floor(Math.random() * foodTypes.length)];
        }
        
        return new Food(type, position, energyValue);
    }
    
    createTree(position = null, size = null) {
        position = position || { x: 0, y: 0, z: 0 };
        size = size || 1 + Math.random() * 0.5;
        
        // Create tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(size * 0.2, size * 0.3, size, 6);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(position.x, position.y + size/2, position.z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        
        // Create tree top
        const topGeometry = new THREE.ConeGeometry(size, size * 2, 6);
        const topMaterial = new THREE.MeshStandardMaterial({ color: 0x2E7D32 });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.set(position.x, position.y + size * 1.5, position.z);
        top.castShadow = true;
        top.receiveShadow = true;
        
        // Create a group to hold both parts
        const treeGroup = new THREE.Group();
        treeGroup.add(trunk);
        treeGroup.add(top);
        treeGroup.position.y = 0;
        
        // Add collision data
        treeGroup.userData = {
            type: 'tree',
            boundingRadius: size * 0.3,
            position: position
        };
        
        return treeGroup;
    }
    
    createRock(position = null, size = null) {
        position = position || { x: 0, y: 0, z: 0 };
        size = size || 0.2 + Math.random() * 0.3;
        
        const geometry = new THREE.DodecahedronGeometry(size, 0);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x9E9E9E,
            flatShading: true
        });
        
        const rock = new THREE.Mesh(geometry, material);
        rock.position.set(position.x, position.y + size / 2, position.z);
        rock.rotation.y = Math.random() * Math.PI;
        rock.castShadow = true;
        rock.receiveShadow = true;
        
        // Add collision data
        rock.userData = {
            type: 'rock',
            boundingRadius: size,
            position: position
        };
        
        return rock;
    }
}