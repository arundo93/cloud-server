import { writeFile as _writeFile, unlink, exists as _exists, readFile as _readFile} from 'node:fs';
import { promisify } from 'node:util';


const writeFileAsync = promisify(_writeFile);
const unlinkFileAsync = promisify(unlink);
const existsFileAsync = promisify(_exists);
const readFileAsync = promisify(_readFile);

export async function writeFile(path, content) {
  await writeFileAsync(path, content, { encoding: 'utf-8' });
}
export async function removeFile(path) {
  try {
    await unlinkFileAsync(path);
  } catch (err) {
    console.log(`removeFile error: file ${path} doesn't exist...`);
  }
}
export async function exists(path) {
  return await existsFileAsync(path);
}

export async function readFile(path) {
  return await readFileAsync(path);
}