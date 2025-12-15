/**
 * 제네릭 LRU(+TTL) 메모리 캐시.
 *
 * - LRU(Least Recently Used): 가장 오래 사용하지 않은 항목부터 축출
 * - TTL(Time-To-Live): 항목별 만료 시간(경과 시 자동 무효화)
 *
 * 사용 예:
 *   const cache = new LruCache<string, Result>(200, 30 * 60 * 1000);
 *   cache.set("key", value);
 *   const v = cache.get("key"); // TTL 만료·미스면 null
 */
export class LruCache<K, V> {
  // 내부 저장소: 삽입 순서를 유지하는 Map. value와 마지막 사용 시각(at)을 저장
  private map = new Map<K, { value: V; at: number }>();

  /**
   * @param capacity 최대 항목 수(초과 시 LRU 순서대로 축출). 최소 1로 보정
   * @param ttlMs    TTL(ms). null이면 만료 없음
   */
  constructor(
    private capacity = 200,
    private ttlMs: number | null = 30 * 60 * 1000 // 30 min
  ) {
    this.capacity = Math.max(1, Math.floor(capacity));
  }

  /**
   * 내부 용량 초과 시, 가장 오래 사용되지 않은 키부터 제거.
   * Map의 삽입 순서를 이용해 '첫 번째 키'를 오래된 항목으로 간주.
   * 타입 안전하게 비어있는 경우를 가드한다.
   */
  private evictIfNeeded() {
    while (this.map.size > this.capacity) {
      const it = this.map.keys();
      const first = it.next();
      if (first.done) break;
      this.map.delete(first.value);
    }
  }

  /**
   * 캐시에서 값을 조회.
   * - TTL이 설정되어 있고 만료되었으면 해당 항목 제거 후 null 반환.
   * - 미만료/히트 시 LRU 갱신(최근 사용으로 재삽입) 후 value 반환.
   * @returns V | null
   */
  get(key: K): V | null {
    const entry = this.map.get(key);
    if (!entry) return null;

    // TTL 체크: 오래되었으면 제거하고 미스로 처리
    if (this.ttlMs && Date.now() - entry.at > this.ttlMs) {
      this.map.delete(key);
      return null;
    }

    // LRU 갱신: 삭제 후 재삽입하면 '가장 최근'으로 이동
    this.map.delete(key);
    this.map.set(key, { value: entry.value, at: Date.now() });

    return entry.value;
  }

  /**
   * 값을 저장/갱신.
   * - 기존 키면 일단 삭제하여 LRU 순서를 갱신.
   * - 새 키면 삽입 후 용량 초과 여부를 검사하여 필요 시 LRU 축출.
   *   (삽입 → 초과 → 축출 순서. 표준적 LRU 동작이며 기능상 문제 없음)
   */
  set(key: K, val: V) {
    if (this.map.has(key)) this.map.delete(key); // LRU 순서 갱신용
    this.map.set(key, { value: val, at: Date.now() }); // 삽입/갱신
    this.evictIfNeeded(); // 초과 시 오래된 항목 제거
  }

  /**
   * 키 존재 여부 확인(만료 여부 고려하지 않음)
   */
  has(key: K) {
    return this.map.has(key);
  }

  /**
   * 특정 키 제거
   * 존재하지 않아도 안전
   */
  delete(key: K) {
    this.map.delete(key);
  }

  /**
   * 모든 항목 제거(메모리 반환)
   */
  clear() {
    this.map.clear();
  }

  /**
   * 현재 저장된 항목 수 반환
   */
  size() {
    return this.map.size;
  }

  /**
   * 용량(capacity)을 동적으로 변경
   * 줄어든 용량에 맞게 즉시 LRU 축출 수행
   */
  setCapacity(n: number) {
    this.capacity = Math.max(1, Math.floor(n));
    this.evictIfNeeded();
  }

  /**
   * TTL(ms)을 동적으로 변경.
   * 변경 즉시 만료 정리는 하지 않으며,
   * 이후 get() 시점 또는 set 시 용량 정리에서 자연스럽게 정리됨.
   * 즉시 정리가 필요하면 수동으로 키를 순회하며 get()을 호출할 수 있음.
   */
  setTTL(ms: number | null) {
    this.ttlMs = ms;
  }

  /**
   * (선택) 만료 검사 없이 현재 값을 훔쳐보기.
   * LRU 순서도 갱신하지 않는다.
   * 캐시 내부 상태를 보고 싶을 때만 사용(일반 사용엔 get() 권장).
   */
  peek(key: K): V | null {
    const entry = this.map.get(key);
    return entry ? entry.value : null;
  }
}
