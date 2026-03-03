const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Gafe362215.@db.reqhddvgquiomxvqvcdn.supabase.co:5432/postgres',
});

async function main() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT
                t.relname AS table_name,
                i.relname AS index_name,
                a.attname AS column_name
            FROM
                pg_class t,
                pg_class i,
                pg_index ix,
                pg_attribute a
            WHERE
                t.oid = ix.indrelid
                AND i.oid = ix.indexrelid
                AND a.attrelid = t.oid
                AND a.attnum = ANY(ix.indkey)
                AND t.relkind = 'r'
                AND t.relname IN ('alunos', 'pagamentos', 'presencas', 'aulas', 'avaliacoes', 'notificacoes')
        `);
        console.log('INDICES:', JSON.stringify(res.rows, null, 2));

        const sizeRes = await client.query(`
            SELECT relname AS table_name, n_live_tup AS row_count
            FROM pg_stat_user_tables
            WHERE relname IN ('alunos', 'pagamentos', 'presencas', 'aulas', 'avaliacoes', 'notificacoes')
        `);
        console.log('SIZES:', JSON.stringify(sizeRes.rows, null, 2));

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}
main();
