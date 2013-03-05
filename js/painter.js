/**
 * Painter class handles interactions to change the source image of the fractal.
 */

/**
 * @constructor
 */ 
function Painter(canvas) {
  this.width = canvas.width;
  this.height = canvas.height;
  
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  
  this.drawing = false;
  this.erasing = false;
}

Painter.prototype = {
  mousedown: function(e) {
    var c = this.ctx;
    
    c.lineCap = 'round';
    c.strokeStyle = 'white';
    
    if (e.button == 0) { // Draw
      c.globalCompositeOperation = 'source-over';
      this.drawing = true;
      this.erasing = false;
    }
    else if (e.button == 2) { // Erase
      c.globalCompositeOperation = 'destination-out';
      this.drawing = false;
      this.erasing = true;
    }
    
    this.mouseXPrev = e.layerX;
    this.mouseYPrev = e.layerY;
  },
  
  mousemove: function(e) {
    if (!this.drawing && !this.erasing) return;
    
    var c = this.ctx, 
        mouseX = e.layerX, 
        mouseY = e.layerY,
        a = (mouseX - this.mouseXPrev) * (mouseX - this.mouseXPrev) + (mouseY - this.mouseYPrev) * (mouseY - this.mouseYPrev);
        
    // Brush size depends on whether the user is drawing or erasing and the mouse speed.
    if (this.drawing) c.lineWidth = Math.min(6, Math.pow(a, 0.25));
    else c.lineWidth = Math.min(30, 6+Math.pow(a, 0.25));
    
    c.beginPath();
    c.moveTo(this.mouseXPrev, this.mouseYPrev);
    c.lineTo(mouseX, mouseY);
    c.stroke();
    
    this.mouseXPrev = mouseX;
    this.mouseYPrev = mouseY;
  },
  
  mouseup: function(e) {
    this.drawing = false;
    this.erasing = false;
  },
  
  // Transforms the image according to some affine transformation matrix
  transform: function(a, b, c, d, e, f) {
    var ctx = this.ctx;
    ctx.save();
    ctx.setTransform(a, c, b, d, e, f);
    ctx.globalCompositeOperation = 'destination-atop';
    ctx.drawImage(this.canvas, 0, 0);
    ctx.restore();
  },
  
  resize: function(w, h) {
    resizeCanvas(this.canvas, w, h);
    this.width = w;
    this.height = h;
  },
  
  // Replaces the canvas with some image, converted to transparent white.
  loadImage: function(img) {
    var c = this.ctx, xOffset, yOffset, newWidth, newHeight;
    
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, this.width, this.height);
    
    // Set the bounds to draw the image into
    if (img.width > this.width || img.height > this.height) {
      if (this.height * img.width > img.height * this.width) {
        newWidth = this.width;
        newHeight = img.height * this.width / img.width;
        xOffset = 0;
        yOffset = (this.height - newHeight) / 2;
      }
      else {
        newWidth = img.width * this.height / img.height;
        newHeight = this.height;
        xOffset = (this.width - newWidth) / 2;
        yOffset = 0;
      }
    }
    else {
      newWidth = img.width;
      newHeight = img.height;
      xOffset = (this.width - img.width) / 2;
      yOffset = (this.height - img.height) / 2;
    }
    c.drawImage(img, xOffset, yOffset, newWidth, newHeight);
    
    // Make it transparent white
    var imgd = c.getImageData(xOffset, yOffset, newWidth, newHeight);
    var pix = imgd.data;
    for (var i = 0, n = pix.length; i < n; i += 4) {
      var r = pix[i],
          g = pix[i+1],
          b = pix[i+2],
          a = pix[i+3];
          
      pix[i+3] = 0 | Math.max(r, g, b) * a / 255;
      pix[i] = pix[i+1] = pix[i+2] = 255;
    }
    c.putImageData(imgd, xOffset, yOffset);
  }
};