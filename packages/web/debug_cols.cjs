const { Client } = require('pg');
require('dotenv').config({ path: './.env.local' });

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
});

async function main() {
    await client.connect();
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'trilhas_videos'");
    console.log(res.rows.map(r => r.column_name));
    await client.end();
}
main();
