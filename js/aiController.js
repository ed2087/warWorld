// SUPER INTELLIGENT AI CONTROLLER - BALANCED VERSION
class AIController {
    constructor(countryId, aggression, strategy) {
        this.countryId = countryId;
        this.aggression = aggression; // 0-100
        this.strategy = strategy; // 0-100
        this.thinkCooldown = 0;
        
        // STRATEGIC STATE
        this.currentStrategy = 'boom'; // boom, turtle, rush, aggressive, desperate
        this.phase = 'early'; // early, mid, late, endgame
        this.targetEnemyCity = null;
        this.scoutedEnemies = new Map(); // Track enemy info
        this.resourcePriority = 'gold'; // gold, map_control, army
        
        // MEMORY & INTELLIGENCE
        this.knownEnemyPositions = new Map();
        this.lastSeenEnemies = new Map();
        this.strategicTargets = [];
        this.expandDirection = null;
        this.retreatPosition = null;
        
        // BUILD ORDER
        this.buildOrder = this.generateBuildOrder();
        this.buildStep = 0;
        
        // ECONOMIC TRACKING
        this.incomeHistory = [];
        this.armyValueHistory = [];
        
        // TACTICAL STATE
        this.armyRallyPoint = null;
        this.isRegrouping = false;
        this.lastBattleWon = true;
        
        // DIPLOMACY (future)
        this.relationships = new Map(); // enemy_id -> trust_level
        this.warTargets = new Set();
    }
    
    generateBuildOrder() {
        // Different builds based on personality
        if (this.aggression > 70) {
            return ['scout', 'army', 'army', 'army', 'expand', 'army'];
        } else if (this.strategy > 70) {
            return ['scout', 'gather', 'expand', 'army', 'gather', 'army'];
        } else {
            return ['gather', 'scout', 'gather', 'army', 'expand', 'army'];
        }
    }
    
    update(units, cities, resources, game) {
        this.thinkCooldown--;
        if (this.thinkCooldown > 0) return;
        this.thinkCooldown = 15; // Think every 15 frames
        
        const myUnits = units.filter(u => u.countryId === this.countryId && !u.isDead);
        const myCity = cities.find(c => c.countryId === this.countryId && !c.isDestroyed);
        
        if (!myCity || myUnits.length === 0) return;
        
        // UPDATE INTELLIGENCE
        this.updateIntelligence(myUnits, units, cities, resources, game);
        
        // STRATEGIC THINKING
        this.evaluateGamePhase(game.turn);
        this.evaluateStrategicSituation(myUnits, units, cities, myCity, game);
        this.chooseStrategy(myUnits, units, cities, myCity, game);
        
        // EXECUTE ORDERS
        this.executeStrategy(myUnits, units, cities, resources, myCity, game);
        
        // TACTICAL MICRO
        this.manageCombat(myUnits, units, myCity, game);
    }
    
    updateIntelligence(myUnits, allUnits, cities, resources, game) {
        // Scout and remember enemy positions
        for (let unit of myUnits) {
            const visionRange = 200;
            
            // Spot enemies
            const spotted = allUnits.filter(u => 
                !u.isDead && 
                u.countryId !== this.countryId &&
                Math.hypot(u.x - unit.x, u.y - unit.y) < visionRange
            );
            
            for (let enemy of spotted) {
                this.lastSeenEnemies.set(enemy.countryId, {
                    x: enemy.x,
                    y: enemy.y,
                    strength: enemy.strength,
                    time: game.turn
                });
            }
            
            // Spot enemy cities
            const spottedCities = cities.filter(c =>
                c.countryId !== this.countryId &&
                !c.isDestroyed &&
                Math.hypot(c.x - unit.x, c.y - unit.y) < visionRange
            );
            
            for (let city of spottedCities) {
                if (!this.knownEnemyPositions.has(city.countryId)) {
                    this.knownEnemyPositions.set(city.countryId, {
                        x: city.x,
                        y: city.y,
                        lastSeen: game.turn
                    });
                }
            }
        }
        
        // Update enemy power estimates
        for (let city of cities) {
            if (city.countryId === this.countryId || city.isDestroyed) continue;
            
            const enemyUnits = allUnits.filter(u => 
                u.countryId === city.countryId && 
                !u.isDead
            );
            
            const power = enemyUnits.reduce((sum, u) => sum + u.strength, 0) + city.garrison;
            
            this.scoutedEnemies.set(city.countryId, {
                cityLevel: city.level,
                unitCount: enemyUnits.length,
                estimatedPower: power,
                resources: city.resources,
                garrison: city.garrison
            });
        }
    }
    
    evaluateGamePhase(turn) {
        if (turn < 50) {
            this.phase = 'early';
        } else if (turn < 200) {
            this.phase = 'mid';
        } else if (turn < 400) {
            this.phase = 'late';
        } else {
            this.phase = 'endgame';
        }
    }
    
    evaluateStrategicSituation(myUnits, allUnits, cities, myCity, game) {
        // Calculate my power
        const myPower = myUnits.reduce((sum, u) => sum + u.strength, 0) + myCity.garrison;
        
        // Calculate enemy power
        const enemies = cities.filter(c => c.countryId !== this.countryId && !c.isDestroyed);
        let totalEnemyPower = 0;
        let strongestEnemy = null;
        let strongestPower = 0;
        let weakestEnemy = null;
        let weakestPower = Infinity;
        
        for (let enemy of enemies) {
            const info = this.scoutedEnemies.get(enemy.countryId);
            const power = info ? info.estimatedPower : 100;
            
            totalEnemyPower += power;
            
            if (power > strongestPower) {
                strongestPower = power;
                strongestEnemy = enemy;
            }
            if (power < weakestPower) {
                weakestPower = power;
                weakestEnemy = enemy;
            }
        }
        
        // Store evaluation
        this.lastEvaluation = {
            myPower,
            totalEnemyPower,
            strongestEnemy,
            strongestPower,
            weakestEnemy,
            weakestPower,
            powerRatio: totalEnemyPower > 0 ? myPower / totalEnemyPower : 999,
            economyHealth: myCity.resources > 100 ? 'good' : (myCity.resources > 50 ? 'ok' : 'poor'),
            underThreat: this.isUnderThreat(myUnits, allUnits, myCity)
        };
        
        // Track history
        this.armyValueHistory.push(myPower);
        if (this.armyValueHistory.length > 100) this.armyValueHistory.shift();
    }
    
    isUnderThreat(myUnits, allUnits, myCity) {
        const threats = allUnits.filter(u =>
            !u.isDead &&
            u.countryId !== this.countryId &&
            Math.hypot(u.x - myCity.x, u.y - myCity.y) < 300
        );
        
        return threats.length > 5 || myCity.garrison < 15;
    }
    
chooseStrategy(myUnits, allUnits, cities, myCity, game) {
    const evaluation = this.lastEvaluation; // Changed from 'eval' to 'evaluation'
    
    // DESPERATE - Losing badly
    if (evaluation.underThreat || evaluation.powerRatio < 0.3 || myCity.garrison < 10) {
        this.currentStrategy = 'desperate';
        this.resourcePriority = 'survival';
        return;
    }
    
    // EARLY GAME - Build economy
    if (this.phase === 'early') {
        if (myUnits.length < 3) {
            this.currentStrategy = 'boom';
            this.resourcePriority = 'gold';
        } else if (evaluation.economyHealth === 'poor') {
            this.currentStrategy = 'boom';
            this.resourcePriority = 'gold';
        } else if (this.aggression > 70 && myUnits.length >= 5) {
            this.currentStrategy = 'rush';
            this.resourcePriority = 'army';
        } else {
            this.currentStrategy = 'turtle';
            this.resourcePriority = 'map_control';
        }
        return;
    }
    
    // MID GAME - Calculated expansion/aggression
    if (this.phase === 'mid') {
        // Can we crush someone? MORE CAUTIOUS NOW - needs 2.5x advantage
        if (evaluation.weakestEnemy && evaluation.myPower > evaluation.weakestPower * 2.5 && myCity.resources > 100) {
            this.currentStrategy = 'aggressive';
            this.targetEnemyCity = evaluation.weakestEnemy;
            this.resourcePriority = 'army';
        }
        // Need to catch up?
        else if (evaluation.powerRatio < 0.7) {
            this.currentStrategy = 'boom';
            this.resourcePriority = 'gold';
        }
        // Expand control
        else {
            this.currentStrategy = 'turtle';
            this.resourcePriority = 'map_control';
        }
        return;
    }
    
    // LATE GAME - Domination or survival
    if (this.phase === 'late' || this.phase === 'endgame') {
        const aliveEnemies = cities.filter(c => c.countryId !== this.countryId && !c.isDestroyed).length;
        
        // Final push - MORE CAUTIOUS NOW
        if (aliveEnemies <= 2 && evaluation.powerRatio > 2.0) {
            this.currentStrategy = 'aggressive';
            this.targetEnemyCity = evaluation.weakestEnemy;
            this.resourcePriority = 'army';
        }
        // Snowball advantage - MORE CAUTIOUS NOW
        else if (evaluation.powerRatio > 2.5) {
            this.currentStrategy = 'aggressive';
            this.targetEnemyCity = evaluation.weakestEnemy;
            this.resourcePriority = 'army';
        }
        // Hold the line
        else {
            this.currentStrategy = 'turtle';
            this.resourcePriority = 'army';
        }
    }
}
    
    executeStrategy(myUnits, allUnits, cities, resources, myCity, game) {
        // Assign roles to units
        const roles = this.assignUnitRoles(myUnits, allUnits, cities, resources, myCity);
        
        for (let unit of myUnits) {
            // Don't interrupt critical actions
            if (unit.carryingResources > 0) continue;
            if (unit.state === 'fighting' && this.currentStrategy !== 'desperate') continue;
            
            const distToTarget = Math.hypot(unit.targetX - unit.x, unit.targetY - unit.y);
            if (distToTarget < 20 || unit.state === 'idle') {
                const role = roles.get(unit) || 'defend';
                this.executeUnitRole(unit, role, allUnits, cities, resources, myCity, game);
            }
        }
    }
    
    assignUnitRoles(myUnits, allUnits, cities, resources, myCity) {
        const roles = new Map();
        const unitCount = myUnits.length;
        
        switch (this.currentStrategy) {
            case 'boom':
                // 80% gatherers, 20% scouts/defenders
                myUnits.forEach((unit, i) => {
                    if (i < unitCount * 0.8) {
                        roles.set(unit, 'gather');
                    } else if (i < unitCount * 0.9) {
                        roles.set(unit, 'scout');
                    } else {
                        roles.set(unit, 'defend');
                    }
                });
                break;
                
            case 'rush':
            case 'aggressive':
                // 60% attackers, 25% gatherers, 15% defenders (more balanced)
                myUnits.forEach((unit, i) => {
                    if (i < unitCount * 0.6) {
                        roles.set(unit, 'attack');
                    } else if (i < unitCount * 0.85) {
                        roles.set(unit, 'gather');
                    } else {
                        roles.set(unit, 'defend');
                    }
                });
                break;
                
            case 'turtle':
                // 40% defenders, 40% gatherers, 20% scouts
                myUnits.forEach((unit, i) => {
                    if (i < unitCount * 0.4) {
                        roles.set(unit, 'defend');
                    } else if (i < unitCount * 0.8) {
                        roles.set(unit, 'gather');
                    } else {
                        roles.set(unit, 'scout');
                    }
                });
                break;
                
            case 'desperate':
                // Everyone defends!
                myUnits.forEach(unit => roles.set(unit, 'defend'));
                break;
        }
        
        return roles;
    }
    
    executeUnitRole(unit, role, allUnits, cities, resources, myCity, game) {
        switch (role) {
            case 'attack':
                this.orderAttack(unit, allUnits, cities, myCity);
                break;
            case 'defend':
                this.orderDefend(unit, myCity, allUnits);
                break;
            case 'gather':
                this.orderGather(unit, resources, myCity, allUnits);
                break;
            case 'scout':
                this.orderScout(unit, myCity, cities, allUnits);
                break;
        }
    }
    
    orderAttack(unit, allUnits, cities, myCity) {
        if (this.targetEnemyCity && !this.targetEnemyCity.isDestroyed) {
            // Coordinate attack - move to rally point first
            if (!this.armyRallyPoint) {
                const dirX = this.targetEnemyCity.x - myCity.x;
                const dirY = this.targetEnemyCity.y - myCity.y;
                const dist = Math.hypot(dirX, dirY);
                this.armyRallyPoint = {
                    x: myCity.x + (dirX / dist) * (dist * 0.6),
                    y: myCity.y + (dirY / dist) * (dist * 0.6)
                };
            }
            
            const distToRally = Math.hypot(unit.x - this.armyRallyPoint.x, unit.y - this.armyRallyPoint.y);
            
            if (distToRally > 50) {
                unit.setTarget(this.armyRallyPoint.x, this.armyRallyPoint.y);
            } else {
                unit.setTarget(this.targetEnemyCity.x, this.targetEnemyCity.y);
            }
        } else {
            // Find nearest enemy
            const enemies = allUnits.filter(u => !u.isDead && u.countryId !== this.countryId);
            if (enemies.length > 0) {
                const nearest = this.findNearestEnemy(unit, enemies);
                unit.setTarget(nearest.x, nearest.y);
            }
        }
    }
    
    orderDefend(unit, myCity, allUnits) {
        // Find threats near city
        const threats = allUnits.filter(u =>
            !u.isDead &&
            u.countryId !== this.countryId &&
            Math.hypot(u.x - myCity.x, u.y - myCity.y) < 350
        );
        
        if (threats.length > 0) {
            const nearest = this.findNearestEnemy(unit, threats);
            unit.setTarget(nearest.x, nearest.y);
        } else {
            // Defensive perimeter
            const angle = (unit.x + unit.y) * 0.01; // Deterministic spread
            const distance = 80 + (unit.strength * 3);
            unit.setTarget(
                myCity.x + Math.cos(angle) * distance,
                myCity.y + Math.sin(angle) * distance
            );
        }
    }
    
    orderGather(unit, resources, myCity, allUnits) {
        // Find SAFE, HIGH-VALUE resources
        const available = resources.filter(r => {
            if (r.depleted) return false;
            
            const distToResource = Math.hypot(r.x - unit.x, r.y - unit.y);
            if (distToResource > 400) return false;
            
            // Safety check
            const enemiesNearby = allUnits.filter(u =>
                !u.isDead &&
                u.countryId !== this.countryId &&
                Math.hypot(u.x - r.x, u.y - r.y) < 100
            );
            
            return enemiesNearby.length === 0;
        });
        
        if (available.length > 0) {
            // Prioritize closest + richest
            const sorted = available.sort((a, b) => {
                const distA = Math.hypot(a.x - unit.x, a.y - unit.y);
                const distB = Math.hypot(b.x - unit.x, b.y - unit.y);
                const valueA = a.amount / distA;
                const valueB = b.amount / distB;
                return valueB - valueA;
            });
            
            unit.setTarget(sorted[0].x, sorted[0].y);
        } else {
            // Return to city
            unit.setTarget(myCity.x, myCity.y);
        }
    }
    
    orderScout(unit, myCity, cities, allUnits) {
        // Scout unexplored areas or enemy positions
        if (!this.expandDirection || Math.random() < 0.1) {
            const angle = Math.random() * Math.PI * 2;
            this.expandDirection = { angle };
        }
        
        const distance = 300 + Math.random() * 200;
        const targetX = Math.max(100, Math.min(2900, myCity.x + Math.cos(this.expandDirection.angle) * distance));
        const targetY = Math.max(100, Math.min(1900, myCity.y + Math.sin(this.expandDirection.angle) * distance));
        
        unit.setTarget(targetX, targetY);
    }
    
    manageCombat(myUnits, allUnits, myCity, game) {
        // TACTICAL MICRO - Focus fire, retreats, formations
        const engaged = myUnits.filter(u => u.state === 'fighting');
        
        for (let unit of engaged) {
            const nearbyEnemies = allUnits.filter(u =>
                !u.isDead &&
                u.countryId !== this.countryId &&
                Math.hypot(u.x - unit.x, u.y - unit.y) < 80
            );
            
            if (nearbyEnemies.length === 0) continue;
            
            // Find weakest enemy to focus
            const weakest = nearbyEnemies.reduce((w, e) =>
                e.strength < w.strength ? e : w
            );
            
            // Should we retreat?
            const myNearbyAllies = myUnits.filter(u =>
                !u.isDead &&
                Math.hypot(u.x - unit.x, u.y - unit.y) < 100
            );
            
            const myForce = myNearbyAllies.reduce((sum, u) => sum + u.strength, 0);
            const enemyForce = nearbyEnemies.reduce((sum, u) => sum + u.strength, 0);
            
            // RETREAT if outnumbered (more cautious now)
            if (enemyForce > myForce * 1.2 || unit.strength < 4) {
                const dirX = myCity.x - unit.x;
                const dirY = myCity.y - unit.y;
                const dist = Math.hypot(dirX, dirY);
                unit.setTarget(
                    unit.x + (dirX / dist) * 100,
                    unit.y + (dirY / dist) * 100
                );
            }
            // FOCUS FIRE weakest
            else {
                unit.targetX = weakest.x;
                unit.targetY = weakest.y;
            }
        }
    }
    
    findNearestEnemy(unit, enemies) {
        return enemies.reduce((nearest, enemy) => {
            const dist = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
            const nearestDist = Math.hypot(nearest.x - unit.x, nearest.y - unit.y);
            return dist < nearestDist ? enemy : nearest;
        });
    }
}