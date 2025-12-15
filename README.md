# ☕ mybeans-frontend-public

**포트폴리오** 프로젝트입니다.

## Getting Started

```
node -v
v20.19.4
```

```bash
npm run local
npm run dev
npm run prod
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 명명 규칙

| 항목               | 명명 규칙                  | 예시                                 |
| ------------------ | -------------------------- | ------------------------------------ |
| **라우트 폴더**    | `kebab-case`               | `/app/product-list/page.tsx`         |
| **동적 라우트**    | `[param]` 형식             | `/app/products/[id]/page.tsx`        |
| **컴포넌트 파일**  | `PascalCase`               | `ProductCard.tsx`, `ProductList.tsx` |
| **훅 파일**        | `camelCase` + `use` 접두어 | `useCart.ts`, `useProductList.ts`    |
| **유틸 함수**      | `camelCase`                | `formatDate.ts`, `getProductData.ts` |
| **상수/enum 파일** | `camelCase`                | `constants.ts`, `types.ts`           |
