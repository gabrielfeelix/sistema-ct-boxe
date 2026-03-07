const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Gafe362215.@db.reqhddvgquiomxvqvcdn.supabase.co:5432/postgres',
});

const sql = `
ALTER TABLE IF EXISTS trilhas_categorias
ADD COLUMN IF NOT EXISTS capa_url TEXT;
`;

async function main() {
    try {
        await client.connect();
        console.log('Aplicando coluna capa_url em trilhas_categorias...');
        await client.query(sql);
        console.log('OK.');
    } catch (error) {
        console.error('Erro ao aplicar ajuste de trilhas:', error);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

main();
