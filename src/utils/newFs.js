import { createReadStream } from 'node:fs';
import { imagesFolder } from '../config/index.js';
import path from 'node:path';


export const getImage = (req, res) => {
    console.log(req.body);
    if(!req.body.filename){
        res.status(404).send("No such file");
        return;
    }
    const filePath = path.join(imagesFolder, req.body.filename); // Замените 'yourfile.txt' на имя вашего файла
    const stream = createReadStream(filePath);

    stream.on('error', (err) => {
        res.status(404).send('Файл не найден');
    });

    // Установка заголовка для передачи файла
    res.setHeader('Content-Type', 'image/png'); // Замените на нужный вам тип
    stream.pipe(res);
}