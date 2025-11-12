// AI Controller for each country - FIXED & AGGRESSIVE
class AIController {
    constructor(countryId, aggression, strategy) {
        this.countryId = countryId;
        this.aggression = aggression;
        this.strategy = strategy;
        this.thinkCooldown = 0;
        this.currentStrategy = 'expand';
        this.targetEnemyCity = null;
    }
    
    update(units, cities, resources) {
        this.thinkCooldown--;
        
        if (this.thinkCooldown > 0) return;
        
        this.thinkCooldown = 20; // Think every 20 frames (faster decisions)
        
        const myUnits = units.filter(u => u.countryId === this.countryId && !u.isDead);
        const myCity = cities.find(c => c.countryId === this.countryId && !c.isDestroyed);
        
        if (!myCity || myUnits.length === 0) return;
        
        // Decide strategy
        this.decideStrategy(myUnits, units, cities, resources, myCity);
        
        // Give orders to ALL units (not just idle ones)
        this.giveOrders(myUnits, units, cities, resources, myCity);
    }
    
    decideStrategy(myUnits, allUnits, cities, resources, myCity) {
        const enemyUnits = allUnits.filter(u => u.countryId !== this.countryId && !u.isDead);
        const enemyCities = cities.filter(c => c.countryId !== this.countryId && !c.isDestroyed);
        const unitRatio = myUnits.length / (enemyUnits.length + 1);
        
        // More aggressive decision making
        if (myUnits.length > 5 && this.aggression > 50) {
            this.currentStrategy = 'attack';
            // Pick a target city if we don't have one
            if (!this.targetEnemyCity || this.targetEnemyCity.isDestroyed) {
                if (enemyCities.length > 0) {
                    // Find nearest enemy city
                    this.targetEnemyCity = enemyCities.reduce((closest, city) => {
                        const distToClosest = Math.hypot(closest.x - myCity.x, closest.y - myCity.y);
                        const distToCity = Math.hypot(city.x - myCity.x, city.y - myCity.y);
                        return distToCity < distToClosest ? city : closest;
                    });
                }
            }
        } else if (unitRatio < 0.5) {
            this.currentStrategy = 'defend';
        } else if (myCity.resources < 100) {
            this.currentStrategy = 'gather';
        } else {
            this.currentStrategy = 'expand';
        }
    }
    
    giveOrders(myUnits, allUnits, cities, resources, myCity) {
        // Give orders to units based on their state
        for (let unit of myUnits) {
            // Units carrying resources should return home
            if (unit.carryingResources > 0) {
                const distToCity = Math.hypot(myCity.x - unit.x, myCity.y - unit.y);
                if (distToCity > 25) {
                    unit.setTarget(myCity.x, myCity.y);
                }
                continue;
            }
            
            // Only reassign idle or moving units
            if (unit.state === 'fighting' || unit.state === 'gathering') {
                continue; // Let them finish what they're doing
            }
            
            // Check if unit reached its target
            const distToTarget = Math.hypot(unit.targetX - unit.x, unit.targetY - unit.y);
            if (distToTarget < 10 || unit.state === 'idle') {
                switch (this.currentStrategy) {
                    case 'attack':
                        this.orderAttack(unit, allUnits, cities, myCity);
                        break;
                    case 'defend':
                        this.orderDefend(unit, myCity, allUnits);
                        break;
                    case 'gather':
                        this.orderGather(unit, resources, myCity);
                        break;
                    case 'expand':
                        this.orderExpand(unit, myCity, allUnits, cities);
                        break;
                }
            }
        }
    }
    
    orderAttack(unit, allUnits, cities, myCity) {
        // Priority 1: Attack nearby enemies
        const nearbyEnemies = allUnits.filter(u => 
            !u.isDead && 
            u.countryId !== this.countryId && 
            Math.hypot(u.x - unit.x, u.y - unit.y) < 200
        );
        
        if (nearbyEnemies.length > 0) {
            const nearest = nearbyEnemies.reduce((closest, enemy) => {
                const dist = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
                const closestDist = Math.hypot(closest.x - unit.x, closest.y - unit.y);
                return dist < closestDist ? enemy : closest;
            });
            
            unit.setTarget(nearest.x, nearest.y);
            return;
        }
        
        // Priority 2: Attack target enemy city
        if (this.targetEnemyCity && !this.targetEnemyCity.isDestroyed) {
            unit.setTarget(this.targetEnemyCity.x, this.targetEnemyCity.y);
            return;
        }
        
        // Priority 3: Find ANY enemy city
        const enemyCities = cities.filter(c => c.countryId !== this.countryId && !c.isDestroyed);
        if (enemyCities.length > 0) {
            const target = enemyCities[0];
            unit.setTarget(target.x, target.y);
            return;
        }
        
        // Priority 4: Hunt remaining enemy units
        const allEnemies = allUnits.filter(u => !u.isDead && u.countryId !== this.countryId);
        if (allEnemies.length > 0) {
            const target = allEnemies[0];
            unit.setTarget(target.x, target.y);
        }
    }
    
    orderDefend(unit, myCity, allUnits) {
        // Check for nearby threats
        const threats = allUnits.filter(u => 
            !u.isDead && 
            u.countryId !== this.countryId && 
            Math.hypot(u.x - myCity.x, u.y - myCity.y) < 150
        );
        
        if (threats.length > 0) {
            // Intercept the nearest threat
            const nearest = threats.reduce((closest, enemy) => {
                const dist = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
                const closestDist = Math.hypot(closest.x - unit.x, closest.y - unit.y);
                return dist < closestDist ? enemy : closest;
            });
            
            unit.setTarget(nearest.x, nearest.y);
        } else {
            // Form defensive perimeter around city
            const angle = Math.random() * Math.PI * 2;
            const distance = 40 + Math.random() * 30;
            const x = myCity.x + Math.cos(angle) * distance;
            const y = myCity.y + Math.sin(angle) * distance;
            
            unit.setTarget(x, y);
        }
    }
    
    orderGather(unit, resources, myCity) {
        // Find nearest unclaimed resource
        const available = resources.filter(r => !r.depleted);
        
        if (available.length > 0) {
            const nearest = available.reduce((closest, res) => {
                const dist = Math.hypot(res.x - unit.x, res.y - unit.y);
                const closestDist = Math.hypot(closest.x - unit.x, closest.y - unit.y);
                return dist < closestDist ? res : closest;
            });
            
            unit.setTarget(nearest.x, nearest.y);
        } else {
            // No resources available, switch to expanding
            this.orderExpand(unit, myCity, [], []);
        }
    }
    
    orderExpand(unit, myCity, allUnits, cities) {
        // Expand towards nearest enemy territory
        const enemyCities = cities.filter(c => c.countryId !== this.countryId && !c.isDestroyed);
        
        if (enemyCities.length > 0) {
            // Move towards nearest enemy city (but not all the way)
            const nearest = enemyCities.reduce((closest, city) => {
                const dist = Math.hypot(city.x - myCity.x, city.y - myCity.y);
                const closestDist = Math.hypot(closest.x - myCity.x, closest.y - myCity.y);
                return dist < closestDist ? city : closest;
            });
            
            // Move 60% of the way towards enemy
            const dirX = nearest.x - myCity.x;
            const dirY = nearest.y - myCity.y;
            const dist = Math.hypot(dirX, dirY);
            const targetX = myCity.x + (dirX / dist) * (dist * 0.6);
            const targetY = myCity.y + (dirY / dist) * (dist * 0.6);
            
            // Add some randomness to spread out
            const randomOffset = 50;
            unit.setTarget(
                targetX + (Math.random() - 0.5) * randomOffset,
                targetY + (Math.random() - 0.5) * randomOffset
            );
        } else {
            // No enemies, explore randomly
            const angle = Math.random() * Math.PI * 2;
            const distance = 150 + Math.random() * 100;
            const x = myCity.x + Math.cos(angle) * distance;
            const y = myCity.y + Math.sin(angle) * distance;
            
            // Clamp to map bounds
            unit.setTarget(
                Math.max(50, Math.min(1950, x)),
                Math.max(50, Math.min(1450, y))
            );
        }
    }
}