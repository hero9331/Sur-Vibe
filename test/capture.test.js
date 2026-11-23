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

// prepareCapture 시험: 브라우저의 사진 열기·캔버스를 가짜로 바꿔요.
let prepareCapture;
let MAX_FILE_SIZE;
let closed;
let qualities;

function fakeBrowser({ width, height, blobSizes = [], cannotOpen = false }) {
  closed = 0;
  qualities = [];
  globalThis.createImageBitmap = async () => {
    if (cannotOpen) throw new Error('not an image');
    return { width, height, close: () => { closed += 1; } };
  };
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({ drawImage: () => {} }),
      toBlob(callback, type, quality) {
        qualities.push(quality);
        const size = blobSizes.shift();
        callback(size === null ? null : new Blob([new Uint8Array(size)], { type }));
      },
    }),
  };
}

const photo = (size, name = 'shot.png') => new File([new Uint8Array(size)], name, { type: 'image/png' });

test.before(async () => {
  ({ prepareCapture, MAX_FILE_SIZE } = await import('../public/js/capture.js'));
});

test('작고 보통 크기인 캡처는 그대로 보낸다', async () => {
  fakeBrowser({ width: 1080, height: 2400 });
  const file = photo(1000);
  assert.equal(await prepareCapture(file), file);
  assert.equal(closed, 1);
});

test('브라우저가 못 여는 파일은 서버 검사에 맡기고 그대로 보낸다', async () => {
  fakeBrowser({ width: 0, height: 0, cannotOpen: true });
  const file = photo(10);
  assert.equal(await prepareCapture(file), file);
});

test('긴 캡처는 줄여서 jpg로 바꾼다', async () => {
  fakeBrowser({ width: 1080, height: 15800, blobSizes: [2000] });
  const result = await prepareCapture(photo(1000, '긴캡처.png'));
  assert.equal(result.name, '긴캡처.jpg');
  assert.equal(result.type, 'image/jpeg');
  assert.deepEqual(qualities, [0.9]);
  assert.equal(closed, 1);
});

test('무거운 캡처는 jpg로 줄이고, 그래도 크면 화질을 한 번 더 낮춘다', async () => {
  fakeBrowser({ width: 1080, height: 2400, blobSizes: [MAX_FILE_SIZE + 1, 3000] });
  const result = await prepareCapture(photo(MAX_FILE_SIZE + 1));
  assert.equal(result.size, 3000);
  assert.deepEqual(qualities, [0.9, 0.7]);
});

test('jpg로 못 바꾸면 원래 파일을 보낸다', async () => {
  fakeBrowser({ width: 1080, height: 15800, blobSizes: [null] });
  const file = photo(1000);
  assert.equal(await prepareCapture(file), file);
});
