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
  },
};

/**
 * Controls class handles interactions to modify the frames and source image and draws the frames.
 */

/**
 * @constructor
 */
function Controls(canvas, transforms, fractal, painter) {
  this.width = canvas.width;
  this.height = canvas.height;
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.transforms = transforms;
  this.selection = {index: -1, corner: -1};
  this.dragging = false;
  this.fractal = fractal;
  this.mouseOver = false;
  
  this.painter = painter;
  
  // Change the context of canvas mouse events to this class.
  var that = this;
  for (var method in {'mousedown': 1, 'mouseup': 1, 'mousemove': 1, 'mouseover': 1, 'mouseout': 1, 'dblclick': 1}) {
    (function(m) {
      that.canvas['on' + m] = function() { that[m].apply(that, arguments); }
    })(method);
  }
  
  // Mouse wheel event is not consistent amongst browsers >:(
  if ('onwheel' in that.canvas) m = 'onwheel';
  else if ('onmousewheel' in that.canvas) m = 'onmousewheel';
  else throw new Error("Mousewheel event not supported.");
  
  that.canvas[m] = function() { that['wheel'].apply(that, arguments); }
}

Controls.prototype = {
  transformEverything: function(a, b, c, d, e, f) {
    this.painter.transform(a, b, c, d, e, f);
    
    this.transforms.forEach(function (t) {
      a2 = t[0]; b2 = t[1]; e2 = t[4];
      c2 = t[2]; d2 = t[3]; f2 = t[5];
      
      t[0] = a * a2 + b * c2;
      t[1] = a * b2 + b * d2;
      t[2] = c * a2 + d * c2;
      t[3] = c * b2 + d * d2;
      
      t[4] = e + a * e2 + b * f2;
      t[5] = f + c * e2 + d * f2;
    });
  },
  
  select: function(e) {
    var img = this.inputImage, t, minDist = 64, d;
    this.selection = {index: -1, corner: -1};
    
    // First check if any corner is at mouse position
    for (var i = this.transforms.length - 1; i >= 0; i--) {
      t = this.transforms[i];
      // Top-left
      d = distanceSquared(e.layerX, e.layerY, t[4], t[5]);
      if (d < minDist) {
        d = minDist;
        this.selection.index = i;
        this.selection.corner = 0;
      }
      
      // Top-right
      d = distanceSquared(e.layerX, e.layerY, t[4] + t[0], t[5] + t[2]);
      if (d < minDist) {
        d = minDist;
        this.selection.index = i;
        this.selection.corner = 1;
      }
      
      // Bottom-right
      d = distanceSquared(e.layerX, e.layerY, t[4] + t[0] + t[1], t[5] + t[2] + t[3]);
      if (d < minDist) {
        d = minDist;
        this.selection.index = i;
        this.selection.corner = 2;
      }
      
      // Bottom-left
      d = distanceSquared(e.layerX, e.layerY, t[4] + t[1], t[5] + t[3]);
      if (d < minDist) {
        d = minDist;
        this.selection.index = i;
        this.selection.corner = 3;
      }
    }
    
    if (this.selection.index == -1) {
      // No corner selected - then check if a frame is selected
      for (var i = this.transforms.length - 1; i >= 0; i--) {
        t = this.transforms[i];
        if (this.pointInTransform(e.layerX, e.layerY, t)) {
            this.selection.index = i;
            break;
        }
      }
    }
    
    this.dragging = true;
  },
  
  // Returns whether a point is inside a transformation frame.
  pointInTransform: function(x, y, t) {
    return pointInTriangle(x, y, 
                           t[4], t[5], 
                           t[4] + t[0], t[5] + t[2], 
                           t[4] + t[1], t[5] + t[3]) ||
           pointInTriangle(x, y,
                           t[4] + t[0] + t[1], t[5] + t[2] + t[3], 
                           t[4] + t[0], t[5] + t[2], 
                           t[4] + t[1], t[5] + t[3]);
  },
  
  mousedown: function(e) {
    if (!e.shiftKey) {
      this.painter.mousedown(e);
      return;
    }
    
    this.select(e);
    this.prevX = e.layerX;
    this.prevY = e.layerY;
  },
  
  mouseup: function(e) {
    this.painter.mouseup(e);
    this.selection.index = -1;
    this.dragging = false;
  },
  
  mousemove: function(e) {
    // Only transform frames and the canvas when shift is pressed.
    if (!e.shiftKey) {
      this.painter.mousemove(e);
    }
    else if (this.selection.index == -1) {
      // Pan everything
      if (this.dragging) {
        this.transformEverything(1, 0, 0, 1, e.layerX - this.prevX, e.layerY - this.prevY);
      }
    }
    else {
      // Modify a selected frame
      var t = this.transforms[this.selection.index], x1, y1, x2, y2, x3, y3, x4, y4;
      
      switch (this.selection.corner) {
        case -1: 
          // No corner selected - just translate it
          t[4] += e.layerX - this.prevX;
          t[5] += e.layerY - this.prevY;
          break;
        case 0:
          // Prepare variables for dragging the top-left corner
          x1 = e.layerX;
          y1 = e.layerY;
          x3 = t[4] + t[0] + t[1];
          y3 = t[5] + t[2] + t[3];
          x2 = (x1 + x3 + y3 - y1) / 2;
          y2 = (y1 + y3 + x1 - x3) / 2;
          break;
        case 1:
          // Prepare variables for dragging the top-right corner
          x2 = e.layerX;
          y2 = e.layerY;
          x4 = t[4] + t[1];
          y4 = t[5] + t[3];
          x1 = (x2 + x4 - y4 + y2) / 2;
          y1 = (y2 + y4 - x2 + x4) / 2;
          x3 = (x2 + x4 + y4 - y2) / 2;
          y3 = (y2 + y4 + x2 - x4) / 2;
          break;
        case 2:
          // Prepare variables for dragging the bottom-right corner
          x3 = e.layerX;
          y3 = e.layerY;
          x1 = t[4];
          y1 = t[5];
          x2 = (x1 + x3 + y3 - y1) / 2;
          y2 = (y1 + y3 + x1 - x3) / 2;
          break;
        case 3:
          // Prepare variables for dragging the bottom-left corner
          x4 = e.layerX;
          y4 = e.layerY;
          x2 = t[4] + t[0];
          y2 = t[5] + t[2];
          x1 = (x2 + x4 - y4 + y2) / 2;
          y1 = (y2 + y4 - x2 + x4) / 2;
          x3 = (x2 + x4 + y4 - y2) / 2;
          y3 = (y2 + y4 + x2 - x4) / 2;
          break;
      }
      
      if (this.selection.corner != -1) {
        // Update the transformation frame accordingly.
        t[0] = x2 - x1;
        t[2] = y2 - y1;
        t[1] = x3 - x2;
        t[3] = y3 - y2;
        t[4] = x1;
        t[5] = y1;
      }
      
      this.fractal.reset();
    }
    
    this.prevX = e.layerX;
    this.prevY = e.layerY;
  },
  
  mouseover: function() {
    this.mouseOver = true;
  },
  
  mouseout: function() {
    this.mouseOver = false;
  },
  
  // Mouse wheel - zooming in and out
  wheel: function(e) {
    var delta = e.wheelDeltaY ? -e.wheelDeltaY / 40 : e.deltaY, // Chrome vs Firefox implementation
        scale = Math.pow(0.996, delta === undefined ? 0 : delta);
    this.transformEverything(scale, 0, 0, scale, (1 - scale) * this.prevX, (1 - scale) * this.prevY);
    e.preventDefault();
    return false;
  },
  
  // Double click - remove or add a transformation frame
  dblclick: function(e) {
    var transforms = this.transforms, t, s, theta, a, b;
    
    // Check if the mouse is over any transformation frame, and delete it
    for (var i = transforms.length - 1; i >= 1; i--) {
      t = transforms[i];
      if (this.pointInTransform(e.layerX, e.layerY, t)) {
          transforms.splice(i, 1);
          return;
      }
    }
    
    // Add a new random transformation frame
    var ref = transforms[0];
    s = (0.45 + Math.random() * 0.2) * Math.sqrt(ref[0] * ref[0] + ref[1] * ref[1]);
    theta = Math.random() * Math.PI;
    a = s * Math.cos(theta);
    b = s * Math.sin(theta);
    t = [
      a, b, -b, a, 
      e.layerX - (a+b)/2,
      e.layerY - (a-b)/2
    ];
    transforms.push(t);
  },
  
  // Draws the transformation frames.
  step: function() {
    var c = this.ctx, t, mx, my, dd;
    c.clearRect(0, 0, this.width, this.height);
    
    if (!this.mouseOver) return;
    
    for (var k = 0; k < 2; k++) {
      if (k == 0) {
        // Outline
        c.strokeStyle = 'black';
        c.lineWidth = 4;
      }
      else {
        // Inside - only first frame is yellow
        c.strokeStyle = 'yellow';
        c.lineWidth = 2;
      }

      for (var i = 0; i < this.transforms.length; i++) {
        if (k == 1 && i == 1) c.strokeStyle = 'white'; // other frames are white
        t = this.transforms[i];
        c.beginPath();
        c.moveTo(t[4], t[5]);
        c.lineTo(t[4] + t[0], t[5] + t[2]);
        c.lineTo(t[4] + t[0] + t[1], t[5] + t[2] + t[3]);
        c.lineTo(t[4] + t[1], t[5] + t[3]);
        c.closePath();
        c.stroke();
        
        // Draw the little arrows
        for (var j = 0; j < 2; j++) {
          mx = t[4] + t[0+j] / 2;
          my = t[5] + t[2+j] / 2;
          dd = Math.sqrt(t[0+j]*t[0+j] + t[2+j]*t[2+j]);
          if (dd > 10) dd = 5 / dd;
          else dd = 0.5;
          c.beginPath();
          c.moveTo(mx - (t[0+j] - t[2+j]) * dd, my - (t[2+j] + t[0+j]) * dd);
          c.lineTo(mx, my);
          c.lineTo(mx - (t[0+j] + t[2+j]) * dd, my - (t[2+j] - t[0+j]) * dd);
          c.stroke();
        }
      }
    }
  },
  
  resize: function(w, h) {
    var that = this;
    this.transforms.forEach(function(t) {
      t[4] += (w - that.width) / 2;
      t[5] += (h - that.height) / 2;
    });
    this.painter.resize(w, h);
    this.canvas.width = this.width = w;
    this.canvas.height = this.height = h;
  }
};

// Used by all classes using canvases
function resizeCanvas(canvas, newWidth, newHeight) {
  var width = canvas.width, 
      height = canvas.height, 
      ctx = canvas.getContext('2d'), 
      image, 
      cropRect = {
        x: 0,
        y: 0,
        w: width,
        h: height
      }, 
      xOff = 0, 
      yOff = 0;
  
  if (newWidth < width) {
    cropRect.x = (width - newWidth) / 2;
    cropRect.w = newWidth;
  }
  else xOff = (newWidth - width) / 2;
  
  if (newHeight < height) {
    cropRect.y = (height - newHeight) / 2;
    cropRect.h = newHeight;
  }
  else yOff = (newHeight - height) / 2;

  image = ctx.getImageData(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
  canvas.width = newWidth;
  canvas.height = newHeight;
  ctx.putImageData(image, xOff, yOff);
}

// Used by the Controls class:
function distanceSquared(x1,y1,x2,y2) {
  return (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1);
}

// Used by the Controls class:
function pointInTriangle(x, y, x1, y1, x2, y2, x3, y3) {
  var b1 = (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2) < 0,
      b2 = (x - x3) * (y2 - y3) - (x2 - x3) * (y - y3) < 0,
      b3 = (x - x1) * (y3 - y1) - (x3 - x1) * (y - y1) < 0;

  return ((b1 == b2) && (b2 == b3));
}

// Cross-browser compatibility checks
window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                               window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

function initTransforms(width, height, transforms) {
  var size = Math.min(width / 3, height / 3), angle, a, b, x, y;
  
  transforms.length = 0;
  
  transforms.push([
    size, 0, 0, size, (width - size) / 2, (height - size) / 2
  ]);
  
  // Make all frames quite a bit smaller to prevent exploding fractals right from the start.
  size *= 0.6;
  
  for (var i = 0; i < 3; i++) {
    angle = Math.random() * Math.PI * 2;
    a = size * Math.cos(angle);
    b = -size * Math.sin(angle);
    x = Math.random() > 0.5 ? width * (1 + Math.random()) / 5 : width * (4 - Math.random()) / 5;
    y = Math.random() > 0.5 ? height * (1 + Math.random()) / 5 : height * (4 - Math.random()) / 5;
    transforms.push([
      a,
      b,
      -b,
      a,
      x - a - b,
      y + b - a
    ]);
    
    size *= 0.8 - Math.random() * 0.1;
  }
}
                               
/**
 * Initialization code. Executed at the very start.
 */
(function() {
  var fractal = document.querySelector('#fractal'),
      controls = document.querySelector('#controls'),
      drawTarget = document.querySelector('#draw-target'),
      wrapper = document.querySelector('#wrapper'),
      bg = document.querySelector('#bg');
      
  // Resize the canvases according to the wrapper, which is most likely stretched to the viewport.
  fractal.width = controls.width = drawTarget.width = wrapper.offsetWidth;
  bg.style.width = wrapper.offsetWidth + "px";
  fractal.height = controls.height = drawTarget.height = wrapper.offsetHeight;
  bg.style.height = wrapper.offsetHeight + "px";
 
  controls.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });

  // Init the main components
  var transforms = [];
  initTransforms(drawTarget.width, drawTarget.height, transforms);

  var fractal = new Fractal(fractal, drawTarget, transforms), 
      painter = new Painter(drawTarget), 
      ui = new Controls(controls, transforms, fractal, painter);
      
  /*function onResize() {  
    fractal.resize(wrapper.offsetWidth, wrapper.offsetHeight);
    ui.resize(wrapper.offsetWidth, wrapper.offsetHeight);
  }
  
  onResize();
  window.onresize = onResize;*/

  fractal.reset();
  function step() {
    fractal.step();
    ui.step();
    requestAnimationFrame(step);
  }
  step();
  
  // Init some interaction with the document  
  document.querySelector('#info a').onclick = function() {
    this.parentNode.style.display = 'none'
  }
  
  document.onclick = function() {
    document.body.className = '';
  }
  
  document.ondragover = function() {
    document.className = 'hover';
    return false;
  };
  
  document.ondragend = function() {
    document.className = '';
    return false;
  };
  
  document.ondrop = function(e) {
    document.className = '';
    e.preventDefault();

    var file = e.dataTransfer.files[0],
        reader = new FileReader;
    reader.onload = function (event) {

      if (event.target.result.substr(0, 11) != "data:image/") return;
        
      var img = new Image;
      img.onload = function() {
        painter.loadImage(img);
      };
      img.src = event.target.result;
    };

    reader.readAsDataURL(file);

    return false;
  }
