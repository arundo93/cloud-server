import express from 'express';
import multer from 'multer';
import path from 'path'
import db from "../entities/Database.js"
import { datasetsFolder } from '../config/index.js';
import { checkFileName, checkFolderName } from '../utils/checkFilename.js';
import { YOLOv8lModel } from '../entities/YOLOModel.js';

// Настройка multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const foldername = checkFolderName(req.params.foldername);
        if(!foldername || !db.findFolder(foldername)){
            cb(new Error('Недопустимое значение директории'), "Error");
        }
        else{
            const pathToFolder = path.join(datasetsFolder, foldername);
            cb(null, pathToFolder); // Куда сохранять файлы
        }
    },
    filename: (req, file, cb) => {
        cb(null, checkFileName(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/tiff',
            'video/mpeg',
            'video/mp4',
            'video/webm',
        ]; // Разрешенные типы файлов
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

apiRouter.post('/folders', (req, res) => {
    res.json({
        folders: db.getFolders()
    });
});

apiRouter.post('/folders/new', (req, res) => {
    let {foldername} = req.body;
    foldername = checkFolderName(foldername);
    if(!!foldername && !db.findFolder(foldername)){
        db.createFolder(foldername).then((result) => {
            if(!!result.status){
                res.status(result.status).json({success: false, message: result.message});
            }
            else{
                res.json({success: true, message: result.message});
            }
        });
    }
    else{
        res.status(400).json({
            success: false,
            message: "Ошибка, неверное имя папки"
        });
    }
});

apiRouter.post('/:foldername/images', (req, res) => {
    const foldername = checkFolderName(req.params.foldername);
    if(db.findFolder(foldername)){
        res.json(db.getFolderContent(foldername).filter(file => /\.(jpg|jpeg|png|gif|svg)$/i.test(file)));
    }
    else{
        res.status(400).json({
            success: false,
            message: "Ошибка чтения директории с изображениями."
        });
    }
});

// Маршрут для загрузки файла методом PUT
apiRouter.put('/:foldername/upload', upload.single('file'), (req, res) => {
    const folderName = checkFolderName(req.params.foldername);
    if (!req.file) {
        return res.status(400).json({ success: false, message: "Файл не выбран."});
    }

    const { originalname, filename } = req.file;
    db.addFileToFolder(folderName, filename);
    res.json({ success: true, message: `Файл "${originalname}" успешно загружен как "${filename}" в ${req.params.foldername}.`});
});

apiRouter.delete("/:foldername/remove", (req, res) => {
    const filename = checkFileName(req.body.filename + "");
    const foldername = checkFolderName(req.params.foldername);
    if(!filename || !db.findFolder(foldername)){
        return res.status(400).json({ success: false, message: "Файл не найден"});
    }
    db.removeFileFromFolder(foldername, filename).then((result) => {
        if(!!result.status){
            res.status(result.status).json({success: false, message: result.message});
        }
        else{
            res.json({success: true, message: result.message});
        }
    });
});

apiRouter.post("/:foldername/rename", (req, res) => {
    const {filename, newName} = req.body;
    const foldername = checkFolderName(req.params.foldername);
    if(!filename || !newName){
        return res.status(400).json({ success: false, message: "Пустой запрос"});
    }

    db.renameFileInFolder(foldername, checkFileName(filename), checkFileName(newName)).then((result) => {
        if(!!result.status){
            res.status(result.status).json({success: false, message: result.message});
        }
        else{
            res.json({success: true, message: result.message});
        }
    });
});

apiRouter.post("/predict", (req, res) => {
    const foldername = checkFolderName(req.body.foldername);
    const filename = checkFileName(req.body.filename);
    if(!db.findFileInFolder(foldername, filename)){
        return res.status(400).json({ success: false, message: "Пустой запрос"});
    }
    YOLOv8lModel.detect(foldername, filename).then((result) => {
        if(!result){
            return res.status(500).json({ success: false, message: "Ошибка при распознавании объектов. Попробуйте снова"});
        }
        res.json(result);
    })
})