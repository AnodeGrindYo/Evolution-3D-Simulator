import { BaseBehavior } from './BaseBehavior.js';

export class TitForTatBehavior extends BaseBehavior {
    constructor() {
        super('titfortat', { r: 0.9, g: 0.6, b: 0.1 }); // Orange color
    }
    
    selectTarget(self, nearbyEntities) {
        // Tit-for-tat prefers to interact with entities it has interacted with before
        const entitiesWithHistory = nearbyEntities.filter(entity => 
            this.memory.has(entity.mesh.id)
        );
        
        if (entitiesWithHistory.length > 0) {
            return super.selectTarget(self, entitiesWithHistory);
        }
        
        // If no history, select randomly (trying new partners)
        if (nearbyEntities.length > 0) {
            return nearbyEntities[Math.floor(Math.random() * nearbyEntities.length)];
        }
        
        return null;
    }
    
    interact(self, target) {
        // Check if we have interacted with this target before
        const lastInteraction = this.getLastInteraction(target.mesh.id);
        
        // First interaction is always cooperative
        if (!lastInteraction) {
            const energyToShare = 5;
            
            this.rememberInteraction(target.mesh.id, true);
            
            return {
                selfEnergyDelta: -energyToShare,
                targetEnergyDelta: energyToShare
            };
        }
        
        // If the last interaction was positive, cooperate
        if (lastInteraction.wasPositive) {
            const energyToShare = 5;
            
            this.rememberInteraction(target.mesh.id, true);
            
            return {
                selfEnergyDelta: -energyToShare,
                targetEnergyDelta: energyToShare
            };
        } 
        // Otherwise, retaliate
        else {
            const energyToTake = Math.min(8, target.energy * 0.15);
            
            this.rememberInteraction(target.mesh.id, false);
            
            return {
                selfEnergyDelta: energyToTake,
                targetEnergyDelta: -energyToTake
            };
        }
    }
}