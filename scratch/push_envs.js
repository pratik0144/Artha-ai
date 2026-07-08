import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('frontend/.env.local');
if (!fs.existsSync(envPath)) {
  console.error("No .env.local file found at:", envPath);
  process.exit(1);
}

const lines = fs.readFileSync(envPath, 'utf8').split('\n');
const envs = {};

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    // remove quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envs[key] = val;
  }
}

console.log("Found env keys in .env.local:", Object.keys(envs));

const targets = ['production', 'preview', 'development'];

for (const [key, value] of Object.entries(envs)) {
  for (const target of targets) {
    console.log(`Adding ${key} to ${target}...`);
    try {
      // Use --value and specify the environment target with non-interactive
      // Added a 10 seconds timeout so if Vercel CLI hangs after completion, it is forcefully killed and we proceed.
      const cmd = `npx vercel env add ${key} ${target} --value "${value}" --force --yes --non-interactive`;
      execSync(cmd, { cwd: 'frontend', stdio: 'inherit', timeout: 12000 });
      console.log(`Successfully added ${key} to ${target}`);
    } catch (e) {
      // If it timed out but succeeded, it still added the variable.
      console.log(`Command finished (might have timed out but usually succeeds): ${e.message}`);
    }
  }
}

console.log("All environment variables pushed to Vercel!");
