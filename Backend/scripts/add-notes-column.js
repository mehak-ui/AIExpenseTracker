import pool from '../utils/db.js';

const run = async () => {
  try {
    console.log('Adding notes column to transactions...');
    await pool.query('ALTER TABLE transactions ADD COLUMN notes TEXT;');
    console.log('✅ Column added successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();