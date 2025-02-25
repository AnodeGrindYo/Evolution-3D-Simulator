import { BaseBehavior } from './BaseBehavior.js';

export class DeepQLearningBehavior extends BaseBehavior {
    constructor() {
        super('deepq', { r: 0.1, g: 0.6, b: 0.8 }); // Teal color
        
        // Neural network parameters
        this.inputSize = 12;  // Number of input features
        this.hiddenSize = 8;  // Number of hidden neurons
        this.outputSize = 3;  // Number of possible actions
        
        // Q-learning parameters
        this.learningRate = 0.05;    // Alpha
        this.discountFactor = 0.9;   // Gamma
        this.explorationRate = 0.3;  // Epsilon
        
        // Simple actions (same as QLearningBehavior)
        this.actions = [
            'cooperate',  // Share energy
            'compete',    // Take energy
            'ignore'      // Do nothing
        ];
        
        // Initialize neural network weights
        this.initializeNetwork();
        
        // Track last state-action pair for learning
        this.lastState = null;
        this.lastAction = null;
        this.lastReward = 0;
        
        // Experience replay buffer
        this.replayBuffer = [];
        this.maxReplayBufferSize = 100;
        this.miniBatchSize = 10;
        
        // Decay exploration rate over time
        this.explorationDecay = 0.9999;
        this.minExplorationRate = 0.05;
    }
    
    initializeNetwork() {
        // Initialize weights for a simple feed-forward neural network
        
        // First layer weights (input -> hidden)
        this.weights1 = new Array(this.inputSize);
        for (let i = 0; i < this.inputSize; i++) {
            this.weights1[i] = new Array(this.hiddenSize);
            for (let j = 0; j < this.hiddenSize; j++) {
                // Xavier initialization
                const variance = 2.0 / (this.inputSize + this.hiddenSize);
                this.weights1[i][j] = (Math.random() * 2 - 1) * Math.sqrt(variance);
            }
        }
        
        // First layer bias
        this.bias1 = new Array(this.hiddenSize);
        for (let i = 0; i < this.hiddenSize; i++) {
            this.bias1[i] = 0;
        }
        
        // Second layer weights (hidden -> output)
        this.weights2 = new Array(this.hiddenSize);
        for (let i = 0; i < this.hiddenSize; i++) {
            this.weights2[i] = new Array(this.outputSize);
            for (let j = 0; j < this.outputSize; j++) {
                // Xavier initialization
                const variance = 2.0 / (this.hiddenSize + this.outputSize);
                this.weights2[i][j] = (Math.random() * 2 - 1) * Math.sqrt(variance);
            }
        }
        
        // Second layer bias
        this.bias2 = new Array(this.outputSize);
        for (let i = 0; i < this.outputSize; i++) {
            this.bias2[i] = 0;
        }
    }
    
    selectTarget(self, nearbyEntities) {
        if (nearbyEntities.length === 0) return null;
        
        // Select a random target with probability epsilon (exploration)
        if (Math.random() < this.explorationRate) {
            return nearbyEntities[Math.floor(Math.random() * nearbyEntities.length)];
        }
        
        // Otherwise, evaluate each potential target using the neural network
        let bestTarget = null;
        let bestValue = -Infinity;
        
        for (const entity of nearbyEntities) {
            const stateVector = this.getStateVector(self, entity);
            
            // Get Q-values from the neural network
            const qValues = this.forward(stateVector);
            
            // Find maximum Q-value
            const maxQ = Math.max(...qValues);
            
            if (maxQ > bestValue) {
                bestValue = maxQ;
                bestTarget = entity;
            }
        }
        
        return bestTarget || nearbyEntities[0];
    }
    
    interact(self, target) {
        // Get current state and convert to vector
        const stateVector = this.getStateVector(self, target);
        
        // Choose action based on Q-values
        const action = this.selectAction(stateVector);
        
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
            selfEnergyDelta = 1; // Small gain for conserving energy
            targetEnergyDelta = 0;
        }
        
        // Calculate immediate reward
        const reward = selfEnergyDelta;
        
        // Learn from previous state-action pair if it exists
        if (this.lastState !== null && this.lastAction !== null) {
            const experience = {
                state: this.lastState,
                action: this.lastAction,
                reward: this.lastReward,
                nextState: stateVector
            };
            
            // Add to replay buffer
            this.addToReplayBuffer(experience);
            
            // Learn from replay buffer
            this.learnFromReplayBuffer();
        }
        
        // Store current state, action, and reward for next learning step
        this.lastState = stateVector;
        this.lastAction = action;
        this.lastReward = reward;
        
        // Decay exploration rate
        this.explorationRate = Math.max(
            this.minExplorationRate,
            this.explorationRate * this.explorationDecay
        );
        
        return {
            selfEnergyDelta,
            targetEnergyDelta
        };
    }
    
    getStateVector(self, target) {
        // Create a normalized feature vector for the neural network input
        const vector = [
            // Self energy (normalized to [0,1])
            self.energy / 100,
            
            // Target energy
            target.energy / 100,
            
            // Self size
            self.size / 2,
            
            // Target size
            target.size / 2,
            
            // Target behavior one-hot encoding (5 behaviors)
            target.getBehaviorType() === 'aggressive' ? 1 : 0,
            target.getBehaviorType() === 'altruistic' ? 1 : 0,
            target.getBehaviorType() === 'titfortat' ? 1 : 0,
            target.getBehaviorType() === 'cooperative' ? 1 : 0,
            target.getBehaviorType() === 'selfish' ? 1 : 0,
            target.getBehaviorType() === 'qlearning' ? 1 : 0,
            target.getBehaviorType() === 'deepq' ? 1 : 0,
            
            // Previous interaction (1 for positive, -1 for negative, 0 for none)
            this.getPreviousInteractionValue(target.mesh.id)
        ];
        
        return vector;
    }
    
    getPreviousInteractionValue(targetId) {
        const memory = this.getLastInteraction(targetId);
        if (!memory) return 0;
        return memory.wasPositive ? 1 : -1;
    }
    
    selectAction(stateVector) {
        // Exploration: Random action with probability epsilon
        if (Math.random() < this.explorationRate) {
            return this.actions[Math.floor(Math.random() * this.actions.length)];
        }
        
        // Exploitation: Choose best action according to neural network
        return this.getBestAction(stateVector);
    }
    
    getBestAction(stateVector) {
        // Get Q-values from neural network
        const qValues = this.forward(stateVector);
        
        // Find action with highest Q-value
        let bestActionIndex = 0;
        for (let i = 1; i < this.outputSize; i++) {
            if (qValues[i] > qValues[bestActionIndex]) {
                bestActionIndex = i;
            }
        }
        
        return this.actions[bestActionIndex];
    }
    
    forward(stateVector) {
        // Forward pass through the neural network
        
        // First layer: input -> hidden
        const hidden = new Array(this.hiddenSize).fill(0);
        
        for (let i = 0; i < this.hiddenSize; i++) {
            for (let j = 0; j < this.inputSize; j++) {
                hidden[i] += stateVector[j] * this.weights1[j][i];
            }
            hidden[i] += this.bias1[i];
            // ReLU activation
            hidden[i] = Math.max(0, hidden[i]);
        }
        
        // Second layer: hidden -> output
        const output = new Array(this.outputSize).fill(0);
        
        for (let i = 0; i < this.outputSize; i++) {
            for (let j = 0; j < this.hiddenSize; j++) {
                output[i] += hidden[j] * this.weights2[j][i];
            }
            output[i] += this.bias2[i];
        }
        
        return output;
    }
    
    addToReplayBuffer(experience) {
        this.replayBuffer.push(experience);
        
        // Limit buffer size
        if (this.replayBuffer.length > this.maxReplayBufferSize) {
            this.replayBuffer.shift();
        }
    }
    
    learnFromReplayBuffer() {
        // Only learn if we have enough experiences
        if (this.replayBuffer.length < this.miniBatchSize) return;
        
        // Sample random mini-batch
        const batchIndices = [];
        for (let i = 0; i < this.miniBatchSize; i++) {
            batchIndices.push(Math.floor(Math.random() * this.replayBuffer.length));
        }
        
        // Learn from each experience in the batch
        for (const index of batchIndices) {
            const experience = this.replayBuffer[index];
            this.learn(experience);
        }
    }
    
    learn(experience) {
        const { state, action, reward, nextState } = experience;
        
        // Get current Q-values
        const currentQ = this.forward(state);
        
        // Get next state's Q-values
        const nextQ = this.forward(nextState);
        
        // Find max Q-value for next state
        const maxNextQ = Math.max(...nextQ);
        
        // Create target Q-values (same as current)
        const targetQ = [...currentQ];
        
        // Update only the Q-value for the action taken (TD update)
        const actionIndex = this.actions.indexOf(action);
        targetQ[actionIndex] = reward + this.discountFactor * maxNextQ;
        
        // Backpropagation
        this.backpropagate(state, currentQ, targetQ);
    }
    
    backpropagate(stateVector, predictedQ, targetQ) {
        // Simplified backpropagation implementation
        
        // 1. Forward pass to get activations
        // First layer: input -> hidden
        const hidden = new Array(this.hiddenSize).fill(0);
        const hiddenActivation = new Array(this.hiddenSize);
        
        for (let i = 0; i < this.hiddenSize; i++) {
            for (let j = 0; j < this.inputSize; j++) {
                hidden[i] += stateVector[j] * this.weights1[j][i];
            }
            hidden[i] += this.bias1[i];
            // ReLU activation with derivative tracking
            hiddenActivation[i] = hidden[i] > 0 ? 1 : 0;
            hidden[i] = Math.max(0, hidden[i]);
        }
        
        // 2. Calculate output layer gradients
        const outputGradients = new Array(this.outputSize);
        for (let i = 0; i < this.outputSize; i++) {
            // MSE derivative
            outputGradients[i] = predictedQ[i] - targetQ[i];
        }
        
        // 3. Calculate hidden layer gradients
        const hiddenGradients = new Array(this.hiddenSize).fill(0);
        for (let i = 0; i < this.hiddenSize; i++) {
            for (let j = 0; j < this.outputSize; j++) {
                hiddenGradients[i] += outputGradients[j] * this.weights2[i][j];
            }
            // Apply ReLU derivative
            hiddenGradients[i] *= hiddenActivation[i];
        }
        
        // 4. Update weights and biases
        // Output layer
        for (let i = 0; i < this.hiddenSize; i++) {
            for (let j = 0; j < this.outputSize; j++) {
                this.weights2[i][j] -= this.learningRate * outputGradients[j] * hidden[i];
            }
        }
        
        for (let i = 0; i < this.outputSize; i++) {
            this.bias2[i] -= this.learningRate * outputGradients[i];
        }
        
        // Hidden layer
        for (let i = 0; i < this.inputSize; i++) {
            for (let j = 0; j < this.hiddenSize; j++) {
                this.weights1[i][j] -= this.learningRate * hiddenGradients[j] * stateVector[i];
            }
        }
        
        for (let i = 0; i < this.hiddenSize; i++) {
            this.bias1[i] -= this.learningRate * hiddenGradients[i];
        }
    }
}