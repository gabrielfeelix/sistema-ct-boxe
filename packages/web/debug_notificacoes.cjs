const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Gafe362215.@db.reqhddvgquiomxvqvcdn.supabase.co:5432/postgres',
});

async function main() {
    try {
        await client.connect();
        const res = await client.query("SELECT id, titulo, tipo, aluno_id, created_at FROM notificacoes WHERE tipo = 'ct' OR aluno_id IS NULL ORDER BY created_at DESC LIMIT 10");
        console.log('--- Notificações do Admin Encontradas ---');
        res.rows.forEach(r => {
            console.log(`[${r.created_at.toISOString()}] ${r.titulo} (Tipo: ${r.tipo}, AlunoID: ${r.aluno_id || 'Global'})`);
        });
        if (res.rows.length === 0) console.log('Nenhuma notificação encontrada com esses critérios.');
    } catch (e) {
        console.error('Erro na consulta:', e.message);
    } finally {
        await client.end();
    }
}
main();
