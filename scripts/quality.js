// 리팩터링 전후 품질 재기 (5강 "품질 측정 절차")
// 사용법: npm run quality            → 전체 요약
//         npm run quality -- src/services/scanner.js public/js/upload.js  → 고른 파일만
// 함수마다 순환 복잡도(CC)를 재고, 파일마다 코드 줄 수(빈 줄·주석 줄 빼고)를 세요.
// 파이썬의 radon cc / radon raw 와 같은 일을 ESLint로 해요.
const fs = require('node:fs');
const path = require('node:path');
const { ESLint } = require('eslint');

const ROOT = path.join(__dirname, '..');
const DEFAULT_TARGETS = ['src', 'public/js', 'eval/run.js'];

// 빈 줄과 주석만 있는 줄을 뺀 줄 수
function codeLines(text) {
  let inBlock = false;
  let count = 0;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) inBlock = false;
      continue;
    }
    if (line === '' || line.startsWith('//')) continue;
    if (line.startsWith('/*')) {
      inBlock = !line.includes('*/');
      continue;
    }
    count += 1;
  }
  return count;
}

// ESLint complexity 규칙을 0으로 두면 함수마다 "복잡도 N" 메시지가 나와요. 그 숫자를 모아요.
function complexities(messages) {
  return messages
    .filter((m) => m.ruleId === 'complexity')
    .map((m) => {
      const match = m.message.match(/complexity of (\d+)/);
      return { line: m.line, cc: match ? Number(match[1]) : 0, name: m.message.split(' has ')[0] };
    });
}

function average(numbers) {
  return numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
}

async function measure(targets) {
  const counter = new ESLint({ cwd: ROOT, overrideConfig: { rules: { complexity: ['warn', 0] } } });
  const normal = new ESLint({ cwd: ROOT });
  const [ccResults, lintResults] = await Promise.all([counter.lintFiles(targets), normal.lintFiles(targets)]);
  const warnings = lintResults.reduce((sum, r) => sum + r.warningCount + r.errorCount, 0);

  const files = ccResults.map((r) => {
    const funcs = complexities(r.messages);
    return {
      file: path.relative(ROOT, r.filePath).replaceAll('\\', '/'),
      loc: codeLines(fs.readFileSync(r.filePath, 'utf8')),
      functions: funcs.length,
      avgCC: average(funcs.map((f) => f.cc)),
      maxCC: Math.max(0, ...funcs.map((f) => f.cc)),
      over5: funcs.filter((f) => f.cc > 5).length,
      top: funcs.sort((a, b) => b.cc - a.cc)[0],
    };
  });
  return { files, warnings };
}

function printReport({ files, warnings }) {
  const funcCount = files.reduce((s, f) => s + f.functions, 0);
  const weightedAvg = funcCount ? files.reduce((s, f) => s + f.avgCC * f.functions, 0) / funcCount : 0;

  console.log('| 파일 | 코드 줄 | 함수 수 | 평균 CC | 최대 CC | 가장 복잡한 함수 |');
  console.log('|---|---:|---:|---:|---:|---|');
  for (const f of files.sort((a, b) => b.maxCC - a.maxCC)) {
    const top = f.top ? `${f.top.name} (${f.top.line}줄)` : '';
    console.log(`| ${f.file} | ${f.loc} | ${f.functions} | ${f.avgCC.toFixed(2)} | ${f.maxCC} | ${top} |`);
  }
  console.log('');
  console.log(`전체: 파일 ${files.length}개, 코드 줄 ${files.reduce((s, f) => s + f.loc, 0)}, 함수 ${funcCount}개, ` +
    `평균 CC ${weightedAvg.toFixed(2)}, 최대 CC ${Math.max(0, ...files.map((f) => f.maxCC))}, ` +
    `CC 5 넘는 함수 ${files.reduce((s, f) => s + f.over5, 0)}개, ESLint 경고 ${warnings}개`);
}

const targets = process.argv.slice(2);
measure(targets.length ? targets : DEFAULT_TARGETS).then(printReport).catch((err) => {
  console.error(err);
  process.exit(1);
});
