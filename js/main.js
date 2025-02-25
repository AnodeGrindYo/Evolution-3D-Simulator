import { World } from './world/World.js';
import { UIController } from './ui/UIController.js';
import { SimulationManager } from './simulation/SimulationManager.js';
import { StatisticsTracker } from './statistics/StatisticsTracker.js';

// Main application class
class Application {
    constructor() {
        try {
            // Initialize main components
            this.world = new World('simulation-container');
            this.statistics = new StatisticsTracker();
            this.simulation = new SimulationManager(this.world, this.statistics);
            
            // Store reference to simulation in world for proper parameter access
            this.world.simulation = this.simulation;
            
            // Initialize UI controller
            this.ui = new UIController(this.simulation, this.statistics, this.world);
            
            // Load saved settings if available
            this.loadSavedSettings();
            
            // Start animation loop
            this.lastTimestamp = 0;
            this.animate = this.animate.bind(this);
            this.animate(0);
            
            // Set up window resize handler
            window.addEventListener('resize', this.onWindowResize.bind(this));
            
            // Cleanup when window is closed or page is left
            window.addEventListener('beforeunload', this.cleanup.bind(this));
        } catch (error) {
            console.error("Application initialization error:", error);
        }
    }
    
    loadSavedSettings() {
        try {
            // Try to load saved settings
            const success = this.ui.loadSimulationSettings();
            
            if (success) {
                // If we loaded settings successfully, reset to create a new simulation with these settings
                this.simulation.reset();
                console.log("Loaded saved settings");
            }
        } catch (error) {
            console.error("Error loading saved settings:", error);
        }
    }
    
    onWindowResize() {
        if (this.world) {
            this.world.onResize();
        }
    }
    
    animate(timestamp) {
        requestAnimationFrame(this.animate);
        
        try {
            // Calculate delta time for smooth animations regardless of frame rate
            const deltaTime = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1); // Cap at 100ms to prevent huge jumps
            this.lastTimestamp = timestamp;
            
            // Update simulation
            if (this.simulation) {
                this.simulation.update(deltaTime);
            }
            
            // Update UI
            if (this.ui) {
                this.ui.update();
            }
            
            // Render the scene
            if (this.world) {
                this.world.render();
            }
        } catch (error) {
            console.error("Animation loop error:", error);
        }
    }
    
    cleanup() {
        // Perform cleanup to prevent memory leaks
        if (this.ui) {
            this.ui.cleanup();
        }
        
        // Save settings before unloading
        if (this.ui) {
            this.ui.saveSimulationSettings();
        }
    }
}

// Start the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new Application();
    } catch (error) {
        console.error("Failed to start application:", error);
    }
});