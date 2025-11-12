// Main Game Logic - UPDATED WITH TERRITORIES
class WarSandbox {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isPaused = false;
        this.turn = 0;
        this.frame = 0;
        this.selectedCountry = null;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.init();
        this.setupUI();
        this.startGameLoop();
    }
    
    init() {
        // Create territory map
        this.territoryMap = new TerritoryMap(2000, 1500);
        
        // Create cities (countries)
        this.cities = [];
        this.countries = [];
        const numCountries = 8;
        
        for (let i = 0; i < numCountries; i++) {
            const x = 200 + Math.random() * 1600;
            const y = 200 + Math.random() * 1100;
            const color = `hsl(${i * 360 / numCountries}, 70%, 60%)`;
            const name = this.generateCityName();
            
            this.cities.push(new City(x, y, i, color, name));
            this.countries.push({
                id: i,
                color: color,
                name: name,
                isAlive: true
            });
        }
        
        // Create resource nodes
        this.resources = [];
        for (let i = 0; i < 50; i++) {
            const x = 100 + Math.random() * 1800;
            const y = 100 + Math.random() * 1300;
            this.resources.push(new ResourceNode(x, y));
        }
        
        // Create units array
        this.units = [];
        
        // Create AI controllers
        this.aiControllers = [];
        for (let i = 0; i < numCountries; i++) {
            const aggression = 30 + Math.random() * 70;
            const strategy = 30 + Math.random() * 70;
            this.aiControllers.push(new AIController(i, aggression, strategy));
        }
        
        // Setup controls
        this.controls = new GameControls(this.canvas);
        
        this.log('🌍 World generated with ' + numCountries + ' nations');
    }
    
    generateCityName() {
        const prefixes = ['Nova', 'Fort', 'New', 'Port', 'Castle', 'Mount', 'Saint', 'Old'];
        const suffixes = ['ville', 'town', 'burg', 'shire', 'haven', 'field', 'ton', 'dale'];
        return prefixes[Math.floor(Math.random() * prefixes.length)] + 
               suffixes[Math.floor(Math.random() * suffixes.length)];
    }
    
    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }
    
    setupUI() {
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            document.getElementById('pause-btn').textContent = this.isPaused ? '▶ Resume' : '⏸ Pause';
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.init();
            this.turn = 0;
            this.frame = 0;
            this.log('🔄 Game reset');
        });
        
        document.getElementById('toggle-panel').addEventListener('click', () => {
            document.getElementById('side-panel').classList.toggle('hidden');
        });
        
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const transform = this.controls.getTransform();
            const x = (e.clientX - rect.left - transform.offsetX) / transform.scale;
            const y = (e.clientY - rect.top - transform.offsetY) / transform.scale;
            
            this.selectCityAt(x, y);
        });
    }
    
    startGameLoop() {
        const loop = () => {
            if (!this.isPaused) {
                this.update();
                this.frame++;
                
                if (this.frame % 60 === 0) {
                    this.turn++;
                }
            }
            
            this.render();
            requestAnimationFrame(loop);
        };
        
        loop();
    }
    
    update() {
        // Update cities
        for (let city of this.cities) {
            city.update(this.units);
        }
        
        // Update resources
        for (let resource of this.resources) {
            resource.update();
        }
        
        // Update units
        for (let unit of this.units) {
            unit.update(this.units, this.resources, this.cities);
        }
        
        // Remove dead units
        this.units = this.units.filter(u => !u.isDead);
        
        // Update territory map
        this.territoryMap.update(this.cities, this.units);
        
        // AI decisions
        for (let ai of this.aiControllers) {
            ai.update(this.units, this.cities, this.resources);
        }
        
        // Check for eliminated countries
        for (let country of this.countries) {
            if (!country.isAlive) continue;
            
            const hasCity = this.cities.some(c => c.countryId === country.id && !c.isDestroyed);
            const hasUnits = this.units.some(u => u.countryId === country.id && !u.isDead);
            
            if (!hasCity && !hasUnits) {
                country.isAlive = false;
                this.log(`💀 ${country.name} has been eliminated!`);
            }
        }
        
        // Update UI
        const aliveCount = this.countries.filter(c => c.isAlive).length;
        document.getElementById('turn-counter').textContent = 'Turn: ' + this.turn;
        document.getElementById('country-count').textContent = 'Nations: ' + aliveCount;
    }
    
    render() {
        const { offsetX, offsetY, scale } = this.controls.getTransform();
        
        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply transform
        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);
        this.ctx.scale(scale, scale);
        
        // Draw grid (subtle background)
        this.drawGrid();
        
        // Draw territories (COLORED MAP!)
        this.territoryMap.draw(this.ctx, this.countries);
        
        // Draw resources
        for (let resource of this.resources) {
            resource.draw(this.ctx);
        }
        
        // Draw cities
        for (let city of this.cities) {
            city.draw(this.ctx);
        }
        
        // Draw units
        for (let unit of this.units) {
            unit.draw(this.ctx);
        }
        
        this.ctx.restore();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < 2000; x += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, 1500);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < 1500; y += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(2000, y);
            this.ctx.stroke();
        }
    }
    
    selectCityAt(x, y) {
        for (let city of this.cities) {
            const dist = Math.hypot(city.x - x, city.y - y);
            if (dist < 15) {
                this.selectedCountry = this.countries[city.countryId];
                this.updateSelectedInfo(city);
                return;
            }
        }
    }
    
    updateSelectedInfo(city) {
        const info = document.getElementById('selected-info');
        
        if (!city || city.isDestroyed) {
            info.innerHTML = '<p class="muted">City destroyed or not selected</p>';
            return;
        }
        
        const unitCount = this.units.filter(u => u.countryId === city.countryId && !u.isDead).length;
        const territorySize = this.territoryMap.getTerritorySize(city.countryId);
        
        info.innerHTML = `
            <p><strong>${city.name}</strong></p>
            <p style="color: ${city.color}">████</p>
            <p>🏰 Garrison: ${Math.floor(city.garrison)}/50</p>
            <p>💰 Resources: ${Math.floor(city.resources)}</p>
            <p>🪖 Units: ${unitCount}</p>
            <p>🗺️ Territory: ${territorySize} cells</p>
        `;
    }
    
    log(message) {
        const logContent = document.getElementById('log-content');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `[Turn ${this.turn}] ${message}`;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
        
        while (logContent.children.length > 50) {
            logContent.removeChild(logContent.firstChild);
        }
    }
}

// Start game
window.addEventListener('DOMContentLoaded', () => {
    new WarSandbox();
});