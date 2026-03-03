const { Client } = require('pg');
require('dotenv').config({ path: './.env.local' });

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || 'postgresql://postgres:Gafe362215.@db.reqhddvgquiomxvqvcdn.supabase.co:5432/postgres',
});

async function main() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'trilhas_videos';
        `);
        console.log('Columns in trilhas_videos:');
        console.table(res.rows);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

main();
