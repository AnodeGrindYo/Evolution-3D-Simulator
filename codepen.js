
/*************************************************/
/* Fichier : ./js/ui/UIController.js */
/*************************************************/

(() => {
    class UIController {
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
        
        addInteractionListener(element, handler) {
            if (!element) return;
            if (window.PointerEvent) {
                element.addEventListener('pointerup', handler);
            } else {
                element.addEventListener('click', handler);
                element.addEventListener('touchend', handler, { passive: false });
            }
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
            
            const pauseBtn = document.getElementById('pause-btn');
            if (pauseBtn) {
                this.addInteractionListener(pauseBtn, () => {
                    const isPaused = this.simulation.togglePause();
                    pauseBtn.innerHTML = isPaused ?
                    '<i class="fas fa-play"></i> Resume' :
                    '<i class="fas fa-pause"></i> Pause';
                });
            }
            
            const resetBtn = document.getElementById('reset-btn');
            if (resetBtn) {
                this.addInteractionListener(resetBtn, () => {
                    if (confirm('Are you sure you want to reset the simulation? This will delete all current organisms and food.')) {
                        this.simulation.reset();
                        if (pauseBtn) {
                            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
                        }
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
            
            if (!behaviorSelect || !interactionControl || !interactionValue) return;
            
            // Update interaction strength when behavior or slider changes
            const updateInteractionStrength = () => {
                const behavior = behaviorSelect.value;
                const strength = parseFloat(interactionControl.value);
                this.simulation.setBehaviorInteractionStrength(behavior, strength);
                interactionValue.textContent = `${strength.toFixed(1)}x`;
                this.saveSimulationSettings();
            };
            
            behaviorSelect.addEventListener('change', () => {
                // Update slider to show current value for selected behavior
                const behavior = behaviorSelect.value;
                interactionControl.value = this.simulation.getBehaviorInteractionStrength(behavior);
                interactionValue.textContent = `${parseFloat(interactionControl.value).toFixed(1)}x`;
            });
            
            interactionControl.addEventListener('input', updateInteractionStrength);
            
            // Memory duration slider
            const memoryControl = document.getElementById('memory-duration');
            const memoryValue = document.getElementById('memory-value');
            
            if (!memoryControl || !memoryValue) return;
            
            // Update memory duration when behavior or slider changes
            const updateMemoryDuration = () => {
                const behavior = behaviorSelect.value;
                const duration = parseInt(memoryControl.value);
                this.simulation.setBehaviorMemoryDuration(behavior, duration);
                memoryValue.textContent = duration;
                this.saveSimulationSettings();
            };
            
            behaviorSelect.addEventListener('change', () => {
                // Update slider to show current value for selected behavior
                const behavior = behaviorSelect.value;
                memoryControl.value = this.simulation.getBehaviorMemoryDuration(behavior);
                memoryValue.textContent = memoryControl.value;
            });
            
            memoryControl.addEventListener('input', updateMemoryDuration);
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
                this.addInteractionListener(optimizeBtn, () => {
                    this.startEquilibriumOptimization();
                    optimizeBtn.style.display = 'none';
                    if (stopOptimizeBtn) stopOptimizeBtn.style.display = 'inline-block';
                });
            }
            
            if (stopOptimizeBtn) {
                this.addInteractionListener(stopOptimizeBtn, () => {
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
                // Calculate a target population based on world size and resource availability
                const worldSize = this.simulation.getWorldSize();
                const resourceAbundance = this.simulation.resourceAbundance;
                
                // Basic formula for carrying capacity
                return Math.floor((worldSize * worldSize) / 30 * resourceAbundance);
            }
            
            updateAllUIElements() {
                try {
                    const updateElement = (id, value) => {
                        const element = document.getElementById(id);
                        if (element) {
                            if (element.tagName === 'INPUT' && element.type === 'range') {
                                element.value = value;
                            } else if (element.tagName === 'INPUT' && element.type === 'checkbox') {
                                element.checked = value;
                            } else {
                                element.textContent = value;
                            }
                        }
                    };
                    
                    updateElement('simulation-speed', this.simulation.speed);
                    updateElement('speed-value', `${this.simulation.speed.toFixed(1)}x`);
                    
                    updateElement('initial-population', this.simulation.initialPopulationSize);
                    updateElement('population-value', this.simulation.initialPopulationSize);
                    
                    updateElement('world-size', this.simulation.getWorldSize());
                    updateElement('world-size-value', this.simulation.getWorldSize());
                    
                    updateElement('resource-abundance', this.simulation.resourceAbundance);
                    updateElement('resource-value', `${this.simulation.resourceAbundance.toFixed(1)}x`);
                    
                    updateElement('environment-harshness', this.simulation.environmentalHarshness);
                    updateElement('harshness-value', `${this.simulation.environmentalHarshness.toFixed(1)}x`);
                    
                    updateElement('food-spawn-rate', this.simulation.foodSpawnRate);
                    updateElement('food-rate-value', `${this.simulation.foodSpawnRate.toFixed(1)}x`);
                    
                    updateElement('food-energy-value', this.simulation.foodEnergyValue);
                    updateElement('food-energy-value-display', this.simulation.foodEnergyValue);
                    
                    updateElement('base-energy', this.simulation.baseEnergy);
                    updateElement('energy-value', this.simulation.baseEnergy);
                    
                    updateElement('base-speed', this.simulation.baseSpeed);
                    updateElement('speed-base-value', `${this.simulation.baseSpeed.toFixed(1)}x`);
                    
                    updateElement('base-size', this.simulation.baseSize);
                    updateElement('size-value', `${this.simulation.baseSize.toFixed(1)}x`);
                    
                    updateElement('base-lifespan', this.simulation.baseLifespan);
                    updateElement('lifespan-value', this.simulation.baseLifespan);
                    
                    updateElement('base-reproduction', this.simulation.baseReproductionRate);
                    updateElement('reproduction-value', this.simulation.baseReproductionRate.toFixed(3));
                    
                    updateElement('mutation-rate', this.simulation.mutationRate);
                    updateElement('mutation-value', this.simulation.mutationRate.toFixed(2));
                    
                    const currentBehaviorElement = document.getElementById('current-behavior');
                    const currentBehavior = currentBehaviorElement ? currentBehaviorElement.value : 'aggressive';
                    
                    updateElement('interaction-strength', this.simulation.getBehaviorInteractionStrength(currentBehavior));
                    updateElement('interaction-value', `${this.simulation.getBehaviorInteractionStrength(currentBehavior).toFixed(1)}x`);
                    
                    updateElement('memory-duration', this.simulation.getBehaviorMemoryDuration(currentBehavior));
                    updateElement('memory-value', this.simulation.getBehaviorMemoryDuration(currentBehavior));
                    
                    updateElement('camera-distance', this.world.getCameraDistance());
                    updateElement('camera-value', this.world.getCameraDistance());
                    
                    updateElement('display-labels', this.simulation.displayLabels);
                    updateElement('show-interactions', this.simulation.showInteractions);
                    updateElement('show-health-bars', this.simulation.showHealthBars);
                } catch (error) {
                    console.error("Error updating UI elements:", error);
                }
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
                        // Load the simulation
                        this.simulation.deserialize(simulation);
                        
                        // Update UI
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
        }window.UIController = UIController;
    })();
    
    
    
    /*************************************************/
    /* Fichier : ./js/behaviors/BaseBehavior.js */
    /*************************************************/
    
    (() => {
        class BaseBehavior {
            constructor(type, color) {
                this.type = type;
                this.color = color;
                this.memory = new Map(); // For behaviors that need to remember past interactions
                
                // Configurable behavior parameters
                this.interactionStrength = 1.0; // Multiplier for interaction intensity
                this.memoryDuration = 50; // How long to remember interactions (in seconds)
            }
            
            getColor() {
                return this.color;
            }
            
            selectTarget(self, nearbyEntities) {
                // Default implementation: select closest entity
                let closestEntity = null;
                let closestDistance = Infinity;
                
                nearbyEntities.forEach(entity => {
                    const dx = entity.position.x - self.position.x;
                    const dz = entity.position.z - self.position.z;
                    const distanceSquared = dx * dx + dz * dz;
                    
                    if (distanceSquared < closestDistance) {
                        closestDistance = distanceSquared;
                        closestEntity = entity;
                    }
                });
                
                return closestEntity;
            }
            
            interact(self, target) {
                // Default implementation now provides a small positive interaction
                // This ensures even basic interactions help both parties a bit
                return { 
                    selfEnergyDelta: 2,  // Small positive energy gain
                    targetEnergyDelta: 2  // Small positive energy gain for target too
                };
            }
            
            // Helper method to remember an interaction
            rememberInteraction(targetId, wasPositive) {
                this.memory.set(targetId, {
                    wasPositive,
                    timestamp: Date.now()
                });
                
                // Clean up old memories
                this.cleanMemory();
            }
            
            // Helper method to get the last interaction with a specific entity
            getLastInteraction(targetId) {
                return this.memory.get(targetId);
            }
            
            // Clean up memory entries older than memory duration
            cleanMemory() {
                const now = Date.now();
                const expirationTime = this.memoryDuration * 1000; // Convert to milliseconds
                
                for (const [id, data] of this.memory.entries()) {
                    if (now - data.timestamp > expirationTime) {
                        this.memory.delete(id);
                    }
                }
            }
        }window.BaseBehavior = BaseBehavior;
    })();
    
    
    
    /*************************************************/
    /* Fichier : ./js/behaviors/AltruisticBehavior.js */
    /*************************************************/
    
    (() => {
        
        
        class AltruisticBehavior extends BaseBehavior {
            constructor() {
                super('altruistic', { r: 0.2, g: 0.7, b: 0.9 }); // Light blue color
            }
            
            selectTarget(self, nearbyEntities) {
                // Altruistic organisms prefer to help those with low energy
                const entitiesNeedingHelp = nearbyEntities.filter(entity => 
                    entity.energy < 50 // Entities with less than 50 energy need help
                );
                
                if (entitiesNeedingHelp.length > 0) {
                    // Sort by energy (lowest first)
                    entitiesNeedingHelp.sort((a, b) => a.energy - b.energy);
                    return entitiesNeedingHelp[0]; // Help the entity with lowest energy
                }
                
                // If no entities need help, select normally
                return super.selectTarget(self, nearbyEntities);
            }
            
            interact(self, target) {
                if (self.energy > 30) { // Only help if we have enough energy
                    // Amount of energy to share
                    const energyToShare = Math.min(10, self.energy * 0.15);
                    
                    // Remember this positive interaction
                    this.rememberInteraction(target.mesh.id, true);
                    
                    return {
                        selfEnergyDelta: -energyToShare,
                        targetEnergyDelta: energyToShare
                    };
                }
                
                // If we don't have enough energy, do nothing
                return {
                    selfEnergyDelta: 0,
                    targetEnergyDelta: 0
                };
            }
        }window.AltruisticBehavior = AltruisticBehavior;
    })();
    
    
    
    /*************************************************/
    /* Fichier : ./js/world/TerrainGenerator.js */
    /*************************************************/
    
    (() => {
        class TerrainGenerator {
            constructor(scene) {
                this.scene = scene;
                this.size = 40; // Size of terrain
                this.terrain = null;
                this.water = null;
                this.decorations = [];
            }
            
            setSize(size) {
                this.size = size;
            }
            
            generateTerrain() {
                this.clearTerrain(); // Clear existing terrain
                
                // Create base terrain plane
                const geometry = new THREE.PlaneGeometry(this.size, this.size, 32, 32);
                
                // Rotate to be horizontal
                geometry.rotateX(-Math.PI / 2);
                
                // Create a nice material for the terrain
                const material = new THREE.MeshStandardMaterial({
                    color: 0x8BC34A,
                    flatShading: true,
                    side: THREE.DoubleSide
                });
                
                this.terrain = new THREE.Mesh(geometry, material);
                this.terrain.receiveShadow = true;
                this.scene.add(this.terrain);
                
                // Add water around the terrain
                this.addWater();
                
                // Add decorative elements
                this.addTrees();
                this.addRocks();
            }
            
            clearTerrain() {
                // Remove previous terrain elements
                if (this.terrain) {
                    this.scene.remove(this.terrain);
                    this.terrain.geometry.dispose();
                    this.terrain.material.dispose();
                }
                
                if (this.water) {
                    this.scene.remove(this.water);
                    this.water.geometry.dispose();
                    this.water.material.dispose();
                }
                
                // Remove decorations
                this.decorations.forEach(decoration => {
                    this.scene.remove(decoration);
                    if (decoration.geometry) decoration.geometry.dispose();
                    if (decoration.material) decoration.material.dispose();
                });
                
                this.decorations = [];
            }
            
            regenerateTerrain() {
                this.generateTerrain();
            }
            
            addWater() {
                const waterSize = this.size * 1.5;
                const waterGeometry = new THREE.PlaneGeometry(waterSize, waterSize);
                waterGeometry.rotateX(-Math.PI / 2);
                
                const waterMaterial = new THREE.MeshStandardMaterial({
                    color: 0x4FC3F7,
                    transparent: true,
                    opacity: 0.7
                });
                
                this.water = new THREE.Mesh(waterGeometry, waterMaterial);
                this.water.position.y = -0.2; // Slightly below the terrain
                this.scene.add(this.water);
            }
            
            addTrees() {
                const treeCount = Math.floor(this.size / 4);
                
                for (let i = 0; i < treeCount; i++) {
                    const position = this.getRandomPositionInBounds(this.size / 2.5);
                    this.createTree(position.x, 0, position.z);
                }
            }
            
            createTree(x, y, z) {
                // Tree trunk
                const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1, 6);
                const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
                const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                trunk.position.set(x, y + 0.5, z);
                trunk.castShadow = true;
                trunk.receiveShadow = true;
                this.scene.add(trunk);
                this.decorations.push(trunk);
                
                // Tree top
                const topGeometry = new THREE.ConeGeometry(1, 2, 6);
                const topMaterial = new THREE.MeshStandardMaterial({ color: 0x2E7D32 });
                const top = new THREE.Mesh(topGeometry, topMaterial);
                top.position.set(x, y + 2, z);
                top.castShadow = true;
                top.receiveShadow = true;
                this.scene.add(top);
                this.decorations.push(top);
                
                // Add tree as an obstacle in the world
                const tree = new THREE.Group();
                tree.add(trunk.clone());
                tree.add(top.clone());
                tree.position.set(x, y, z);
                
                // Add tree data for collision detection
                tree.userData = {
                    type: 'tree',
                    boundingRadius: 0.5,
                    position: { x, y, z }
                };
                
                // Add to world obstacles if simulation is initialized
                if (this.scene.userData.world && this.scene.userData.world.simulation) {
                    this.scene.userData.world.addObstacle(tree);
                }
            }
            
            addRocks() {
                const rockCount = Math.floor(this.size / 3);
                
                for (let i = 0; i < rockCount; i++) {
                    const position = this.getRandomPositionInBounds(this.size / 2.2);
                    this.createRock(position.x, 0, position.z);
                }
            }
            
            createRock(x, y, z) {
                const size = 0.2 + Math.random() * 0.3;
                const geometry = new THREE.DodecahedronGeometry(size, 0);
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0x9E9E9E,
                    flatShading: true
                });
                
                const rock = new THREE.Mesh(geometry, material);
                rock.position.set(x, y + size / 2, z);
                rock.rotation.y = Math.random() * Math.PI;
                rock.castShadow = true;
                rock.receiveShadow = true;
                this.scene.add(rock);
                this.decorations.push(rock);
                
                // Add rock data for collision detection
                rock.userData = {
                    type: 'rock',
                    boundingRadius: size,
                    position: { x, y, z }
                };
                
                // Add to world obstacles if simulation is initialized
                if (this.scene.userData.world && this.scene.userData.world.simulation) {
                    this.scene.userData.world.addObstacle(rock);
                }
            }
            
            getRandomPositionInBounds(bound = this.size / 2) {
                return {
                    x: (Math.random() * 2 - 1) * bound,
                    z: (Math.random() * 2 - 1) * bound
                };
            }
            
            getRandomPosition() {
                const pos = this.getRandomPositionInBounds(this.size / 2.5);
                return { x: pos.x, y: 0, z: pos.z };
            }
        }window.TerrainGenerator = TerrainGenerator;
    })();
    
    
    
    /*************************************************/
    /* Fichier : ./js/main.js */
    /*************************************************/
    
    (() => {
        
        
        
        
        
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
        
        // Fonction d'initialisation pour garantir que les sliders réagissent aux événements tactiles
        function initSliderTouchSupport() {
            const sliders = document.querySelectorAll('input[type="range"]');
            sliders.forEach(slider => {
                // Les événements tactiles sur les sliders ne doivent pas remonter vers les conteneurs parent
                slider.addEventListener('touchstart', (e) => {
                    e.stopPropagation(); // Empêche la capture par des écouteurs parent
                }, { passive: true });
                
                slider.addEventListener('touchmove', (e) => {
                    e.stopPropagation();
                }, { passive: true });
                
                slider.addEventListener('touchend', (e) => {
                    e.stopPropagation();
                }, { passive: true });
            });
        }
        
        
        // Start the application when the DOM is fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            initSliderTouchSupport();
            try {
                window.app = new Application();
            } catch (error) {
                console.error("Failed to start application:", error);
            }
        });window.Application = Application;
    })();
    
    
    
    /*************************************************/
    /* Fichier : ./js/statistics/StatisticsTracker.js */
    /*************************************************/
    
    (() => {
        class StatisticsTracker {
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
        }window.StatisticsTracker = StatisticsTracker;
    })();
    
    
    
    /*************************************************/
    /* Fichier : ./js/entities/EntityModel.js */
    /*************************************************/
    
    (() => {
        class EntityModel {
            constructor(size, color, shape = 'box') {
                this.size = size;
                this.mesh = this.createMesh(color, shape);
                this.label = null;
                this.healthBar = null;
                this.interactionEmoji = null;
                this.createHealthBar();
                this.createInteractionEmoji();
            }
            
            createMesh(color, shape) {
                const group = new THREE.Group();
                
                if (shape === 'sphere') {
                    // Create a spherical fruit
                    const bodyGeometry = new THREE.SphereGeometry(this.size * 0.5, 12, 12);
                    const bodyMaterial = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(color.r, color.g, color.b),
                        flatShading: true
                    });
                    
                    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
                    body.castShadow = true;
                    body.receiveShadow = true;
                    group.add(body);
                    
                    // Add a small stem for fruits
                    const stemGeometry = new THREE.CylinderGeometry(this.size * 0.05, this.size * 0.05, this.size * 0.3, 8);
                    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x795548 });
                    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
                    stem.position.set(0, this.size * 0.6, 0);
                    stem.castShadow = true;
                    group.add(stem);
                    
                    // Add a small leaf for fruits
                    const leafGeometry = new THREE.ConeGeometry(this.size * 0.15, this.size * 0.3, 8);
                    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
                    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
                    leaf.position.set(this.size * 0.1, this.size * 0.6, 0);
                    leaf.rotation.z = Math.PI / 4;
                    leaf.castShadow = true;
                    group.add(leaf);
                } 
                else if (shape === 'banana') {
                    // Create a banana-shaped fruit (curved mesh)
                    const points = [];
                    const segments = 10;
                    const curve = 0.3;
                    
                    for (let i = 0; i <= segments; i++) {
                        const t = i / segments;
                        const x = this.size * 0.6 * Math.sin(t * Math.PI) * curve;
                        const y = this.size * (t - 0.5);
                        points.push(new THREE.Vector2(x, y));
                    }
                    
                    const bodyGeometry = new THREE.LatheGeometry(points, 8);
                    const bodyMaterial = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(color.r, color.g, color.b),
                        flatShading: true
                    });
                    
                    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
                    body.castShadow = true;
                    body.receiveShadow = true;
                    body.rotation.z = Math.PI / 2;
                    group.add(body);
                    
                    // Add a small stem
                    const stemGeometry = new THREE.CylinderGeometry(this.size * 0.05, this.size * 0.05, this.size * 0.2, 8);
                    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x795548 });
                    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
                    stem.position.set(0, this.size * 0.5, 0);
                    stem.castShadow = true;
                    group.add(stem);
                }
                else {
                    // Create body - default organism shape
                    const bodyGeometry = new THREE.BoxGeometry(this.size, this.size * 0.7, this.size * 1.2);
                    const bodyMaterial = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(color.r, color.g, color.b),
                        flatShading: true
                    });
                    
                    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
                    body.castShadow = true;
                    body.receiveShadow = true;
                    group.add(body);
                    
                    // Add eyes
                    const eyeGeometry = new THREE.SphereGeometry(this.size * 0.15, 8, 8);
                    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
                    
                    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
                    leftEye.position.set(this.size * 0.25, this.size * 0.2, this.size * 0.5);
                    
                    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
                    rightEye.position.set(-this.size * 0.25, this.size * 0.2, this.size * 0.5);
                    
                    group.add(leftEye);
                    group.add(rightEye);
                    
                    // Add pupils
                    const pupilGeometry = new THREE.SphereGeometry(this.size * 0.07, 8, 8);
                    const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
                    
                    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
                    leftPupil.position.set(this.size * 0.25, this.size * 0.2, this.size * 0.6);
                    
                    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
                    rightPupil.position.set(-this.size * 0.25, this.size * 0.2, this.size * 0.6);
                    
                    group.add(leftPupil);
                    group.add(rightPupil);
                }
                
                // Add label (hidden by default)
                this.createLabel(group);
                
                return group;
            }
            
            createLabel(parentGroup) {
                // Create a canvas for the label
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = 256;
                canvas.height = 128;
                
                // Create texture from canvas
                const texture = new THREE.CanvasTexture(canvas);
                
                // Create sprite material with the texture
                const spriteMaterial = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true
                });
                
                // Create sprite
                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.scale.set(2, 1, 1);
                sprite.position.set(0, this.size * 1.5, 0);
                sprite.visible = false;
                
                parentGroup.add(sprite);
                
                this.label = {
                    sprite: sprite,
                    canvas: canvas,
                    context: context,
                    texture: texture
                };
            }
            
            updateLabel(text) {
                if (!this.label) return;
                
                const { canvas, context, texture } = this.label;
                
                // Clear canvas
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                // Set font and style
                context.font = '24px Arial';
                context.fillStyle = 'white';
                context.strokeStyle = 'black';
                context.lineWidth = 4;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                
                // Draw text
                context.strokeText(text, canvas.width / 2, canvas.height / 2);
                context.fillText(text, canvas.width / 2, canvas.height / 2);
                
                // Update texture
                texture.needsUpdate = true;
            }
            
            setLabelVisibility(visible) {
                if (this.label) {
                    this.label.sprite.visible = visible;
                }
            }
            
            createHealthBar() {
                // Create a container for the health bar
                const container = new THREE.Group();
                
                // Background bar (dark gray)
                const backgroundGeometry = new THREE.PlaneGeometry(1, 0.15);
                const backgroundMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x333333,
                    transparent: true,
                    opacity: 0.7
                });
                const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
                container.add(background);
                
                // Health indicator (green)
                const healthGeometry = new THREE.PlaneGeometry(0.98, 0.12);
                const healthMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x4caf50,
                    transparent: true,
                    opacity: 0.9
                });
                const health = new THREE.Mesh(healthGeometry, healthMaterial);
                health.position.z = 0.01; // Slightly in front of the background
                container.add(health);
                
                // Position the container above the entity
                container.position.set(0, this.size * 0.9, 0);
                
                // Hide by default
                container.visible = false;
                
                // Add to mesh
                this.mesh.add(container);
                
                // Store references for updating
                this.healthBar = {
                    container: container,
                    background: background,
                    health: health
                };
            }
            
            updateHealthBar(healthPercentage) {
                if (!this.healthBar) return;
                
                // Ensure the value is between 0 and 1
                healthPercentage = Math.max(0, Math.min(1, healthPercentage));
                
                // Update the width of the health bar
                this.healthBar.health.scale.x = healthPercentage;
                
                // Position the bar correctly (centering it)
                this.healthBar.health.position.x = (healthPercentage - 1) * 0.49;
                
                // Update color based on health level
                if (healthPercentage > 0.6) {
                    this.healthBar.health.material.color.setHex(0x4caf50); // Green
                } else if (healthPercentage > 0.3) {
                    this.healthBar.health.material.color.setHex(0xffc107); // Yellow
                } else {
                    this.healthBar.health.material.color.setHex(0xf44336); // Red
                }
            }
            
            setHealthBarVisibility(visible) {
                if (this.healthBar) {
                    this.healthBar.container.visible = visible;
                }
            }
            
            createInteractionEmoji() {
                // Create a canvas for the emoji
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = 128;
                canvas.height = 128;
                
                // Create texture from canvas
                const texture = new THREE.CanvasTexture(canvas);
                
                // Create sprite material with the texture
                const spriteMaterial = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true
                });
                
                // Create sprite
                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.scale.set(0.8, 0.8, 1);
                sprite.position.set(0, this.size * 1.2, 0);
                sprite.visible = false;
                
                this.mesh.add(sprite);
                
                this.interactionEmoji = {
                    sprite: sprite,
                    canvas: canvas,
                    context: context,
                    texture: texture,
                    currentEmoji: null,
                    displayStartTime: 0,
                    displayDuration: 1500 // Show emoji for 1.5 seconds
                };
            }
            
            showEmoji(emoji) {
                if (!this.interactionEmoji) return;
                
                const { canvas, context, texture, sprite } = this.interactionEmoji;
                
                // Clear the canvas
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw the emoji
                context.font = '80px Arial';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(emoji, canvas.width / 2, canvas.height / 2);
                
                // Update texture
                texture.needsUpdate = true;
                
                // Show the sprite
                sprite.visible = true;
                
                // Store the current time and emoji for auto-hiding
                this.interactionEmoji.displayStartTime = Date.now();
                this.interactionEmoji.currentEmoji = emoji;
                
                // Schedule hiding after the duration
                setTimeout(() => {
                    if (this.interactionEmoji && this.interactionEmoji.currentEmoji === emoji) {
                        sprite.visible = false;
                    }
                }, this.interactionEmoji.displayDuration);
            }
            
            setPosition(x, y, z) {
                this.mesh.position.set(x, y, z);
            }
            
            setRotation(x, y, z) {
                this.mesh.rotation.set(x, y, z);
            }
            
            setScale(x, y, z) {
                this.mesh.scale.set(x, y, z);
            }
            
            setColor(r, g, b) {
                // Only change the body color
                this.mesh.children[0].material.color.setRGB(r, g, b);
            }
            
            startDeathAnimation() {
                // Fade out and shrink
                this.mesh.userData.deathAnimation = {
                    progress: 0,
                    duration: 1.5, // seconds
                    active: true
                };
                
                const animate = () => {
                    if (!this.mesh.userData.deathAnimation) return;
                    
                    const anim = this.mesh.userData.deathAnimation;
                    anim.progress += 0.02;
                    
                    if (anim.progress >= 1) {
                        this.mesh.visible = false;
                        return;
                    }
                    
                    // Shrink and sink into ground
                    const scale = 1 - anim.progress;
                    this.setScale(scale, scale, scale);
                    this.mesh.position.y = this.size * 0.5 * (1 - anim.progress);
                    
                    // Fade out
                    this.mesh.children.forEach(child => {
                        if (child.material && !(child instanceof THREE.Sprite)) {
                            if (!child.material.userData.originalOpacity) {
                                child.material.userData.originalOpacity = child.material.opacity || 1;
                            }
                            child.material.transparent = true;
                            child.material.opacity = child.material.userData.originalOpacity * (1 - anim.progress);
                        }
                    });
                    
                    // Hide label
                    this.setLabelVisibility(false);
                    
                    // Continue animation
                    requestAnimationFrame(animate);
                };
                
                animate();
            }
        }window.EntityModel = EntityModel;
    })();
    
    
    
    /*************************************************/
    /* Fichier : ./js/behaviors/CooperativeBehavior.js */
    /*************************************************/
    
    (() => {
        
        
        class CooperativeBehavior extends BaseBehavior {
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
        }window.CooperativeBehavior = CooperativeBehavior;
    })();
    
    
    
    /*************************************************/
    /* Fichier : ./js/behaviors/QLearningBehavior.js */
    /*************************************************/
    
    (() => {
        
        
        class QLearningBehavior extends BaseBehavior {
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
        }window.QLearningBehavior = QLearningBehavior;
    })();
    
    
    
    /*************************************************/
    /* Fichier : ./js/simulation/SimulationManager.js */
    /*************************************************/
    
    (() => {
        class SimulationManager {
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
            }window.SimulationManager = SimulationManager;
        })();
        
        
        
        /*************************************************/
        /* Fichier : ./js/behaviors/BehaviorFactory.js */
        /*************************************************/
        
        (() => {
            
            
            
            
            
            
            
            
            class BehaviorFactory {
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
            }window.BehaviorFactory = BehaviorFactory;
        })();
        
        
        
        /*************************************************/
        /* Fichier : ./js/behaviors/SelfishBehavior.js */
        /*************************************************/
        
        (() => {
            
            
            class SelfishBehavior extends BaseBehavior {
                constructor() {
                    super('selfish', { r: 0.5, g: 0.5, b: 0.5 }); // Gray color
                }
                
                selectTarget(self, nearbyEntities) {
                    // Selfish organisms prefer targets with more energy
                    const targetsByEnergy = [...nearbyEntities].sort((a, b) => b.energy - a.energy);
                    
                    if (targetsByEnergy.length > 0) {
                        return targetsByEnergy[0]; // Select the entity with most energy
                    }
                    
                    return null;
                }
                
                interact(self, target) {
                    // Selfish organisms try to take energy without giving any
                    const energyToTake = Math.min(5, target.energy * 0.1);
                    
                    // Remember this as a negative interaction
                    this.rememberInteraction(target.mesh.id, false);
                    
                    return {
                        selfEnergyDelta: energyToTake,
                        targetEnergyDelta: -energyToTake
                    };
                }
            }window.SelfishBehavior = SelfishBehavior;
        })();
        
        
        
        /*************************************************/
        /* Fichier : ./js/behaviors/DeepQLearningBehavior.js */
        /*************************************************/
        
        (() => {
            
            
            class DeepQLearningBehavior extends BaseBehavior {
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
            }window.DeepQLearningBehavior = DeepQLearningBehavior;
        })();
        
        
        
        /*************************************************/
        /* Fichier : ./js/behaviors/TitForTatBehavior.js */
        /*************************************************/
        
        (() => {
            
            
            class TitForTatBehavior extends BaseBehavior {
                constructor() {
                    super('titfortat', { r: 0.9, g: 0.6, b: 0.1 }); // Orange color
                }
                
                selectTarget(self, nearbyEntities) {
                    // Tit-for-tat prefers to interact with entities it has interacted with before
                    const entitiesWithHistory = nearbyEntities.filter(entity => 
                        this.memory.has(entity.mesh.id)
                    );
                    
                    if (entitiesWithHistory.length > 0) {
                        return super.selectTarget(self, entitiesWithHistory);
                    }
                    
                    // If no history, select randomly (trying new partners)
                    if (nearbyEntities.length > 0) {
                        return nearbyEntities[Math.floor(Math.random() * nearbyEntities.length)];
                    }
                    
                    return null;
                }
                
                interact(self, target) {
                    // Check if we have interacted with this target before
                    const lastInteraction = this.getLastInteraction(target.mesh.id);
                    
                    // First interaction is always cooperative
                    if (!lastInteraction) {
                        const energyToShare = 5;
                        
                        this.rememberInteraction(target.mesh.id, true);
                        
                        return {
                            selfEnergyDelta: -energyToShare,
                            targetEnergyDelta: energyToShare
                        };
                    }
                    
                    // If the last interaction was positive, cooperate
                    if (lastInteraction.wasPositive) {
                        const energyToShare = 5;
                        
                        this.rememberInteraction(target.mesh.id, true);
                        
                        return {
                            selfEnergyDelta: -energyToShare,
                            targetEnergyDelta: energyToShare
                        };
                    } 
                    // Otherwise, retaliate
                    else {
                        const energyToTake = Math.min(8, target.energy * 0.15);
                        
                        this.rememberInteraction(target.mesh.id, false);
                        
                        return {
                            selfEnergyDelta: energyToTake,
                            targetEnergyDelta: -energyToTake
                        };
                    }
                }
            }window.TitForTatBehavior = TitForTatBehavior;
        })();
        
        
        
        /*************************************************/
        /* Fichier : ./js/behaviors/AggressiveBehavior.js */
        /*************************************************/
        
        (() => {
            
            
            class AggressiveBehavior extends BaseBehavior {
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
            }window.AggressiveBehavior = AggressiveBehavior;
        })();
        
        
        
        /*************************************************/
        /* Fichier : ./js/world/World.js */
        /*************************************************/
        
        (() => {
            
            
            
            class World {
                constructor(containerId) {
                    this.container = document.getElementById(containerId);
                    this.entities = [];
                    this.foods = [];
                    this.obstacles = [];
                    this.placementMode = false;
                    this.setupScene();
                    this.setupCamera();
                    this.setupLights();
                    this.setupRenderer();
                    this.setupControls();
                    
                    // Generate the terrain
                    this.terrain = new TerrainGenerator(this.scene);
                    this.terrain.generateTerrain();
                    
                    // Entity factory for creating organisms
                    this.entityFactory = new EntityFactory(this.scene);
                    
                    // Set up raycaster for placement mode
                    this.raycaster = new THREE.Raycaster();
                    this.mouse = new THREE.Vector2();
                    
                    // Event listeners for placement mode
                    this.setupPlacementModeListeners();
                }
                
                setupScene() {
                    this.scene = new THREE.Scene();
                    this.scene.background = new THREE.Color(0xb8d0ff);
                    
                    // Add fog for depth perception
                    this.scene.fog = new THREE.FogExp2(0xb8d0ff, 0.02);
                }
                
                setupCamera() {
                    const aspect = window.innerWidth / window.innerHeight;
                    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
                    
                    // Set up isometric view
                    this.camera.position.set(20, 20, 20);
                    this.camera.lookAt(0, 0, 0);
                }
                
                setupLights() {
                    // Main directional light for shadows
                    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                    this.directionalLight.position.set(50, 50, 50);
                    this.directionalLight.castShadow = true;
                    
                    // Configure shadow properties
                    this.directionalLight.shadow.mapSize.width = 2048;
                    this.directionalLight.shadow.mapSize.height = 2048;
                    this.directionalLight.shadow.camera.near = 0.5;
                    this.directionalLight.shadow.camera.far = 500;
                    this.directionalLight.shadow.camera.left = -30;
                    this.directionalLight.shadow.camera.right = 30;
                    this.directionalLight.shadow.camera.top = 30;
                    this.directionalLight.shadow.camera.bottom = -30;
                    
                    this.scene.add(this.directionalLight);
                    
                    // Ambient light for the scene
                    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
                    this.scene.add(ambientLight);
                }
                
                setupRenderer() {
                    this.renderer = new THREE.WebGLRenderer({ antialias: true });
                    this.renderer.setSize(window.innerWidth, window.innerHeight);
                    this.renderer.setPixelRatio(window.devicePixelRatio);
                    this.renderer.shadowMap.enabled = true;
                    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                    
                    this.container.appendChild(this.renderer.domElement);
                }
                
                setupControls() {
                    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                    this.controls.enableDamping = true;
                    this.controls.dampingFactor = 0.25;
                    this.controls.screenSpacePanning = false;
                    this.controls.maxPolarAngle = Math.PI / 2;
                    
                    // Limit zoom
                    this.controls.minDistance = 10;
                    this.controls.maxDistance = 50;
                }
                
                setupPlacementModeListeners() {
                    // Store the handler so we can remove it later
                    this.clickHandler = this.handlePlacementClick.bind(this);
                    this.mouseMoveHandler = this.handleMouseMove.bind(this);
                    
                    // Ghost/preview object for placement
                    this.ghostObject = null;
                }
                
                activatePlacementMode(itemType, options = {}) {
                    this.placementMode = true;
                    this.placementItemType = itemType;
                    this.placementOptions = options;
                    
                    // Sur mobile, masquer le panneau de contrôle pour libérer de l'espace
                    if (window.innerWidth < 768) {
                        const controlPanel = document.getElementById('control-panel');
                        if (controlPanel) {
                            controlPanel.classList.add('hidden');
                        }
                    }
                    
                    document.getElementById('placement-controls').classList.remove('hidden');
                    
                    if (window.PointerEvent) {
                        this.renderer.domElement.addEventListener('pointerup', this.clickHandler);
                        this.renderer.domElement.addEventListener('pointermove', this.mouseMoveHandler);
                    } else {
                        this.renderer.domElement.addEventListener('click', this.clickHandler);
                        this.renderer.domElement.addEventListener('touchend', this.clickHandler, { passive: false });
                        this.renderer.domElement.addEventListener('mousemove', this.mouseMoveHandler);
                        this.renderer.domElement.addEventListener('touchmove', this.mouseMoveHandler, { passive: false });
                    }
                    this.controls.enabled = false;
                    this.createGhostObject();
                }
                
                deactivatePlacementMode() {
                    this.placementMode = false;
                    document.getElementById('placement-controls').classList.add('hidden');
                    
                    if (window.PointerEvent) {
                        this.renderer.domElement.removeEventListener('pointerup', this.clickHandler);
                        this.renderer.domElement.removeEventListener('pointermove', this.mouseMoveHandler);
                    } else {
                        this.renderer.domElement.removeEventListener('click', this.clickHandler);
                        this.renderer.domElement.removeEventListener('touchend', this.clickHandler, { passive: false });
                        this.renderer.domElement.removeEventListener('mousemove', this.mouseMoveHandler);
                        this.renderer.domElement.removeEventListener('touchmove', this.mouseMoveHandler, { passive: false });
                    }
                    this.controls.enabled = true;
                    
                    // Réafficher le panneau de contrôle sur mobile une fois le placement terminé
                    if (window.innerWidth < 768) {
                        const controlPanel = document.getElementById('control-panel');
                        if (controlPanel) {
                            controlPanel.classList.remove('hidden');
                        }
                    }
                    
                    if (this.ghostObject) {
                        this.scene.remove(this.ghostObject);
                        this.ghostObject = null;
                    }
                }
                
                
                
                
                createGhostObject() {
                    // Remove existing ghost object if it exists
                    if (this.ghostObject) {
                        this.scene.remove(this.ghostObject);
                        this.ghostObject = null;
                    }
                    
                    const position = { x: 0, y: 0, z: 0 };
                    
                    switch (this.placementItemType) {
                        case 'organism':
                        const organism = this.entityFactory.createOrganism(
                            this.placementOptions.behaviorType || 'random', 
                            position
                        );
                        this.ghostObject = organism.mesh;
                        // Make semi-transparent
                        this.makeObjectTransparent(this.ghostObject);
                        break;
                        
                        case 'food':
                        const food = this.entityFactory.createFood(
                            this.placementOptions.foodType || 'apple', 
                            position
                        );
                        this.ghostObject = food.mesh;
                        this.makeObjectTransparent(this.ghostObject);
                        break;
                        
                        case 'tree':
                        this.ghostObject = this.entityFactory.createTree(position);
                        this.makeObjectTransparent(this.ghostObject);
                        break;
                        
                        case 'rock':
                        this.ghostObject = this.entityFactory.createRock(position);
                        this.makeObjectTransparent(this.ghostObject);
                        break;
                    }
                    
                    if (this.ghostObject) {
                        this.scene.add(this.ghostObject);
                    }
                }
                
                makeObjectTransparent(object) {
                    object.traverse(child => {
                        if (child.isMesh && child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    mat.transparent = true;
                                    mat.opacity = 0.5;
                                });
                            } else {
                                child.material.transparent = true;
                                child.material.opacity = 0.5;
                            }
                        }
                    });
                }
                
                handlePlacementClick(event) {
                    // Calculate mouse position
                    this.calculateMousePosition(event);
                    
                    // Raycast to terrain
                    this.raycaster.setFromCamera(this.mouse, this.camera);
                    const intersects = this.raycaster.intersectObject(this.terrain.terrain, false);
                    
                    if (intersects.length > 0) {
                        const point = intersects[0].point;
                        
                        // Place the object at the clicked position
                        switch (this.placementItemType) {
                            case 'organism':
                            this.simulation.addOrganismAt(
                                this.placementOptions.behaviorType || 'random', 
                                { x: point.x, y: 0, z: point.z }
                            );
                            break;
                            
                            case 'food':
                            this.simulation.addFoodAt(
                                this.placementOptions.foodType || 'apple', 
                                { x: point.x, y: 0, z: point.z }
                            );
                            break;
                            
                            case 'tree':
                            this.simulation.addObstacleAt(
                                'tree', 
                                { x: point.x, y: 0, z: point.z }
                            );
                            break;
                            
                            case 'rock':
                            this.simulation.addObstacleAt(
                                'rock', 
                                { x: point.x, y: 0, z: point.z }
                            );
                            break;
                        }
                    }
                }
                
                handleMouseMove(event) {
                    // Only update ghost position if in placement mode
                    if (!this.placementMode || !this.ghostObject) return;
                    
                    // Calculate mouse position
                    this.calculateMousePosition(event);
                    
                    // Raycast to terrain
                    this.raycaster.setFromCamera(this.mouse, this.camera);
                    const intersects = this.raycaster.intersectObject(this.terrain.terrain, false);
                    
                    if (intersects.length > 0) {
                        const point = intersects[0].point;
                        
                        // Update ghost position
                        this.ghostObject.position.set(point.x, point.y, point.z);
                    }
                }
                
                calculateMousePosition(event) {
                    const rect = this.renderer.domElement.getBoundingClientRect();
                    let clientX, clientY;
                    if (event.touches && event.touches.length > 0) {
                        clientX = event.touches[0].clientX;
                        clientY = event.touches[0].clientY;
                    } else {
                        clientX = event.clientX;
                        clientY = event.clientY;
                    }
                    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
                    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
                }
                
                
                onResize() {
                    if (!this.camera || !this.renderer) return;
                    
                    this.camera.aspect = window.innerWidth / window.innerHeight;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(window.innerWidth, window.innerHeight);
                }
                
                addEntity(entity) {
                    this.entities.push(entity);
                    this.scene.add(entity.mesh);
                    return entity;
                }
                
                removeEntity(entity) {
                    const index = this.entities.indexOf(entity);
                    if (index > -1) {
                        this.entities.splice(index, 1);
                        this.scene.remove(entity.mesh);
                    }
                }
                
                addFood(food) {
                    this.foods.push(food);
                    this.scene.add(food.mesh);
                    return food;
                }
                
                removeFood(food) {
                    const index = this.foods.indexOf(food);
                    if (index > -1) {
                        this.foods.splice(index, 1);
                        this.scene.remove(food.mesh);
                    }
                }
                
                addObstacle(obstacle) {
                    this.obstacles.push(obstacle);
                    this.scene.add(obstacle);
                    return obstacle;
                }
                
                removeObstacle(obstacle) {
                    const index = this.obstacles.indexOf(obstacle);
                    if (index > -1) {
                        this.obstacles.splice(index, 1);
                        this.scene.remove(obstacle);
                    }
                }
                
                getEntities() {
                    return this.entities;
                }
                
                getFoodItems() {
                    return this.foods;
                }
                
                getObstacles() {
                    return this.obstacles;
                }
                
                getRandomPosition() {
                    if (!this.terrain) {
                        this.terrain = new TerrainGenerator(this.scene);
                    }
                    return this.terrain.getRandomPosition();
                }
                
                render() {
                    if (!this.controls || !this.renderer || !this.scene || !this.camera) return;
                    
                    this.controls.update();
                    this.renderer.render(this.scene, this.camera);
                }
                
                reset() {
                    // Remove all entities
                    while (this.entities.length > 0) {
                        this.removeEntity(this.entities[0]);
                    }
                    
                    // Remove all food
                    while (this.foods.length > 0) {
                        this.removeFood(this.foods[0]);
                    }
                    
                    // Remove all obstacles
                    while (this.obstacles.length > 0) {
                        this.removeObstacle(this.obstacles[0]);
                    }
                }
                
                // Camera control methods
                setCameraDistance(distance) {
                    if (!this.controls || !this.camera) return;
                    
                    // Update orbit controls limits
                    this.controls.minDistance = Math.min(distance - 5, 5);
                    this.controls.maxDistance = distance + 5;
                    
                    // Set camera position to new distance
                    const direction = new THREE.Vector3();
                    direction.subVectors(this.camera.position, this.controls.target).normalize();
                    direction.multiplyScalar(distance);
                    this.camera.position.copy(direction.add(this.controls.target));
                }
                
                getCameraDistance() {
                    if (!this.camera || !this.controls) return 20;
                    
                    const cameraPosition = new THREE.Vector3();
                    this.camera.getWorldPosition(cameraPosition);
                    
                    const controlsTarget = this.controls.target;
                    return cameraPosition.distanceTo(controlsTarget);
                }
            }window.World = World;
        })();
        
        
        
        /*************************************************/
        /* Fichier : ./js/entities/Organism.js */
        /*************************************************/
        
        (() => {
            
            
            class Organism {
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
                }window.Organism = Organism;
            })();
            
            
            
            /*************************************************/
            /* Fichier : ./js/entities/EntityFactory.js */
            /*************************************************/
            
            (() => {
                
                
                
                
                class EntityFactory {
                    constructor(scene) {
                        this.scene = scene;
                        this.behaviorFactory = new BehaviorFactory();
                    }
                    
                    createOrganism(type = 'random', position = null, stats = null) {
                        // Create a behavior based on the type
                        const behavior = this.behaviorFactory.createBehavior(type);
                        
                        // Generate random stats for the organism if not provided
                        if (!stats) {
                            stats = {
                                energy: 50 + Math.random() * 50,
                                speed: 0.5 + Math.random() * 1.5,
                                size: 0.5 + Math.random() * 0.5,
                                lifespan: 20 + Math.random() * 80,
                                reproductionRate: 0.001 + Math.random() * 0.009
                            };
                        }
                        
                        // Create the organism with the specified behavior and stats
                        return new Organism(stats, behavior, position);
                    }
                    
                    createRandomOrganism(position = null, stats = null) {
                        const behaviorTypes = [
                            'aggressive',
                            'altruistic',
                            'titfortat',
                            'cooperative',
                            'selfish'
                        ];
                        
                        const randomType = behaviorTypes[Math.floor(Math.random() * behaviorTypes.length)];
                        return this.createOrganism(randomType, position, stats);
                    }
                    
                    createFood(type = 'apple', position = null, energyValue = 20) {
                        const foodTypes = ['apple', 'orange', 'berry', 'banana'];
                        
                        if (type === 'random') {
                            type = foodTypes[Math.floor(Math.random() * foodTypes.length)];
                        }
                        
                        return new Food(type, position, energyValue);
                    }
                    
                    createTree(position = null, size = null) {
                        position = position || { x: 0, y: 0, z: 0 };
                        size = size || 1 + Math.random() * 0.5;
                        
                        // Create tree trunk
                        const trunkGeometry = new THREE.CylinderGeometry(size * 0.2, size * 0.3, size, 6);
                        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
                        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                        trunk.position.set(position.x, position.y + size/2, position.z);
                        trunk.castShadow = true;
                        trunk.receiveShadow = true;
                        
                        // Create tree top
                        const topGeometry = new THREE.ConeGeometry(size, size * 2, 6);
                        const topMaterial = new THREE.MeshStandardMaterial({ color: 0x2E7D32 });
                        const top = new THREE.Mesh(topGeometry, topMaterial);
                        top.position.set(position.x, position.y + size * 1.5, position.z);
                        top.castShadow = true;
                        top.receiveShadow = true;
                        
                        // Create a group to hold both parts
                        const treeGroup = new THREE.Group();
                        treeGroup.add(trunk);
                        treeGroup.add(top);
                        treeGroup.position.y = 0;
                        
                        // Add collision data
                        treeGroup.userData = {
                            type: 'tree',
                            boundingRadius: size * 0.3,
                            position: position
                        };
                        
                        return treeGroup;
                    }
                    
                    createRock(position = null, size = null) {
                        position = position || { x: 0, y: 0, z: 0 };
                        size = size || 0.2 + Math.random() * 0.3;
                        
                        const geometry = new THREE.DodecahedronGeometry(size, 0);
                        const material = new THREE.MeshStandardMaterial({ 
                            color: 0x9E9E9E,
                            flatShading: true
                        });
                        
                        const rock = new THREE.Mesh(geometry, material);
                        rock.position.set(position.x, position.y + size / 2, position.z);
                        rock.rotation.y = Math.random() * Math.PI;
                        rock.castShadow = true;
                        rock.receiveShadow = true;
                        
                        // Add collision data
                        rock.userData = {
                            type: 'rock',
                            boundingRadius: size,
                            position: position
                        };
                        
                        return rock;
                    }
                }window.EntityFactory = EntityFactory;
            })();
            
            
            
            /*************************************************/
            /* Fichier : ./js/entities/Food.js */
            /*************************************************/
            
            (() => {
                
                
                class Food {
                    constructor(type, position, energyValue) {
                        this.type = type || 'apple';
                        this.energyValue = energyValue || 30;
                        this.position = position || { x: 0, y: 0, z: 0 };
                        this.size = 0.6 + Math.random() * 0.2;
                        this.isConsumed = false;
                        
                        // Create visual representation
                        this.model = this.createFoodModel();
                        this.model.setPosition(this.position.x, this.position.y, this.position.z);
                    }
                    
                    createFoodModel() {
                        // Colors and shapes for different food types
                        const foodTypes = {
                            apple: { color: { r: 0.9, g: 0.2, b: 0.2 }, shape: 'sphere' },
                            orange: { color: { r: 1.0, g: 0.6, b: 0.1 }, shape: 'sphere' },
                            berry: { color: { r: 0.5, g: 0.0, b: 0.7 }, shape: 'sphere' },
                            banana: { color: { r: 1.0, g: 0.9, b: 0.2 }, shape: 'banana' }
                        };
                        
                        const foodType = foodTypes[this.type] || foodTypes.apple;
                        const model = new EntityModel(this.size, foodType.color, foodType.shape);
                        
                        // Add a small rotation for visual interest
                        model.mesh.rotation.y = Math.random() * Math.PI * 2;
                        
                        return model;
                    }
                    
                    get mesh() {
                        return this.model.mesh;
                    }
                    
                    update(deltaTime) {
                        if (this.isConsumed) return;
                        
                        // Make food gently bob up and down
                        const hoverHeight = Math.sin(Date.now() * 0.002) * 0.1;
                        this.model.setPosition(this.position.x, this.position.y + hoverHeight, this.position.z);
                        
                        // Slowly rotate
                        this.mesh.rotation.y += deltaTime * 0.2;
                    }
                    
                    consume() {
                        if (this.isConsumed) return 0;
                        
                        this.isConsumed = true;
                        this.startConsumptionAnimation();
                        
                        return this.energyValue;
                    }
                    
                    startConsumptionAnimation() {
                        // Scale down and fade out
                        const duration = 0.5; // seconds
                        
                        const animate = () => {
                            const scaleValue = this.mesh.scale.x - 0.05;
                            if (scaleValue <= 0) {
                                this.mesh.visible = false;
                                return;
                            }
                            
                            this.mesh.scale.set(scaleValue, scaleValue, scaleValue);
                            
                            if (this.mesh.material) {
                                this.mesh.material.opacity = scaleValue;
                                this.mesh.material.transparent = true;
                            }
                            
                            requestAnimationFrame(animate);
                        };
                        
                        animate();
                    }
                    
                    // For collision detection
                    getBoundingRadius() {
                        return this.size * 0.4;
                    }
                }window.Food = Food;
            })();
            
            
            
            // Vérification des classes pour éviter 'undefined'
            window.UIController = window.UIController || {};
            window.AltruisticBehavior = window.AltruisticBehavior || {};
            window.TerrainGenerator = window.TerrainGenerator || {};
            window.Application = window.Application || {};
            window.StatisticsTracker = window.StatisticsTracker || {};
            window.EntityModel = window.EntityModel || {};
            window.CooperativeBehavior = window.CooperativeBehavior || {};
            window.QLearningBehavior = window.QLearningBehavior || {};
            window.SimulationManager = window.SimulationManager || {};
            window.BehaviorFactory = window.BehaviorFactory || {};
            window.SelfishBehavior = window.SelfishBehavior || {};
            window.DeepQLearningBehavior = window.DeepQLearningBehavior || {};
            window.TitForTatBehavior = window.TitForTatBehavior || {};
            window.AggressiveBehavior = window.AggressiveBehavior || {};
            window.World = window.World || {};
            window.BaseBehavior = window.BaseBehavior || {};
            window.Organism = window.Organism || {};
            window.EntityFactory = window.EntityFactory || {};
            window.Food = window.Food || {};
            