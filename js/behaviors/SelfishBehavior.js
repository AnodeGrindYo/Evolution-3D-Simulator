import { BaseBehavior } from './BaseBehavior.js';

export class SelfishBehavior extends BaseBehavior {
    constructor() {
        super('selfish', { r: 0.5, g: 0.5, b: 0.5 }); // Gray color
    }
    
    selectTarget(self, nearbyEntities) {
        // Selfish organisms prefer targets with more energy
        const targetsByEnergy = [...nearbyEntities].sort((a, b) => b.energy - a.energy);
        
        if (targetsByEnergy.length > 0) {
            return targetsByEnergy[0]; // Select the entity with most energy
        }
        
        return null;
    }
    
    interact(self, target) {
        // Selfish organisms try to take energy without giving any
        const energyToTake = Math.min(5, target.energy * 0.1);
        
        // Remember this as a negative interaction
        this.rememberInteraction(target.mesh.id, false);
        
        return {
            selfEnergyDelta: energyToTake,
            targetEnergyDelta: -energyToTake
        };
    }
}