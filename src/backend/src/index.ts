import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { router as apiRouter } from './routes';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`);
});
