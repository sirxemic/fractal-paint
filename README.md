Fractal Paint
=============

Simple tool to turn drawings or images into fractals. Works with mouse, touch and pen.

## Demo

Click [here](http://sirxemic.github.io/fractal-paint) for a demo.

## Controls

Whatever is inside the yellow (reference) frame gets copied into every white frame, over and over.

#### Touch
- Draw or erase with one finger; pick the tool in the toolbar.
- Pinch with two fingers to zoom and pan.
- In **Frames** mode, drag frames to move them and drag their corners to rotate and resize them. Double-tap to add or remove a frame, or use the toolbar buttons.

#### Mouse
- Draw with the left mouse button, erase with the right mouse button.
- Hold shift (or use **Frames** mode) to modify the frames (also try dragging the corners) and to pan the scene. Use the scroll wheel to zoom.
- Double click to add/remove frames.
- Keyboard shortcuts: <kbd>D</kbd> draw, <kbd>E</kbd> erase, <kbd>F</kbd> frames, <kbd>Del</kbd> delete the selected frame.

Use the **Image** button, or drag and drop or paste an image onto the page to use that.

## Development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev        # start a dev server
npm test           # run unit tests
npm run build      # type-check and build into dist/
```

Built with [Vue](https://vuejs.org), TypeScript and [Vite](https://vite.dev). The rendering engine in
`src/engine` is framework independent; the Vue components only provide the toolbar and panels.

Pushes to `master` are built and deployed to GitHub Pages by `.github/workflows/ci.yml`
(this requires *Settings → Pages → Source* to be set to *GitHub Actions*).
