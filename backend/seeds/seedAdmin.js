/**
 * Seed (or promote) an admin account. Admins can't self-register through the API.
 *
 * Usage (from the project root or /backend):
 *   npm run seed:admin
 *   npm run seed:admin -- --email=boss@example.com --name="Boss" --password=S3cretPass!
 *   npm run seed:admin -- --email=existing@user.com --promote          # make an existing user admin
 *   npm run seed:admin -- --email=boss@example.com --reset-password    # set a new password for an admin
 *
 * Values come from CLI flags, then ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_PHONE in backend/.env.
 * If no password is provided, a random one is generated and printed once.
 * Prefer the env var over --password so the password doesn't end up in your shell history.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');

const argv = process.argv.slice(2);
const flag = (name) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
};

const name = flag('name') || process.env.ADMIN_NAME || 'Admin';
const email = String(flag('email') || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const phone = flag('phone') || process.env.ADMIN_PHONE || undefined;
const promote = flag('promote') === true;
const resetPassword = flag('reset-password') === true;

let password = flag('password') || process.env.ADMIN_PASSWORD;
let generated = false;

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exitCode = 1;
};

const run = async () => {
  if (!process.env.MONGO_URI) return fail('MONGO_URI is not set. Create backend/.env first (see .env.example).');
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail('A valid admin email is required (--email=... or ADMIN_EMAIL in backend/.env).');

  if (!password) {
    password = crypto.randomBytes(12).toString('base64url'); // 16 chars
    generated = true;
  }
  if (password.length < 8) return fail('Password must be at least 8 characters.');

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to MongoDB (${mongoose.connection.host})`);

  const existing = await User.findOne({ email }).select('+password');

  if (!existing) {
    await User.create({ name, email, password, phone, role: 'admin' });
    console.log(`\n✔ Admin created: ${email}`);
    if (generated) console.log(`  Generated password (shown once, change it after logging in): ${password}`);
    return undefined;
  }

  if (existing.role === 'admin') {
    if (resetPassword) {
      existing.password = password;
      existing.isActive = true;
      await existing.save();
      console.log(`\n✔ Password reset for admin: ${email}`);
      if (generated) console.log(`  Generated password (shown once): ${password}`);
    } else {
      console.log(`\n• Admin already exists: ${email} (nothing changed). Use --reset-password to set a new password.`);
    }
    return undefined;
  }

  if (!promote) {
    return fail(`${email} already exists as a "${existing.role}". Re-run with --promote to make that account an admin.`);
  }

  existing.role = 'admin';
  existing.isActive = true;
  await existing.save();
  console.log(`\n✔ ${email} promoted to admin (existing password kept).`);
  return undefined;
};

run()
  .catch((err) => fail(err.message))
  .finally(async () => {
    await mongoose.disconnect();
  });
