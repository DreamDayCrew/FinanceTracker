import 'dotenv/config';
import { pool } from './server/db';

async function migrateSavingsGoals() {
  try {
    console.log('🔄 Migrating savings goals to add required dates...');
    
    // First, check how many records need updating
    const checkResult = await pool.query(
      'SELECT COUNT(*) as count FROM savings_goals WHERE target_date IS NULL OR start_date IS NULL'
    );
    console.log(`📊 Found ${checkResult.rows[0].count} savings goals needing date updates`);
    
    if (parseInt(checkResult.rows[0].count) === 0) {
      console.log('✓ No updates needed!');
      return;
    }
    
    // Add start_date column if it doesn't exist (with temporary nullable)
    try {
      await pool.query(`
        ALTER TABLE savings_goals 
        ADD COLUMN IF NOT EXISTS start_date TIMESTAMP
      `);
      console.log('✓ Added start_date column (nullable)');
    } catch (err: any) {
      if (err.code !== '42701') { // Ignore "column already exists" error
        throw err;
      }
    }
    
    // Update existing records:
    // - Set start_date to created_at (or current date if created_at is null)
    // - Set target_date to 1 year from start_date if null
    const updateResult = await pool.query(`
      UPDATE savings_goals
      SET 
        start_date = COALESCE(created_at, NOW()),
        target_date = COALESCE(
          target_date, 
          COALESCE(created_at, NOW()) + INTERVAL '1 year'
        )
      WHERE start_date IS NULL OR target_date IS NULL
    `);
    
    console.log(`✓ Updated ${updateResult.rowCount} savings goals with default dates`);
    console.log('✓ Migration completed successfully!');
    console.log('\n📝 Now you can run: npm run db:push');
    
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    console.error('Error code:', error.code);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateSavingsGoals();
