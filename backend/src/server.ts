import app from './app';
import { logger } from './utils/logger';
import * as dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 5000;

import listEndpoints from 'express-list-endpoints';

// Function to log routes for debugging
const debugRouteMap = () => {
    console.log('--- EXPLICIT ROUTE MAP START ---');
    try {
        const endpoints = listEndpoints(app);
        endpoints.forEach((ep) => {
            ep.methods.forEach(method => {
                console.log(`[API_MAP] ${method.toUpperCase().padEnd(7)} http://localhost:5000${ep.path}`);
            });
        });
    } catch (e) {
        console.warn('[SYS] Failed to print route map:', e);
    }
    console.log('--- EXPLICIT ROUTE MAP END ---');
};

app.listen(PORT, () => {
    logger.info(`Backend Server started on port ${PORT}`);

    // Explicit Route Logging (Fix 404 Troubleshooting)
    debugRouteMap();
});
