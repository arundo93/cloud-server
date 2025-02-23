import path, { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const dbFolder = resolve(__dirname, '../../db/');
export const dbDumpFile = resolve(dbFolder, 'dump.json');
export const imagesFolder = resolve(dbFolder, 'images');
export const datasetsFolder = resolve(dbFolder, 'datasets');
