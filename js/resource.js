// Resource node class
class ResourceNode {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.amount = 50 + Math.random() * 100;
        this.maxAmount = this.amount;
        this.depleted = false;
        this.regenCooldown = 0;
    }
    
    update() {
        if (this.depleted) {
            this.regenCooldown++;
            
            // Regenerate after 500 frames
            if (this.regenCooldown > 500) {
                this.amount = this.maxAmount;
                this.depleted = false;
                this.regenCooldown = 0;
            }
        }
    }
    
    draw(ctx) {
        const size = this.depleted ? 4 : 6;
        const alpha = this.depleted ? 0.3 : 1.0;
        
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fillStyle = this.depleted ? '#666' : '#ffd700';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        
        // Draw amount if not depleted
        if (!this.depleted) {
            ctx.font = '8px Arial';
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.textAlign = 'center';
            ctx.strokeText(Math.floor(this.amount), this.x, this.y - 10);
            ctx.fillText(Math.floor(this.amount), this.x, this.y - 10);
        }
    }
}