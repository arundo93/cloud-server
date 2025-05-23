import tf from "@tensorflow/tfjs-node";
import "@tensorflow/tfjs-backend-webgl"; // set backend to webgl
import fs from "node:fs";
import { datasetsFolder, yolov8Folder } from "../config/index.js";
import path from "node:path";
import { labels } from "./labels.js";

class model {
    constructor(){
        this.model = {
            net: null,
            inputShape: [1, 0, 0, 3],
        }
        this.classesCount = labels.length;
        this.loaded = false;
        
        tf.ready().then(async () => {
            // await this.checkGPU();
            await tf.setBackend('tensorflow');
            console.log('Текущий backend:', tf.getBackend());
            const yolov8 = await tf.loadGraphModel(`file://${path.resolve(yolov8Folder, "model.json")}`);
            // const yolov8 = await tf.loadGraphModel(path.resolve(yolov8Folder, "model.json"), {
            //     fetchFunc: (input) => {
            //         return Promise.resolve({
            //             arrayBuffer: () => {
            //                 return fs.promises.readFile(input);
            //             },
            //             text: () => {
            //                 return fs.promises.readFile(input, {
            //                     encoding: "utf-8"
            //                 });
            //             },
            //             json: () => {
            //                 return fs.promises.readFile(input, {
            //                     encoding: "utf-8"
            //                 }).then((text) => {
            //                     return JSON.parse(text);
            //                 });
            //             },
            //             status: 200,
            //             ok: true
            //         });
            //     }
            // });
            const dummyInput = tf.ones(yolov8.inputs[0].shape);
            const warmupResults = yolov8.execute(dummyInput);
            this.model.net = yolov8;
            this.model.inputShape = yolov8.inputs[0].shape;
            this.loaded = true;
            tf.dispose([warmupResults, dummyInput]); // cleanup memory
        });
    }

    async checkGPU() {
        const numGPUs = tf.env().getNumber('WEBGL_NUM_DEVICES');
        console.log(`Количество доступных GPU: ${numGPUs}`);
        if (numGPUs > 0) {
            console.log('GPU доступен для использования!');
        } else {
            console.log('GPU не обнаружен или недоступен.');
        }
    }

    isLoaded(){
        return this.loaded;
    }

    async preprocessImage(imageBuffer) {
        const [modelWidth, modelHeight] = this.model.inputShape.slice(1, 3);
        // console.log(modelWidth, modelHeight);
        // Декодируем изображение из буфера
        const img = tf.node.decodeImage(imageBuffer, 3); // 3 — количество каналов (RGB)
    
        // padding image to square => [n, m] to [n, n], n > m
        const [h, w] = img.shape.slice(0, 2); // get source width and height
        const maxSize = Math.max(w, h); // get max size
    
        // const imgPadded = img.pad([
        //     [Math.floor((maxSize - h) / 2), Math.ceil((maxSize - h) / 2)], // padding y [top and bottom]
        //     [Math.floor((maxSize - w) / 2), Math.ceil((maxSize - w) / 2)], // padding x [left and right]
        //     [0, 0],
        // ]);
    
        const imgPadded = img.pad([
            [0, maxSize - h], // padding y [top and bottom]
            [0, maxSize - w], // padding x [left and right]
            [0, 0],
        ]);
    
        // const xRatio = maxSize / w; // update xRatio
        // const yRatio = maxSize / h; // update yRatio
    
        const xRatio = modelWidth / maxSize; // update xRatio
        const yRatio = modelHeight / maxSize; // update yRatio
    
        const input = tf.tidy(() => {
            return tf.image
                .resizeBilinear(imgPadded, [modelWidth, modelHeight]) // resize frame
                .div(255.0) // normalize
                .expandDims(0); // add batch
        });
    
        return { input, xRatio, yRatio, shape: {w, h}};
    }

    async detect(foldername, filename){
        if(!this.isLoaded()){
            return null;
        }
        tf.engine().startScope(); // start scoping tf engine

        const filePath = path.join(datasetsFolder, foldername, filename);
        const imageBuffer = await fs.promises.readFile(filePath)
        const { input, xRatio, yRatio, shape } = await this.preprocessImage(imageBuffer); // preprocess image
        // console.log(input);

        console.time("Inference time");
        const res = this.model.net.execute(input); // inference model
        console.timeEnd("Inference time");
        const transRes = res.transpose([0, 2, 1]); // transpose result [b, det, n] => [b, n, det]
        const boxes = tf.tidy(() => {
            const w = transRes.slice([0, 0, 2], [-1, -1, 1]); // get width
            const h = transRes.slice([0, 0, 3], [-1, -1, 1]); // get height
            const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2)); // x1
            const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2)); // y1
            return tf
                .concat(
                [
                    y1,
                    x1,
                    tf.add(y1, h), //y2
                    tf.add(x1, w), //x2
                ],
                2
                )
                .squeeze();
        }); // process boxes [y1, x1, y2, x2]
      
        const [scores, classes] = tf.tidy(() => {
          // class scores
          const rawScores = transRes.slice([0, 0, 4], [-1, -1, this.classesCount]).squeeze(0); // #6 only squeeze axis 0 to handle only 1 class models
          return [rawScores.max(1), rawScores.argMax(1)];
        }); // get max scores and classes index
      
        const nms = await tf.image.nonMaxSuppressionAsync(boxes, scores, 500, 0.45, 0.2); // NMS to filter boxes
      
        const boxes_data = boxes.gather(nms, 0).dataSync(); // indexing boxes by nms index
        const scores_data = scores.gather(nms, 0).dataSync(); // indexing scores by nms index
        const classes_data = classes.gather(nms, 0).dataSync(); // indexing classes by nms index
        
        tf.dispose([res, transRes, boxes, scores, classes, nms]); // clear memory
      
        tf.engine().endScope(); // end of scoping
        // console.log(classes_data);
        return {
            boxes_data: Array.from(boxes_data), 
            scores_data: Array.from(scores_data), 
            classes_data: Array.from(classes_data).map((cls) => ({class: labels[cls], idx: cls})), 
            ratios: {xRatio, yRatio}, 
            shape
        }
    };
}

export const YOLOv8lModel = new model();