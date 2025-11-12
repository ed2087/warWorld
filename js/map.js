// Voronoi Map Generator
class VoronoiMap {
    constructor(width, height, numCountries) {
        this.width = width;
        this.height = height;
        this.numCountries = numCountries;
        this.seeds = [];
        this.cells = [];
        
        this.generateSeeds();
        this.generateCells();
    }
    
    generateSeeds() {
        // Generate random seed points for countries
        for (let i = 0; i < this.numCountries; i++) {
            this.seeds.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                countryId: i
            });
        }
    }
    
    generateCells() {
        // Create a grid of cells, each assigned to nearest seed
        const cellSize = 20;
        const cols = Math.ceil(this.width / cellSize);
        const rows = Math.ceil(this.height / cellSize);
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cellX = x * cellSize + cellSize / 2;
                const cellY = y * cellSize + cellSize / 2;
                
                // Find nearest seed
                let nearestSeed = this.seeds[0];
                let minDist = Infinity;
                
                for (let seed of this.seeds) {
                    const dist = Math.hypot(cellX - seed.x, cellY - seed.y);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestSeed = seed;
                    }
                }
                
                this.cells.push({
                    x: x * cellSize,
                    y: y * cellSize,
                    size: cellSize,
                    countryId: nearestSeed.countryId,
                    gridX: x,
                    gridY: y
                });
            }
        }
    }
    
    getCellsForCountry(countryId) {
        return this.cells.filter(cell => cell.countryId === countryId);
    }
    
    getNeighborCountries(countryId) {
        const countryCells = this.getCellsForCountry(countryId);
        const neighbors = new Set();
        
        for (let cell of countryCells) {
            // Check adjacent cells
            const adjacent = this.cells.filter(c => 
                Math.abs(c.gridX - cell.gridX) <= 1 && 
                Math.abs(c.gridY - cell.gridY) <= 1 &&
                c.countryId !== countryId
            );
            
            adjacent.forEach(a => neighbors.add(a.countryId));
        }
        
        return Array.from(neighbors);
    }
    
    transferCell(cell, newCountryId) {
        cell.countryId = newCountryId;
    }
}