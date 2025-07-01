import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import crypto from 'crypto';
import db from './db.js';
import format from 'pg-format';

const QUEUE_NAME = 'line-processor';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { lines } = job.data;
    if (!lines || lines.length === 0) {
      console.log(`Job ${job.id} recebido sem linhas. Ignorando.`);
      return;
    }

    try {
      const start = process.hrtime.bigint();
      
      const values = lines.map(line => {
        const hash = crypto.createHash('md5').update(line).digest('hex');
        return [line, hash];
      });

      const query = format(
        'INSERT INTO lines (line, hash) VALUES %L ON CONFLICT (hash) DO NOTHING',
        values
      );

      const client = await db.getClient();
      try {
        await client.query(query);
      } finally {
        client.release();
      }

      const end = process.hrtime.bigint();
      const duration = (end - start) / 1000000n;
      console.log(`Job ${job.id}: Processou e inseriu ${lines.length} linhas em ${duration}ms.`);

    } catch (error) {
      console.error(`Erro ao processar o job ${job.id}:`, error);
      // Lança o erro novamente para que o BullMQ possa tentar reprocessar o job se configurado para isso
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Ajuste a concorrência baseando-se nos cores da sua CPU e capacidade do DB
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  }
);

console.log('Worker iniciado. Aguardando por jobs...');

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} falhou com o erro: ${err.message}`);
});

process.on('SIGINT', () => {
    worker.close();
    connection.quit();
    console.log("Worker finalizado.");
}); 