import { AggressiveBehavior } from './AggressiveBehavior.js';
import { AltruisticBehavior } from './AltruisticBehavior.js';
import { TitForTatBehavior } from './TitForTatBehavior.js';
import { CooperativeBehavior } from './CooperativeBehavior.js';
import { SelfishBehavior } from './SelfishBehavior.js';
import { QLearningBehavior } from './QLearningBehavior.js';
import { DeepQLearningBehavior } from './DeepQLearningBehavior.js';

export class BehaviorFactory {
    createBehavior(type = 'random') {
        if (type === 'random') {
            const behaviors = [
                'aggressive', 
                'altruistic', 
                'titfortat', 
                'cooperative', 
                'selfish',
                'qlearning',
                'deepq'
            ];
            type = behaviors[Math.floor(Math.random() * behaviors.length)];
        }
        
        switch(type.toLowerCase()) {
            case 'aggressive':
                return new AggressiveBehavior();
            case 'altruistic':
                return new AltruisticBehavior();
            case 'titfortat':
                return new TitForTatBehavior();
            case 'cooperative':
                return new CooperativeBehavior();
            case 'selfish':
                return new SelfishBehavior();
            case 'qlearning':
                return new QLearningBehavior();
            case 'deepq':
                return new DeepQLearningBehavior();
            default:
                return new CooperativeBehavior();
        }
    }
}