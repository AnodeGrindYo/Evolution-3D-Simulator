export class UIController {
    constructor(simulation, statistics, world) {
        this.simulation = simulation;
        this.statistics = statistics;
        this.world = world;
        this.setupEventListeners();
        this.setupAccordion();
        this.setupPanelToggle();
        
        // Update all UI to match initial simulation parameters
        this.updateAllUIElements();
        
        // Store observers to disconnect them when needed
        this.resizeObservers = [];
        
        // Load saved simulations list
        this.loadSavedSimulationsList();
        
        // Setup graph rendering
        this.setupStatsGraph();
        
        // Flag to track if we're currently adjusting population
        this.isAdjustingPopulation = false;
        
        // Dragging related variables
        this.draggingBar = null;
        this.draggingBarContainer = null;
        
        // Variables for equilibrium optimization
        this.optimizationIntervalId = null;
        this.populationHistory = [];
        this.birthsDeathsHistory = [];
        this.isOptimizing = false;
    }
    
    setupPanelToggle() {
        const controlPanel = document.getElementById('control-panel');
        const toggleButton = document.getElementById('toggle-controls-btn');
        const closeButton = document.getElementById('close-panel-btn');
        
        // Affiche le panneau de contrôle au démarrage
        controlPanel.classList.add('visible');
        
        // Fonction de basculement de visibilité
        const toggleVisibility = () => {
            controlPanel.classList.toggle('visible');
        };
        
        this.addInteractionListener(toggleButton, (e) => {
            e.preventDefault();
            toggleVisibility();
        });
        
        this.addInteractionListener(closeButton, (e) => {
            e.preventDefault();
            controlPanel.classList.remove('visible');
        });
    }
    
    setupAccordion() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        
        const toggleAccordion = (header) => {
            header.classList.toggle('active');
            const content = header.nextElementSibling;
            if (content.classList.contains('active')) {
                content.style.maxHeight = null;
                content.classList.remove('active');
                this.resizeObservers.forEach((observer, index) => {
                    if (observer.target === content) {
                        observer.observer.disconnect();
                        this.resizeObservers.splice(index, 1);
                    }
                });
            } else {
                content.classList.add('active');
                setTimeout(() => {
                    if (content.classList.contains('active')) {
                        content.style.maxHeight = content.scrollHeight + 'px';
                    }
                }, 10);
                try {
                    const resizeObserver = new ResizeObserver((entries) => {
                        requestAnimationFrame(() => {
                            if (content.classList.contains('active') && content.style) {
                                content.style.maxHeight = content.scrollHeight + 'px';
                            }
                        });
                    });
                    resizeObserver.observe(content);
                    this.resizeObservers.push({ target: content, observer: resizeObserver });
                } catch (err) {
                    console.warn('ResizeObserver error:', err);
                }
            }
        };
        
        accordionHeaders.forEach(header => {
            // Si c'est la section "Statistics", forcer son ouverture sur mobile
            if (header.textContent.trim().toLowerCase().includes("statistics") && window.innerWidth < 768) {
                const content = header.nextElementSibling;
                if (!content.classList.contains('active')) {
                    header.classList.add('active');
                    content.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
            }
            this.addInteractionListener(header, (e) => {
                e.preventDefault();
                toggleAccordion(header);
            });
        });
    }

    addInteractionListener(element, handler) {
        if (!element) return;
        if (window.PointerEvent) {
            element.addEventListener('pointerup', handler);
        } else {
            element.addEventListener('click', handler);
            element.addEventListener('touchend', handler, { passive: false });
        }
    }
    
    setupEventListeners() {
        // Basic simulation controls
        this.setupSimulationControls();
        
        // Population controls
        this.setupPopulationControls();
        
        // Environment controls
        this.setupEnvironmentControls();
        
        // Organism parameters
        this.setupOrganismControls();
        
        // Behavior tuning
        this.setupBehaviorControls();
        
        // Visual settings
        this.setupVisualControls();
        
        // Persistence controls
        this.setupPersistenceControls();
        
        // Placement mode controls
        this.setupPlacementControls();
        
        // Equilibrium optimization controls
        this.setupEquilibriumControls();
    }
    
    setupSimulationControls() {
        // Speed control
        const speedControl = document.getElementById('simulation-speed');
        const speedValue = document.getElementById('speed-value');
        
        if (speedControl && speedValue) {
            speedControl.addEventListener('input', () => {
                const speed = parseFloat(speedControl.value);
                this.simulation.setSpeed(speed);
                speedValue.textContent = `${speed.toFixed(1)}x`;
                this.saveSimulationSettings();
            });
        }
        
        // Pause button
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                const isPaused = this.simulation.togglePause();
                pauseBtn.innerHTML = isPaused ? 
                    '<i class="fas fa-play"></i> Resume' : 
                    '<i class="fas fa-pause"></i> Pause';
            });
        }
        
        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn && pauseBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset the simulation? This will delete all current organisms and food.')) {
                    this.simulation.reset();
                    pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
                    this.updateAllUIElements();
                    this.saveSimulationSettings();
                }
            });
        }
    }
    
    setupPopulationControls() {
        const populationControl = document.getElementById('initial-population');
        const populationValue = document.getElementById('population-value');
        if (populationControl && populationValue) {
            populationControl.addEventListener('input', () => {
                const population = parseInt(populationControl.value);
                this.simulation.setInitialPopulationSize(population);
                populationValue.textContent = population;
                this.saveSimulationSettings();
            });
        }
        
        // Pour le bouton "Add Organism", on utilise notre helper pour le clic
        const addOrganismBtn = document.getElementById('add-organism-btn');
        // ATTENTION : L'élément <select id="behavior-type"> doit garder son comportement natif !
        const behaviorSelect = document.getElementById('behavior-type');
        if (addOrganismBtn && behaviorSelect) {
            this.addInteractionListener(addOrganismBtn, (e) => {
                e.preventDefault();
                // Ne modifiez pas la valeur du <select>, utilisez la valeur native
                const behaviorType = behaviorSelect.value;
                this.simulation.addOrganism(behaviorType);
            });
        }
        
        const placementModeBtn = document.getElementById('placement-mode-btn');
        if (placementModeBtn) {
            this.addInteractionListener(placementModeBtn, (e) => {
                e.preventDefault();
                // Ne bloquez pas le comportement natif du <select> pour le mode placement
                document.getElementById('placement-controls').classList.remove('hidden');
                this.world.activatePlacementMode('organism', { behaviorType: 'random' });
            });
        }
        
        if (document.getElementById('population-type-controls')) {
            this.updatePopulationControlButtons();
        }
        this.updateBehaviorDistribution();
    }
    
    updatePopulationControlButtons() {
        const container = document.getElementById('population-type-controls');
        if (!container) return;
        
        container.innerHTML = '';
        
        const stats = this.statistics.getStats();
        const behaviorColors = {
            aggressive: '#e57373', // light red
            altruistic: '#64b5f6', // light blue
            titfortat: '#ffb74d', // light orange
            cooperative: '#81c784', // light green
            selfish: '#a1a1a1', // light gray
            qlearning: '#ba68c8', // light purple
            deepq: '#4fc3f7' // light teal
        };
        
        Object.keys(stats.behaviorCounts).forEach(behavior => {
            const count = stats.behaviorCounts[behavior];
            
            // Create control buttons for this behavior type
            const controlGroup = document.createElement('div');
            controlGroup.className = 'population-control-group';
            
            const label = document.createElement('div');
            label.className = 'population-control-label';
            
            const colorBox = document.createElement('div');
            colorBox.className = 'population-color-box';
            colorBox.style.backgroundColor = behaviorColors[behavior];
            
            const labelText = document.createElement('span');
            labelText.textContent = `${behavior.charAt(0).toUpperCase() + behavior.slice(1)}: ${count}`;
            
            label.appendChild(colorBox);
            label.appendChild(labelText);
            
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'population-buttons';
            
            const decreaseBtn = document.createElement('button');
            decreaseBtn.className = 'population-btn decrease';
            decreaseBtn.textContent = '-';
            decreaseBtn.setAttribute('data-behavior', behavior);
            
            const increaseBtn = document.createElement('button');
            increaseBtn.className = 'population-btn increase';
            increaseBtn.textContent = '+';
            increaseBtn.setAttribute('data-behavior', behavior);
            
            buttonsContainer.appendChild(decreaseBtn);
            buttonsContainer.appendChild(increaseBtn);
            
            controlGroup.appendChild(label);
            controlGroup.appendChild(buttonsContainer);
            
            container.appendChild(controlGroup);
            
            // Add event listeners
            decreaseBtn.addEventListener('click', () => {
                this.adjustPopulation(behavior, -1);
            });
            
            increaseBtn.addEventListener('click', () => {
                this.adjustPopulation(behavior, 1);
            });
        });
    }
    
    setupEnvironmentControls() {
        // World size slider
        const worldSizeControl = document.getElementById('world-size');
        const worldSizeValue = document.getElementById('world-size-value');
        
        if (worldSizeControl && worldSizeValue) {
            worldSizeControl.addEventListener('input', () => {
                const size = parseInt(worldSizeControl.value);
                worldSizeValue.textContent = size;
                // World size changes require reset
                worldSizeControl.dataset.pendingChange = 'true';
            });
            
            worldSizeControl.addEventListener('change', () => {
                if (worldSizeControl.dataset.pendingChange === 'true') {
                    const size = parseInt(worldSizeControl.value);
                    if (confirm('Changing world size requires resetting the simulation. Continue?')) {
                        this.simulation.setWorldSize(size);
                        this.simulation.reset();
                        this.saveSimulationSettings();
                    } else {
                        // Reset slider to current value
                        worldSizeControl.value = this.simulation.getWorldSize();
                        worldSizeValue.textContent = this.simulation.getWorldSize();
                    }
                    worldSizeControl.dataset.pendingChange = 'false';
                }
            });
        }
        
        // Resource abundance slider
        const resourceControl = document.getElementById('resource-abundance');
        const resourceValue = document.getElementById('resource-value');
        
        if (resourceControl && resourceValue) {
            resourceControl.addEventListener('input', () => {
                const abundance = parseFloat(resourceControl.value);
                this.simulation.setResourceAbundance(abundance);
                resourceValue.textContent = `${abundance.toFixed(1)}x`;
                this.saveSimulationSettings();
            });
        }
        
        // Environmental harshness slider
        const harshnessControl = document.getElementById('environment-harshness');
        const harshnessValue = document.getElementById('harshness-value');
        
        if (harshnessControl && harshnessValue) {
            harshnessControl.addEventListener('input', () => {
                const harshness = parseFloat(harshnessControl.value);
                this.simulation.setEnvironmentalHarshness(harshness);
                harshnessValue.textContent = `${harshness.toFixed(1)}x`;
                this.saveSimulationSettings();
            });
        }
        
        // Food spawn rate slider
        const foodRateControl = document.getElementById('food-spawn-rate');
        const foodRateValue = document.getElementById('food-rate-value');
        
        if (foodRateControl && foodRateValue) {
            foodRateControl.addEventListener('input', () => {
                const rate = parseFloat(foodRateControl.value);
                this.simulation.setFoodSpawnRate(rate);
                foodRateValue.textContent = `${rate.toFixed(1)}x`;
                this.saveSimulationSettings();
            });
        }
        
        // Food energy value slider
        const foodEnergyControl = document.getElementById('food-energy-value');
        const foodEnergyDisplay = document.getElementById('food-energy-value-display');
        
        if (foodEnergyControl && foodEnergyDisplay) {
            foodEnergyControl.addEventListener('input', () => {
                const value = parseInt(foodEnergyControl.value);
                this.simulation.setFoodEnergyValue(value);
                foodEnergyDisplay.textContent = value;
                this.saveSimulationSettings();
            });
        }
    }
    
    setupOrganismControls() {
        // Base energy slider
        const energyControl = document.getElementById('base-energy');
        const energyValue = document.getElementById('energy-value');
        
        if (energyControl && energyValue) {
            energyControl.addEventListener('input', () => {
                const energy = parseInt(energyControl.value);
                this.simulation.setBaseEnergy(energy);
                energyValue.textContent = energy;
                this.saveSimulationSettings();
            });
        }
        
        // Base speed slider
        const speedControl = document.getElementById('base-speed');
        const speedBaseValue = document.getElementById('speed-base-value');
        
        if (speedControl && speedBaseValue) {
            speedControl.addEventListener('input', () => {
                const speed = parseFloat(speedControl.value);
                this.simulation.setBaseSpeed(speed);
                speedBaseValue.textContent = `${speed.toFixed(1)}x`;
                this.saveSimulationSettings();
            });
        }
        
        // Base size slider
        const sizeControl = document.getElementById('base-size');
        const sizeValue = document.getElementById('size-value');
        
        if (sizeControl && sizeValue) {
            sizeControl.addEventListener('input', () => {
                const size = parseFloat(sizeControl.value);
                this.simulation.setBaseSize(size);
                sizeValue.textContent = `${size.toFixed(1)}x`;
                this.saveSimulationSettings();
            });
        }
        
        // Base lifespan slider
        const lifespanControl = document.getElementById('base-lifespan');
        const lifespanValue = document.getElementById('lifespan-value');
        
        if (lifespanControl && lifespanValue) {
            lifespanControl.addEventListener('input', () => {
                const lifespan = parseInt(lifespanControl.value);
                this.simulation.setBaseLifespan(lifespan);
                lifespanValue.textContent = lifespan;
                this.saveSimulationSettings();
            });
        }
        
        // Reproduction rate slider
        const reproductionControl = document.getElementById('base-reproduction');
        const reproductionValue = document.getElementById('reproduction-value');
        
        if (reproductionControl && reproductionValue) {
            reproductionControl.addEventListener('input', () => {
                const rate = parseFloat(reproductionControl.value);
                this.simulation.setBaseReproductionRate(rate);
                reproductionValue.textContent = rate.toFixed(3);
                this.saveSimulationSettings();
            });
        }
        
        // Mutation rate slider
        const mutationControl = document.getElementById('mutation-rate');
        const mutationValue = document.getElementById('mutation-value');
        
        if (mutationControl && mutationValue) {
            mutationControl.addEventListener('input', () => {
                const rate = parseFloat(mutationControl.value);
                this.simulation.setMutationRate(rate);
                mutationValue.textContent = rate.toFixed(2);
                this.saveSimulationSettings();
            });
        }
    }
    
    setupBehaviorControls() {
        // Behavior selection dropdown
        const behaviorSelect = document.getElementById('current-behavior');
    
        // Interaction strength slider
        const interactionControl = document.getElementById('interaction-strength');
        const interactionValue = document.getElementById('interaction-value');
    
        // Memory duration slider
        const memoryControl = document.getElementById('memory-duration');
        const memoryValue = document.getElementById('memory-value');
    
        // Unlimited memory checkbox
        const unlimitedMemoryToggle = document.getElementById('unlimited-memory');
    
        // Vérification de l'existence des éléments
        if (!behaviorSelect || !interactionControl || !interactionValue || 
            !memoryControl || !memoryValue || !unlimitedMemoryToggle) {
            console.warn("setupBehaviorControls: Certains éléments de l'UI sont introuvables.");
            return;
        }
    
        // Fonction pour mettre à jour les contrôles en fonction du comportement sélectionné
        const updateUI = () => {
            const behavior = behaviorSelect.value;
    
            // Met à jour le slider d'interaction strength
            interactionControl.value = this.simulation.getBehaviorInteractionStrength(behavior);
            interactionValue.textContent = `${parseFloat(interactionControl.value).toFixed(1)}x`;
    
            // Met à jour le slider de mémoire
            memoryControl.value = this.simulation.getBehaviorMemoryDuration(behavior);
            memoryValue.textContent = memoryControl.value;
    
            // Met à jour la checkbox de mémoire illimitée
            unlimitedMemoryToggle.checked = this.simulation.getUnlimitedMemoryForBehavior(behavior);
        };
    
        // Gestion du slider d'interaction strength
        const updateInteractionStrength = () => {
            const behavior = behaviorSelect.value;
            const strength = parseFloat(interactionControl.value);
            this.simulation.setBehaviorInteractionStrength(behavior, strength);
            interactionValue.textContent = `${strength.toFixed(1)}x`;
            this.saveSimulationSettings();
        };
    
        // Gestion du slider de mémoire
        const updateMemoryDuration = () => {
            const behavior = behaviorSelect.value;
            const duration = parseInt(memoryControl.value);
            this.simulation.setBehaviorMemoryDuration(behavior, duration);
            memoryValue.textContent = duration;
            this.saveSimulationSettings();
        };
    
        // Gestion du toggle mémoire illimitée
        const updateUnlimitedMemory = () => {
            const behavior = behaviorSelect.value;
            const enableUnlimitedMemory = unlimitedMemoryToggle.checked;
            this.simulation.setUnlimitedMemoryForBehavior(behavior, enableUnlimitedMemory);
            this.saveSimulationSettings();
        };
    
        // Ajout des écouteurs d'événements
        behaviorSelect.addEventListener('change', updateUI);
        interactionControl.addEventListener('input', updateInteractionStrength);
        memoryControl.addEventListener('input', updateMemoryDuration);
        unlimitedMemoryToggle.addEventListener('change', updateUnlimitedMemory);
    
        // Mise à jour initiale de l'UI
        updateUI();
    }    
    
    setupVisualControls() {
        // Contrôle de la distance de la caméra (slider)
        const cameraControl = document.getElementById('camera-distance');
        const cameraValue = document.getElementById('camera-value');
        if (cameraControl && cameraValue) {
            cameraControl.addEventListener('input', () => {
                const distance = parseInt(cameraControl.value);
                this.world.setCameraDistance(distance);
                cameraValue.textContent = distance;
                this.saveSimulationSettings();
            });
        }
    
        // Fonction générique pour gérer les toggles
        const setupToggle = (id, callback) => {
            const toggle = document.getElementById(id);
            if (!toggle) return;
    
            const toggleHandler = (e) => {
                e.preventDefault(); // Empêche d'éventuels comportements inattendus sur mobile
                setTimeout(() => {
                    toggle.checked = !toggle.checked; // Force la mise à jour de l'affichage
                    toggle.dispatchEvent(new Event('change')); // Déclenche un événement "change" artificiel
                    callback(toggle.checked);
                    this.saveSimulationSettings();
                    console.log(`${id} toggled:`, toggle.checked);
                }, 10);
            };
    
            toggle.addEventListener('change', () => callback(toggle.checked));
            toggle.addEventListener('click', toggleHandler);
            toggle.addEventListener('touchend', toggleHandler);
        };
    
        // Assignation des toggles avec leur callback respectif
        setupToggle('display-labels', (checked) => this.simulation.setDisplayLabels(checked));
        setupToggle('show-interactions', (checked) => this.simulation.setShowInteractions(checked));
        setupToggle('show-health-bars', (checked) => this.simulation.setShowHealthBars(checked));
    }
    
    setupEquilibriumControls() {
        const optimizeBtn = document.getElementById('optimize-equilibrium-btn');
        const stopOptimizeBtn = document.getElementById('stop-optimization-btn');
        
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => {
                this.startEquilibriumOptimization();
                optimizeBtn.style.display = 'none';
                if (stopOptimizeBtn) stopOptimizeBtn.style.display = 'inline-block';
            });
        }
        
        if (stopOptimizeBtn) {
            stopOptimizeBtn.addEventListener('click', () => {
                this.stopEquilibriumOptimization();
                stopOptimizeBtn.style.display = 'none';
                if (optimizeBtn) optimizeBtn.style.display = 'inline-block';
            });
        }
    }
    
    setupPersistenceControls() {
        const saveBtn = document.getElementById('save-btn');
        const simulationNameInput = document.getElementById('simulation-name');
        if (saveBtn && simulationNameInput) {
            // Utilisez un écouteur "click" standard pour le bouton SAVE
            saveBtn.addEventListener('click', () => {
                const name = simulationNameInput.value || 'Simulation ' + new Date().toLocaleString();
                this.saveCurrentSimulation(name);
            });
        }
        
        const loadBtn = document.getElementById('load-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                const savedSimulationsAccordion = document.querySelector('.accordion-header h3:contains("Saved Simulations")');
                if (savedSimulationsAccordion && !savedSimulationsAccordion.parentElement.classList.contains('active')) {
                    savedSimulationsAccordion.parentElement.click();
                }
            });
        }
    }
    
    setupPlacementControls() {
        const placeItemType = document.getElementById('place-item-type');
        const placeOrganismType = document.getElementById('place-organism-type');
        const placeFoodType = document.getElementById('place-food-type');
        
        if (placeItemType) {
            placeItemType.addEventListener('change', () => {
                const itemType = placeItemType.value;
                if (itemType === 'organism') {
                    placeOrganismType.classList.remove('hidden');
                    placeFoodType.classList.add('hidden');
                } else if (itemType === 'food') {
                    placeOrganismType.classList.add('hidden');
                    placeFoodType.classList.remove('hidden');
                } else {
                    placeOrganismType.classList.add('hidden');
                    placeFoodType.classList.add('hidden');
                }
                const options = {};
                if (itemType === 'organism') {
                    options.behaviorType = placeOrganismType.value;
                } else if (itemType === 'food') {
                    options.foodType = placeFoodType.value;
                }
                this.world.activatePlacementMode(itemType, options);
            });
        }
        
        if (placeOrganismType) {
            placeOrganismType.addEventListener('change', () => {
                this.world.activatePlacementMode('organism', { behaviorType: placeOrganismType.value });
            });
        }
        
        if (placeFoodType) {
            placeFoodType.addEventListener('change', () => {
                this.world.activatePlacementMode('food', { foodType: placeFoodType.value });
            });
        }
        
        const cancelPlacementBtn = document.getElementById('cancel-placement');
        if (cancelPlacementBtn) {
            this.addInteractionListener(cancelPlacementBtn, () => {
                this.world.deactivatePlacementMode();
            });
        }
    }
    
    setupStatsGraph() {
        // Create canvas for the graph if it doesn't exist yet
        const graphContainer = document.getElementById('stats-graph');
        if (!graphContainer) return;
        
        if (!graphContainer.querySelector('canvas')) {
            const canvas = document.createElement('canvas');
            canvas.width = graphContainer.clientWidth;
            canvas.height = graphContainer.clientHeight;
            graphContainer.appendChild(canvas);
            
            // Set up resize observer for the canvas
            try {
                const resizeObserver = new ResizeObserver((entries) => {
                    for (let entry of entries) {
                        canvas.width = entry.contentRect.width;
                        canvas.height = entry.contentRect.height;
                        this.drawStatsGraph(canvas);
                    }
                });
                
                resizeObserver.observe(graphContainer);
                
                // Store the observer for cleanup
                this.resizeObservers.push({
                    target: graphContainer,
                    observer: resizeObserver
                });
            } catch (err) {
                console.warn('ResizeObserver error:', err);
            }
        }
    }
    
    drawStatsGraph(canvas) {
        if (!canvas) {
            const graphContainer = document.getElementById('stats-graph');
            if (!graphContainer) return;
            canvas = graphContainer.querySelector('canvas');
            if (!canvas) return;
        }
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Get history data
        const history = this.statistics.getStats().history;
        const behaviors = this.statistics.getStats().history.behaviors;
        
        if (history.population.length < 2) return; // Need at least 2 points to draw
        
        // Set up graph area with padding
        const padding = 10;
        const graphWidth = width - 2 * padding;
        const graphHeight = height - 2 * padding;
        
        // Draw background
        ctx.fillStyle = 'rgba(30, 30, 30, 0.7)';
        ctx.fillRect(padding, padding, graphWidth, graphHeight);
        
        // Draw border
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(padding, padding, graphWidth, graphHeight);
        
        // Find max population for scaling
        let maxPopulation = 10; // Minimum scale
        history.population.forEach(entry => {
            maxPopulation = Math.max(maxPopulation, entry.count);
        });
        
        // Draw population line
        const drawLine = (data, color) => {
            if (data.length < 2) return;
            
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            
            // Draw each point in history
            for (let i = 0; i < data.length; i++) {
                const entry = data[i];
                const x = padding + (i / (data.length - 1)) * graphWidth;
                const y = padding + graphHeight - (entry.count / maxPopulation) * graphHeight;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
        };
        
        // Draw the total population line
        drawLine(history.population, '#fff');
        
        // Draw lines for each behavior type
        const behaviorColors = {
            aggressive: '#e57373', // light red
            altruistic: '#64b5f6', // light blue
            titfortat: '#ffb74d', // light orange
            cooperative: '#81c784', // light green
            selfish: '#a1a1a1', // light gray
            qlearning: '#ba68c8', // light purple
            deepq: '#4fc3f7' // light teal
        };
        
        Object.keys(behaviors).forEach(behavior => {
            if (behaviors[behavior].length > 0) {
                drawLine(behaviors[behavior], behaviorColors[behavior]);
            }
        });
        
        // Draw legend
        const legendY = padding + 15;
        const legendX = padding + 10;
        const legendSpacing = 20;
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('Total', legendX, legendY);
        
        let currentY = legendY;
        Object.keys(behaviors).forEach((behavior, index) => {
            if (this.statistics.getStats().behaviorCounts[behavior] > 0) {
                currentY += legendSpacing;
                ctx.fillStyle = behaviorColors[behavior];
                ctx.fillText(behavior, legendX, currentY);
            }
        });
    }
    
    updateStatistics() {
        const populationStats = document.getElementById('population-stats');
        const behaviorStats = document.getElementById('behavior-stats');
        const equilibriumStats = document.getElementById('equilibrium-stats');
        
        if (!populationStats || !behaviorStats) return;
        
        const stats = this.statistics.getStats();
        
        // Update population stats
        populationStats.innerHTML = `
            <p>Total Population: ${stats.totalPopulation}</p>
        `;
        
        // Update behavior stats
        let behaviorHtml = '';
        const behaviorColors = {
            aggressive: '#e57373', // light red
            altruistic: '#64b5f6', // light blue
            titfortat: '#ffb74d', // light orange
            cooperative: '#81c784', // light green
            selfish: '#a1a1a1', // light gray
            qlearning: '#ba68c8', // light purple
            deepq: '#4fc3f7' // light teal
        };
        
        Object.keys(stats.behaviorCounts).forEach(behavior => {
            const count = stats.behaviorCounts[behavior];
            const percentage = this.statistics.getBehaviorPercentage(behavior);
            
            if (count > 0 || behavior === 'aggressive' || behavior === 'altruistic' || 
                behavior === 'qlearning' || behavior === 'deepq') {
                behaviorHtml += `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <div style="display: flex; align-items: center;">
                            <div style="width: 12px; height: 12px; background-color: ${behaviorColors[behavior]}; margin-right: 8px; border-radius: 2px;"></div>
                            <span>${behavior.charAt(0).toUpperCase() + behavior.slice(1)}:</span>
                        </div>
                        <span>${count} (${percentage.toFixed(1)}%)</span>
                    </div>
                    <div class="population-bar-container" data-behavior="${behavior}">
                        <div class="population-bar" style="width: ${percentage}%; background-color: ${behaviorColors[behavior]};" data-behavior="${behavior}"></div>
                        <div class="population-bar-controls">
                            <button class="decrease-population" data-behavior="${behavior}">-</button>
                            <button class="increase-population" data-behavior="${behavior}">+</button>
                        </div>
                    </div>
                `;
            }
        });
        
        behaviorStats.innerHTML = behaviorHtml;
        
        // Update equilibrium stats if optimizing
        if (this.isOptimizing && equilibriumStats) {
            const reproductionRate = this.calculateReproductionRate();
            const stabilityStatus = this.getStabilityStatus(reproductionRate);
            
            equilibriumStats.innerHTML = `
                <div class="equilibrium-stats-item">
                    <span>Reproduction Rate (R):</span>
                    <span>${reproductionRate.toFixed(2)}</span>
                </div>
                <div class="equilibrium-stats-item">
                    <span>Stability Status:</span>
                    <span class="${stabilityStatus.class}">${stabilityStatus.message}</span>
                </div>
            `;
        }
        
        // Add event listeners to the population adjustment buttons
        this.setupPopulationAdjustmentControls();
        
        // Update behavior distribution visualization
        this.updateBehaviorDistribution();
        
        // Update the real-time population control buttons
        this.updatePopulationControlButtons();
        
        // Update the graph
        this.drawStatsGraph();
        
        // Track population for optimization
        this.trackPopulationForEquilibrium();
    }
    
    setupPopulationAdjustmentControls() {
        // Remove previous listeners if they exist
        const oldDecreaseButtons = document.querySelectorAll('.decrease-population');
        const oldIncreaseButtons = document.querySelectorAll('.increase-population');
        const oldPopulationBars = document.querySelectorAll('.population-bar');
        const oldPopulationContainers = document.querySelectorAll('.population-bar-container');
        
        oldDecreaseButtons.forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
        
        oldIncreaseButtons.forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
        
        // Add new listeners
        const decreaseButtons = document.querySelectorAll('.decrease-population');
        const increaseButtons = document.querySelectorAll('.increase-population');
        const populationBars = document.querySelectorAll('.population-bar');
        const populationContainers = document.querySelectorAll('.population-bar-container');
        
        decreaseButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const behavior = e.target.getAttribute('data-behavior');
                this.adjustPopulation(behavior, -1);
            });
        });
        
        increaseButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const behavior = e.target.getAttribute('data-behavior');
                this.adjustPopulation(behavior, 1);
            });
        });
        
        // Make the containers and bars draggable to adjust population
        populationContainers.forEach(container => {
            container.addEventListener('mousedown', (e) => {
                const behavior = container.getAttribute('data-behavior');
                
                // If we clicked on a button, don't start dragging
                if (e.target.tagName === 'BUTTON') return;
                
                this.draggingBarContainer = container;
                this.draggingBar = behavior;
                
                // Handle initial adjustment on click
                this.handleBarDrag(e);
                
                // Add document listeners for dragging
                document.addEventListener('mousemove', this.handleDocumentMouseMove);
                document.addEventListener('mouseup', this.handleDocumentMouseUp);
            });
        });
        
        // Store bound functions for removal later
        this.handleDocumentMouseMove = this.handleBarDrag.bind(this);
        this.handleDocumentMouseUp = () => {
            this.draggingBar = null;
            this.draggingBarContainer = null;
            document.removeEventListener('mousemove', this.handleDocumentMouseMove);
            document.removeEventListener('mouseup', this.handleDocumentMouseUp);
        };
    }
    
    handleBarDrag(e) {
        if (!this.draggingBar || !this.draggingBarContainer) return;
        
        const containerRect = this.draggingBarContainer.getBoundingClientRect();
        let percentage = (e.clientX - containerRect.left) / containerRect.width;
        percentage = Math.max(0, Math.min(1, percentage));
        
        // Get current stats
        const stats = this.statistics.getStats();
        const currentCount = stats.behaviorCounts[this.draggingBar] || 0;
        
        // Calculate target count based on percentage of total population
        // Scale to make it more responsive, allow creating new organisms
        const totalPopulation = Math.max(stats.totalPopulation, 5);
        const targetCount = Math.round(percentage * totalPopulation * 2);
        
        // Adjust population
        if (targetCount !== currentCount) {
            this.adjustPopulation(this.draggingBar, targetCount - currentCount);
        }
    }
    
    adjustPopulation(behavior, amount) {
        // Don't do anything if amount is 0
        if (amount === 0) return;
        
        // If removing organisms
        if (amount < 0) {
            const stats = this.statistics.getStats();
            
            // Check if we have enough organisms of this type to remove
            if (stats.behaviorCounts[behavior] < Math.abs(amount)) {
                amount = -stats.behaviorCounts[behavior]; // Only remove as many as exist
            }
            
            if (amount === 0) return; // Nothing to remove
            
            // Find organisms with this behavior to remove
            const organisms = this.world.getEntities().filter(entity => 
                entity.isAlive && entity.getBehaviorType() === behavior
            );
            
            // Sort by age to remove oldest first, reducing impact on reproduction
            organisms.sort((a, b) => b.age - a.age);
            
            // Remove the specified number of organisms
            for (let i = 0; i < Math.abs(amount) && i < organisms.length; i++) {
                organisms[i].die();
            }
        }
        // If adding organisms
        else {
            // Add the specified number of organisms
            for (let i = 0; i < amount; i++) {
                const position = this.simulation.findSafePosition();
                if (position) {
                    this.simulation.addOrganismAt(behavior, position);
                } else {
                    // If we can't find a safe position, stop adding
                    break;
                }
            }
        }
        
        // Force an immediate statistics update for better feedback
        setTimeout(() => {
            this.statistics.update(this.world.getEntities());
            this.updateStatistics();
        }, 100);
    }
    
    updateBehaviorDistribution() {
        const container = document.getElementById('behavior-distribution');
        if (!container) return;
        
        container.innerHTML = '';
        
        const stats = this.statistics.getStats();
        const behaviorColors = {
            aggressive: '#e57373', // light red
            altruistic: '#64b5f6', // light blue
            titfortat: '#ffb74d', // light orange
            cooperative: '#81c784', // light green
            selfish: '#a1a1a1', // light gray
            qlearning: '#ba68c8', // light purple
            deepq: '#4fc3f7' // light teal
        };
        
        Object.keys(stats.behaviorCounts).forEach(behavior => {
            const percentage = this.statistics.getBehaviorPercentage(behavior);
            
            if (percentage > 0) {
                const div = document.createElement('div');
                div.style.backgroundColor = behaviorColors[behavior];
                div.style.width = `${percentage}%`;
                div.title = `${behavior}: ${percentage.toFixed(1)}%`;
                container.appendChild(div);
            }
        });
    }
    
    trackPopulationForEquilibrium() {
        const stats = this.statistics.getStats();
        const currentPopulation = stats.totalPopulation;
        
        // Track population history for equilibrium calculation
        this.populationHistory.push({
            time: Date.now(),
            count: currentPopulation,
            births: this.statistics.births || 0,
            deaths: this.statistics.deaths || 0
        });
        
        // Keep history at a reasonable size
        if (this.populationHistory.length > 10) {
            this.populationHistory.shift();
        }
    }
    
    calculateReproductionRate() {
        // Need at least 2 data points
        if (this.populationHistory.length < 2) return 1.0;
        
        // Calculate changes over time
        const changes = [];
        
        for (let i = 1; i < this.populationHistory.length; i++) {
            const prevPop = this.populationHistory[i-1].count;
            const currentPop = this.populationHistory[i].count;
            
            // Skip if previous population was 0 to avoid division by zero
            if (prevPop > 0) {
                changes.push(currentPop / prevPop);
            }
        }
        
        // Return average change ratio (reproduction rate R)
        if (changes.length === 0) return 1.0;
        
        const sum = changes.reduce((a, b) => a + b, 0);
        return sum / changes.length;
    }
    
    getStabilityStatus(reproductionRate) {
        // Define thresholds for stability
        if (reproductionRate > 1.05) {
            return {
                message: "Unstable Growth",
                class: "warning"
            };
        } else if (reproductionRate < 0.95) {
            return {
                message: "Population Decline",
                class: "danger"
            };
        } else {
            return {
                message: "Stable",
                class: "success"
            };
        }
    }
    
    startEquilibriumOptimization() {
        // Don't start if already optimizing
        if (this.isOptimizing) return;
        
        this.isOptimizing = true;
        this.populationHistory = [];
        
        // Display the optimization status
        const equilibriumContainer = document.getElementById('equilibrium-container');
        if (equilibriumContainer) {
            equilibriumContainer.classList.remove('hidden');
        }
        
        // Run optimization every few seconds
        this.optimizationIntervalId = setInterval(() => {
            this.optimizeForEquilibrium();
        }, 3000); // Adjust parameters every 3 seconds
    }
    
    stopEquilibriumOptimization() {
        if (!this.isOptimizing) return;
        
        this.isOptimizing = false;
        clearInterval(this.optimizationIntervalId);
        this.optimizationIntervalId = null;
        
        // Hide the optimization status
        const equilibriumContainer = document.getElementById('equilibrium-container');
        if (equilibriumContainer) {
            equilibriumContainer.classList.add('hidden');
        }
    }
    
    optimizeForEquilibrium() {
        // Calculate current reproduction rate
        const reproductionRate = this.calculateReproductionRate();
        const currentPopulation = this.statistics.getStats().totalPopulation;
        
        // Target reproduction rate is approximately 1
        // This ensures stable population (not growing or declining too fast)
        const targetR = 1.0;
        
        console.log(`Optimizing equilibrium - Current R: ${reproductionRate.toFixed(3)}, Population: ${currentPopulation}`);
        
        // Don't adjust if population is too small
        if (currentPopulation < 5) {
            console.log("Population too small for optimization, increasing resources");
            this.simulation.setResourceAbundance(Math.min(5, this.simulation.resourceAbundance + 0.5));
            this.simulation.setFoodSpawnRate(Math.min(5, this.simulation.foodSpawnRate + 0.5));
            this.updateAllUIElements();
            return;
        }
        
        // Determine which parameters to adjust based on the current reproduction rate
        if (reproductionRate > 1.1) {
            // Growth is too high, need to reduce reproduction or increase mortality
            console.log("Population growing too fast, adjusting parameters to slow growth");
            
            // Randomly choose a parameter to adjust
            const adjustmentType = Math.random();
            
            if (adjustmentType < 0.25) {
                // Reduce food spawn rate
                const newRate = Math.max(0.5, this.simulation.foodSpawnRate * 0.9);
                this.simulation.setFoodSpawnRate(newRate);
                console.log(`Reduced food spawn rate to ${newRate.toFixed(2)}`);
            } 
            else if (adjustmentType < 0.5) {
                // Reduce reproduction rate
                const newRate = Math.max(0.001, this.simulation.baseReproductionRate * 0.9);
                this.simulation.setBaseReproductionRate(newRate);
                console.log(`Reduced reproduction rate to ${newRate.toFixed(4)}`);
            }
            else if (adjustmentType < 0.75) {
                // Increase environmental harshness
                const newHarshness = Math.min(1.5, this.simulation.environmentalHarshness * 1.1);
                this.simulation.setEnvironmentalHarshness(newHarshness);
                console.log(`Increased environmental harshness to ${newHarshness.toFixed(2)}`);
            }
            else {
                // Reduce resource abundance
                const newAbundance = Math.max(0.5, this.simulation.resourceAbundance * 0.9);
                this.simulation.setResourceAbundance(newAbundance);
                console.log(`Reduced resource abundance to ${newAbundance.toFixed(2)}`);
            }
        } 
        else if (reproductionRate < 0.9) {
            // Growth is too low, need to increase reproduction or decrease mortality
            console.log("Population declining too fast, adjusting parameters to increase growth");
            
            // Randomly choose a parameter to adjust
            const adjustmentType = Math.random();
            
            if (adjustmentType < 0.25) {
                // Increase food spawn rate
                const newRate = Math.min(8, this.simulation.foodSpawnRate * 1.1);
                this.simulation.setFoodSpawnRate(newRate);
                console.log(`Increased food spawn rate to ${newRate.toFixed(2)}`);
            } 
            else if (adjustmentType < 0.5) {
                // Increase reproduction rate
                const newRate = Math.min(0.02, this.simulation.baseReproductionRate * 1.1);
                this.simulation.setBaseReproductionRate(newRate);
                console.log(`Increased reproduction rate to ${newRate.toFixed(4)}`);
            }
            else if (adjustmentType < 0.75) {
                // Decrease environmental harshness
                const newHarshness = Math.max(0.1, this.simulation.environmentalHarshness * 0.9);
                this.simulation.setEnvironmentalHarshness(newHarshness);
                console.log(`Decreased environmental harshness to ${newHarshness.toFixed(2)}`);
            }
            else {
                // Increase resource abundance
                const newAbundance = Math.min(5, this.simulation.resourceAbundance * 1.1);
                this.simulation.setResourceAbundance(newAbundance);
                console.log(`Increased resource abundance to ${newAbundance.toFixed(2)}`);
            }
        } 
        else {
            // Reproduction rate is good, but check capacity constraints
            const targetPopulation = this.getTargetPopulation();
            
            if (currentPopulation > targetPopulation * 1.3) {
                // Population is above carrying capacity, make small adjustment
                console.log("Population above carrying capacity, making minor adjustment");
                this.simulation.setFoodSpawnRate(Math.max(0.5, this.simulation.foodSpawnRate * 0.95));
            } 
            else if (currentPopulation < targetPopulation * 0.7) {
                // Population is below carrying capacity, make small adjustment
                console.log("Population below carrying capacity, making minor adjustment");
                this.simulation.setFoodSpawnRate(Math.min(8, this.simulation.foodSpawnRate * 1.05));
            } 
            else {
                console.log("Population is stable and near carrying capacity");
            }
        }
        
        // Update UI elements to reflect the changes
        this.updateAllUIElements();
    }
    
    getTargetPopulation() {
        const worldSize = this.simulation.getWorldSize();
        const resourceAbundance = this.simulation.resourceAbundance;
        const environmentalFactor = 1.2 - this.simulation.environmentalHarshness; // Plus c'est dur, plus c'est bas
    
        return Math.max(5, Math.floor((worldSize * worldSize) / 30 * resourceAbundance * environmentalFactor));
    }    
    
    updateAllUIElements() {
        const elements = {
            'simulation-speed': this.simulation.speed,
            'speed-value': `${this.simulation.speed.toFixed(1)}x`,
            'initial-population': this.simulation.initialPopulationSize,
            'population-value': this.simulation.initialPopulationSize,
            'world-size': this.simulation.getWorldSize(),
            'world-size-value': this.simulation.getWorldSize(),
            'resource-abundance': this.simulation.resourceAbundance,
            'resource-value': `${this.simulation.resourceAbundance.toFixed(1)}x`
        };
    
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    }
    
    // Persistence methods
    saveSimulationSettings() {
        // Save just the current settings (not the entities)
        try {
            const settings = {
                speed: this.simulation.speed,
                initialPopulationSize: this.simulation.initialPopulationSize,
                worldSize: this.simulation.getWorldSize(),
                resourceAbundance: this.simulation.resourceAbundance,
                environmentalHarshness: this.simulation.environmentalHarshness,
                foodSpawnRate: this.simulation.foodSpawnRate,
                foodEnergyValue: this.simulation.foodEnergyValue,
                baseEnergy: this.simulation.baseEnergy,
                baseSpeed: this.simulation.baseSpeed,
                baseSize: this.simulation.baseSize,
                baseLifespan: this.simulation.baseLifespan,
                baseReproductionRate: this.simulation.baseReproductionRate,
                mutationRate: this.simulation.mutationRate,
                behaviorParameters: this.simulation.behaviorParameters,
                displayLabels: this.simulation.displayLabels,
                showInteractions: this.simulation.showInteractions,
                showHealthBars: this.simulation.showHealthBars,
                cameraDistance: this.world.getCameraDistance()
            };
            
            localStorage.setItem('evolutionSim_settings', JSON.stringify(settings));
        } catch (error) {
            console.error("Error saving settings:", error);
        }
    }
    
    loadSimulationSettings() {
        try {
            const savedSettings = localStorage.getItem('evolutionSim_settings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                
                // Apply settings without entities
                this.simulation.speed = settings.speed;
                this.simulation.initialPopulationSize = settings.initialPopulationSize;
                
                if (settings.worldSize !== this.simulation.getWorldSize()) {
                    this.simulation.setWorldSize(settings.worldSize);
                }
                
                this.simulation.resourceAbundance = settings.resourceAbundance;
                this.simulation.environmentalHarshness = settings.environmentalHarshness;
                this.simulation.foodSpawnRate = settings.foodSpawnRate || 1.0;
                this.simulation.foodEnergyValue = settings.foodEnergyValue || 20;
                
                this.simulation.baseEnergy = settings.baseEnergy;
                this.simulation.baseSpeed = settings.baseSpeed;
                this.simulation.baseSize = settings.baseSize;
                this.simulation.baseLifespan = settings.baseLifespan;
                this.simulation.baseReproductionRate = settings.baseReproductionRate;
                this.simulation.mutationRate = settings.mutationRate;
                
                this.simulation.behaviorParameters = settings.behaviorParameters;
                
                this.simulation.displayLabels = settings.displayLabels;
                this.simulation.showInteractions = settings.showInteractions;
                this.simulation.showHealthBars = settings.showHealthBars;
                
                if (settings.cameraDistance) {
                    this.world.setCameraDistance(settings.cameraDistance);
                }
                
                // Update UI to reflect the loaded settings
                this.updateAllUIElements();
                
                return true;
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        }
        return false;
    }
    
    saveCurrentSimulation(name) {
        try {
            // Get all saved simulations
            const savedSimulations = this.getSavedSimulations();
            
            // Serialize current simulation
            const data = this.simulation.serialize();
            data.name = name;
            data.saveDate = new Date().toISOString();
            
            // Add or update this simulation
            const existingIndex = savedSimulations.findIndex(sim => sim.name === name);
            if (existingIndex >= 0) {
                if (confirm(`A simulation with name "${name}" already exists. Overwrite?`)) {
                    savedSimulations[existingIndex] = data;
                } else {
                    return false;
                }
            } else {
                savedSimulations.push(data);
            }
            
            // Save to local storage
            localStorage.setItem('evolutionSim_savedSimulations', JSON.stringify(savedSimulations));
            
            // Update the saved simulations list
            this.loadSavedSimulationsList();
            
            alert(`Simulation "${name}" saved successfully!`);
            return true;
        } catch (error) {
            console.error("Error saving simulation:", error);
            alert("Error saving simulation: " + error.message);
            return false;
        }
    }
    
    getSavedSimulations() {
        try {
            const savedData = localStorage.getItem('evolutionSim_savedSimulations');
            return savedData ? JSON.parse(savedData) : [];
        } catch (error) {
            console.error("Error loading saved simulations:", error);
            return [];
        }
    }
    
    loadSavedSimulationsList() {
        const container = document.getElementById('saved-simulations-list');
        if (!container) return;
        
        const savedSimulations = this.getSavedSimulations();
        
        if (savedSimulations.length === 0) {
            container.innerHTML = '<p class="no-saves-message">No saved simulations yet</p>';
            return;
        }
        
        // Sort by save date, newest first
        savedSimulations.sort((a, b) => new Date(b.saveDate) - new Date(a.saveDate));
        
        let html = '';
        savedSimulations.forEach(sim => {
            const date = new Date(sim.saveDate).toLocaleString();
            html += `
                <div class="saved-simulation-item">
                    <div class="name">${sim.name}</div>
                    <div class="date">${date}</div>
                    <div class="actions">
                        <button class="load-sim-btn" data-name="${sim.name}"><i class="fas fa-folder-open"></i></button>
                        <button class="delete-sim-btn" data-name="${sim.name}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add event listeners for load and delete buttons
        container.querySelectorAll('.load-sim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const simName = btn.dataset.name;
                this.loadSavedSimulation(simName);
            });
        });
        
        container.querySelectorAll('.delete-sim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const simName = btn.dataset.name;
                this.deleteSavedSimulation(simName);
            });
        });
    }
    
    loadSavedSimulation(name) {
        try {
            const savedSimulations = this.getSavedSimulations();
            const simulation = savedSimulations.find(sim => sim.name === name);
    
            if (!simulation) {
                alert(`Simulation "${name}" not found.`);
                return false;
            }
    
            if (confirm(`Load simulation "${name}"? Current simulation will be replaced.`)) {
                this.simulation.deserialize(simulation);
                this.updateAllUIElements();
                alert(`Simulation "${name}" loaded successfully!`);
                return true;
            }
        } catch (error) {
            console.error("Error loading simulation:", error);
            alert("Error loading simulation: " + error.message);
        }
        return false;
    }
    
    
    deleteSavedSimulation(name) {
        try {
            if (!confirm(`Are you sure you want to delete simulation "${name}"?`)) {
                return false;
            }
            
            const savedSimulations = this.getSavedSimulations();
            const filteredSimulations = savedSimulations.filter(sim => sim.name !== name);
            
            localStorage.setItem('evolutionSim_savedSimulations', JSON.stringify(filteredSimulations));
            
            // Update the list
            this.loadSavedSimulationsList();
            
            return true;
        } catch (error) {
            console.error("Error deleting simulation:", error);
            alert("Error deleting simulation: " + error.message);
            return false;
        }
    }
    
    update() {
        this.updateStatistics();
    }
    
    // Clean up all observers when no longer needed
    cleanup() {
        this.resizeObservers.forEach(observer => {
            observer.observer.disconnect();
        });
        this.resizeObservers = [];
        
        // Clean up document event listeners
        document.removeEventListener('mousemove', this.handleDocumentMouseMove);
        document.removeEventListener('mouseup', this.handleDocumentMouseUp);
        
        // Clean up optimization interval
        if (this.optimizationIntervalId) {
            clearInterval(this.optimizationIntervalId);
            this.optimizationIntervalId = null;
        }
    }
}