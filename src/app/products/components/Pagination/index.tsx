import Link from "next/link";
import { type RawSP } from "@/utils/shared/url";

export default function Pagination({
  page,
  pageSize,
  total,
  searchParams,
  basePath = "/products",
  windowSize = 5,
}: {
  page: number;
  pageSize: number;
  total: number;
  searchParams: RawSP;
  basePath?: string;
  windowSize?: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total ?? 0) / pageSize);

  const { start, end } = calcWindow(page, pageCount, windowSize);
  const pageNums = range(start, end);

  const href = (p: number) => `${basePath}?${spToQSWithPage(searchParams, p).toString()}`;

  const isFirst = page <= 1;
  const isLast = page >= pageCount;

  return (
    <nav className="mt-8 flex justify-center" aria-label="페이지네이션">
      <ul className="flex items-center gap-1 text-sm">
        {/* << 맨앞 */}
        <Item disabled={isFirst} href={href(1)} label="«" ariaLabel="첫 페이지" />

        {/* < 이전 */}
        <Item
          disabled={isFirst}
          href={href(Math.max(1, page - 1))}
          label="‹"
          ariaLabel="이전 페이지"
        />

        {/* 번호들 */}
        {pageNums.map(n => (
          <li key={n}>
            {n === page ? (
              <span
                aria-current="page"
                className="inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-black px-3 text-white"
              >
                {n}
              </span>
            ) : (
              <Link
                href={href(n)}
                className="inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                {n}
              </Link>
            )}
          </li>
        ))}

        {/* > 다음 */}
        <Item
          disabled={isLast}
          href={href(Math.min(pageCount, page + 1))}
          label="›"
          ariaLabel="다음 페이지"
        />

        {/* >> 맨뒤 */}
        <Item disabled={isLast} href={href(pageCount)} label="»" ariaLabel="마지막 페이지" />
      </ul>
    </nav>
  );
}

/**
 * 페이지네이션 처음과 끝 계산
 */
function calcWindow(
  page: number,
  pageCount: number,
  windowSize: number
): { start: number; end: number } {
  const window = Math.max(1, Math.floor(windowSize));
  let start = Math.max(1, page - Math.floor(window / 2));
  const end = Math.min(pageCount, start + window - 1);
  start = Math.max(1, end - window + 1);

  return { start, end };
}

/**
 * 페이지네이션 처음과 끝으로 페이지범위의 숫자들
 */
function range(start: number, end: number) {
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);

  return result;
}

function spToQSWithPage(sp: RawSP, page: number): URLSearchParams {
  const qs = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (v === undefined) return;
    if (k === "page") return; // page는 새 값으로 덮어씀
    if (Array.isArray(v)) v.forEach(x => qs.append(k, String(x)));
    else qs.set(k, String(v));
  });
  qs.set("page", String(page)); // 1페이지도 명시
  return qs;
}

function Item({
  disabled,
  href,
  label,
  ariaLabel,
}: {
  disabled: boolean;
  href: string;
  label: string;
  ariaLabel: string;
}) {
  if (disabled) {
    return (
      <li>
        <span
          aria-disabled="true"
          className="inline-flex h-9 min-w-9 select-none items-center justify-center rounded-md px-3 text-neutral-400"
        >
          {label}
        </span>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={href}
        aria-label={ariaLabel}
        className="inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
      >
        {label}
      </Link>
    </li>
  );
}
