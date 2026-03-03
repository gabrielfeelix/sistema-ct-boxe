const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Gafe362215.@db.reqhddvgquiomxvqvcdn.supabase.co:5432/postgres',
});

async function main() {
    try {
        await client.connect();
        const res = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log('Tables:', res.rows.map(r => r.tablename).join(', '));

        const countRes = await client.query("SELECT COUNT(*) FROM notificacoes");
        console.log('Total notificações:', countRes.rows[0].count);

        const sampleRes = await client.query("SELECT id, titulo, tipo, aluno_id FROM notificacoes LIMIT 10");
        console.log('Amostra de dados:', JSON.stringify(sampleRes.rows, null, 2));

    } catch (e) {
        console.error('Erro:', e.message);
    } finally {
        await client.end();
    }
}
main();
