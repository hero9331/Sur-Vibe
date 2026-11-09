// 카테고리 목록은 data/categories.json 한 곳에서만 관리해요.
const categories = require('../data/categories.json');

const CATEGORY_NAMES = categories.map((c) => c.name);

module.exports = { categories, CATEGORY_NAMES };
