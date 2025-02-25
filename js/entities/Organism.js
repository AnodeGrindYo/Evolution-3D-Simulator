import { EntityModel } from './EntityModel.js';

export class Organism {
    constructor(stats, behavior, position = null) {
        this.behavior = behavior;
        
        // Set organism stats
        this.energy = stats.energy || 100;
        this.speed = stats.speed || 1.0;
        this.size = stats.size || 1.0;
        this.maxLifespan = stats.lifespan || 100;
        this.reproductionRate = stats.reproductionRate || 0.005;
        
        // Tracking variables
        this.age = 0;
        this.isAlive = true;
        this.target = null;
        this.lastInteractionTime = 0;
        this.interactionCooldown = 1.2; // Reduced from 1.5 to allow more interactions
        
        // Environmental factors that can be adjusted by the simulation
        this.energyConsumptionRate = 2; // Base energy consumption per second
        this.resourceMultiplier = 1.0; // Multiplier for resource gain
        
        // Visual settings
        this.showLabel = false;
        
        // Create visual representation
        this.model = new EntityModel(this.size, this.behavior.getColor());
        
        // Set initial position or get a random one
        this.position = position || { x: 0, y: 0, z: 0 };
        this.model.setPosition(this.position.x, this.position.y, this.position.z);
        
        // Set initial direction
        this.direction = { 
            x: Math.random() * 2 - 1, 
            z: Math.random() * 2 - 1 
        };
        this.normalizeDirection();
        
        // Collision avoidance variables
        this.lastCollisionTime = 0;
        this.collisionAvoidanceTime = 0;
        this.avoidanceDirection = null;
        
        // Store previous position for reversion if collision occurs
        this.previousPosition = {...this.position};
    }
    
    get mesh() {
        return this.model.mesh;
    }
    
    update(deltaTime, world) {
        if (!this.isAlive) return;
        
        // Store previous position before moving
        this.previousPosition = {...this.position};
        
        // Increase age
        this.age += deltaTime;
        
        // Decrease energy over time based on environmental factors - but less when static
        // REDUCED ENERGY CONSUMPTION for sustainability
        const movementFactor = this.target ? 0.9 : 0.4; // Move efficiently, consume less when static
        this.energy -= deltaTime * this.energyConsumptionRate * movementFactor;
        
        // Check if organism should die
        if (this.energy <= 0 || this.age >= this.maxLifespan) {
            this.die();
            return;
        }
        
        // Update organism color based on energy
        this.updateAppearance();
        
        // Decide action based on behavior
        this.decideAction(deltaTime, world);
        
        // Move organism
        this.move(deltaTime, world);
    }
    
    decideAction(deltaTime, world) {
        // Check if enough time has passed since last interaction
        const cooldownOver = (this.age - this.lastInteractionTime) > this.interactionCooldown;
        
        if (cooldownOver) {
            // Find food if energy is below threshold - INCREASED THRESHOLD
            if (this.energy < 70) {
                const food = this.findNearestFood(world);
                if (food && !food.isConsumed) {
                    this.target = food;
                    
                    // Increased interaction range to make it easier to eat
                    if (this.isTargetInRange(food, 1.5)) {
                        this.eatFood(food);
                        this.lastInteractionTime = this.age;
                    }
                }
            } else {
                // Get all nearby organisms
                const nearbyEntities = this.getNearbyEntities(world, 5);
                
                if (nearbyEntities.length > 0) {
                    // Let behavior decide what to do with nearby entities
                    this.target = this.behavior.selectTarget(this, nearbyEntities);
                    
                    if (this.target && this.isTargetInRange(this.target, 1.5)) {
                        this.interactWithTarget(this.target);
                        this.lastInteractionTime = this.age;
                    }
                }
            }
        }
        
        // Try to reproduce with a chance affected by the resource multiplier
        // LOWERED REPRODUCTION THRESHOLD for sustainability
        const reproductionThreshold = 50;
        if (this.energy > reproductionThreshold && 
            Math.random() < this.reproductionRate * deltaTime * this.resourceMultiplier) {
            this.reproduce(world);
        }
    }
    
    findNearestFood(world) {
        const foodItems = world.getFoodItems();
        let nearestFood = null;
        let minDistance = Infinity;
        
        foodItems.forEach(food => {
            if (food.isConsumed) return;
            
            const dx = food.position.x - this.position.x;
            const dz = food.position.z - this.position.z;
            const distanceSquared = dx * dx + dz * dz;
            
            if (distanceSquared < minDistance) {
                minDistance = distanceSquared;
                nearestFood = food;
            }
        });
        
        return nearestFood;
    }
    
    eatFood(food) {
        const energyGained = food.consume();
        // INCREASED FOOD EFFICIENCY with abundant resources
        this.energy += energyGained * (1 + (this.resourceMultiplier - 1) * 0.5);
        
        // Increased energy cap
        this.energy = Math.min(this.energy, 150);
        
        // Show eating emoji
        this.model.showEmoji('🍽️');
        
        // Clear target after eating
        this.target = null;
    }
    
    interactWithTarget(target) {
        if (!target.isAlive) return;
        
        // Execute interaction based on behavior
        const interactionResult = this.behavior.interact(this, target);
        
        // Apply energy changes based on the interaction, scaled by the behavior's interaction strength
        const strengthMultiplier = this.behavior.interactionStrength || 1.0;
        
        this.energy += interactionResult.selfEnergyDelta * strengthMultiplier;
        target.energy += interactionResult.targetEnergyDelta * strengthMultiplier;
        
        // Cap energy at 100
        this.energy = Math.min(this.energy, 150);
        target.energy = Math.min(target.energy, 150);
        
        // Show interaction emoji based on the type of interaction
        if (interactionResult.selfEnergyDelta > 0) {
            // Taking energy from target
            this.model.showEmoji('😈');
            target.model.showEmoji('😠');
        } else if (interactionResult.selfEnergyDelta < 0 && interactionResult.targetEnergyDelta > 0) {
            // Giving energy to target
            this.model.showEmoji('😇');
            target.model.showEmoji('😊');
        } else {
            // Neutral interaction
            this.model.showEmoji('🤔');
            target.model.showEmoji('🤔');
        }
    }
    
    reproduce(world) {
        // Only reproduce if we have enough energy
        if (this.energy < 50) return;
        
        // Create offspring with similar traits but with some variation
        const mutationFactor = 0.2 * (world.simulation?.mutationRate || 0.1);
        
        const childStats = {
            energy: 70, // INCREASED INITIAL ENERGY for offspring to improve survival
            speed: this.speed * (1 - mutationFactor + Math.random() * mutationFactor * 2),
            size: this.size * (1 - mutationFactor + Math.random() * mutationFactor * 2),
            lifespan: this.maxLifespan * (1 - mutationFactor + Math.random() * mutationFactor * 2),
            reproductionRate: this.reproductionRate * (1 - mutationFactor + Math.random() * mutationFactor * 2)
        };
        
        // Offspring inherits parent's behavior with chance to mutate based on mutation rate
        let behaviorType = this.behavior.type;
        if (Math.random() < (world.simulation?.mutationRate || 0.1)) {
            const behaviorTypes = [
                'aggressive',
                'altruistic',
                'titfortat',
                'cooperative',
                'selfish',
                'qlearning',
                'deepq'
            ];
            behaviorType = behaviorTypes[Math.floor(Math.random() * behaviorTypes.length)];
        }
        
        // Calculate safe spawn position that doesn't overlap with other entities
        const safePosition = this.findSafeSpawnPosition(world);
        
        if (!safePosition) {
            // If no safe position found, don't reproduce
            return null;
        }
        
        // Create new organism through world's entity factory
        const offspring = world.entityFactory.createOrganism(behaviorType, safePosition, childStats);
        
        // Add offspring to world
        world.addEntity(offspring);
        
        // Show reproduction emoji
        this.model.showEmoji('❤️');
        
        // REDUCED REPRODUCTION COST to improve survival
        this.energy -= 20;
        
        return offspring;
    }
    
    findSafeSpawnPosition(world) {
        const entities = world.getEntities();
        const obstacles = world.getObstacles();
        
        // Define minimum safe distance based on size
        const safeDistance = Math.max(1.5, this.size * 2.0);
        
        // Try different positions in a spiral pattern around the parent
        const maxAttempts = 20;
        const spiralStep = 0.6; // Step size for spiral
        
        // Position directly around the parent, starting with a random angle
        let angle = Math.random() * Math.PI * 2;
        let distance = safeDistance;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Calculate position in spiral pattern
            const x = this.position.x + Math.cos(angle) * distance;
            const z = this.position.z + Math.sin(angle) * distance;
            
            const position = { x, y: 0, z };
            
            // Check if this position is safe (no overlap with other entities or obstacles)
            if (this.isPositionSafe(position, entities, obstacles, world)) {
                return position;
            }
            
            // Increase angle and distance for spiral pattern
            angle += Math.PI / 4; // 45-degree steps
            distance += spiralStep;
            
            // Check if we're going out of world bounds
            const worldBound = world.terrain.size / 2.1;
            if (Math.abs(x) > worldBound || Math.abs(z) > worldBound) {
                // Try a different direction if we're going out of bounds
                angle = Math.random() * Math.PI * 2;
                distance = safeDistance;
            }
        }
        
        // If all attempts failed, try a completely random position in the world
        const worldBound = world.terrain.size / 2.5;
        for (let attempt = 0; attempt < 5; attempt++) {
            const randomX = (Math.random() * 2 - 1) * worldBound;
            const randomZ = (Math.random() * 2 - 1) * worldBound;
            
            const position = { x: randomX, y: 0, z: randomZ };
            
            if (this.isPositionSafe(position, entities, obstacles, world)) {
                return position;
            }
        }
        
        // If all attempts fail, return null to indicate reproduction shouldn't occur
        return null;
    }
    
    isPositionSafe(position, entities, obstacles, world) {
        const myRadius = this.getBoundingRadius();
        
        // Check for overlap with other entities
        for (const entity of entities) {
            if (entity === this || !entity.isAlive) continue;
            
            const dx = position.x - entity.position.x;
            const dz = position.z - entity.position.z;
            const distanceSquared = dx * dx + dz * dz;
            const minDistance = myRadius + entity.getBoundingRadius();
            
            if (distanceSquared < minDistance * minDistance) {
                return false; // Overlap detected
            }
        }
        
        // Check for overlap with obstacles
        for (const obstacle of obstacles) {
            const obstaclePos = obstacle.userData.position;
            const obstacleRadius = obstacle.userData.boundingRadius;
            
            const dx = position.x - obstaclePos.x;
            const dz = position.z - obstaclePos.z;
            const distanceSquared = dx * dx + dz * dz;
            const minDistance = myRadius + obstacleRadius;
            
            if (distanceSquared < minDistance * minDistance) {
                return false; // Overlap detected
            }
        }
        
        // Check for overlap with food items
        for (const food of world.getFoodItems()) {
            if (food.isConsumed) continue;
            
            const dx = position.x - food.position.x;
            const dz = position.z - food.position.z;
            const distanceSquared = dx * dx + dz * dz;
            const minDistance = myRadius + food.getBoundingRadius();
            
            if (distanceSquared < minDistance * minDistance) {
                return false; // Overlap detected
            }
        }
        
        return true; // Position is safe
    }
    
    move(deltaTime, world) {
        // Check if we're in collision avoidance mode
        if (this.collisionAvoidanceTime > 0) {
            this.collisionAvoidanceTime -= deltaTime;
            
            if (this.avoidanceDirection) {
                this.direction = this.avoidanceDirection;
                this.normalizeDirection();
            }
            
            if (this.collisionAvoidanceTime <= 0) {
                this.avoidanceDirection = null;
            }
        } else if (this.target && (this.target.isAlive === undefined || this.target.isAlive) && 
            (this.target.isConsumed === undefined || !this.target.isConsumed)) {
            // Move toward target
            this.direction = {
                x: this.target.position.x - this.position.x,
                z: this.target.position.z - this.position.z
            };
            this.normalizeDirection();
        } else {
            // Random movement with occasional direction changes
            if (Math.random() < 0.02) {
                this.direction = {
                    x: Math.random() * 2 - 1,
                    z: Math.random() * 2 - 1
                };
                this.normalizeDirection();
            }
            
            this.target = null;
        }
        
        // Calculate movement
        const moveDistance = this.speed * deltaTime;
        
        // Calculate new position
        const newPosition = {
            x: this.position.x + this.direction.x * moveDistance,
            y: this.position.y,
            z: this.position.z + this.direction.z * moveDistance
        };
        
        // Check for collisions before moving
        const collision = this.checkCollision(newPosition, world);
        
        if (!collision) {
            // Update position if no collision
            this.position = newPosition;
        } else {
            // Handle collision by moving in a different direction for a short time
            this.handleCollision(collision, world);
            
            // Revert to previous position to prevent passing through
            this.position = {...this.previousPosition};
            
            // Try moving in the new avoidance direction, but only a small step
            if (this.avoidanceDirection) {
                const safeDistance = moveDistance * 0.2; // much smaller step
                const safePosition = {
                    x: this.position.x + this.avoidanceDirection.x * safeDistance,
                    y: this.position.y,
                    z: this.position.z + this.avoidanceDirection.z * safeDistance
                };
                
                // Check if this smaller step would cause a collision
                if (!this.checkCollision(safePosition, world)) {
                    this.position = safePosition;
                }
            }
        }
        
        // Boundary checks (keep within world bounds)
        const worldBound = world.terrain.size / 2.1; // Slightly smaller than terrain size
        this.position.x = Math.max(-worldBound, Math.min(worldBound, this.position.x));
        this.position.z = Math.max(-worldBound, Math.min(worldBound, this.position.z));
        
        // Update visual model
        this.model.setPosition(this.position.x, this.position.y, this.position.z);
        
        // Update rotation to face direction of movement
        const angle = Math.atan2(this.direction.x, this.direction.z);
        this.model.setRotation(0, angle, 0);
    }
    
    checkCollision(newPosition, world) {
        const myRadius = this.getBoundingRadius();
        
        // Check collision with other organisms
        const entities = world.getEntities();
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (entity === this || !entity.isAlive) continue;
            
            const dx = newPosition.x - entity.position.x;
            const dz = newPosition.z - entity.position.z;
            const distanceSquared = dx * dx + dz * dz;
            const minDistance = myRadius + entity.getBoundingRadius();
            
            if (distanceSquared < minDistance * minDistance) {
                return { type: 'entity', entity: entity };
            }
        }
        
        // Check collision with obstacles (trees, rocks)
        const obstacles = world.getObstacles();
        for (let i = 0; i < obstacles.length; i++) {
            const obstacle = obstacles[i];
            const obstaclePos = obstacle.userData.position;
            const obstacleRadius = obstacle.userData.boundingRadius;
            
            const dx = newPosition.x - obstaclePos.x;
            const dz = newPosition.z - obstaclePos.z;
            const distanceSquared = dx * dx + dz * dz;
            const minDistance = myRadius + obstacleRadius;
            
            if (distanceSquared < minDistance * minDistance) {
                return { type: 'obstacle', obstacle: obstacle };
            }
        }
        
        return null; // No collision
    }
    
    handleCollision(collision, world) {
        // Only change direction if we haven't just had a collision
        const now = this.age;
        if (now - this.lastCollisionTime < 0.5) return;
        
        this.lastCollisionTime = now;
        
        // Set collision avoidance time - longer to ensure organisms don't immediately try to go back
        this.collisionAvoidanceTime = 2.0; // Increased from 1.5 to ensure longer avoidance time
        
        if (collision.type === 'entity') {
            // Get direction away from the collided entity
            const awayX = this.position.x - collision.entity.position.x;
            const awayZ = this.position.z - collision.entity.position.z;
            
            // Normalize this vector
            const length = Math.sqrt(awayX * awayX + awayZ * awayZ);
            let normalizedAwayX = awayX;
            let normalizedAwayZ = awayZ;
            
            if (length > 0) {
                normalizedAwayX = awayX / length;
                normalizedAwayZ = awayZ / length;
            }
            
            // Add some randomness to prevent getting stuck
            const randomAngle = (Math.random() - 0.5) * Math.PI * 0.3; // Reduced randomness
            const cos = Math.cos(randomAngle);
            const sin = Math.sin(randomAngle);
            
            this.avoidanceDirection = {
                x: normalizedAwayX * cos - normalizedAwayZ * sin,
                z: normalizedAwayX * sin + normalizedAwayZ * cos
            };
        } else if (collision.type === 'obstacle') {
            // Get direction away from the collided obstacle
            const obstaclePos = collision.obstacle.userData.position;
            const awayX = this.position.x - obstaclePos.x;
            const awayZ = this.position.z - obstaclePos.z;
            
            // Normalize this vector
            const length = Math.sqrt(awayX * awayX + awayZ * awayZ);
            let normalizedAwayX = awayX;
            let normalizedAwayZ = awayZ;
            
            if (length > 0) {
                normalizedAwayX = awayX / length;
                normalizedAwayZ = awayZ / length;
            }
            
            // Add some randomness
            const randomAngle = (Math.random() - 0.5) * Math.PI * 0.3; // Reduced randomness
            const cos = Math.cos(randomAngle);
            const sin = Math.sin(randomAngle);
            
            this.avoidanceDirection = {
                x: normalizedAwayX * cos - normalizedAwayZ * sin,
                z: normalizedAwayX * sin + normalizedAwayZ * cos
            };
        } else {
            // Random direction as fallback
            this.avoidanceDirection = {
                x: Math.random() * 2 - 1,
                z: Math.random() * 2 - 1
            };
        }
        
        this.normalizeDirection();
    }
    
    normalizeDirection() {
        const length = Math.sqrt(this.direction.x * this.direction.x + this.direction.z * this.direction.z);
        if (length > 0) {
            this.direction.x /= length;
            this.direction.z /= length;
        }
    }
    
    updateAppearance() {
        // Update size based on energy
        const scaleFactor = 0.8 + (this.energy / 100) * 0.4;
        this.model.setScale(this.size * scaleFactor, this.size * scaleFactor, this.size * scaleFactor);
        
        // Pulse animation for low energy
        if (this.energy < 30) {
            const pulseIntensity = 0.8 + Math.sin(this.age * 5) * 0.2;
            this.model.setColor(
                this.behavior.getColor().r * pulseIntensity,
                this.behavior.getColor().g * pulseIntensity,
                this.behavior.getColor().b * pulseIntensity
            );
        } else {
            this.model.setColor(
                this.behavior.getColor().r,
                this.behavior.getColor().g,
                this.behavior.getColor().b
            );
        }
        
        // Update label visibility
        this.model.setLabelVisibility(this.showLabel);
        if (this.showLabel) {
            this.model.updateLabel(`${this.behavior.type} (${Math.floor(this.energy)})`);
        }
        
        // Update health bar
        const healthPercentage = this.energy / 150; // Normalized to [0,1]
        this.model.updateHealthBar(healthPercentage);
        this.model.setHealthBarVisibility(true);
    }
    
    getNearbyEntities(world, radius) {
        return world.getEntities().filter(entity => {
            if (entity === this || !entity.isAlive) return false;
            
            const dx = entity.position.x - this.position.x;
            const dz = entity.position.z - this.position.z;
            const distanceSquared = dx * dx + dz * dz;
            
            return distanceSquared <= radius * radius;
        });
    }
    
    isTargetInRange(target, range) {
        const dx = target.position.x - this.position.x;
        const dz = target.position.z - this.position.z;
        const distanceSquared = dx * dx + dz * dz;
        
        return distanceSquared <= range * range;
    }
    
    die() {
        this.isAlive = false;
        this.model.startDeathAnimation();
    }
    
    getBehaviorType() {
        return this.behavior.type;
    }
    
    // For collision detection
    getBoundingRadius() {
        // Increase the bounding radius to ensure proper collision detection
        // This value is multiplied by the size to ensure larger organisms have larger collision areas
        return this.size * 0.8; // Increased from 0.75 to ensure better collision detection
    }
    
    // For saving/loading
    serialize() {
        return {
            type: this.behavior.type,
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            stats: {
                energy: this.energy,
                speed: this.speed,
                size: this.size,
                lifespan: this.maxLifespan,
                reproductionRate: this.reproductionRate
            },
            age: this.age
        };
    }
}