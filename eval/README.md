# 캡처 인식 정확도 재기

서버를 켜 둔 채로 실행해요. **돌릴 때마다 Claude API 요금이 나가요.**

```bash
npm run eval
```

- `eval/samples/`: 제가 만든 가짜 캡처 6장과 정답이에요. 취소 거래, 겹치는 캡처, 캡처 속 지시문 같은 어려운 경우를 넣었어요.
- 가짜 캡처는 글자가 또렷해서 실제보다 점수가 잘 나올 수 있어요. **발표에 쓸 숫자는 진짜 캡처로 재요.**

## 진짜 캡처로 재기

1. `eval/private/` 폴더를 만들어 캡처를 넣어요. 이 폴더는 GitHub에 올라가지 않아요.
2. 같은 폴더에 `answers.json`을 만들어요. 형식은 `eval/samples/answers.json`과 같아요.
3. 실행해요.

```bash
npm run eval -- eval/private
```

## 모델 비교

`.env`의 `ANTHROPIC_MODEL`을 바꾸고 서버를 다시 켠 뒤 또 실행해요. (`claude-opus-5-5`, `claude-haiku-5-5`)
