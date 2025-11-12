// city.js - BALANCED VERSION
class City {
    constructor(x, y, countryId, color, name) {
        this.x = x;
        this.y = y;
        this.countryId = countryId;
        this.color = color;
        this.name = name;
        this.resources = 30;
        this.unitProductionCooldown = 0;
        this.unitProductionRate = 180;
        this.isDestroyed = false;
        this.garrison = 20; // Reduced from 30
        this.level = 1;
        this.controlledResourceNodes = 0;
        this.tributeIncome = 0;
    }
    
    update(units, resourceNodes, game) {
        if (this.isDestroyed) return;
        
        // BASE RESOURCE GENERATION
        this.resources += 2;
        
        // BONUS: Controlled resource nodes
        this.resources += this.controlledResourceNodes * 3;
        
        // BONUS: Tribute from conquered cities
        this.resources += this.tributeIncome;
        
        // BONUS: City level
        this.resources += (this.level - 1) * 2;
        
        // UPKEEP: Pay for army
        const myUnits = units.filter(u => u.countryId === this.countryId && !u.isDead);
        const upkeepCost = myUnits.length * 0.3;
        this.resources -= upkeepCost;
        
        // Bankrupt = weakened units
        if (this.resources < 0) {
            this.resources = 0;
            if (myUnits.length > 0) {
                const randomUnit = myUnits[Math.floor(Math.random() * myUnits.length)];
                randomUnit.strength -= 1;
                
                if (game && game.frame % 180 === 0) {
                    game.log(`⚠️ ${game.countries[this.countryId].name} is BANKRUPT! Units weakening!`);
                }
            }
        }
        
        // Cap resources
        this.resources = Math.min(1000, this.resources);
        
        // POPULATION CAP - Prevents runaway snowball
        const maxUnits = 30 + (this.level * 15); // Max 30 + 15 per level
        if (myUnits.length >= maxUnits) {
            this.unitProductionCooldown = Math.max(this.unitProductionCooldown, 300);
            return; // Can't produce more units
        }
        
        // Produce units (EXPENSIVE and scales with level)
        this.unitProductionCooldown--;
        
        const unitCost = 25 + (this.level * 5); // More expensive as you grow
        if (this.unitProductionCooldown <= 0 && this.resources >= unitCost) {
            this.spawnUnit(units);
            this.resources -= unitCost;
            this.unitProductionCooldown = this.unitProductionRate / this.level;
            
            if (game) {
                const totalUnits = units.filter(u => u.countryId === this.countryId && !u.isDead).length;
                game.log(`🪖 ${game.countries[this.countryId].name} trained unit #${totalUnits} in ${this.name}`);
            }
        }
        
        // Check if under attack
        const nearbyEnemies = units.filter(u => 
            !u.isDead && 
            u.countryId !== this.countryId && 
            Math.hypot(u.x - this.x, u.y - this.y) < 40
        );
        
        if (nearbyEnemies.length > 0) {
            const previousGarrison = this.garrison;
            this.garrison -= nearbyEnemies.length * 0.3;
            
            if (game && Math.floor(previousGarrison / 10) > Math.floor(this.garrison / 10)) {
                const attackerCountryId = nearbyEnemies[0].countryId;
                game.log(`🔥 ${game.countries[attackerCountryId].name} damaging ${this.name}! Garrison: ${Math.floor(this.garrison)}/${20 + this.level * 10}`);
            }
            
            if (this.garrison <= 0) {
                this.isDestroyed = true;
                
                if (game) {
                    const attackerCountryId = nearbyEnemies[0].countryId;
                    game.log(`💥 ${this.name} has FALLEN! ${game.countries[attackerCountryId].name} is taking control...`);
                }
            }
        } else {
            // Slowly regenerate garrison
            this.garrison = Math.min(20 + (this.level * 10), this.garrison + 0.2);
        }
    }
    
    spawnUnit(units) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 25;
        const x = this.x + Math.cos(angle) * distance;
        const y = this.y + Math.sin(angle) * distance;
        
        const unit = new Unit(x, y, this.countryId, this.color);
        unit.strength = 8 + (this.level - 1) * 2; // Reduced base strength
        units.push(unit);
    }
    
    conquer(attackerCountryId, attackerColor, game) {
        const oldCountryId = this.countryId;
        const oldCountryName = game.countries[oldCountryId].name;
        
        this.countryId = attackerCountryId;
        this.color = attackerColor;
        
        const loot = Math.floor(this.resources * 0.7);
        const attackerCity = game.cities.find(c => c.countryId === attackerCountryId && !c.isDestroyed);
        if (attackerCity) {
            attackerCity.resources += loot;
            attackerCity.level += 1;
            attackerCity.tributeIncome += 3; // Reduced from 5
            game.log(`🏆🏆 ${game.countries[attackerCountryId].name} CONQUERED ${this.name} from ${oldCountryName}!`);
            game.log(`   ↳ Looted ${loot}💰, Level UP to ${attackerCity.level}, +3💰/turn tribute`);
        }
        
        this.resources = 10;
        this.garrison = 15;
        this.level = 1;
        
        const orphanedUnits = game.units.filter(u => u.countryId === oldCountryId);
        if (orphanedUnits.length > 0) {
            orphanedUnits.forEach(u => {
                u.strength *= 0.5;
            });
            game.log(`   ↳ ${orphanedUnits.length} ${oldCountryName} units demoralized!`);
        }
    }
    
    draw(ctx) {
        if (this.isDestroyed) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#333';
            ctx.fill();
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.font = '16px Arial';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText('💀', this.x, this.y + 5);
            return;
        }
        
        const radius = 15 + (this.level - 1) * 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        if (this.level > 1) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius + 3, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        const garrisonPercent = this.garrison / (20 + this.level * 10);
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius - 3, 0, Math.PI * 2 * garrisonPercent);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(this.name, this.x, this.y - radius - 5);
        ctx.fillText(this.name, this.x, this.y - radius - 5);
        
        if (this.level > 1) {
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`Lv${this.level}`, this.x, this.y + radius + 12);
        }
        
        ctx.font = '9px Arial';
        ctx.fillStyle = this.resources < 20 ? '#ff4444' : '#ffd700';
        ctx.fillText('💰' + Math.floor(this.resources), this.x, this.y + radius + 22);
    }
}