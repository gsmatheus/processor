import fs from 'fs';
import readline from 'readline';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const QUEUE_NAME = 'line-processor';
const BATCH_SIZE = 10000; // Otimize este valor conforme a memória e o perfil de uso

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue(QUEUE_NAME, { connection });

async function processFile(filePath) {
  console.log(`Iniciando processamento do arquivo: ${filePath}`);
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let linesBatch = [];
  let linesCount = 0;
  let jobsCount = 0;

  for await (const line of rl) {
    if (line.trim().length > 0) {
      linesBatch.push(line);
    }
    
    if (linesBatch.length >= BATCH_SIZE) {
      await queue.add('process-batch', { lines: linesBatch });
      linesCount += linesBatch.length;
      jobsCount++;
      linesBatch = [];
      console.log(`Lote ${jobsCount} com ${BATCH_SIZE} linhas enviado para a fila. Total de linhas: ${linesCount}`);
    }
  }

  if (linesBatch.length > 0) {
    await queue.add('process-batch', { lines: linesBatch });
    linesCount += linesBatch.length;
    jobsCount++;
    console.log(`Lote final ${jobsCount} com ${linesBatch.length} linhas enviado para a fila.`);
  }

  console.log('Leitura do arquivo concluída.');
  console.log(`Total de ${linesCount} linhas enviadas em ${jobsCount} jobs.`);
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Erro: Forneça o caminho do arquivo .txt como argumento.');
    console.log('Uso: node producer.js /caminho/para/seu/arquivo.txt');
    process.exit(1);
  }

  try {
    await processFile(filePath);
    console.log('Todos os lotes foram adicionados à fila. Fechando em 5s...');
    // Dê um tempo para o script finalizar e fechar as conexões
    setTimeout(() => {
        connection.quit();
    }, 5000);
  } catch (error) {
    console.error('Ocorreu um erro no producer:', error);
    process.exit(1);
  }
}

main(); 