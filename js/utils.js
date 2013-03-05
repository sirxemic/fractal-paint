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