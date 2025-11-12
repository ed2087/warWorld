// Main Game Logic - WITH COMPREHENSIVE LOGGING AND GRAPHS
class WarSandbox {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isPaused = false;
        this.gameSpeed = 1;
        this.turn = 0;
        this.frame = 0;
        this.selectedCountry = null;
        this.selectedCity = null;
        this.lastLoggedTurn = -1;
        this.powerHistoryData = new Map();
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.init();
        this.setupUI();
        this.startGameLoop();
    }
    
    init() {
        // BIGGER MAP!
        this.territoryMap = new TerritoryMap(3000, 2000);
        
        // Create cities with ENFORCED SPACING
        this.cities = [];
        this.countries = [];
        const numCountries = 6;
        const minDistance = 500;
        
        let attempts = 0;
        while (this.cities.length < numCountries && attempts < 1000) {
            const x = 300 + Math.random() * 2400;
            const y = 300 + Math.random() * 1400;
            
            let tooClose = false;
            for (let city of this.cities) {
                const dist = Math.hypot(city.x - x, city.y - y);
                if (dist < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                const id = this.cities.length;
                const color = `hsl(${id * 360 / numCountries}, 70%, 60%)`;
                const name = this.generateCityName();
                
                this.cities.push(new City(x, y, id, color, name));
                this.countries.push({
                    id: id,
                    color: color,
                    name: name,
                    isAlive: true
                });
                this.powerHistoryData.set(id, []);
            }
            
            attempts++;
        }
        
        // Create resource nodes
        this.resources = [];
        for (let i = 0; i < 80; i++) {
            const x = 150 + Math.random() * 2700;
            const y = 150 + Math.random() * 1700;
            this.resources.push(new ResourceNode(x, y));
        }
        
        // Create units array
        this.units = [];
        
        // Create AI controllers
        this.aiControllers = [];
        for (let i = 0; i < numCountries; i++) {
            const aggression = 40 + Math.random() * 60;
            const strategy = 40 + Math.random() * 60;
            this.aiControllers.push(new AIController(i, aggression, strategy));
        }
        
        // Setup controls
        this.controls = new GameControls(this.canvas);
        
        this.log('🌍 World generated with ' + numCountries + ' nations');
        
        // Log starting positions
        for (let city of this.cities) {
            this.log(`🏰 ${city.name} founded at (${Math.floor(city.x)}, ${Math.floor(city.y)})`);
        }
    }
    
    generateCityName() {
        const prefixes = ['Nova', 'Fort', 'New', 'Port', 'Castle', 'Mount', 'Saint', 'Old', 'High', 'North'];
        const suffixes = ['ville', 'town', 'burg', 'shire', 'haven', 'field', 'ton', 'dale', 'port', 'hold'];
        return prefixes[Math.floor(Math.random() * prefixes.length)] + 
               suffixes[Math.floor(Math.random() * suffixes.length)];
    }
    
    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }
    
    setupUI() {
        // Pause button
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            document.getElementById('pause-btn').textContent = this.isPaused ? '▶ Resume' : '⏸ Pause';
        });
        
        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.powerHistoryData.clear();
            this.init();
            this.turn = 0;
            this.frame = 0;
            this.selectedCountry = null;
            this.selectedCity = null;
            this.lastLoggedTurn = -1;
            document.getElementById('log-content').innerHTML = '';
            this.log('🔄 Game reset');
            this.drawPowerGraph();
            this.drawTerritoryGraph();
            this.updateMilitaryBreakdown();
        });
        
        // Speed controls
        document.getElementById('speed-slow').addEventListener('click', () => {
            this.gameSpeed = 0.5;
            document.querySelectorAll('.controls .btn-small').forEach(b => b.classList.remove('active'));
            document.getElementById('speed-slow').classList.add('active');
        });
        
        document.getElementById('speed-normal').addEventListener('click', () => {
            this.gameSpeed = 1;
            document.querySelectorAll('.controls .btn-small').forEach(b => b.classList.remove('active'));
            document.getElementById('speed-normal').classList.add('active');
        });
        
        document.getElementById('speed-fast').addEventListener('click', () => {
            this.gameSpeed = 2;
            document.querySelectorAll('.controls .btn-small').forEach(b => b.classList.remove('active'));
            document.getElementById('speed-fast').classList.add('active');
        });
        
        // Panel toggles
        document.getElementById('toggle-left').addEventListener('click', () => {
            document.querySelector('.left-panel').classList.toggle('collapsed');
        });
        
        document.getElementById('toggle-right').addEventListener('click', () => {
            document.querySelector('.right-panel').classList.toggle('collapsed');
        });
        
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`tab-${targetTab}`).classList.add('active');
            });
        });
        
        // Log filter tabs
        document.querySelectorAll('.log-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.log-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
        
        // Canvas click
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const transform = this.controls.getTransform();
            const x = (e.clientX - rect.left - transform.offsetX) / transform.scale;
            const y = (e.clientY - rect.top - transform.offsetY) / transform.scale;
            
            this.selectCityAt(x, y);
        });
        
        // Update nations list every second
        setInterval(() => this.updateNationsList(), 1000);
        
        // Initialize graphs
        this.drawPowerGraph();
        this.drawTerritoryGraph();
        this.updateMilitaryBreakdown();
    }
    
    startGameLoop() {
        const loop = () => {
            if (!this.isPaused) {
                this.update();
                this.frame++;
                
                if (this.frame % 60 === 0) {
                    this.turn++;
                    this.logTurnSummary();
                }
            }
            
            this.render();
            requestAnimationFrame(loop);
        };
        
        loop();
    }
    
    logTurnSummary() {
        // Detailed turn summary every 10 turns
        if (this.turn % 10 === 0) {
            this.log(`━━━━━━━ TURN ${this.turn} SUMMARY ━━━━━━━`);
            
            for (let city of this.cities) {
                if (city.isDestroyed) continue;
                
                const country = this.countries[city.countryId];
                const units = this.units.filter(u => u.countryId === city.countryId && !u.isDead);
                const ai = this.aiControllers[city.countryId];
                
                const fighting = units.filter(u => u.state === 'fighting').length;
                const gathering = units.filter(u => u.state === 'gathering').length;
                
                this.log(`${country.name}: Lv${city.level} | ${units.length} units | ${Math.floor(city.resources)}💰 | ${ai.currentStrategy.toUpperCase()} | Fight:${fighting} Gather:${gathering}`);
            }
        }
    }
    
    update() {
        // Count controlled resource nodes for each city
        for (let city of this.cities) {
            if (city.isDestroyed) continue;
            
            city.controlledResourceNodes = 0;
            for (let resource of this.resources) {
                if (resource.depleted) continue;
                
                const dist = Math.hypot(resource.x - city.x, resource.y - city.y);
                if (dist < 150) {
                    const friendlyUnits = this.units.filter(u => 
                        u.countryId === city.countryId &&
                        !u.isDead &&
                        Math.hypot(u.x - resource.x, u.y - resource.y) < 80
                    );
                    
                    if (friendlyUnits.length > 0) {
                        city.controlledResourceNodes++;
                    }
                }
            }
        }
        
        // Track unit spawns
        const unitsBefore = this.units.length;
        
        // Update cities
        for (let city of this.cities) {
            city.update(this.units, this.resources, this);
        }
        
        // Update resources
        for (let resource of this.resources) {
            resource.update();
        }
        
        // Update units
        for (let unit of this.units) {
            unit.update(this.units, this.resources, this.cities, this);
        }
        
        // Update AI controllers
        for (let ai of this.aiControllers) {
            ai.update(this.units, this.cities, this.resources, this);
        }
        
        // Update territory map
        this.territoryMap.update(this.cities, this.units);
        
        // Check for city conquests
        for (let city of this.cities) {
            if (!city.isDestroyed) continue;
            
            // Find who destroyed it
            const nearbyEnemies = this.units.filter(u => 
                !u.isDead && 
                u.countryId !== city.countryId && 
                Math.hypot(u.x - city.x, u.y - city.y) < 50
            );
            
            if (nearbyEnemies.length > 0) {
                const conqueror = nearbyEnemies[0];
                city.conquer(conqueror.countryId, conqueror.color, this);
            }
        }
        
        // Check for eliminated nations
        for (let country of this.countries) {
            if (!country.isAlive) continue;
            
            const hasCity = this.cities.some(c => c.countryId === country.id && !c.isDestroyed);
            const hasUnits = this.units.some(u => u.countryId === country.id && !u.isDead);
            
            if (!hasCity && !hasUnits) {
                country.isAlive = false;
                this.log(`💀💀💀 ${country.name} HAS BEEN ELIMINATED! 💀💀💀`);
            }
        }
        
        // Update selected city info if selected
        if (this.selectedCity) {
            this.updateSelectedInfo(this.selectedCity);
        }
        
        // Update graphs and power history every 60 frames (1 turn)
        if (this.frame % 60 === 0) {
            // Record power for each nation
            for (let city of this.cities) {
                const units = this.units.filter(u => u.countryId === city.countryId && !u.isDead);
                const power = units.reduce((sum, u) => sum + u.strength, 0) + city.garrison;
                
                if (!this.powerHistoryData.has(city.countryId)) {
                    this.powerHistoryData.set(city.countryId, []);
                }
                
                this.powerHistoryData.get(city.countryId).push(power);
                
                // Keep only last 100 points
                if (this.powerHistoryData.get(city.countryId).length > 100) {
                    this.powerHistoryData.get(city.countryId).shift();
                }
            }
            
            this.drawPowerGraph();
            this.drawTerritoryGraph();
            this.updateMilitaryBreakdown();
        }
    }
    
    render() {
        const { offsetX, offsetY, scale } = this.controls.getTransform();
        
        // Clear canvas
        this.ctx.fillStyle = '#0d0d0d';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply transform
        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);
        this.ctx.scale(scale, scale);
        
        // Draw grid
        this.drawGrid();
        
        // Draw territories
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
        
        // Highlight selected city
        if (this.selectedCity && !this.selectedCity.isDestroyed) {
            this.ctx.beginPath();
            this.ctx.arc(this.selectedCity.x, this.selectedCity.y, 25, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        this.ctx.restore();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < 3000; x += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, 2000);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < 2000; y += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(3000, y);
            this.ctx.stroke();
        }
    }
    
    drawPowerGraph() {
        const canvas = document.getElementById('power-graph');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear
        ctx.fillStyle = '#0a0e27';
        ctx.fillRect(0, 0, width, height);
        
        // Find max power for scaling
        let maxPower = 1;
        for (let [_, history] of this.powerHistoryData) {
            if (history.length === 0) continue;
            const max = Math.max(...history);
            if (max > maxPower) maxPower = max;
        }
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw lines for each nation
        const maxTurns = 100;
        for (let [countryId, history] of this.powerHistoryData) {
            if (history.length < 2) continue;
            
            const country = this.countries[countryId];
            if (!country || !country.isAlive) continue;
            
            ctx.strokeStyle = country.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            for (let i = 0; i < history.length; i++) {
                const x = (width / maxTurns) * i;
                const y = height - (history[i] / maxPower) * height;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
        }
        
        // Draw legend
        ctx.font = '10px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(`Max: ${Math.floor(maxPower)}`, 5, 15);
        ctx.fillText(`Turn: ${this.turn}`, 5, 30);
    }
    
    drawTerritoryGraph() {
        const canvas = document.getElementById('territory-graph');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear
        ctx.fillStyle = '#0a0e27';
        ctx.fillRect(0, 0, width, height);
        
        // Get territory sizes
        const territories = [];
        let total = 0;
        
        for (let city of this.cities) {
            if (city.isDestroyed) continue;
            
            const size = this.territoryMap.getTerritorySize(city.countryId);
            territories.push({
                countryId: city.countryId,
                size: size,
                color: this.countries[city.countryId].color,
                name: this.countries[city.countryId].name
            });
            total += size;
        }
        
        if (total === 0) return;
        
        // Sort by size
        territories.sort((a, b) => b.size - a.size);
        
        // Draw bars
        const barHeight = Math.max(15, height / territories.length - 5);
        
        for (let i = 0; i < territories.length; i++) {
            const t = territories[i];
            const barWidth = (t.size / total) * (width - 70);
            const y = i * (barHeight + 5);
            
            // Bar
            ctx.fillStyle = t.color;
            ctx.fillRect(70, y, barWidth, barHeight);
            
            // Border
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(70, y, barWidth, barHeight);
            
            // Label
            ctx.fillStyle = '#fff';
            ctx.font = '9px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(t.name.substring(0, 8), 65, y + barHeight / 2 + 3);
            
            // Value
            ctx.textAlign = 'left';
            ctx.fillText(t.size, 75 + barWidth, y + barHeight / 2 + 3);
        }
    }
    
    updateMilitaryBreakdown() {
        const container = document.getElementById('military-breakdown');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (let city of this.cities) {
            if (city.isDestroyed) continue;
            
            const country = this.countries[city.countryId];
            const units = this.units.filter(u => u.countryId === city.countryId && !u.isDead);
            
            const fighting = units.filter(u => u.state === 'fighting').length;
            const gathering = units.filter(u => u.state === 'gathering').length;
            const moving = units.filter(u => u.state === 'moving').length;
            const idle = units.filter(u => u.state === 'idle').length;
            const veterans = units.filter(u => u.experience > 1).length;
            
            const totalPower = units.reduce((sum, u) => sum + u.strength, 0);
            
            const card = document.createElement('div');
            card.style.cssText = `
                background: var(--bg-light);
                border: 1px solid var(--border);
                border-radius: 4px;
                padding: 0.75rem;
                margin-bottom: 0.5rem;
            `;
            
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div style="width: 12px; height: 12px; background: ${country.color}; border-radius: 50%;"></div>
                    <strong style="font-size: 0.9rem;">${country.name}</strong>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                    <div>Total: ${units.length} units (${Math.floor(totalPower)} power)</div>
                    <div style="margin-top: 0.25rem;">
                        ⚔️ ${fighting} | 💰 ${gathering} | 🚶 ${moving} | 💤 ${idle}
                    </div>
                    ${veterans > 0 ? `<div style="color: #ffd93d; margin-top: 0.25rem;">⭐ ${veterans} veterans</div>` : ''}
                </div>
            `;
            
            container.appendChild(card);
        }
    }
    
    selectCityAt(x, y) {
        for (let city of this.cities) {
            const dist = Math.hypot(city.x - x, city.y - y);
            if (dist < 20) {
                this.selectedCountry = this.countries[city.countryId];
                this.selectedCity = city;
                this.updateSelectedInfo(city);
                this.log(`📍 Selected ${city.name} (${this.countries[city.countryId].name})`);
                return;
            }
        }
    }
    
    updateSelectedInfo(city) {
        const info = document.getElementById('selected-info');
        
        if (!city || city.isDestroyed) {
            info.innerHTML = '<p class="muted">City destroyed or not selected</p>';
            this.selectedCountry = null;
            this.selectedCity = null;
            return;
        }
        
        const unitCount = this.units.filter(u => u.countryId === city.countryId && !u.isDead).length;
        const territorySize = this.territoryMap.getTerritorySize(city.countryId);
        const country = this.countries[city.countryId];
        
        // Get AI controller info
        const ai = this.aiControllers[city.countryId];
        const strategyIcons = {
            'boom': '💰 BOOMING',
            'rush': '⚡ RUSHING',
            'aggressive': '⚔️ ATTACKING',
            'turtle': '🛡️ TURTLING',
            'desperate': '🆘 DESPERATE'
        };
        
        // Count units by state
        const myUnits = this.units.filter(u => u.countryId === city.countryId && !u.isDead);
        const fighting = myUnits.filter(u => u.state === 'fighting').length;
        const gathering = myUnits.filter(u => u.state === 'gathering').length;
        const moving = myUnits.filter(u => u.state === 'moving').length;
        const idle = myUnits.filter(u => u.state === 'idle').length;
        const veterans = myUnits.filter(u => u.experience > 1).length;
        
        // Calculate total power
        const totalPower = myUnits.reduce((sum, u) => sum + u.strength, 0);
        
        // Upkeep cost
        const upkeep = (unitCount * 0.3).toFixed(1);
        
        // Income calculation
        const baseIncome = 2;
        const resourceBonus = city.controlledResourceNodes * 3;
        const tributeBonus = city.tributeIncome;
        const levelBonus = (city.level - 1) * 2;
        const totalIncome = baseIncome + resourceBonus + tributeBonus + levelBonus;
        const netIncome = totalIncome - upkeep;
        
        info.innerHTML = `
            <p><strong>${city.name}</strong></p>
            <p style="color: ${city.color}; font-size: 1.2rem;">████ Level ${city.level}</p>
            <p style="font-size: 0.85rem;">${country.isAlive ? '✅ Active' : '💀 Defeated'}</p>
            <hr style="margin: 0.5rem 0; border-color: var(--border)">
            
            <p><strong>💰 Economy:</strong></p>
            <p>Resources: ${Math.floor(city.resources)}</p>
            <p style="font-size: 0.8rem; margin-left: 1rem;">Income: +${totalIncome}/turn</p>
            <p style="font-size: 0.8rem; margin-left: 1rem;">Upkeep: -${upkeep}/turn</p>
            <p style="font-size: 0.8rem; margin-left: 1rem; color: ${netIncome > 0 ? '#0f0' : '#f00'};">Net: ${netIncome > 0 ? '+' : ''}${netIncome.toFixed(1)}/turn</p>
            <p style="font-size: 0.8rem; margin-left: 1rem;">⛏️ Nodes: ${city.controlledResourceNodes}</p>
            ${city.tributeIncome > 0 ? `<p style="font-size: 0.8rem; margin-left: 1rem;">👑 Tribute: +${city.tributeIncome}/turn</p>` : ''}
            
            <hr style="margin: 0.5rem 0; border-color: var(--border)">
            <p><strong>🏰 Defense:</strong></p>
            <p>Garrison: ${Math.floor(city.garrison)}/${30 + city.level * 10}</p>
            <p style="font-size: 0.8rem;">Next Unit: ${Math.max(0, Math.floor(city.unitProductionCooldown / 60))}s</p>
            
            <hr style="margin: 0.5rem 0; border-color: var(--border)">
            <p><strong>⚔️ Military:</strong></p>
            <p>Units: ${unitCount} (Power: ${Math.floor(totalPower)})</p>
            <p style="font-size: 0.8rem; margin-left: 1rem;">⚔️ Fighting: ${fighting}</p>
            <p style="font-size: 0.8rem; margin-left: 1rem;">💰 Gathering: ${gathering}</p>
            <p style="font-size: 0.8rem; margin-left: 1rem;">🚶 Moving: ${moving}</p>
            <p style="font-size: 0.8rem; margin-left: 1rem;">💤 Idle: ${idle}</p>
            ${veterans > 0 ? `<p style="font-size: 0.8rem; margin-left: 1rem;">⭐ Veterans: ${veterans}</p>` : ''}
            
            <hr style="margin: 0.5rem 0; border-color: var(--border)">
            <p><strong>🗺️ Territory:</strong></p>
            <p>Size: ${territorySize} cells</p>
            
            <hr style="margin: 0.5rem 0; border-color: var(--border)">
            <p><strong>🤖 AI Status:</strong></p>
            <p>${strategyIcons[ai.currentStrategy] || ai.currentStrategy.toUpperCase()}</p>
            <p style="font-size: 0.8rem;">Phase: ${ai.phase.toUpperCase()}</p>
            <p style="font-size: 0.8rem;">Power Ratio: ${ai.lastEvaluation && ai.lastEvaluation.powerRatio ? ai.lastEvaluation.powerRatio.toFixed(2) : 'N/A'}</p>
            <p style="font-size: 0.8rem;">Economy: ${ai.lastEvaluation && ai.lastEvaluation.economyHealth ? ai.lastEvaluation.economyHealth : 'N/A'}</p>
        `;
    }
    
    updateNationsList() {
        const nationsList = document.getElementById('nations-list');
        if (!nationsList) return;
        
        nationsList.innerHTML = '';
        
        for (let city of this.cities) {
            const country = this.countries[city.countryId];
            const unitCount = this.units.filter(u => u.countryId === city.countryId && !u.isDead).length;
            const ai = this.aiControllers[city.countryId];
            
            const card = document.createElement('div');
            card.className = 'nation-card';
            if (city.isDestroyed) card.classList.add('dead');
            if (this.selectedCity === city) card.classList.add('selected');
            
            card.innerHTML = `
                <div class="nation-header">
                    <div class="nation-color" style="background: ${country.color}"></div>
                    <div class="nation-name">${country.name}</div>
                    <div class="nation-status">${city.isDestroyed ? '💀' : '✅'}</div>
                </div>
                <div class="nation-stats">
                    <span>🏰 Lv${city.level}</span>
                    <span>🪖 ${unitCount}</span>
                    <span>💰 ${Math.floor(city.resources)}</span>
                    <span>🎯 ${ai.currentStrategy.toUpperCase().substring(0, 4)}</span>
                </div>
            `;
            
            card.addEventListener('click', () => {
                this.selectedCity = city;
                this.selectedCountry = country;
                this.updateSelectedInfo(city);
                this.updateNationsList();
            });
            
            nationsList.appendChild(card);
        }
        
        // Update top stats
        document.getElementById('turn-counter').textContent = `Turn: ${this.turn}`;
        document.getElementById('year-counter').textContent = `Year: ${1000 + this.turn}`;
        document.getElementById('country-count').textContent = `Nations: ${this.cities.filter(c => !c.isDestroyed).length}`;
        document.getElementById('total-units').textContent = `Units: ${this.units.filter(u => !u.isDead).length}`;
    }
    
    log(message) {
        const logContent = document.getElementById('log-content');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        // Add timestamp
        const timestamp = `[T${this.turn}:${Math.floor(this.frame % 60)}]`;
        entry.textContent = `${timestamp} ${message}`;
        
        // Color code important events
        if (message.includes('ELIMINATED')) {
            entry.style.color = '#ff4444';
            entry.style.fontWeight = 'bold';
            entry.classList.add('combat');
        } else if (message.includes('CONQUERED')) {
            entry.style.color = '#ffd700';
            entry.style.fontWeight = 'bold';
            entry.classList.add('diplomacy');
        } else if (message.includes('attacking') || message.includes('FALLEN')) {
            entry.style.color = '#ff6666';
            entry.classList.add('combat');
        } else if (message.includes('trained') || message.includes('delivered')) {
            entry.style.color = '#66ff66';
            entry.classList.add('economy');
        } else if (message.includes('SUMMARY')) {
            entry.style.color = '#00ffff';
            entry.style.fontWeight = 'bold';
        }
        
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
        
        // Keep only last 100 entries
        while (logContent.children.length > 100) {
            logContent.removeChild(logContent.firstChild);
        }
    }
}

// Start game
window.addEventListener('DOMContentLoaded', () => {
    new WarSandbox();
});