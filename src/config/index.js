import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const yolov8Folder = path.resolve(__dirname, "../../db/yolov8l_web_model")
export const dbFolder = path.resolve(__dirname, '../../db/');
export const dbDumpFile = path.resolve(dbFolder, 'dump.json');
export const imagesFolder = path.resolve(dbFolder, 'images');
export const datasetsFolder = path.resolve(dbFolder, 'datasets');
