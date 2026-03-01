import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const prisma = new PrismaClient();
const BATCH_SIZE = 500; // Optimal batch size for MongoDB insertion

async function main() {
    console.log('Starting DB Seeding Process...');

    const dataPath = path.resolve(__dirname, '../../Data/kaggle_data.csv'); // Example path
    if (!fs.existsSync(dataPath)) {
        console.warn(`Data file not found at ${dataPath}. Skipping seed.`);
        return;
    }

    const fileStream = fs.createReadStream(dataPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    let batch: any[] = [];
    let totalSeeded = 0;
    let isFirstLine = true;

    for await (const line of rl) {
        if (isFirstLine) {
            isFirstLine = false;
            continue; // Skip CSV header
        }

        // Example CSV Parsing logic (would be adapted to exact Kaggle schema)
        const [text, label] = line.split(',');

        if (text) {
            batch.push({
                rawText: text,
                source: 'Kaggle',
            });
        }

        if (batch.length >= BATCH_SIZE) {
            await insertBatch(batch);
            totalSeeded += batch.length;
            batch = [];
        }
    }

    // Insert remaining
    if (batch.length > 0) {
        await insertBatch(batch);
        totalSeeded += batch.length;
    }

    console.log(`Seeding complete. Inserted ${totalSeeded} records.`);
}

async function insertBatch(batch: any[]) {
    // In a real scenario, we'd create PatientContexts here first if required.
    // For this seed, we'll create a single bulk context.
    const context = await prisma.patientContext.create({ data: { ageRange: 'Unknown' } });

    const notesToInsert = batch.map(b => ({
        ...b,
        patientContextId: context.id
    }));

    await prisma.clinicalNote.createMany({
        data: notesToInsert
    });
    console.log(`Inserted batch of ${batch.length}`);
}

main()
    .catch((e) => {
        console.error('Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
