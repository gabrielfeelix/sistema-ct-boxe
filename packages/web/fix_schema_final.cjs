const { Client } = require('pg');
require('dotenv').config({ path: './.env.local' });

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || 'postgresql://postgres:Gafe362215.@db.reqhddvgquiomxvqvcdn.supabase.co:5432/postgres',
});

async function main() {
    try {
        await client.connect();

        console.log('--- Corrigindo Tabela trilhas_videos ---');

        // Verifica se a coluna 'categoria' existe e a remove (pois o correto é categoria_id)
        const checkCol = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'trilhas_videos' AND column_name = 'categoria';
        `);

        if (checkCol.rows.length > 0) {
            console.log('Removendo coluna errada "categoria"...');
            await client.query('ALTER TABLE trilhas_videos DROP COLUMN categoria CASCADE;');
        }

        // Garante que categoria_id existe e é UUID
        const checkId = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'trilhas_videos' AND column_name = 'categoria_id';
        `);

        if (checkId.rows.length === 0) {
            console.log('Adicionando coluna correta "categoria_id"...');
            await client.query('ALTER TABLE trilhas_videos ADD COLUMN categoria_id UUID REFERENCES trilhas_categorias(id) ON DELETE CASCADE;');
        }

        console.log('Sincronização concluída.');

        const finalCols = await client.query(`
            SELECT column_name, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'trilhas_videos';
        `);
        console.table(finalCols.rows);

    } catch (e) {
        console.error('Erro:', e.message);
    } finally {
        await client.end();
    }
}
main();
