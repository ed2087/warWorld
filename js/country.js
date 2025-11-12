// Country (Bot) Class
class Country {
    constructor(id, color) {
        this.id = id;
        this.color = color;
        this.name = this.generateName();
        this.army = 100 + Math.random() * 50;
        this.resources = 50;
        this.isAlive = true;
        
        // Personality traits
        this.aggression = 30 + Math.random() * 70;  // 30-100
        this.economy = 30 + Math.random() * 70;      // 30-100
        this.strategy = 30 + Math.random() * 70;     // 30-100
    }
    
    generateName() {
        const prefixes = ['North', 'South', 'East', 'West', 'United', 'Free', 'Imperial', 'Grand'];
        const suffixes = ['lands', 'ia', 'istan', 'onia', 'aria', 'terra', 'dom', 'reich'];
        return prefixes[Math.floor(Math.random() * prefixes.length)] + 
               suffixes[Math.floor(Math.random() * suffixes.length)];
    }
    
    update(landSize) {
        if (!this.isAlive) return;
        
        // Gain resources based on land
        this.resources += landSize * 0.5;
        
        // Build army (spend resources)
        const armyGrowth = (this.resources * this.economy / 100) * 0.1;
        this.army += armyGrowth;
        this.resources -= armyGrowth * 0.5;
        
        // Decay resources to prevent infinite growth
        this.resources = Math.max(0, this.resources - 1);
    }
    
    shouldAttack(target, myLandSize, targetLandSize) {
        if (!target.isAlive) return false;
        
        const powerRatio = this.army / target.army;
        const landRatio = targetLandSize / (myLandSize + 1);
        
        // More aggressive countries attack with worse odds
        const threshold = 1.2 - (this.aggression / 200);
        
        // Strategic countries consider land value
        const strategicBonus = (landRatio * this.strategy) / 100;
        
        return (powerRatio + strategicBonus) > threshold;
    }
    
    attack(target) {
        if (!target.isAlive) return false;
        
        // Combat calculation
        const attackPower = this.army * (0.8 + Math.random() * 0.4);
        const defensePower = target.army * (0.7 + Math.random() * 0.4);
        
        if (attackPower > defensePower) {
            // Attacker wins
            const losses = target.army * 0.3;
            this.army -= losses * 0.5;
            target.army -= losses;
            
            if (target.army < 10) {
                target.isAlive = false;
            }
            
            return true;
        } else {
            // Defender wins
            const losses = this.army * 0.4;
            this.army -= losses;
            target.army -= losses * 0.3;
            
            return false;
        }
    }
}