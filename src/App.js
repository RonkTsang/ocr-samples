import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import Tesseract from "tesseract.js";
import * as PaddlejsOcr from '@paddlejs-models/ocr';

class TesseractOCR {
  /**
   * @type {Tesseract.Worker}
   */
  worker = null;
  opts = {};

  constructor(opts) {
    this.opts = opts;
  }

  async init() {
    if (this.worker || this.pending) {
      return;
    }
    this.pending = true;
    const s = Date.now();
    const worker = await Tesseract.createWorker();
    await worker.loadLanguage('chi_sim');
    await worker.initialize('chi_sim');
    await worker.setParameters({

    })
    const cost = Date.now() - s;
    console.info('init finish')
    this.worker = worker;
    this.pending = false;
    return cost;
  }

  destroy() {
    this.worker?.terminate();
  }

  async startOCR(file) {

    const s = Date.now();
    const res = await this.worker.recognize(file);
    const cost = Date.now() - s;
    console.log(res);
    return [res, cost];
  }
}

class PaddleOCR {
  constructor(opts) {
    this.opts = opts;
  }

  async init() {
    if (this.pending) {
      return;
    }

    console.debug('==> init PaddleOCR')

    this.pending = true;
    const s = Date.now();
    await PaddlejsOcr.init();
    const cost = Date.now() - s;
    console.info('init finish')
    return cost;
  }

  destroy() {
    // PaddlejsOcr
  }

  async startOCR(file) {
    return new Promise((resolve) => {
      const s = Date.now();
      const src = URL.createObjectURL(file)
      const img = document.createElement('img')
      img.onload = async () => {
          const res = await PaddlejsOcr.recognize(img, {
            canvas: document.getElementById('paddle')
          });

          resolve([res, Date.now() - s]);
      };
      img.src = src
    })
  }
}
const tesseractOCR = new TesseractOCR();


const paddleOCR = new PaddleOCR();

function App() {

  const currentFile = useRef();

  const [cost1, setCost1] = useState({
    init: undefined,
    recognize: undefined,
  });

  const [cost2, setCost2] = useState({
    init: undefined,
    recognize: undefined,
  });

  useEffect(() => {
    tesseractOCR.init().then((cost) => {
      if (cost) {
        setCost1({
          init: cost
        })
      }
    });
    
    paddleOCR.init().then((cost) => {
      if (cost) {
        setCost2({
          init: cost
        })
      }
    });
  }, [setCost1, setCost2])

  const handleFileInput = useCallback((e) => {
    if (e.target.files.length) {
      currentFile.current = e.target.files[0];
    }
  }, [])

  const startOCR = () => {
    if (currentFile.current) {
      tesseractOCR.startOCR(currentFile.current).then(([res, cost]) => {
        setCost1({
          ...cost1,
          recognize: cost,
        })
      });
    }
  }

  const startPaddleOCR = () => {
    if (currentFile.current) {
      paddleOCR.startOCR(currentFile.current).then(([res, cost]) => {
        setCost2({
          ...cost2,
          recognize: cost,
        })
      });
    }
  }

  return (
    <div className="App">
      <h1 className="text-3xl font-bold underline">
        OCR Samples
      </h1>
      <div>
        <input type="file" onChange={handleFileInput} className="file-input file-input-bordered w-full max-w-xs" />
      </div>

      <div>
        <p>
          [Tesseract cost] init: {cost1.init ?? '-'}ms / recognize: {cost1.recognize ?? '-'}ms
        </p>
        <p>
          [Paddle cost] init: {cost2.init ?? '-'}ms / recognize: {cost2.recognize ?? '-'}ms
        </p>
      </div>

      <div className="flex w-full">
        <button className="btn btn-primary" onClick={startOCR}>
          Tesseract OCR
        </button>

        <div className="divider divider-horizontal"></div>

        <canvas></canvas>
      </div>

      <div className="flex w-full">
        <button className="btn btn-accent" onClick={startPaddleOCR}>
          Paddle OCR
        </button>
        <div className="divider divider-horizontal"></div>
        <canvas id="paddle"></canvas>
      </div>
    </div>
  );
}

export default App;
