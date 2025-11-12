// unit.js - BALANCED VERSION
class Unit {
    constructor(x, y, countryId, color) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.countryId = countryId;
        this.color = color;
        this.strength = 8; // Reduced from 10
        this.speed = 1.2;
        this.state = 'idle';
        this.target = null;
        this.isDead = false;
        this.carryingResources = 0;
        this.experience = 0;
    }
    
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.state = 'moving';
    }
    
    update(units, resources, cities, game) {
        if (this.isDead) return;
        
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 2) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
            this.state = 'moving';
        } else {
            this.state = 'idle';
        }
        
        if (this.carryingResources > 0) {
            const city = cities.find(c => c.countryId === this.countryId && !c.isDestroyed);
            if (city) {
                const distToCity = Math.hypot(city.x - this.x, city.y - this.y);
                if (distToCity < 25) {
                    if (game && this.carryingResources > 5) {
                        game.log(`💰 ${game.countries[this.countryId].name} delivered ${Math.floor(this.carryingResources)} resources`);
                    }
                    city.resources += this.carryingResources;
                    this.carryingResources = 0;
                }
            }
            return;
        }
        
        const nearbyEnemies = units.filter(u => 
            !u.isDead && 
            u.countryId !== this.countryId && 
            Math.hypot(u.x - this.x, u.y - this.y) < 30
        );
        
        if (nearbyEnemies.length > 0) {
            const strongestEnemy = nearbyEnemies.reduce((strongest, enemy) => 
                enemy.strength > strongest.strength ? enemy : strongest
            );
            
            const nearbyAllies = units.filter(u => 
                !u.isDead && 
                u.countryId === this.countryId && 
                Math.hypot(u.x - this.x, u.y - this.y) < 50
            );
            
            const myForce = nearbyAllies.reduce((sum, u) => sum + u.strength, this.strength);
            const enemyForce = nearbyEnemies.reduce((sum, u) => sum + u.strength, 0);
            
            if (myForce > enemyForce * 0.7) { // More cautious
                this.state = 'fighting';
                this.fight(strongestEnemy);
            } else {
                const city = cities.find(c => c.countryId === this.countryId && !c.isDestroyed);
                if (city) {
                    this.setTarget(city.x, city.y);
                }
            }
            return;
        }
        
        const nearbyResource = resources.find(r => 
            !r.depleted && 
            Math.hypot(r.x - this.x, r.y - this.y) < 20
        );
        
        if (nearbyResource) {
            this.state = 'gathering';
            this.gather(nearbyResource);
        }
    }
    
    fight(enemy) {
        const myPower = this.strength * (1 + this.experience * 0.1);
        const enemyPower = enemy.strength * (1 + enemy.experience * 0.1);
        
        const damage = (0.8 + Math.random() * 0.4) * 1.5; // Reduced from 2
        
        enemy.strength -= damage * (myPower / enemyPower);
        this.strength -= damage * (enemyPower / myPower) * 0.7;
        
        if (enemy.strength <= 0) {
            enemy.isDead = true;
            this.experience += 0.5;
        }
        if (this.strength <= 0) {
            this.isDead = true;
        }
    }
    
    gather(resource) {
        if (resource.amount > 0) {
            const gathered = Math.min(10, resource.amount);
            this.carryingResources += gathered;
            resource.amount -= gathered;
            
            if (resource.amount <= 0) {
                resource.depleted = true;
            }
        }
    }
    
    draw(ctx) {
        if (this.isDead) return;
        
        const size = 4 + Math.min(this.experience, 3);
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        
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
        
        if (this.experience > 1) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, size + 2, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        if (this.state === 'moving' && Math.hypot(this.targetX - this.x, this.targetY - this.y) > 30) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.targetX, this.targetY);
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }
        
        const barWidth = 12;
        const barHeight = 2;
        const healthPercent = Math.max(0, this.strength / 12); // Adjusted for new max
        
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - barWidth/2, this.y - 10, barWidth, barHeight);
        ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : (healthPercent > 0.25 ? '#ff0' : '#f00');
        ctx.fillRect(this.x - barWidth/2, this.y - 10, barWidth * healthPercent, barHeight);
    }
}