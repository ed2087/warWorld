// AI Controller for each country
class AIController {
    constructor(countryId, aggression, strategy) {
        this.countryId = countryId;
        this.aggression = aggression;
        this.strategy = strategy;
        this.thinkCooldown = 0;
        this.currentStrategy = 'expand'; // expand, attack, defend, gather
    }
    
    update(units, cities, resources) {
        this.thinkCooldown--;
        
        if (this.thinkCooldown > 0) return;
        
        this.thinkCooldown = 30; // Think every 30 frames
        
        const myUnits = units.filter(u => u.countryId === this.countryId && !u.isDead);
        const myCity = cities.find(c => c.countryId === this.countryId && !c.isDestroyed);
        
        if (!myCity || myUnits.length === 0) return;
        
        // Decide strategy
        this.decideStrategy(myUnits, units, cities, resources);
        
        // Give orders to units
        this.giveOrders(myUnits, units, cities, resources, myCity);
    }
    
    decideStrategy(myUnits, allUnits, cities, resources) {
        const enemyUnits = allUnits.filter(u => u.countryId !== this.countryId && !u.isDead);
        const unitRatio = myUnits.length / (enemyUnits.length + 1);
        
        if (unitRatio > 1.5 && this.aggression > 60) {
            this.currentStrategy = 'attack';
        } else if (unitRatio < 0.7) {
            this.currentStrategy = 'defend';
        } else if (myUnits.filter(u => u.carryingResources === 0).length > 3) {
            this.currentStrategy = 'gather';
        } else {
            this.currentStrategy = 'expand';
        }
    }
    
    giveOrders(myUnits, allUnits, cities, resources, myCity) {
        const idleUnits = myUnits.filter(u => u.state === 'idle' && u.carryingResources === 0);
        
        for (let unit of idleUnits) {
            switch (this.currentStrategy) {
                case 'attack':
                    this.orderAttack(unit, allUnits, cities);
                    break;
                case 'defend':
                    this.orderDefend(unit, myCity);
                    break;
                case 'gather':
                    this.orderGather(unit, resources);
                    break;
                case 'expand':
                    this.orderExpand(unit, myCity);
                    break;
            }
        }
    }
    
    orderAttack(unit, allUnits, cities) {
        // Find nearest enemy
        const enemies = allUnits.filter(u => u.countryId !== this.countryId && !u.isDead);
        
        if (enemies.length > 0) {
            const nearest = enemies.reduce((closest, enemy) => {
                const dist = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
                const closestDist = Math.hypot(closest.x - unit.x, closest.y - unit.y);
                return dist < closestDist ? enemy : closest;
            });
            
            unit.setTarget(nearest.x, nearest.y);
        } else {
            // Target enemy city
            const enemyCities = cities.filter(c => c.countryId !== this.countryId && !c.isDestroyed);
            if (enemyCities.length > 0) {
                const target = enemyCities[Math.floor(Math.random() * enemyCities.length)];
                unit.setTarget(target.x, target.y);
            }
        }
    }
    
    orderDefend(unit, myCity) {
        // Move near city
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 30;
        const x = myCity.x + Math.cos(angle) * distance;
        const y = myCity.y + Math.sin(angle) * distance;
        
        unit.setTarget(x, y);
    }
    
    orderGather(unit, resources) {
        // Find nearest resource
        const available = resources.filter(r => !r.depleted);
        
        if (available.length > 0) {
            const nearest = available.reduce((closest, res) => {
                const dist = Math.hypot(res.x - unit.x, res.y - unit.y);
                const closestDist = Math.hypot(closest.x - unit.x, closest.y - unit.y);
                return dist < closestDist ? res : closest;
            });
            
            unit.setTarget(nearest.x, nearest.y);
        }
    }
    
    orderExpand(unit, myCity) {
        // Explore random direction
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 100;
        const x = myCity.x + Math.cos(angle) * distance;
        const y = myCity.y + Math.sin(angle) * distance;
        
        unit.setTarget(x, y);
    }
}