const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Gafe362215.@db.reqhddvgquiomxvqvcdn.supabase.co:5432/postgres' });

async function main() {
    await client.connect();
    const tables = ['alunos', 'pagamentos', 'presencas', 'aulas', 'avaliacoes', 'notificacoes'];
    for (const table of tables) {
        const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`${table}: ${res.rows[0].count} rows`);
    }
    await client.end();
}
main();
