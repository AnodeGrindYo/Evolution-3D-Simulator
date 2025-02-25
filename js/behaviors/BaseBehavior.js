export class BaseBehavior {
    constructor(type, color) {
        this.type = type;
        this.color = color;
        this.memory = new Map(); // For behaviors that need to remember past interactions
        
        // Configurable behavior parameters
        this.interactionStrength = 1.0; // Multiplier for interaction intensity
        this.memoryDuration = 50; // How long to remember interactions (in seconds)

        this.unlimitedMemory = false;
    }

    setUnlimitedMemory(enabled) {
        this.unlimitedMemory = enabled;
    }

    getUnlimitedMemory() {
        return this.unlimitedMemory;
    }
    
    getColor() {
        return this.color;
    }
    
    selectTarget(self, nearbyEntities) {
        // Default implementation: select closest entity
        let closestEntity = null;
        let closestDistance = Infinity;
        
        nearbyEntities.forEach(entity => {
            const dx = entity.position.x - self.position.x;
            const dz = entity.position.z - self.position.z;
            const distanceSquared = dx * dx + dz * dz;
            
            if (distanceSquared < closestDistance) {
                closestDistance = distanceSquared;
                closestEntity = entity;
            }
        });
        
        return closestEntity;
    }
    
    interact(self, target) {
        // Default implementation now provides a small positive interaction
        // This ensures even basic interactions help both parties a bit
        return { 
            selfEnergyDelta: 2,  // Small positive energy gain
            targetEnergyDelta: 2  // Small positive energy gain for target too
        };
    }
    
    // Helper method to remember an interaction
    rememberInteraction(targetId, wasPositive) {
        this.memory.set(targetId, {
            wasPositive,
            timestamp: Date.now()
        });

        if (!this.unlimitedMemory) {
            this.cleanMemory();
        }
    }
    
    // Helper method to get the last interaction with a specific entity
    getLastInteraction(targetId) {
        return this.memory.get(targetId);
    }
    
    // Clean up memory entries older than memory duration
    cleanMemory() {
        if (this.unlimitedMemory) return;
        const now = Date.now();
        const expirationTime = this.memoryDuration * 1000; // Convert to milliseconds
        
        for (const [id, data] of this.memory.entries()) {
            if (now - data.timestamp > expirationTime) {
                this.memory.delete(id);
            }
        }
    }
}