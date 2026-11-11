const config = require('./config');
const { connectDb, isMemoryDb } = require('./db');
const { seedDemoData } = require('./devSeed');
const { createApp } = require('./app');

async function main() {
  await connectDb();
  if (isMemoryDb()) await seedDemoData();
  createApp().listen(config.port, () => {
    console.log(`서버 실행 중: http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
