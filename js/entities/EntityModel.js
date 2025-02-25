export class EntityModel {
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
}