const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Gafe362215.@db.reqhddvgquiomxvqvcdn.supabase.co:5432/postgres' });

async function main() {
    await client.connect();
    const res = await client.query("SELECT definition FROM pg_views WHERE viewname = 'contratos_com_status'");
    console.log(res.rows[0]?.definition || 'NOT FOUND');
    await client.end();
}
main();
