import { EventEmitter } from 'events';
import fs from 'node:fs';
import { dbDumpFile, dbFolder, datasetsFolder } from '../config/index.js';
import { prettifyJsonToString } from '../utils/prettifyJsonToString.js';
import path from 'node:path';
import { insertToArr } from '../utils/insertToArray.js';

class Database extends EventEmitter {
  constructor() {
    super();

    this.folders = [];
    this.files = {};
  }

  initFromDump() {
    if (fs.existsSync(dbDumpFile) === false) {
      return;
    }

    fs.readFile(dbDumpFile, {encoding: 'utf-8'}, (err, data) => {
      const dump = JSON.parse(data);
      if (typeof dump.folders === 'object') {
        this.folders = Array.from(dump.folders);
      }
    });
  }

  createFolder(foldername){
    return new Promise((res, rej) => {
      if(!foldername){
        res({ status: 400, message: `Пустое имя папки.` });
      }
      fs.mkdir(`${dbFolder}/datasets/${foldername}`, (err) => {
        if(err){
          console.log(err);
          return res({ status: 500, message: `Папка "${foldername}" не была создана.` });
        }
        this.folders = insertToArr(
          this.folders, 
          {
            foldername,
            dataType: "",
            files: [],
            predictions: {},
          },
          (a, b) => (a.foldername > b.foldername ? "more" : (a.foldername === b.foldername ? "equal" : "less")));
        this.emit('changed');
        res({ status: undefined, message: `Папка "${foldername}" успешно создана.` });
      });
    });
  }

  getFolders(){
    return this.folders.map((folder) => {
      const {foldername, dataType} = folder;
      return {
        foldername,
        dataType,
        filesCount: folder.files.length,
      }
    });
  }

  findFolder(foldername){
    return this.folders.filter((folder) => folder.foldername === foldername).length > 0;
  }

  findFileInFolder(foldername, filename){
    const [folder] = this.folders.filter((folder) => folder.foldername === foldername);
    if(!folder){
      return false;
    }
    return folder.files.includes(filename);
  }

  getFolderContent(foldername){
    const [folder] = this.folders.filter((folder) => folder.foldername === foldername);
    if(!folder){
      return [];
    }
    return folder.files;
  }

  addFileToFolder(foldername, filename){
    const [folder] = this.folders.filter((folder) => folder.foldername === foldername);
    if(!!folder){
      folder.files = insertToArr(folder.files, filename);
      this.emit('changed');
    }
  }

  removeFileFromFolder(foldername, filename){
    return new Promise((res, rej) => {
      const [folder] = this.folders.filter((folder) => folder.foldername === foldername);
      if(!!folder && folder.files.includes(filename)){
        const filePath = path.join(datasetsFolder, foldername, filename);
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                return res({ status: 400, message: `Файл "${filename}" не найден.` });
            }
            // Удаляем файл
            fs.unlink(filePath, (err) => {
                if (err) {
                    return res({ status: 500, message: `Ошибка при удалении файла: ${err.message}` });
                }
                folder.files = folder.files.filter((file) => file !== filename);
                folder.predictions[filename] = undefined;
                this.emit('changed');
                res({ status: undefined, message: `Файл "${filename}" успешно удален.` });
            });
        });
      }
      else{
        res({ status: 400, message: `Файл "${filename}" не найден.` });
      }
    });
  }

  renameFileInFolder(foldername, filename, newName){
    return new Promise((res, rej) => {
      const [folder] = this.folders.filter((folder) => folder.foldername === foldername);
      if(!!folder && folder.files.includes(filename)){
        const filePath = path.join(datasetsFolder, foldername, filename);
        const newFilePath = path.join(datasetsFolder, foldername, newName);
        // Проверяем, существует ли файл
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                return res({ status: 400, message: `Файл "${filename}" не найден.` });
            }
            fs.rename(filePath, newFilePath, (err) => {
                if (err) {
                    return res({ status: 500, message: `Ошибка при удалении файла: ${err.message}` });
                }
                folder.files = insertToArr(folder.files.filter((file) => file !== filename), newName);
                folder.predictions[newName] = folder.predictions[filename];
                folder.predictions[filename] = undefined;
                this.emit('changed');
                res({ status: undefined, message: `Файл "${filename}" успешно переименован в ${newName}.` });
            });
        });
      }
      else{
        res({ status: 400, message: `Файл "${filename}" не найден.` });
      }
    });
  }

  addFilePrediction(foldername, filename, prediction){
    const [folder] = this.folders.filter((folder) => folder.foldername === foldername);
    if(!!folder && folder.files.includes(filename)){
      folder.predictions[filename] = JSON.stringify(prediction);
      this.emit('changed');
    }
  }

  getPredictionToFile(foldername, filename){
    const [folder] = this.folders.filter((folder) => folder.foldername === foldername);
    return folder.predictions[filename];
  }

  toJSON() {
    return {
      folders: this.folders,
    };
  }
}

const db = new Database();

db.initFromDump();

db.on('changed', () => {
  fs.writeFile(dbDumpFile, prettifyJsonToString(db.toJSON()), (err) => {
    if(err){
      console.log(err);
    }
  });
});

export default db;
