// 날짜 도우미 — 담당: 1학년 A
// 날짜는 "2026-11-03", 달은 "2026-11" 글자로 다뤄요. (docs/API.md 공통 규칙)

// 한국 시간 기준 오늘
function kstToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}

// ("2026-11", -3) → "2026-08"
function shiftMonth(month, diff) {
  const [year, mon] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon - 1 + diff, 1)).toISOString().slice(0, 7);
}

module.exports = { kstToday, shiftMonth };
