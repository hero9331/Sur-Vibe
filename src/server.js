const config = require('./config');
const { connectDb } = require('./db');
const { createApp } = require('./app');

async function main() {
  await connectDb();
  createApp().listen(config.port, () => {
    console.log(`서버 실행 중: http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
