export class StatisticsTracker {
    constructor() {
        this.stats = {
            totalPopulation: 0,
            behaviorCounts: {
                aggressive: 0,
                altruistic: 0,
                titfortat: 0,
                cooperative: 0,
                selfish: 0,
                qlearning: 0,
                deepq: 0
            },
            history: {
                population: [],
                behaviors: {}
            }
        };
        
        // Initialize history for each behavior type
        Object.keys(this.stats.behaviorCounts).forEach(behavior => {
            this.stats.history.behaviors[behavior] = [];
        });
        
        this.lastUpdateTime = Date.now();
        this.updateInterval = 1000; // Update stats every second
        
        // Track births and deaths for reproduction rate calculation
        this.births = 0;
        this.deaths = 0;
        this.lastBirthCount = 0;
        this.lastDeathCount = 0;
        this.lastPopulation = 0;
    }
    
    update(entities) {
        const now = Date.now();
        
        // Only update stats periodically to avoid performance issues
        if (now - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        
        this.lastUpdateTime = now;
        
        // Store previous population count for reproduction rate calculation
        const previousPopulation = this.stats.totalPopulation;
        
        // Reset counts
        this.stats.totalPopulation = 0;
        
        Object.keys(this.stats.behaviorCounts).forEach(behavior => {
            this.stats.behaviorCounts[behavior] = 0;
        });
        
        // Count living entities by behavior
        entities.forEach(entity => {
            if (entity.isAlive) {
                this.stats.totalPopulation++;
                
                const behaviorType = entity.getBehaviorType();
                if (this.stats.behaviorCounts.hasOwnProperty(behaviorType)) {
                    this.stats.behaviorCounts[behaviorType]++;
                }
            }
        });
        
        // Record data for history
        this.stats.history.population.push({
            time: now,
            count: this.stats.totalPopulation
        });
        
        Object.keys(this.stats.behaviorCounts).forEach(behavior => {
            this.stats.history.behaviors[behavior].push({
                time: now,
                count: this.stats.behaviorCounts[behavior]
            });
        });
        
        // Limit history length to prevent memory issues
        const maxHistoryLength = 100;
        
        if (this.stats.history.population.length > maxHistoryLength) {
            this.stats.history.population.shift();
        }
        
        Object.keys(this.stats.history.behaviors).forEach(behavior => {
            if (this.stats.history.behaviors[behavior].length > maxHistoryLength) {
                this.stats.history.behaviors[behavior].shift();
            }
        });
        
        // Calculate births and deaths based on population changes
        if (this.lastPopulation > 0) {
            const populationChange = this.stats.totalPopulation - this.lastPopulation;
            
            // If population increased, we had more births than deaths
            if (populationChange > 0) {
                this.births += populationChange;
            } 
            // If population decreased, we had more deaths than births
            else if (populationChange < 0) {
                this.deaths += Math.abs(populationChange);
            }
        }
        
        this.lastPopulation = this.stats.totalPopulation;
    }
    
    getStats() {
        return this.stats;
    }
    
    getBehaviorPercentage(behaviorType) {
        if (this.stats.totalPopulation === 0) return 0;
        
        return (this.stats.behaviorCounts[behaviorType] / this.stats.totalPopulation) * 100;
    }
    
    getBirthDeathRatio() {
        const birthsSinceLastCheck = this.births - this.lastBirthCount;
        const deathsSinceLastCheck = this.deaths - this.lastDeathCount;
        
        this.lastBirthCount = this.births;
        this.lastDeathCount = this.deaths;
        
        if (deathsSinceLastCheck === 0) return birthsSinceLastCheck > 0 ? Infinity : 1.0;
        return birthsSinceLastCheck / deathsSinceLastCheck;
    }
    
    getReproductionRate() {
        // Calculate from population history
        if (this.stats.history.population.length < 2) return 1.0;
        
        const last5Points = this.stats.history.population.slice(-5);
        const changes = [];
        
        for (let i = 1; i < last5Points.length; i++) {
            const prev = last5Points[i-1].count;
            const current = last5Points[i].count;
            if (prev > 0) {
                changes.push(current / prev);
            }
        }
        
        if (changes.length === 0) return 1.0;
        
        // Return average change ratio
        return changes.reduce((a, b) => a + b, 0) / changes.length;
    }
    
    reset() {
        this.stats.totalPopulation = 0;
        
        Object.keys(this.stats.behaviorCounts).forEach(behavior => {
            this.stats.behaviorCounts[behavior] = 0;
        });
        
        this.stats.history.population = [];
        
        Object.keys(this.stats.history.behaviors).forEach(behavior => {
            this.stats.history.behaviors[behavior] = [];
        });
        
        this.births = 0;
        this.deaths = 0;
        this.lastBirthCount = 0;
        this.lastDeathCount = 0;
        this.lastPopulation = 0;
    }
}