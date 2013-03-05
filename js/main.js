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
  var fractalCanvas = document.querySelector('#fractal'),
      controlsCanvas = document.querySelector('#controls'),
      drawCanvas = document.querySelector('#draw-target'),
      wrapper = document.querySelector('#wrapper'),
      bgDiv = document.querySelector('#bg');
      
  // Resize the canvases according to the wrapper, which is most likely stretched to the viewport.
  fractalCanvas.width = controlsCanvas.width = drawCanvas.width = wrapper.offsetWidth;
  bgDiv.style.width = wrapper.offsetWidth + "px";
  fractalCanvas.height = controlsCanvas.height = drawCanvas.height = wrapper.offsetHeight;
  bgDiv.style.height = wrapper.offsetHeight + "px";
 
  controlsCanvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  }, false);

  // Init the main components
  var transforms = [];
  initTransforms(drawCanvas.width, drawCanvas.height, transforms);

  var fractal = new Fractal(fractalCanvas, drawCanvas, transforms), 
      painter = new Painter(drawCanvas), 
      ui = new Controls(controlsCanvas, transforms, fractal, painter);
      
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
  };
})();