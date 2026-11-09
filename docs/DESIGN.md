# 디자인 규칙

**콘셉트: 영수증과 통장.** 종이색 배경에 초록색 하나만 포인트로 써요. AI에게 화면을 시킬 때 "docs/DESIGN.md를 따라 줘"라고 말해요.

## 하지 말 것

- 새 색상, 그라데이션, 그림자, 크게 둥근 모서리
- 이모지
- 숫자 카드를 3~4개 나란히 놓는 대시보드 모양
- 기능 설명 문구를 화면마다 길게 쓰기

## 색은 이것만

`public/css/style.css`의 토큰을 써요.

| 토큰 | 용도 |
|---|---|
| `--color-primary` | 버튼, 그래프, 강조 |
| `--color-bg` | 페이지 배경 (종이색) |
| `--color-card` | 카드 배경 |
| `--color-text` / `--color-muted` | 본문 / 보조 글자 |
| `--color-line` | 구분선 |
| `--color-warning` / `--color-danger` | 경고 / 초과, 지출 증가 |

## 자주 쓰는 모양

**영수증 카드.** 페이지에서 제일 중요한 카드 하나에만 써요. 아래쪽이 톱니 모양이에요.

```js
el('div', { class: 'card receipt p-4 mb-3' }, ...)
```

**일반 카드**

```js
el('div', { class: 'card p-4 mb-3' }, cardTitle('제목'), ...)
```

**이름과 금액 한 줄**

```js
el('div', { class: 'receipt-line' },
  el('span', { class: 'text-muted' }, '이번 달 쓴 돈'),
  el('strong', {}, won(126250)))
```

**합계**

```js
el('div', { class: 'receipt-total' }, el('span', {}, '합계'), el('span', {}, won(126250)))
```

**목록**

```js
el('ul', { class: 'list-group list-group-flush' },
  el('li', { class: 'list-group-item px-0' }, '내용'))
```

## 문구

- 쉬운 한국어로, 해요체로 써요.
- 금액은 `won()`으로 표시해요. 예: `12,000원`
- 비어 있을 때 할 일을 알려 줘요. 예: `아직 내역이 없어요`
- 오류는 무엇을 하면 되는지 적어요. 예: `캡처는 한 장에 5MB까지 올릴 수 있어요`

## 만들고 나서 확인

- 폰 크기(375px)에서 가로로 밀리지 않나요? 폰에서는 메뉴가 화면 아래 탭으로 바뀌어요.
- 버튼과 입력칸은 라벨이나 `aria-label`이 있나요?
- 크롬 콘솔에 오류가 없나요?
- Lighthouse가 90점 이상인가요?
