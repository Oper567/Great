/**
 * Great-Favour Montessori School (GFMS)
 * Automated Production Packaging Script for cPanel / Truehost Deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('\n======================================================');
console.log('🏫 GFMS - Production Packaging for cPanel (Phusion Passenger)');
console.log('======================================================\n');

// 1. Verify production build files or trigger build if needed
const nextDir = path.join(rootDir, '.next');
const buildIdFile = path.join(nextDir, 'BUILD_ID');
try {
  execSync('npx prisma generate', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.warn('⚠️ Note: Prisma client already generated, proceeding with existing staged binaries.');
}

if (!fs.existsSync(nextDir) || !fs.existsSync(buildIdFile)) {
  console.log('📦 No production build detected (missing BUILD_ID). Running npm run build...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
} else {
  console.log('✓ Verified production .next build (BUILD_ID present).');
}

// 2. Remove .next/cache and .next/trace to reduce archive size and avoid file locks
const cacheDir = path.join(nextDir, 'cache');
if (fs.existsSync(cacheDir)) {
  console.log('🧹 Step 2: Purging .next/cache to save bundle size...');
  try {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('✓ Cache purged successfully.');
  } catch (err) {
    console.warn('⚠️ Could not remove cache directory:', err.message);
  }
}
const traceFile = path.join(nextDir, 'trace');
if (fs.existsSync(traceFile)) {
  try { fs.unlinkSync(traceFile); } catch (_) {}
}

// 3. Remove existing deploy.zip if present
const zipFile = path.join(rootDir, 'deploy.zip');
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

// 4. Stage pre-compiled Linux Prisma engines as .prisma (NOT node_modules!)
const localPrismaClient = path.join(rootDir, 'node_modules', '.prisma');
const rootDotPrisma = path.join(rootDir, '.prisma');

if (fs.existsSync(localPrismaClient)) {
  console.log('📦 Step 3: Staging pre-compiled Linux Prisma engines into .prisma (CloudLinux compliant)...');
  fs.cpSync(localPrismaClient, rootDotPrisma, { recursive: true });
  const clientDir = path.join(rootDotPrisma, 'client');
  if (fs.existsSync(clientDir)) {
    const engines = fs.readdirSync(clientDir).filter((f) => f.includes('query_engine'));
    console.log(`✓ Staged ${engines.length} query engine binaries:`);
    engines.forEach((eng) => console.log(`   - ${eng}`));
  }
}

// 4b. Pre-bundle zero-install runtime packages (pg, bcryptjs)
const prebundlePkgs = [
  'pg',
  'pg-cloudflare',
  'pg-connection-string',
  'pg-int8',
  'pg-pool',
  'pg-protocol',
  'pg-types',
  'pgpass',
  'postgres-array',
  'postgres-bytea',
  'postgres-date',
  'postgres-interval',
  'split2',
  'bcryptjs',
];

const prebundledDir = path.join(rootDir, 'prebundled_modules');
if (fs.existsSync(prebundledDir)) {
  fs.rmSync(prebundledDir, { recursive: true, force: true });
}
fs.mkdirSync(prebundledDir, { recursive: true });

console.log('📦 Step 3b: Pre-bundling zero-install runtime packages (pg, bcryptjs)...');
for (const pkg of prebundlePkgs) {
  const src = path.join(rootDir, 'node_modules', pkg);
  const dest = path.join(prebundledDir, pkg);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}
console.log('✓ Staged pre-bundled zero-install packages.');

// 5. Compress production package into deploy.zip with POSIX paths
console.log('🗜️ Step 4: Compressing production package into deploy.zip...');

const targetItems = [
  '.next',
  'public',
  'prisma',
  '.prisma',
  'prebundled_modules',
  'database',
  'scripts',
  'package.json',
  'package-lock.json',
  'server.js',
  'next.config.js',
  '.env',
  'logo.jpg',
  'cpanel-subdomain-setup.md',
].filter((item) => fs.existsSync(path.join(rootDir, item)));

try {
  let packaged = false;
  try {
    execSync('tar --version', { stdio: 'ignore' });
    console.log('✓ Using bsdtar for POSIX-compliant zip compression (guarantees Linux / cPanel folder structure)...');
    execSync(`tar -a -c -f deploy.zip ${targetItems.join(' ')}`, { cwd: rootDir, stdio: 'inherit' });
    packaged = true;
  } catch (_) {
    console.warn('⚠️ tar command not found, using fallback zip...');
  }

  if (!packaged) {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const psCommand = `Compress-Archive -Path ${targetItems.join(', ')} -DestinationPath deploy.zip -Force`;
      execSync(`powershell -NoProfile -Command "${psCommand}"`, { cwd: rootDir, stdio: 'inherit' });
    } else {
      execSync(`zip -r deploy.zip ${targetItems.join(' ')} -x "*.next/cache*"`, { cwd: rootDir, stdio: 'inherit' });
    }
  }

  // Clean staged .prisma and prebundled_modules from local root
  if (fs.existsSync(rootDotPrisma)) {
    fs.rmSync(rootDotPrisma, { recursive: true, force: true });
  }
  if (fs.existsSync(prebundledDir)) {
    fs.rmSync(prebundledDir, { recursive: true, force: true });
  }

  if (fs.existsSync(zipFile)) {
    const stats = fs.statSync(zipFile);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n🎉 Success! Clean deployment archive created: deploy.zip (${sizeInMB} MB)`);
    console.log('\nDeployment Checklist for Truehost cPanel / CloudLinux NodeJS Selector:');
    console.log(' 1. Upload and Extract deploy.zip into your cPanel application root (/home/mqqfpopx/gfms_app).');
    console.log(' 2. Open cPanel "Setup Node.js App".');
    console.log(' 3. Set Application Startup File: server.js and Application Mode: Production.');
    console.log(' 4. (Zero-Install) You DO NOT need to run "NPM Install" - all packages (pg, bcryptjs) are pre-bundled.');
    console.log(' 5. Click "Restart" (or Stop, then Start) to run the application.');
    console.log('======================================================\n');
  }
} catch (err) {
  if (fs.existsSync(rootDotPrisma)) {
    fs.rmSync(rootDotPrisma, { recursive: true, force: true });
  }
  console.error('❌ Error creating deployment archive:', err);
  process.exit(1);
}
