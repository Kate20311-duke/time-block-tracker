#!/bin/sh
set -e
cd /app

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

echo "Ensuring PostgreSQL schema 'app' exists..."
node -e "
const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('CREATE SCHEMA IF NOT EXISTS app');
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
"

echo "Applying Prisma migrations..."
export NODE_PATH="/app/prisma-cli/node_modules${NODE_PATH:+:$NODE_PATH}"
/app/prisma-cli/node_modules/.bin/prisma migrate deploy

echo "Starting Next.js..."
exec node server.js
