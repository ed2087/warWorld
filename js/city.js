// City (base) class
class City {
    constructor(x, y, countryId, color, name) {
        this.x = x;
        this.y = y;
        this.countryId = countryId;
        this.color = color;
        this.name = name;
        this.resources = 100;
        this.unitProductionCooldown = 0;
        this.unitProductionRate = 120; // frames between spawns
        this.isDestroyed = false;
        this.garrison = 50; // defense strength
    }
    
    update(units) {
        if (this.isDestroyed) return;
        
        // Produce units
        this.unitProductionCooldown--;
        
        if (this.unitProductionCooldown <= 0 && this.resources >= 20) {
            this.spawnUnit(units);
            this.resources -= 20;
            this.unitProductionCooldown = this.unitProductionRate;
        }
        
        // Generate resources slowly
        this.resources = Math.min(500, this.resources + 0.5);
        
        // Check if under attack
        const nearbyEnemies = units.filter(u => 
            !u.isDead && 
            u.countryId !== this.countryId && 
            Math.hypot(u.x - this.x, u.y - this.y) < 30
        );
        
        if (nearbyEnemies.length > 0) {
            this.garrison -= nearbyEnemies.length * 0.1;
            
            if (this.garrison <= 0) {
                this.isDestroyed = true;
            }
        } else {
            // Slowly regenerate garrison
            this.garrison = Math.min(50, this.garrison + 0.1);
        }
    }
    
    spawnUnit(units) {
        // Random position around city
        const angle = Math.random() * Math.PI * 2;
        const distance = 20;
        const x = this.x + Math.cos(angle) * distance;
        const y = this.y + Math.sin(angle) * distance;
        
        units.push(new Unit(x, y, this.countryId, this.color));
    }
    
    draw(ctx) {
        if (this.isDestroyed) {
            // Draw ruins
            ctx.beginPath();
            ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#333';
            ctx.fill();
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.stroke();
            return;
        }
        
        // Draw city
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw garrison indicator
        const garrisonPercent = this.garrison / 50;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 12, 0, Math.PI * 2 * garrisonPercent);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw name
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(this.name, this.x, this.y - 20);
        ctx.fillText(this.name, this.x, this.y - 20);
        
        // Draw resource count
        ctx.font = '8px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('💰' + Math.floor(this.resources), this.x, this.y + 25);
    }
}