import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import Tesseract from "tesseract.js";
import * as PaddlejsOcr from '@paddlejs-models/ocr';

const fileToImgEl = (file) => new Promise((resolve) => {
  const src = URL.createObjectURL(file)
  const img = document.createElement('img')
  img.onload = async () => {
      resolve(img);
  };
  img.src = src
})

function drawBox(
  infos,
  image,
  canvas,
) {
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  infos && infos.forEach(info => {
      const { point, confidence, text } = info;
      // 开始一个新的绘制路径
      ctx.beginPath();
      // 设置绘制线条颜色，默认为黑色
      ctx.strokeStyle = 'red';
      // 设置线段宽度，默认为1
      ctx.lineWidth = 1;
      // 设置填充颜色，默认透明
      ctx.fillStyle = 'transparent';
      // 设置路径起点坐标
      ctx.moveTo(point[0][0], point[0][1]);
      ctx.lineTo(point[1][0], point[1][1]);
      ctx.lineTo(point[2][0], point[2][1]);
      ctx.lineTo(point[3][0], point[3][1]);
      // 进行内容填充
      ctx.fill();
      ctx.closePath();
      ctx.stroke();


      ctx.fillStyle = 'red';
      ctx.font = "16px serif";
      ctx.fillText(text, point[0][0], point[0][1] - 2);
      confidence && ctx.fillText(confidence.toFixed(2) + '%', point[1][0] - 48, point[1][1] - 2);

      ctx.restore();
  });
}

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
      tessedit_ocr_engine_mode: Tesseract.OEM.TESSERACT_ONLY,
      // tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
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

    const imgEl = await fileToImgEl(file);
    const s = Date.now();
    const res = await this.worker.recognize(imgEl);
    const cost = Date.now() - s;
    console.log(res);
    const canvas = document.getElementById('tesserect');
    const infos = res.data.lines.map(lineInfo => {
      const { bbox, confidence, text } = lineInfo;
      const point = [
        [bbox.x0, bbox.y0],
        [bbox.x1, bbox.y0],
        [bbox.x1, bbox.y1],
        [bbox.x0, bbox.y1],
      ]
      return {
        point,
        confidence,
        text: text.trim(),
      }
    })
    drawBox(infos, imgEl, canvas)

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
    this.pending = true;

    return new Promise((resolve) => {
      setTimeout(async () => {
        console.debug('==> init PaddleOCR')

        alert('注意: Paddlejs 初始化耗时可能需要比较久的时间');
    
        const s = Date.now();
        await PaddlejsOcr.init();
        const cost = Date.now() - s;
        console.info('init finish')
        resolve(cost)
      }, 2000);
    })
  }

  destroy() {
    // PaddlejsOcr
  }

  async startOCR(file) {
    const imgEl = await fileToImgEl(file);
    const s = Date.now();
    const res = await PaddlejsOcr.recognize(imgEl);
    const cost = Date.now() - s;
    console.log(res);
    const canvas = document.getElementById('paddle');
    const infos = res.text.map((text, idx) => {
      const point = res.points[idx]
      return {
        point,
        confidence: 0,
        text: text.trim(),
      }
    })
    drawBox(infos, imgEl, canvas)

    return [res, cost];
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

        <canvas id="tesserect"></canvas>
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
