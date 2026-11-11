const mongoose = require('mongoose');
const config = require('./config');

let memoryServer = null;

// MONGODB_URI가 없으면 임시 메모리 DB로 실행해요.
// Atlas 계정이 없어도 각자 컴퓨터에서 바로 개발할 수 있게 하려는 거예요.
async function connectDb(uri = config.mongodbUri) {
  if (!uri) {
    if (config.isProd) throw new Error('MONGODB_URI가 없어요. .env를 확인해 주세요.');
    const { MongoMemoryServer } = require('mongodb-memory-server-core');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    console.warn('[DB] MONGODB_URI가 없어서 임시 메모리 DB로 실행해요. 서버를 끄면 데이터가 사라져요.');
  }
  await mongoose.connect(uri);
}

function isMemoryDb() {
  return memoryServer !== null;
}

async function disconnectDb() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectDb, disconnectDb, isMemoryDb };
