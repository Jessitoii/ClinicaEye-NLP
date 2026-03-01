import { PrismaClient } from '@prisma/client';

export const prismaTest = new PrismaClient();

// In a real environment, we'd setup Testcontainers for testing MongoDB.
// For MVP, we'll assume the local instance is cleanable.
afterAll(async () => {
    // Teardown operations
});
