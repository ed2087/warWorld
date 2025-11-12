// Unit (moving dot) class
class Unit {
    constructor(x, y, countryId, color) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.countryId = countryId;
        this.color = color;
        this.strength = 10 + Math.random() * 5;
        this.speed = 1 + Math.random() * 0.5;
        this.state = 'idle'; // idle, moving, fighting, gathering
        this.target = null;
        this.isDead = false;
        this.carryingResources = 0;
    }
    
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.state = 'moving';
    }
    
    update(units, resources, cities) {
        if (this.isDead) return;
        
        // Move towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 2) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        } else {
            this.state = 'idle';
            
            // If carrying resources, try to return to city
            if (this.carryingResources > 0) {
                const city = cities.find(c => c.countryId === this.countryId);
                if (city) {
                    const distToCity = Math.hypot(city.x - this.x, city.y - this.y);
                    if (distToCity < 20) {
                        city.resources += this.carryingResources;
                        this.carryingResources = 0;
                    } else {
                        this.setTarget(city.x, city.y);
                    }
                }
            }
        }
        
        // Check for nearby enemies
        const nearbyEnemies = units.filter(u => 
            !u.isDead && 
            u.countryId !== this.countryId && 
            Math.hypot(u.x - this.x, u.y - this.y) < 15
        );
        
        if (nearbyEnemies.length > 0) {
            this.state = 'fighting';
            this.fight(nearbyEnemies[0]);
        }
        
        // Check for nearby resources
        if (this.carryingResources === 0) {
            const nearbyResource = resources.find(r => 
                !r.depleted && 
                Math.hypot(r.x - this.x, r.y - this.y) < 10
            );
            
            if (nearbyResource) {
                this.state = 'gathering';
                this.gather(nearbyResource);
            }
        }
    }
    
    fight(enemy) {
        // Simple combat
        const damage = 0.5 + Math.random() * 0.5;
        enemy.strength -= damage;
        this.strength -= damage * 0.7;
        
        if (enemy.strength <= 0) {
            enemy.isDead = true;
        }
        if (this.strength <= 0) {
            this.isDead = true;
        }
    }
    
    gather(resource) {
        if (resource.amount > 0) {
            const gathered = Math.min(5, resource.amount);
            this.carryingResources += gathered;
            resource.amount -= gathered;
            
            if (resource.amount <= 0) {
                resource.depleted = true;
            }
        }
    }
    
    draw(ctx) {
        if (this.isDead) return;
        
        // Draw unit dot
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        
        // Color based on state
        if (this.state === 'fighting') {
            ctx.fillStyle = '#ff0000';
        } else if (this.state === 'gathering') {
            ctx.fillStyle = '#ffff00';
        } else if (this.carryingResources > 0) {
            ctx.fillStyle = '#ffd700';
        } else {
            ctx.fillStyle = this.color;
        }
        
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw movement line
        if (this.state === 'moving') {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.targetX, this.targetY);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Draw strength bar
        const barWidth = 10;
        const barHeight = 2;
        const healthPercent = Math.max(0, this.strength / 15);
        
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - barWidth/2, this.y - 8, barWidth, barHeight);
        ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : (healthPercent > 0.25 ? '#ff0' : '#f00');
        ctx.fillRect(this.x - barWidth/2, this.y - 8, barWidth * healthPercent, barHeight);
    }
}