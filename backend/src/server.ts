import app from './app';
import { logger } from './utils/logger';
import * as dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 5000;

import listEndpoints from 'express-list-endpoints';

app.listen(PORT, () => {
    logger.info(`Backend Server started on port ${PORT}`);
});
