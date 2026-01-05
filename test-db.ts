import 'dotenv/config';
import { pool } from './server/db';

async function testDB() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Database connected successfully:', result.rows[0]);
    
    // Test a query that might fail
    const accounts = await pool.query('SELECT * FROM accounts LIMIT 1');
    console.log('✓ Accounts table accessible:', accounts.rows.length > 0 ? 'has data' : 'empty');
    
  } catch (error: any) {
    console.error('✗ Database error:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await pool.end();
  }
}

testDB();
