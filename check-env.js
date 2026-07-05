#!/usr/bin/env node
/**
 * Check Environment Variables
 * Validasi bahwa semua env vars yang diperlukan sudah diset
 */

import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '.env');

console.log('\n🔍 Checking Environment Variables...\n');

// Check if .env exists
if (!existsSync(envPath)) {
  console.error('❌ File .env tidak ditemukan!');
  console.error('💡 Copy .env.example ke .env dan isi nilai yang diperlukan:\n');
  console.error('   cp .env.example .env\n');
  process.exit(1);
}

// Read .env file
const envContent = readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

// Required variables
const required = {
  'JWT_SECRET': 'Secret key untuk JWT authentication (min. 32 characters)',
  'ADMIN_SECRET': 'Secret key untuk admin access',
  'DATABASE_URL': 'PostgreSQL connection string (dari Neon/Supabase)',
  'GEMINI_API_KEY': 'Google Gemini API key (opsional untuk AI features)',
  'BLOB_READ_WRITE_TOKEN': 'Vercel Blob storage token (opsional untuk images)',
};

let hasErrors = false;
const missing = [];
const needsChange = [];

for (const [key, description] of Object.entries(required)) {
  const line = envLines.find(l => l.startsWith(`${key}=`));
  
  if (!line) {
    missing.push({ key, description });
    hasErrors = true;
  } else {
    const value = line.split('=')[1]?.trim();
    if (!value || value === 'CHANGE_ME' || value === '') {
      needsChange.push({ key, description });
      hasErrors = true;
    } else {
      console.log(`✅ ${key}: OK`);
    }
  }
}

if (missing.length > 0) {
  console.error('\n❌ Missing Variables:');
  missing.forEach(({ key, description }) => {
    console.error(`   - ${key}: ${description}`);
  });
}

if (needsChange.length > 0) {
  console.error('\n⚠️  Variables Need Configuration:');
  needsChange.forEach(({ key, description }) => {
    console.error(`   - ${key}: ${description}`);
  });
}

if (hasErrors) {
  console.error('\n📝 Edit file .env dan isi nilai yang diperlukan.\n');
  console.error('💡 Tips:');
  console.error('   - JWT_SECRET: generate random string (32+ chars)');
  console.error('   - ADMIN_SECRET: generate random string (32+ chars)');
  console.error('   - DATABASE_URL: dapatkan dari Neon.tech atau Supabase');
  console.error('   - GEMINI_API_KEY: https://makersuite.google.com/app/apikey');
  console.error('   - BLOB_READ_WRITE_TOKEN: https://vercel.com/dashboard\n');
  process.exit(1);
}

console.log('\n✅ All environment variables configured!\n');
console.log('🚀 Ready to start development server.\n');
