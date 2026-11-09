// 캡처를 AI에게 보내기 전에 손보고, 이미 저장한 내역을 찾아요 — 담당: 박영웅

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_SIDE = 7900; // Claude는 한 변이 8000픽셀을 넘는 사진을 받지 않아요. (긴 스크롤 캡처)

export function fitSize(width, height, maxSide = MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function toJpeg(canvas, quality) {
  return new Promise((resolve) => { canvas.toBlob(resolve, 'image/jpeg', quality); });
}

// 너무 길거나 무거운 캡처만 줄여요. 괜찮은 캡처는 화질 그대로 보내요.
export async function prepareCapture(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // 브라우저가 못 여는 파일은 서버 검사에 맡겨요
  }

  const size = fitSize(bitmap.width, bitmap.height);
  if (size.width === bitmap.width && file.size <= MAX_FILE_SIZE) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  let blob = await toJpeg(canvas, 0.9);
  if (blob && blob.size > MAX_FILE_SIZE) blob = await toJpeg(canvas, 0.7);
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

// 날짜와 금액이 같은 저장 내역이 있으면 표시해요. 같은 날 같은 금액을 진짜로 두 번 썼을 수도 있어서
// 지우지 않고 사용자가 고르게 해요. 저장된 건수만큼만 표시해요.
export function markDuplicates(items, savedList) {
  const keyOf = (date, amount) => `${date}|${amount}`;
  const counts = new Map();
  for (const saved of savedList) {
    const key = keyOf(saved.date, saved.originalAmount ?? saved.amount);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return items.map((item) => {
    const key = keyOf(item.date, item.amount);
    const left = counts.get(key) || 0;
    if (left === 0) return item;
    counts.set(key, left - 1);
    return { ...item, maybeDuplicate: true };
  });
}
