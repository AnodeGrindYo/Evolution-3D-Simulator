export class SimulationManager {
    constructor(world, statistics) {
        this.world = world;
        this.statistics = statistics;
        this.speed = 1.0;
        this.isPaused = false;
        this.initialPopulationSize = 20;
        
        // Environment settings
        this.resourceAbundance = 1.0;
        this.environmentalHarshness = 0.8;
        this.foodSpawnRate = 1.5;
        this.foodEnergyValue = 30;
        
        // Organism base parameters
        this.baseEnergy = 120;
        this.baseSpeed = 1.0;
        this.baseSize = 1.0;
        this.baseLifespan = 120;
        this.baseReproductionRate = 0.008;
        this.mutationRate = 0.1;
        
        // Behavior parameters - store multipliers for each behavior
        this.behaviorParameters = {
            aggressive: { interactionStrength: 1.0, memoryDuration: 50 },
            altruistic: { interactionStrength: 1.0, memoryDuration: 50 },
            titfortat: { interactionStrength: 1.0, memoryDuration: 50 },
            cooperative: { interactionStrength: 1.0, memoryDuration: 50 },
            selfish: { interactionStrength: 1.0, memoryDuration: 50 },
            qlearning: { interactionStrength: 1.0, memoryDuration: 50 },
            deepq: { interactionStrength: 1.0, memoryDuration: 50 }
        };
        
        // Visual settings
        this.displayLabels = false;
        this.showInteractions = true;
        this.showHealthBars = false;
        
        // Food spawning timer
        this.timeSinceLastFoodSpawn = 0;
        
        // Initialize the simulation
        this.initialize();
    }
    
    initialize() {
        // Create initial population with non-overlapping positions
        this.createInitialPopulation();
        
        // Create initial food
        const initialFoodCount = Math.floor(this.initialPopulationSize * 0.5);
        for (let i = 0; i < initialFoodCount; i++) {
            this.spawnFood();
        }
    }
    
    createInitialPopulation() {
        let organismsCreated = 0;
        const maxAttempts = this.initialPopulationSize * 3; // Allow multiple attempts per organism
        let attempts = 0;
        
        while (organismsCreated < this.initialPopulationSize && attempts < maxAttempts) {
            attempts++;
            
            // Find a safe position for this organism
            const position = this.findSafePosition();
            
            if (position) {
                const organism = this.createOrganism('random', position);
                this.world.addEntity(organism);
                organismsCreated++;
            }
        }
        
        if (organismsCreated < this.initialPopulationSize) {
            console.warn(`Only able to place ${organismsCreated} organisms safely out of ${this.initialPopulationSize} requested.`);
        }
    }
    
    findSafePosition() {
        // Get all existing entities and obstacles
        const entities = this.world.getEntities();
        const obstacles = this.world.getObstacles();
        const foods = this.world.getFoodItems();
        
        // Define the minimum safe distance
        const safeDistance = 2.0;
        
        // Try several random positions
        const maxAttempts = 20;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const position = this.world.getRandomPosition();
            let isSafe = true;
            
            // Check distance from all entities
            for (const entity of entities) {
                if (!entity.isAlive) continue;
                
                const dx = position.x - entity.position.x;
                const dz = position.z - entity.position.z;
                const distanceSquared = dx * dx + dz * dz;
                
                if (distanceSquared < safeDistance * safeDistance) {
                    isSafe = false;
                    break;
                }
            }
            
            if (!isSafe) continue;
            
            // Check distance from all obstacles
            for (const obstacle of obstacles) {
                const obstaclePos = obstacle.userData.position;
                const obstacleRadius = obstacle.userData.boundingRadius || 0.5;
                
                const dx = position.x - obstaclePos.x;
                const dz = position.z - obstaclePos.z;
                const distanceSquared = dx * dx + dz * dz;
                const minDistance = safeDistance + obstacleRadius;
                
                if (distanceSquared < minDistance * minDistance) {
                    isSafe = false;
                    break;
                }
            }
            
            if (!isSafe) continue;
            
            // Check distance from all food items
            for (const food of foods) {
                if (food.isConsumed) continue;
                
                const dx = position.x - food.position.x;
                const dz = position.z - food.position.z;
                const distanceSquared = dx * dx + dz * dz;
                
                if (distanceSquared < safeDistance * safeDistance) {
                    isSafe = false;
                    break;
                }
            }
            
            if (isSafe) {
                return position;
            }
        }
        
        // If all attempts failed, return null
        return null;
    }
    
    createOrganism(behaviorType, position) {
        // Create stats based on current simulation parameters
        const stats = {
            energy: this.baseEnergy * (0.8 + Math.random() * 0.4),
            speed: this.baseSpeed * (0.8 + Math.random() * 0.4),
            size: this.baseSize * (0.8 + Math.random() * 0.4),
            lifespan: this.baseLifespan * (0.8 + Math.random() * 0.4),
            reproductionRate: this.baseReproductionRate * (0.8 + Math.random() * 0.4)
        };
        
        return this.world.entityFactory.createOrganism(behaviorType, position, stats);
    }
    
    spawnFood() {
        // Find a safe position that doesn't overlap with existing entities
        const position = this.findSafeFoodPosition();
        
        if (position) {
            const food = this.world.entityFactory.createFood('random', position, this.foodEnergyValue);
            this.world.addFood(food);
            return food;
        }
        
        return null;
    }
    
    findSafeFoodPosition() {
        // Similar to findSafePosition but optimized for food
        const entities = this.world.getEntities();
        const obstacles = this.world.getObstacles();
        const foods = this.world.getFoodItems();
        
        // Food can be closer to other objects than organisms
        const safeDistance = 1.2;
        
        const maxAttempts = 15;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const position = this.world.getRandomPosition();
            let isSafe = true;
            
            // Check distance from all entities
            for (const entity of entities) {
                if (!entity.isAlive) continue;
                
                const dx = position.x - entity.position.x;
                const dz = position.z - entity.position.z;
                const distanceSquared = dx * dx + dz * dz;
                
                if (distanceSquared < safeDistance * safeDistance) {
                    isSafe = false;
                    break;
                }
            }
            
            if (!isSafe) continue;
            
            // Check distance from all obstacles
            for (const obstacle of obstacles) {
                const obstaclePos = obstacle.userData.position;
                const obstacleRadius = obstacle.userData.boundingRadius || 0.5;
                
                const dx = position.x - obstaclePos.x;
                const dz = position.z - obstaclePos.z;
                const distanceSquared = dx * dx + dz * dz;
                const minDistance = safeDistance + obstacleRadius;
                
                if (distanceSquared < minDistance * minDistance) {
                    isSafe = false;
                    break;
                }
            }
            
            if (!isSafe) continue;
            
            // Check distance from all food items
            for (const food of foods) {
                if (food.isConsumed) continue;
                
                const dx = position.x - food.position.x;
                const dz = position.z - food.position.z;
                const distanceSquared = dx * dx + dz * dz;
                
                if (distanceSquared < safeDistance * safeDistance) {
                    isSafe = false;
                    break;
                }
            }
            
            if (isSafe) {
                return position;
            }
        }
        
        // If all attempts failed, return a completely random position as last resort
        return this.world.getRandomPosition();
    }
    
    update(deltaTime) {
        if (this.isPaused) return;
        
        // Apply simulation speed
        const adjustedDeltaTime = deltaTime * this.speed;
        
        // Apply environmental factors - REDUCED energy consumption for sustainability
        const energyConsumptionRate = 1.0 * this.environmentalHarshness;
        
        // Update food spawning
        this.timeSinceLastFoodSpawn += adjustedDeltaTime;
        
        // Get current population count for adaptive food spawning
        const currentPopulation = this.world.getEntities().filter(e => e.isAlive).length;
        
        // Base spawn interval, but shorter when population is low - IMPROVED food spawning
        let foodSpawnInterval = 4 / (this.foodSpawnRate * this.resourceAbundance);
        if (currentPopulation < 10) {
            foodSpawnInterval *= 0.3; // Spawn food much faster when population is low
        }
        
        if (this.timeSinceLastFoodSpawn >= foodSpawnInterval) {
            // Spawn multiple food items at once - INCREASED food count
            const foodCount = this.resourceAbundance >= 1.5 ? Math.ceil(this.resourceAbundance) : 
                             (currentPopulation < 5 ? 4 : 
                              currentPopulation < 10 ? 3 : 1);
                              
            for (let i = 0; i < foodCount; i++) {
                this.spawnFood();
            }
            this.timeSinceLastFoodSpawn = 0;
        }
        
        // Update all entities
        const entities = this.world.getEntities();
        const foods = this.world.getFoodItems();
        
        // Track dead entities to remove
        const deadEntities = [];
        const consumedFoods = [];
        
        // Update each entity
        entities.forEach(entity => {
            // Apply environmental factors to entity
            entity.energyConsumptionRate = energyConsumptionRate;
            entity.resourceMultiplier = this.resourceAbundance;
            
            // Apply behavior parameters
            if (entity.behavior) {
                const behavior = entity.getBehaviorType();
                if (this.behaviorParameters[behavior]) {
                    entity.behavior.interactionStrength = this.behaviorParameters[behavior].interactionStrength;
                    entity.behavior.memoryDuration = this.behaviorParameters[behavior].memoryDuration;
                }
            }
            
            // Update the entity
            entity.update(adjustedDeltaTime, this.world);
            
            // Apply visual settings
            entity.showLabel = this.displayLabels;
            
            // Collect dead entities
            if (!entity.isAlive) {
                deadEntities.push(entity);
            }
        });
        
        // Update food items
        foods.forEach(food => {
            food.update(adjustedDeltaTime);
            
            if (food.isConsumed) {
                consumedFoods.push(food);
            }
        });
        
        // Remove dead entities after a delay
        deadEntities.forEach(entity => {
            setTimeout(() => {
                this.world.removeEntity(entity);
            }, 1500); // After death animation completes
        });
        
        // Remove consumed food after a delay
        consumedFoods.forEach(food => {
            setTimeout(() => {
                this.world.removeFood(food);
            }, 500); // After consumption animation completes
        });
        
        // Update statistics
        this.statistics.update(entities);
        
        // Safety mechanism: Add organisms if population falls below critical level
        if (currentPopulation === 0) {
            console.log("Population extinct, reintroducing organisms...");
            for (let i = 0; i < 5; i++) {
                this.addOrganism('random');
            }
        }
        else if (currentPopulation < 3 && Math.random() < 0.1) {
            // Small chance to add an organism when population is very low
            this.addOrganism('random');
        }
    }
    
    // Simulation control methods
    setSpeed(speed) {
        this.speed = speed;
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        return this.isPaused;
    }
    
    reset() {
        // Clear all entities
        this.world.reset();
        
        // Reset statistics
        this.statistics.reset();
        
        // Apply any pending terrain changes
        if (this.pendingWorldSize) {
            this.world.terrain.setSize(this.pendingWorldSize);
            this.world.terrain.regenerateTerrain();
            this.pendingWorldSize = null;
        }
        
        // Reinitialize
        this.initialize();
    }
    
    // Population control methods
    setInitialPopulationSize(size) {
        this.initialPopulationSize = size;
    }
    
    addOrganism(behaviorType) {
        const position = this.world.getRandomPosition();
        const organism = this.createOrganism(behaviorType, position);
        this.world.addEntity(organism);
    }
    
    addOrganismAt(behaviorType, position) {
        const organism = this.createOrganism(behaviorType, position);
        this.world.addEntity(organism);
        return organism;
    }
    
    addFoodAt(type, position) {
        const food = this.world.entityFactory.createFood(type, position, this.foodEnergyValue);
        this.world.addFood(food);
        return food;
    }
    
    addObstacleAt(type, position) {
        let obstacle;
        if (type === 'tree') {
            obstacle = this.world.entityFactory.createTree(position);
        } else if (type === 'rock') {
            obstacle = this.world.entityFactory.createRock(position);
        }
        
        if (obstacle) {
            this.world.addObstacle(obstacle);
        }
        return obstacle;
    }
    
    // Environment settings methods
    setWorldSize(size) {
        this.pendingWorldSize = size;
    }
    
    getWorldSize() {
        return this.world.terrain.size;
    }
    
    setResourceAbundance(abundance) {
        this.resourceAbundance = abundance;
        
        // When abundance is high, spawn extra food immediately
        if (abundance > 1.5) {
            const extraFoodCount = Math.ceil(abundance * 2);
            for (let i = 0; i < extraFoodCount; i++) {
                this.spawnFood();
            }
        }
    }
    
    setEnvironmentalHarshness(harshness) {
        this.environmentalHarshness = harshness;
    }
    
    setFoodSpawnRate(rate) {
        this.foodSpawnRate = rate;
    }
    
    setFoodEnergyValue(value) {
        this.foodEnergyValue = value;
    }
    
    // Organism parameter methods
    setBaseEnergy(energy) {
        this.baseEnergy = energy;
    }
    
    setBaseSpeed(speed) {
        this.baseSpeed = speed;
    }
    
    setBaseSize(size) {
        this.baseSize = size;
    }
    
    setBaseLifespan(lifespan) {
        this.baseLifespan = lifespan;
    }
    
    setBaseReproductionRate(rate) {
        this.baseReproductionRate = rate;
    }
    
    setMutationRate(rate) {
        this.mutationRate = rate;
    }
    
    // Behavior parameter methods
    setBehaviorInteractionStrength(behavior, strength) {
        if (this.behaviorParameters[behavior]) {
            this.behaviorParameters[behavior].interactionStrength = strength;
        }
    }
    
    getBehaviorInteractionStrength(behavior) {
        return this.behaviorParameters[behavior]?.interactionStrength || 1.0;
    }
    
    setBehaviorMemoryDuration(behavior, duration) {
        if (this.behaviorParameters[behavior]) {
            this.behaviorParameters[behavior].memoryDuration = duration;
        }
    }
    
    getBehaviorMemoryDuration(behavior) {
        return this.behaviorParameters[behavior]?.memoryDuration || 50;
    }
    
    // Visual settings methods
    setDisplayLabels(display) {
        this.displayLabels = display;
    }
    
    setShowInteractions(show) {
        this.showInteractions = show;
    }
    
    setShowHealthBars(show) {
        this.showHealthBars = show;
        
        // Update all existing entities
        const entities = this.world.getEntities();
        entities.forEach(entity => {
            if (entity.model && entity.model.setHealthBarVisibility) {
                entity.model.setHealthBarVisibility(show);
            }
        });
    }

    setUnlimitedMemoryForBehavior(behavior, enabled) {
        this.world.getEntities().forEach(entity => {
            if (entity.behavior && entity.behavior.type === behavior) {
                entity.behavior.setUnlimitedMemory(enabled);
            }
        });
    }
    
    getUnlimitedMemoryForBehavior(behavior) {
        const entity = this.world.getEntities().find(e => e.behavior && e.behavior.type === behavior);
        return entity ? entity.behavior.getUnlimitedMemory() : false;
    }
    
    
    // Save and load functionality
    serialize() {
        // Create a serializable version of the current simulation state
        return {
            // Basic simulation settings
            speed: this.speed,
            initialPopulationSize: this.initialPopulationSize,
            
            // Environment settings
            worldSize: this.world.terrain.size,
            resourceAbundance: this.resourceAbundance,
            environmentalHarshness: this.environmentalHarshness,
            foodSpawnRate: this.foodSpawnRate,
            foodEnergyValue: this.foodEnergyValue,
            
            // Organism parameters
            baseEnergy: this.baseEnergy,
            baseSpeed: this.baseSpeed,
            baseSize: this.baseSize,
            baseLifespan: this.baseLifespan,
            baseReproductionRate: this.baseReproductionRate,
            mutationRate: this.mutationRate,
            
            // Behavior parameters
            behaviorParameters: JSON.parse(JSON.stringify(this.behaviorParameters)),
            
            // Visual settings
            displayLabels: this.displayLabels,
            showInteractions: this.showInteractions,
            showHealthBars: this.showHealthBars,
            
            // Current entities
            entities: this.world.getEntities().filter(e => e.isAlive).map(entity => entity.serialize()),
            
            // Food items
            foods: this.world.getFoodItems().filter(f => !f.isConsumed).map(food => ({
                type: food.type,
                position: { x: food.position.x, y: food.position.y, z: food.position.z },
                energyValue: food.energyValue
            })),
            
            // Obstacles
            obstacles: this.world.getObstacles().map(obstacle => ({
                type: obstacle.userData.type,
                position: { x: obstacle.userData.position.x, y: obstacle.userData.position.y, z: obstacle.userData.position.z }
            }))
        };
    }
    
    deserialize(data) {
        // Reset the world
        this.world.reset();
        
        // Apply basic simulation settings
        this.speed = data.speed;
        this.initialPopulationSize = data.initialPopulationSize;
        
        // Apply environment settings
        if (data.worldSize !== this.world.terrain.size) {
            this.world.terrain.setSize(data.worldSize);
            this.world.terrain.regenerateTerrain();
        }
        
        this.resourceAbundance = data.resourceAbundance;
        this.environmentalHarshness = data.environmentalHarshness;
        this.foodSpawnRate = data.foodSpawnRate || 1.0;
        this.foodEnergyValue = data.foodEnergyValue || 20;
        
        // Apply organism parameters
        this.baseEnergy = data.baseEnergy;
        this.baseSpeed = data.baseSpeed;
        this.baseSize = data.baseSize;
        this.baseLifespan = data.baseLifespan;
        this.baseReproductionRate = data.baseReproductionRate;
        this.mutationRate = data.mutationRate;
        
        // Apply behavior parameters
        this.behaviorParameters = data.behaviorParameters;
        
        // Apply visual settings
        this.displayLabels = data.displayLabels;
        this.showInteractions = data.showInteractions;
        this.showHealthBars = data.showHealthBars;
        
        // Recreate entities
        if (data.entities) {
            data.entities.forEach(entityData => {
                const organism = this.createOrganism(entityData.type, entityData.position);
                
                // Apply saved stats
                organism.energy = entityData.stats.energy;
                organism.speed = entityData.stats.speed;
                organism.size = entityData.stats.size;
                organism.maxLifespan = entityData.stats.lifespan;
                organism.reproductionRate = entityData.stats.reproductionRate;
                organism.age = entityData.age || 0;
                
                this.world.addEntity(organism);
            });
        }
        
        // Recreate food items
        if (data.foods) {
            data.foods.forEach(foodData => {
                const food = this.world.entityFactory.createFood(
                    foodData.type, 
                    foodData.position,
                    foodData.energyValue
                );
                this.world.addFood(food);
            });
        }
        
        // Recreate obstacles
        if (data.obstacles) {
            data.obstacles.forEach(obstacleData => {
                this.addObstacleAt(obstacleData.type, obstacleData.position);
            });
        }
        
        // Reset statistics
        this.statistics.reset();
    }
}