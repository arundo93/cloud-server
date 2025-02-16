import express from 'express';
import multer from 'multer';
import path from 'path'
import fs from 'node:fs';
import { imagesFolder } from '../config/index.js';

// Настройка multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imagesFolder); // Куда сохранять файлы
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    dest: path.join(imagesFolder, "temp/"),
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/tiff']; // Разрешенные типы файлов
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true); // Разрешаем загрузку
        } else {
            cb(new Error('Недопустимый тип файла'), false); // Отклоняем загрузку
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024
    }
});

export const apiRouter = new express.Router();

apiRouter.use(express.json());

// Обработка ошибок multer
apiRouter.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: 'Ошибка при загрузке файла: ' + err.message});
    }
    next(err);
});

apiRouter.post('/images', (req, res) => {
    fs.readdir(imagesFolder, (err, files) => {
        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|svg)$/i.test(file));
        res.send(imageFiles);
    })
});

// Маршрут для загрузки файла методом PUT
apiRouter.put('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "Файл не выбран."});
    }

    const { originalname, filename } = req.file;
    res.json({ success: true, message: `Файл "${originalname}" успешно загружен как "${filename}".`});
});

apiRouter.delete("/remove", (req, res) => {
    const {filename} = req.body;
    if(!filename){
        return res.status(500).json({ success: false, message: "Пустой запрос"});
    }
    const filePath = path.join(imagesFolder, filename.split("/").at(-1));
    // Проверяем, существует ли файл
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ success: false, message: `Файл "${filename}" не найден.` });
        }
        // Удаляем файл
        fs.unlink(filePath, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: `Ошибка при удалении файла: ${err.message}` });
            }
            res.json({ success: true, message: `Файл "${filename}" успешно удален.` });
        });
    });
});

apiRouter.post("/rename", (req, res) => {
    const {filename, newName} = req.body;
    if(!filename || !newName){
        return res.status(500).json({ success: false, message: "Пустой запрос"});
    }
    const filePath = path.join(imagesFolder, filename.split("/").at(-1));
    const newFilePath = path.join(imagesFolder, newName.split("/").at(-1));
    // Проверяем, существует ли файл
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ success: false, message: `Файл "${filename}" не найден.` });
        }
        // Удаляем файл
        fs.rename(filePath, newFilePath, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: `Ошибка при удалении файла: ${err.message}` });
            }
            res.json({ success: true, message: `Файл "${filename}" успешно переименован в ${newName}.` });
        });
    });
});

// apiRouter.put("/upload/:filename", (req, res) => {
//     const filename = req.params.filename;
//     const filePath = path.join(imagesFolder, filename);
//     const writeStream = fs.createWriteStream(filePath);
//     writeStream.on("open", (stream) => {
//         //console.log(stream);
//     }).on("pipe", (stream) => {
//         // console.log(stream);
//     });
//     req.pipe(writeStream).on("open", (stream) => {
//         console.log(stream);
//     }).on('finish', () => {
//         res.send(`Файл "${filename}" успешно загружен.`);
//     }).on('error', (err) => {
//         fs.unlink(filePath, () => {}); // Удаляем файл в случае ошибки
//         res.status(500).send('Ошибка при загрузке файла.');
//     });
// });