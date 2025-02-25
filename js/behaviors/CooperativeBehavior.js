import { BaseBehavior } from './BaseBehavior.js';

export class CooperativeBehavior extends BaseBehavior {
    constructor() {
        super('cooperative', { r: 0.2, g: 0.8, b: 0.2 }); // Green color
    }
    
    selectTarget(self, nearbyEntities) {
        // Cooperative organisms prefer to interact with other cooperative organisms
        const cooperativeEntities = nearbyEntities.filter(entity => 
            entity.getBehaviorType() === 'cooperative'
        );
        
        if (cooperativeEntities.length > 0) {
            return super.selectTarget(self, cooperativeEntities);
        }
        
        // If no cooperative entities, select based on past positive interactions
        const entitiesWithPositiveHistory = nearbyEntities.filter(entity => {
            const history = this.getLastInteraction(entity.mesh.id);
            return history && history.wasPositive;
        });
        
        if (entitiesWithPositiveHistory.length > 0) {
            return super.selectTarget(self, entitiesWithPositiveHistory);
        }
        
        // Fall back to default selection
        return super.selectTarget(self, nearbyEntities);
    }
    
    interact(self, target) {
        // Cooperative organisms share resources
        const energyExchange = 8; // Increased from 7 to make cooperation more beneficial
        
        // Remember this as a positive interaction
        this.rememberInteraction(target.mesh.id, true);
        
        return {
            selfEnergyDelta: -energyExchange * 0.7, // Give less than we get to make cooperation advantageous
            targetEnergyDelta: energyExchange
        };
    }
}