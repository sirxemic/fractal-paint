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
 /* for (var method in {'mousedown': 1, 'mouseup': 1, 'mousemove': 1, 'mouseover': 1, 'mouseout': 1, 'dblclick': 1}) {
    (function(m) {
      that.canvas['on' + m] = function() { that[m].apply(that, arguments); }
    })(method);
  }*/
  // Temporary fix for google closure compiler:
  that.canvas.onmousedown = function() { that.mousedown.apply(that, arguments); }
  that.canvas.onmouseup = function() { that.mouseup.apply(that, arguments); }
  that.canvas.onmousemove = function() { that.mousemove.apply(that, arguments); }
  that.canvas.onmouseover = function() { that.mouseover.apply(that, arguments); }
  that.canvas.onmouseout = function() { that.mouseout.apply(that, arguments); }
  that.canvas.ondblclick = function() { that.dblclick.apply(that, arguments); }
  
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
    var t, minDist = 64, d;
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