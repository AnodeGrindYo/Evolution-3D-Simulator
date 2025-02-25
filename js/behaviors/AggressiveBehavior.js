import { BaseBehavior } from './BaseBehavior.js';

export class AggressiveBehavior extends BaseBehavior {
    constructor() {
        super('aggressive', { r: 0.9, g: 0.2, b: 0.2 }); // Red color
    }
    
    selectTarget(self, nearbyEntities) {
        // Aggressive organisms prefer weaker targets
        const weakerEntities = nearbyEntities.filter(entity => 
            entity.energy < self.energy || entity.size < self.size
        );
        
        if (weakerEntities.length > 0) {
            // Pick the closest weaker entity
            return super.selectTarget(self, weakerEntities);
        }
        
        // If no weaker entities, just pick the closest
        return super.selectTarget(self, nearbyEntities);
    }
    
    interact(self, target) {
        // Aggressive organisms attempt to steal energy from others
        const energyStolen = Math.min(10, target.energy * 0.2);
        
        // Remember this interaction
        this.rememberInteraction(target.mesh.id, false);
        
        return {
            selfEnergyDelta: energyStolen,
            targetEnergyDelta: -energyStolen
        };
    }
}