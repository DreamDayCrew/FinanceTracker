import 'dotenv/config';
import { storage } from './server/storage';

async function testEndpoints() {
  try {
    console.log('Testing getAllAccounts...');
    const accounts = await storage.getAllAccounts();
    console.log('✓ Accounts fetched:', accounts.length, 'accounts');
  } catch (error: any) {
    console.error('✗ Error fetching accounts:', error.message);
    console.error('Stack:', error.stack);
  }

  try {
    console.log('\nTesting getAllTransactions...');
    const transactions = await storage.getAllTransactions();
    console.log('✓ Transactions fetched:', transactions.length, 'transactions');
  } catch (error: any) {
    console.error('✗ Error fetching transactions:', error.message);
    console.error('Stack:', error.stack);
  }

  try {
    console.log('\nTesting getDashboardStats...');
    const stats = await storage.getDashboardStats();
    console.log('✓ Dashboard stats fetched:', JSON.stringify(stats, null, 2));
  } catch (error: any) {
    console.error('✗ Error fetching dashboard stats:', error.message);
    console.error('Stack:', error.stack);
  }

  process.exit(0);
}

testEndpoints();
