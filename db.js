import pg from 'pg';

// Adapte as configurações para o seu ambiente PostgreSQL.
const pool = new pg.Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'your_database',
  password: process.env.DB_PASSWORD || 'your_password',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  max: 20, // Número máximo de clientes no pool
  idleTimeoutMillis: 30000, // Tempo que um cliente pode ficar ocioso
  connectionTimeoutMillis: 2000, // Tempo para tentar conectar
});

pool.on('error', (err, client) => {
  console.error('Erro inesperado no cliente do pool', err);
  process.exit(-1);
});

export default {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
}; 