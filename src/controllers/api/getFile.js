import { imagesFolder } from '../config';

export default async (req, res) => {
  const { filename } = req.params;
  const pathToFile = path.resolve(jsonFolder, filename);
  const isFileExists = await exists(pathToFile);

  return res.json(readFile(pathToFile));
};