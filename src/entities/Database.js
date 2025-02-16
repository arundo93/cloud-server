import { EventEmitter } from 'events';
import { existsSync } from 'fs';
import { dbDumpFile } from '../config';
import { writeFile } from '../utils/fs';
import { prettifyJsonToString } from '../utils/prettifyJsonToString';
import Svg from './Svg';
import Json from './Json';

class Database extends EventEmitter {
  constructor() {
    super();

    this.likedIds = {};
    this.idToSvg = {};
    this.jsonFiles = {};
  }

  async initFromDump() {
    if (existsSync(dbDumpFile) === false) {
      return;
    }

    const dump = require(dbDumpFile);

    if (typeof dump.idToSvg === 'object') {
      this.idToSvg = {};

      for (let id in dump.idToSvg) {
        const svg = dump.idToSvg[id];

        this.idToSvg[id] = new Svg(svg.id, svg.createdAt);
      }
    }

    if (typeof dump.likedIds === 'object') {
      this.likedIds = { ...dump.likedIds };
    }
  }

  async addFile(json, content){
    await json.saveFile(content);
    this.jsonFiles[json.id] = json;
    this.emit('changed');
  }

  async insert(svg, originalContent) {
    await svg.saveOriginal(originalContent);

    this.idToSvg[svg.id] = svg;

    this.emit('changed');
  }

  setLiked(svgId, value) {
    if (value === false) {
      delete this.likedIds[svgId];
    } else {
      this.likedIds[svgId] = true;
    }

    this.emit('changed');
  }

  async remove(svgId) {
    const svgRaw = this.idToSvg[svgId];

    const svg = new Svg(svgRaw.id, svgRaw.createdAt);

    await svg.removeOriginal();

    delete this.idToSvg[svgId];
    delete this.likedIds[svgId];

    this.emit('changed');

    return svgId;
  }

  findFile(fileId){
    const jsonFile = this.jsonFiles[fileId];
    if(!jsonFile){
      return null;
    }
    const file = new Json(jsonFile.id, jsonFile.createdAt);
    return file;
  }

  findOne(svgId) {
    const svgRaw = this.idToSvg[svgId];

    if (!svgRaw) {
      return null;
    }

    const svg = new Svg(svgRaw.id, svgRaw.createdAt);

    return svg;
  }

  find(isLiked = false) {
    let allSvgs = Object.values(this.idToSvg);

    if (isLiked === true) {
      allSvgs = allSvgs.filter((svg) => this.likedIds[svg.id]);
    }

    allSvgs.sort((svgA, svgB) => svgB.createdAt - svgA.createdAt);

    return allSvgs;
  }

  toJSON() {
    return {
      idToSvg: this.idToSvg,
      likedIds: this.likedIds,
    };
  }
}

const db = new Database();

db.initFromDump();

db.on('changed', () => {
  writeFile(dbDumpFile, prettifyJsonToString(db.toJSON()));
});

export default db;
