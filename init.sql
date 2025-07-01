-- Garante que o script pare se algum comando falhar
\set ON_ERROR_STOP on

-- Cria a tabela 'lines' se ela ainda não existir
CREATE TABLE IF NOT EXISTS lines (
    id SERIAL PRIMARY KEY,
    line TEXT NOT NULL,
    hash VARCHAR(32) NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cria o índice UNIQUE no hash.
-- A cláusula IF NOT EXISTS garante que não haverá erro se o índice já existir.
-- Usar CONCURRENTLY não é suportado em blocos de transação como o initdb,
-- mas o 'IF NOT EXISTS' cumpre o papel de evitar falhas em reinicializações.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lines_hash ON lines(hash);

-- Opcional: Informa que o script foi executado
\echo 'Database initialization script executed successfully.' 