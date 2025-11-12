// Territory visualization system
class TerritoryMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.cellSize = 40;
        this.cols = Math.ceil(width / this.cellSize);
        this.rows = Math.ceil(height / this.cellSize);
        this.cells = [];
        
        this.initCells();
    }
    
    initCells() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.cells.push({
                    x: x * this.cellSize,
                    y: y * this.cellSize,
                    size: this.cellSize,
                    countryId: -1, // -1 = neutral
                    influence: 0
                });
            }
        }
    }
    
    update(cities, units) {
        // Reset all cells
        for (let cell of this.cells) {
            cell.countryId = -1;
            cell.influence = 0;
        }
        
        // Calculate influence from cities and units
        for (let city of cities) {
            if (city.isDestroyed) continue;
            
            this.applyInfluence(city.x, city.y, city.countryId, 200);
        }
        
        for (let unit of units) {
            if (unit.isDead) continue;
            
            this.applyInfluence(unit.x, unit.y, unit.countryId, 50);
        }
    }
    
    applyInfluence(x, y, countryId, radius) {
        for (let cell of this.cells) {
            const cellCenterX = cell.x + cell.size / 2;
            const cellCenterY = cell.y + cell.size / 2;
            const dist = Math.hypot(cellCenterX - x, cellCenterY - y);
            
            if (dist < radius) {
                const influence = (1 - dist / radius) * 100;
                
                if (influence > cell.influence) {
                    cell.influence = influence;
                    cell.countryId = countryId;
                }
            }
        }
    }
    
    draw(ctx, countries) {
        for (let cell of this.cells) {
            if (cell.countryId === -1) {
                // Neutral territory
                ctx.fillStyle = 'rgba(50, 50, 50, 0.3)';
            } else {
                // Country territory
                const country = countries[cell.countryId];
                if (country && country.isAlive) {
                    const alpha = Math.min(0.4, cell.influence / 100 * 0.4);
                    const color = this.hexToRgb(country.color);
                    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
                } else {
                    ctx.fillStyle = 'rgba(50, 50, 50, 0.3)';
                }
            }
            
            ctx.fillRect(cell.x, cell.y, cell.size - 1, cell.size - 1);
        }
        
        // Draw borders between territories
        this.drawBorders(ctx, countries);
    }
    
    drawBorders(ctx, countries) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        
        for (let i = 0; i < this.cells.length; i++) {
            const cell = this.cells[i];
            const row = Math.floor(i / this.cols);
            const col = i % this.cols;
            
            // Check right neighbor
            if (col < this.cols - 1) {
                const right = this.cells[i + 1];
                if (cell.countryId !== right.countryId && cell.countryId !== -1 && right.countryId !== -1) {
                    ctx.beginPath();
                    ctx.moveTo(cell.x + cell.size, cell.y);
                    ctx.lineTo(cell.x + cell.size, cell.y + cell.size);
                    ctx.stroke();
                }
            }
            
            // Check bottom neighbor
            if (row < this.rows - 1) {
                const bottom = this.cells[i + this.cols];
                if (cell.countryId !== bottom.countryId && cell.countryId !== -1 && bottom.countryId !== -1) {
                    ctx.beginPath();
                    ctx.moveTo(cell.x, cell.y + cell.size);
                    ctx.lineTo(cell.x + cell.size, cell.y + cell.size);
                    ctx.stroke();
                }
            }
        }
    }
    
    hexToRgb(hex) {
        // Convert hsl/hex to rgb
        const temp = document.createElement('div');
        temp.style.color = hex;
        document.body.appendChild(temp);
        const computed = window.getComputedStyle(temp).color;
        document.body.removeChild(temp);
        
        const match = computed.match(/\d+/g);
        return {
            r: parseInt(match[0]),
            g: parseInt(match[1]),
            b: parseInt(match[2])
        };
    }
    
    getTerritorySize(countryId) {
        return this.cells.filter(c => c.countryId === countryId).length;
    }
}