import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { apiRouter } from './routers/apiRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const port = 3000;

app.use(express.json());
app.use("/", express.static("public"));

app.use("/api", apiRouter);

app.use("/img", express.static(path.join(__dirname, "../db/images")));

app.listen(port, () => {
    console.log(`Server started on port ${port}!`);
});