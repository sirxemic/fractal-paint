/**
 * Fractal class renders a fractal-like image from a source image and transformations.
 */

/**
 * @constructor
 */
function Fractal(canvas, image, transforms) {
  this.width = canvas.width;
  this.height = canvas.height;
  
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.image = image;
  this.transforms = transforms;
  
  image.style.display = 'none'; // Drawing will already be drawn by the fractal
  
  // Use an extra buffer to store the previous frame into
  this.fractalBuffer = document.createElement('canvas');
  this.fractalBuffer.width = this.width;
  this.fractalBuffer.height = this.height;
  this.ctx2 = this.fractalBuffer.getContext('2d');
}

Fractal.prototype = {
  reset: function() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.image, 0, 0);
  },
  
  swapBuffers: function() {
    var t;
    t = this.canvas;
    this.canvas = this.fractalBuffer;
    this.fractalBuffer = t;
    t = this.ctx;
    this.ctx = this.ctx2;
    this.ctx2 = t;
  },

  step: function() {
    var ctx = this.ctx,
        ctx2 = this.ctx2,
        t = this.transforms[0], 
        t2, 
        D = 1 / (t[0] * t[3] - t[1] * t[2]),
        a, b, c, d, e, f;
    
    // Clear working buffer    
    ctx2.clearRect(0, 0, this.width, this.height);
    // Draw the original image
    ctx2.drawImage(this.image, 0, 0);
    ctx2.save();
    // Draw the fractal transformed onto the working buffer according to each transform
    for (var i = 1; i < this.transforms.length; i++) {
      t2 = this.transforms[i];
      a = (t[3] * t2[0] - t[2] * t2[1]) * D;
      b = (t[0] * t2[1] - t[1] * t2[0]) * D;
      c = (t[3] * t2[2] - t[2] * t2[3]) * D;
      d = (t[0] * t2[3] - t[1] * t2[2]) * D;
      e = t2[4] - t[4] * a - t[5] * b;
      f = t2[5] - t[4] * c - t[5] * d;
      ctx2.setTransform(a, c, b, d, e, f);
      ctx2.drawImage(this.canvas, 0, 0);
    }
    ctx2.restore();
    
    // Show the new fractal
    this.swapBuffers();
  },
  
  resize: function(w, h) {
    resizeCanvas(this.canvas, w, h);
    resizeCanvas(this.fractalBuffer, w, h);
    this.width = w;
    this.height = h;
  }
};