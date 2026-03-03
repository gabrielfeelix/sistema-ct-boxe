const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Gafe362215.@db.reqhddvgquiomxvqvcdn.supabase.co:5432/postgres' });

const sql = `
-- Indíces para Alunos
CREATE INDEX IF NOT EXISTS idx_alunos_status ON alunos(status);
CREATE INDEX IF NOT EXISTS idx_alunos_created_at ON alunos(created_at);
CREATE INDEX IF NOT EXISTS idx_alunos_ultimo_treino ON alunos(ultimo_treino);

-- Indíces para Pagamentos
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_vencimento ON pagamentos(data_vencimento);

-- Indíces para Presenças
CREATE INDEX IF NOT EXISTS idx_presencas_status ON presencas(status);
CREATE INDEX IF NOT EXISTS idx_presencas_created_at ON presencas(created_at);
CREATE INDEX IF NOT EXISTS idx_presencas_data_checkin ON presencas(data_checkin);

-- Indíces para Aulas
CREATE INDEX IF NOT EXISTS idx_aulas_data ON aulas(data);
CREATE INDEX IF NOT EXISTS idx_aulas_status ON aulas(status);
`;

async function main() {
    try {
        await client.connect();
        console.log('Applying performance indices...');
        await client.query(sql);
        console.log('Indices applied successfully.');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}
main();
