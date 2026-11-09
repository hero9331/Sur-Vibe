const mongoose = require('mongoose');

// 모든 모델이 JSON으로 나갈 때 _id 대신 id를 쓰고, 비밀번호 같은 내부 값은 빼요.
mongoose.plugin((schema) => {
  schema.set('toJSON', {
    versionKey: false,
    transform(doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.user;
      delete ret.passwordHash;
      return ret;
    },
  });
});

module.exports = {
  User: require('./User'),
  Account: require('./Account'),
  Transaction: require('./Transaction'),
  Rule: require('./Rule'),
  Setting: require('./Setting'),
};
