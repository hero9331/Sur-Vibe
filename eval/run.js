// 캡처 인식 정확도를 재는 도구예요. 실행할 때마다 Claude API 요금이 나가요.
// 사용법: 서버를 켜 둔 채로 node eval/run.js [폴더] (기본: eval/samples)
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.EVAL_URL || 'http://localhost:3000';
const GOAL = 90;
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

function simplify(name) {
  return String(name).toLowerCase().replace(/[\s·.,()-]/g, '');
}

function sameMerchant(a, b) {
  const x = simplify(a);
  const y = simplify(b);
  return x === y || (Math.min(x.length, y.length) >= 2 && (x.includes(y) || y.includes(x)));
}

// 금액과 가게가 다 맞는 짝을 먼저 찾고, 없으면 일부만 맞는 짝을 찾아요.
const MATCH_RULES = [
  (want, got) => want.amount === got.amount && sameMerchant(want.merchant, got.merchant),
  (want, got) => want.date === got.date && sameMerchant(want.merchant, got.merchant),
  (want, got) => want.date === got.date && want.amount === got.amount,
];

function matchItems(expected, actual) {
  const remaining = [...actual];
  const pairs = expected.map((want) => ({ want, got: null }));
  for (const rule of MATCH_RULES) {
    for (const pair of pairs) {
      if (pair.got) continue;
      const index = remaining.findIndex((got) => rule(pair.want, got));
      if (index >= 0) [pair.got] = remaining.splice(index, 1);
    }
  }
  return { pairs, extras: remaining };
}

function compareField(field, want, got) {
  if (field === 'merchant') return sameMerchant(want.merchant, got.merchant);
  return want[field] === got[field];
}

function scoreCases(results) {
  const score = { total: 0, found: 0, date: 0, merchant: 0, amount: 0, category: 0, extras: 0 };
  const problems = [];

  for (const { name, expected, actual } of results) {
    const { pairs, extras } = matchItems(expected, actual);
    score.total += pairs.length;
    score.extras += extras.length;
    extras.forEach((got) => problems.push(`[${name}] 없는 거래를 적음: ${got.merchant} ${got.amount}원`));

    pairs.forEach((pair) => scorePair(name, pair, score, problems));
  }
  return { score, problems };
}

function scorePair(name, { want, got }, score, problems) {
  if (!got) {
    problems.push(`[${name}] 못 찾음: ${want.merchant} ${want.amount}원`);
    return;
  }
  score.found += 1;
  for (const field of ['date', 'merchant', 'amount', 'category']) {
    if (compareField(field, want, got)) score[field] += 1;
    else problems.push(`[${name}] ${want.merchant}: ${field} 틀림 (정답 ${want[field]} / 읽음 ${got[field]})`);
  }
}

function percent(value, total) {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

async function signUp() {
  const username = `eval_${Date.now().toString(36)}`;
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'evaluation-only' }),
  });
  if (!res.ok) throw new Error(`테스트 계정을 못 만들었어요 (${res.status})`);
  return (await res.json()).token;
}

async function scan(token, folder, images) {
  const form = new FormData();
  for (const image of images) {
    const type = MIME[path.extname(image).toLowerCase()];
    form.append('images', new Blob([fs.readFileSync(path.join(folder, image))], { type }), image);
  }
  const res = await fetch(`${BASE_URL}/api/scans`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `읽기 실패 (${res.status})`);
  return data.items;
}

async function main() {
  const folder = path.resolve(process.argv[2] || path.join(__dirname, 'samples'));
  const { cases } = JSON.parse(fs.readFileSync(path.join(folder, 'answers.json'), 'utf8'));
  const token = await signUp();

  const results = [];
  for (const item of cases) {
    const started = Date.now();
    const actual = await scan(token, folder, item.images);
    console.log(`읽음: ${item.name} (${actual.length}건, ${((Date.now() - started) / 1000).toFixed(1)}초)`);
    results.push({ name: item.name, expected: item.expected, actual });
  }

  const { score, problems } = scoreCases(results);
  console.log('\n결과');
  console.log(`  거래 찾기  ${score.found}/${score.total} (${percent(score.found, score.total)}%)`);
  for (const [field, label] of [['date', '날짜'], ['merchant', '가게'], ['amount', '금액'], ['category', '카테고리']]) {
    console.log(`  ${label.padEnd(8)}  ${score[field]}/${score.total} (${percent(score[field], score.total)}%)`);
  }
  console.log(`  없는 거래  ${score.extras}건`);

  if (problems.length) {
    console.log('\n틀린 곳');
    problems.forEach((problem) => console.log(`  - ${problem}`));
  }

  const categoryPercent = percent(score.category, score.total);
  console.log(`\n목표 ${GOAL}%: 카테고리 정확도 ${categoryPercent}% → ${categoryPercent >= GOAL ? '통과' : '미달'}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`멈췄어요: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { matchItems, scoreCases, sameMerchant };
