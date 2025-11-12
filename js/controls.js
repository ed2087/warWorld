// Touch/Mouse Controls for Pan & Zoom
class GameControls {
    constructor(canvas) {
        this.canvas = canvas;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
        
        this.setupControls();
    }
    
    setupControls() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
        this.canvas.addEventListener('mousemove', (e) => this.drag(e));
        this.canvas.addEventListener('mouseup', () => this.endDrag());
        this.canvas.addEventListener('mouseleave', () => this.endDrag());
        this.canvas.addEventListener('wheel', (e) => this.zoom(e));
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.endDrag());
        
        // Click to select
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }
    
    startDrag(e) {
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }
    
    drag(e) {
        if (!this.isDragging) return;
        
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        
        this.offsetX += dx;
        this.offsetY += dy;
        
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }
    
    endDrag() {
        this.isDragging = false;
    }
    
    zoom(e) {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        
        this.scale = Math.max(0.5, Math.min(3, this.scale + delta));
    }
    
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.lastX = e.touches[0].clientX;
            this.lastY = e.touches[0].clientY;
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1 && this.isDragging) {
            const dx = e.touches[0].clientX - this.lastX;
            const dy = e.touches[0].clientY - this.lastY;
            
            this.offsetX += dx;
            this.offsetY += dy;
            
            this.lastX = e.touches[0].clientX;
            this.lastY = e.touches[0].clientY;
        }
    }
    
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.offsetX) / this.scale;
        const y = (e.clientY - rect.top - this.offsetY) / this.scale;
        
        // Return click position for selection
        return { x, y };
    }
    
    getTransform() {
        return {
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            scale: this.scale
        };
    }
}