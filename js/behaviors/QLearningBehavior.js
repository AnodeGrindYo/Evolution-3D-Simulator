import { BaseBehavior } from './BaseBehavior.js';

export class QLearningBehavior extends BaseBehavior {
    constructor() {
        super('qlearning', { r: 0.6, g: 0.3, b: 0.8 }); // Purple color
        
        // Q-learning parameters
        this.learningRate = 0.1;    // Alpha
        this.discountFactor = 0.9;  // Gamma
        this.explorationRate = 0.2; // Epsilon
        
        // State-action values (Q-table)
        this.qTable = {};
        
        // Track last state-action pair for learning
        this.lastState = null;
        this.lastAction = null;
        this.lastReward = 0;
        
        // Simple actions
        this.actions = [
            'cooperate',  // Share energy
            'compete',    // Take energy
            'ignore'      // Do nothing
        ];
    }
    
    selectTarget(self, nearbyEntities) {
        if (nearbyEntities.length === 0) return null;
        
        // Select a random target with probability epsilon (exploration)
        if (Math.random() < this.explorationRate) {
            return nearbyEntities[Math.floor(Math.random() * nearbyEntities.length)];
        }
        
        // Otherwise, evaluate each potential target using the Q-table (exploitation)
        let bestTarget = null;
        let bestValue = -Infinity;
        
        for (const entity of nearbyEntities) {
            const state = this.getState(self, entity);
            
            // Get max Q-value for this state across all actions
            let maxActionValue = this.getMaxQValue(state);
            
            if (maxActionValue > bestValue) {
                bestValue = maxActionValue;
                bestTarget = entity;
            }
        }
        
        // If all values are default (0), pick randomly
        if (bestValue === 0) {
            return nearbyEntities[Math.floor(Math.random() * nearbyEntities.length)];
        }
        
        return bestTarget;
    }
    
    interact(self, target) {
        // Get the current state
        const state = this.getState(self, target);
        
        // Choose action based on Q-values
        const action = this.selectAction(state);
        
        // Execute the chosen action
        let selfEnergyDelta = 0;
        let targetEnergyDelta = 0;
        
        if (action === 'cooperate') {
            // Cooperate: Give energy to target
            const energyToShare = Math.min(8, self.energy * 0.1);
            selfEnergyDelta = -energyToShare;
            targetEnergyDelta = energyToShare * 1.5; // Cooperation creates surplus energy
            
            this.rememberInteraction(target.mesh.id, true);
        } 
        else if (action === 'compete') {
            // Compete: Try to take energy from target
            const energyToTake = Math.min(10, target.energy * 0.15);
            selfEnergyDelta = energyToTake;
            targetEnergyDelta = -energyToTake;
            
            this.rememberInteraction(target.mesh.id, false);
        }
        else { // 'ignore'
            // Do nothing
            selfEnergyDelta = 0;
            targetEnergyDelta = 0;
        }
        
        // Calculate immediate reward
        const reward = selfEnergyDelta;
        
        // Learn from previous state-action pair if it exists
        if (this.lastState !== null && this.lastAction !== null) {
            this.learn(this.lastState, this.lastAction, this.lastReward, state);
        }
        
        // Store current state, action, and reward for next learning step
        this.lastState = state;
        this.lastAction = action;
        this.lastReward = reward;
        
        return {
            selfEnergyDelta,
            targetEnergyDelta
        };
    }
    
    getState(self, target) {
        // Simplified state representation:
        // 1. Self energy level (low, medium, high)
        // 2. Target energy level (low, medium, high)
        // 3. Target behavior type
        // 4. Previous interaction result if it exists (positive, negative, none)
        
        let selfEnergyLevel = 'medium';
        if (self.energy < 30) selfEnergyLevel = 'low';
        else if (self.energy > 70) selfEnergyLevel = 'high';
        
        let targetEnergyLevel = 'medium';
        if (target.energy < 30) targetEnergyLevel = 'low';
        else if (target.energy > 70) targetEnergyLevel = 'high';
        
        const targetBehavior = target.getBehaviorType();
        
        let previousInteraction = 'none';
        const memory = this.getLastInteraction(target.mesh.id);
        if (memory) {
            previousInteraction = memory.wasPositive ? 'positive' : 'negative';
        }
        
        return `${selfEnergyLevel}_${targetEnergyLevel}_${targetBehavior}_${previousInteraction}`;
    }
    
    selectAction(state) {
        // Exploration: Random action with probability epsilon
        if (Math.random() < this.explorationRate) {
            return this.actions[Math.floor(Math.random() * this.actions.length)];
        }
        
        // Exploitation: Choose best action according to Q-values
        return this.getBestAction(state);
    }
    
    getBestAction(state) {
        if (!this.qTable[state]) {
            this.initializeState(state);
        }
        
        // Find action with highest Q-value
        let bestAction = this.actions[0];
        let bestValue = this.qTable[state][bestAction];
        
        for (const action of this.actions) {
            if (this.qTable[state][action] > bestValue) {
                bestValue = this.qTable[state][action];
                bestAction = action;
            }
        }
        
        return bestAction;
    }
    
    getMaxQValue(state) {
        if (!this.qTable[state]) {
            this.initializeState(state);
        }
        
        let maxValue = -Infinity;
        for (const action of this.actions) {
            if (this.qTable[state][action] > maxValue) {
                maxValue = this.qTable[state][action];
            }
        }
        
        return maxValue;
    }
    
    initializeState(state) {
        this.qTable[state] = {};
        for (const action of this.actions) {
            this.qTable[state][action] = 0; // Initialize with optimistic values
        }
    }
    
    learn(state, action, reward, nextState) {
        // Q-learning update rule: Q(s,a) = Q(s,a) + α * [r + γ * max_a' Q(s',a') - Q(s,a)]
        
        if (!this.qTable[state]) {
            this.initializeState(state);
        }
        
        if (!this.qTable[nextState]) {
            this.initializeState(nextState);
        }
        
        const currentQ = this.qTable[state][action];
        const maxNextQ = this.getMaxQValue(nextState);
        
        // Update Q-value
        this.qTable[state][action] = currentQ + this.learningRate * (
            reward + this.discountFactor * maxNextQ - currentQ
        );
    }
}