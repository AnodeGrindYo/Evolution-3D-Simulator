import { EntityModel } from './EntityModel.js';

export class Food {
    constructor(type, position, energyValue) {
        this.type = type || 'apple';
        this.energyValue = energyValue || 30;
        this.position = position || { x: 0, y: 0, z: 0 };
        this.size = 0.6 + Math.random() * 0.2;
        this.isConsumed = false;
        
        // Create visual representation
        this.model = this.createFoodModel();
        this.model.setPosition(this.position.x, this.position.y, this.position.z);
    }
    
    createFoodModel() {
        // Colors and shapes for different food types
        const foodTypes = {
            apple: { color: { r: 0.9, g: 0.2, b: 0.2 }, shape: 'sphere' },
            orange: { color: { r: 1.0, g: 0.6, b: 0.1 }, shape: 'sphere' },
            berry: { color: { r: 0.5, g: 0.0, b: 0.7 }, shape: 'sphere' },
            banana: { color: { r: 1.0, g: 0.9, b: 0.2 }, shape: 'banana' }
        };
        
        const foodType = foodTypes[this.type] || foodTypes.apple;
        const model = new EntityModel(this.size, foodType.color, foodType.shape);
        
        // Add a small rotation for visual interest
        model.mesh.rotation.y = Math.random() * Math.PI * 2;
        
        return model;
    }
    
    get mesh() {
        return this.model.mesh;
    }
    
    update(deltaTime) {
        if (this.isConsumed) return;
        
        // Make food gently bob up and down
        const hoverHeight = Math.sin(Date.now() * 0.002) * 0.1;
        this.model.setPosition(this.position.x, this.position.y + hoverHeight, this.position.z);
        
        // Slowly rotate
        this.mesh.rotation.y += deltaTime * 0.2;
    }
    
    consume() {
        if (this.isConsumed) return 0;
        
        this.isConsumed = true;
        this.startConsumptionAnimation();
        
        return this.energyValue;
    }
    
    startConsumptionAnimation() {
        // Scale down and fade out
        const duration = 0.5; // seconds
        
        const animate = () => {
            const scaleValue = this.mesh.scale.x - 0.05;
            if (scaleValue <= 0) {
                this.mesh.visible = false;
                return;
            }
            
            this.mesh.scale.set(scaleValue, scaleValue, scaleValue);
            
            if (this.mesh.material) {
                this.mesh.material.opacity = scaleValue;
                this.mesh.material.transparent = true;
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    // For collision detection
    getBoundingRadius() {
        return this.size * 0.4;
    }
}