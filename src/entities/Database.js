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
      if(typeof dump.files === 'object'){
        this.files = {...dump.files};
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
            filesCount: 0
          },
          (a, b) => (a.foldername > b.foldername ? "more" : (a.foldername === b.foldername ? "equal" : "less")));
        this.folders.push({
          foldername,
          dataType: "",
          filesCount: 0
        });
        this.emit('changed');
        res({ status: undefined, message: `Папка "${foldername}" успешно создана.` });
      });
    });
  }

  getFolders(){
    return this.folders;
  }

  findFolder(foldername){
    return this.folders.filter((folder) => folder.foldername === foldername).length > 0;
  }

  getFolderContent(foldername){
    return this.files[foldername];
  }

  addFileToFolder(foldername, filename){
    if(!!this.files[foldername]){
      this.files[foldername] = insertToArr(this.files[foldername], filename);
      this.emit('changed');
    }
  }

  removeFileFromFolder(foldername, filename){
    return new Promise((res, rej) => {
      if(!!this.files[foldername].includes(filename)){
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
                this.files[foldername] = this.files[foldername].filter((file) => file !== filename);
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
      if(!!this.files[foldername].includes(filename)){
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
                this.files[foldername] = insertToArr(this.files[foldername].filter((file) => file !== filename), newName);
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

  toJSON() {
    return {
      folders: this.folders,
      files: this.files,
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
