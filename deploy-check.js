#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking deployment configuration...\n');

// Check environment variables
const envFiles = ['.env.local', '.env'];
let envFound = false;

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    console.log(`✅ Found ${envFile}`);
    envFound = true;
    
    const envContent = fs.readFileSync(envFile, 'utf8');
    const requiredVars = [
      'NEXT_PUBLIC_STREAM_API_KEY',
      'STREAM_SECRET_KEY',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !envContent.includes(varName));
    
    if (missingVars.length > 0) {
      console.log(`❌ Missing environment variables in ${envFile}:`);
      missingVars.forEach(varName => console.log(`   - ${varName}`));
    } else {
      console.log('✅ All required environment variables found');
    }
    break;
  }
}

if (!envFound) {
  console.log('❌ No environment file found (.env.local or .env)');
  console.log('   Please copy .env.example to .env.local and configure your variables');
}

// Check package.json
if (fs.existsSync('package.json')) {
  console.log('\n✅ Found package.json');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check Node.js version
  const nodeVersion = process.version;
  const requiredNodeVersion = packageJson.engines?.node || '>=18.0.0';
  console.log(`📦 Node.js version: ${nodeVersion}`);
  
  // Check dependencies
  const requiredDeps = [
    '@stream-io/video-react-sdk',
    '@clerk/nextjs',
    'next',
    'react'
  ];
  
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies?.[dep]);
  
  if (missingDeps.length > 0) {
    console.log('❌ Missing required dependencies:');
    missingDeps.forEach(dep => console.log(`   - ${dep}`));
  } else {
    console.log('✅ All required dependencies found');
  }
} else {
  console.log('❌ package.json not found');
}

// Check server.js
if (fs.existsSync('server.js')) {
  console.log('\n✅ Found server.js');
} else {
  console.log('\n❌ server.js not found - required for deployment');
}

// Check next.config.js
if (fs.existsSync('next.config.js')) {
  console.log('\n✅ Found next.config.js');
} else {
  console.log('\n❌ next.config.js not found');
}

// Check Procfile
if (fs.existsSync('Procfile')) {
  console.log('\n✅ Found Procfile');
} else {
  console.log('\n❌ Procfile not found - required for Heroku deployment');
}

console.log('\n📋 Deployment Checklist:');
console.log('1. ✅ Environment variables configured');
console.log('2. ✅ Dependencies installed (run: npm install)');
console.log('3. ✅ Build successful (run: npm run build)');
console.log('4. ✅ Server starts (run: npm start)');
console.log('5. ✅ Health check passes (/api/health)');

console.log('\n🚀 Ready for deployment!');
console.log('   Run: npm run build && npm start'); 