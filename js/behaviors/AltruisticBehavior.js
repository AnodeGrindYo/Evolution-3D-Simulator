import { BaseBehavior } from './BaseBehavior.js';

export class AltruisticBehavior extends BaseBehavior {
    constructor() {
        super('altruistic', { r: 0.2, g: 0.7, b: 0.9 }); // Light blue color
    }
    
    selectTarget(self, nearbyEntities) {
        // Altruistic organisms prefer to help those with low energy
        const entitiesNeedingHelp = nearbyEntities.filter(entity => 
            entity.energy < 50 // Entities with less than 50 energy need help
        );
        
        if (entitiesNeedingHelp.length > 0) {
            // Sort by energy (lowest first)
            entitiesNeedingHelp.sort((a, b) => a.energy - b.energy);
            return entitiesNeedingHelp[0]; // Help the entity with lowest energy
        }
        
        // If no entities need help, select normally
        return super.selectTarget(self, nearbyEntities);
    }
    
    interact(self, target) {
        if (self.energy > 30) { // Only help if we have enough energy
            // Amount of energy to share
            const energyToShare = Math.min(10, self.energy * 0.15);
            
            // Remember this positive interaction
            this.rememberInteraction(target.mesh.id, true);
            
            return {
                selfEnergyDelta: -energyToShare,
                targetEnergyDelta: energyToShare
            };
        }
        
        // If we don't have enough energy, do nothing
        return {
            selfEnergyDelta: 0,
            targetEnergyDelta: 0
        };
    }
}