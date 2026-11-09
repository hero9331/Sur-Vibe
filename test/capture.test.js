const test = require('node:test');
const assert = require('node:assert/strict');

let fitSize;
let markDuplicates;

test.before(async () => {
  ({ fitSize, markDuplicates } = await import('../public/js/capture.js'));
});

const item = (date, amount) => ({ date, merchant: '가게', amount });

test('보통 캡처는 크기를 바꾸지 않는다', () => {
  assert.deepEqual(fitSize(1080, 2400), { width: 1080, height: 2400 });
});

test('8000픽셀이 넘는 긴 캡처는 비율을 지켜 줄인다', () => {
  const size = fitSize(1080, 15800);
  assert.equal(size.height, 7900);
  assert.equal(size.width, 540);
});

test('날짜와 금액이 같은 저장 내역이 있으면 표시한다', () => {
  const [same, otherDay, otherAmount] = markDuplicates(
    [item('2026-11-03', 5600), item('2026-11-04', 5600), item('2026-11-03', 5700)],
    [{ date: '2026-11-03', amount: 5600 }],
  );
  assert.equal(same.maybeDuplicate, true);
  assert.equal(otherDay.maybeDuplicate, undefined);
  assert.equal(otherAmount.maybeDuplicate, undefined);
});

test('더치페이로 저장한 건은 내 몫이 아니라 원래 금액으로 비교한다', () => {
  const [share, original] = markDuplicates(
    [item('2026-11-03', 2800), item('2026-11-03', 5600)],
    [{ date: '2026-11-03', amount: 2800, originalAmount: 5600, splitCount: 2 }],
  );
  assert.equal(share.maybeDuplicate, undefined);
  assert.equal(original.maybeDuplicate, true);
});

test('저장된 건수만큼만 표시한다 (같은 날 지하철을 또 탄 경우)', () => {
  const result = markDuplicates(
    [item('2026-11-03', 1550), item('2026-11-03', 1550)],
    [{ date: '2026-11-03', amount: 1550 }],
  );
  assert.deepEqual(result.map((x) => x.maybeDuplicate === true), [true, false]);
});
