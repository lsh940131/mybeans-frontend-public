// app/components/Footer.tsx
export default function Footer() {
  return (
    <footer className="w-full border-t bg-neutral-50">
      <div className="mx-auto w-11/12 max-w-7xl py-8 grid gap-8 md:grid-cols-2 text-sm text-neutral-700">
        {/* 고객센터 */}
        <section>
          <h3 className="text-base font-semibold">고객센터</h3>
          <div className="mt-3 space-y-1">
            <p>운영시간: 평일 10:00–18:00 (점심 12:00–13:00)</p>
            <p>전화: 0000-0000</p>
            <p>이메일: help@mybeans.local</p>
          </div>
        </section>

        {/* 사업자 정보 (로컬 개발용 더미) */}
        <section>
          <h3 className="text-base font-semibold">사업자 정보</h3>
          <div className="mt-3 space-y-1">
            <p>상호: mybeans</p>
            <p>대표자: 홍길동</p>
            <p>사업자등록번호: 000-00-00000</p>
            <p>통신판매업신고번호: 2025-서울-가상-0000</p>
            <p>주소: 서울특별시 가상구 가상로 123 (로컬 개발용)</p>
            <p>개인정보보호책임자: 홍길동</p>
            <p>호스팅서비스 제공자: mybeans (local)</p>
          </div>
        </section>
      </div>

      <div className="bg-neutral-100">
        <div className="mx-auto w-11/12 max-w-7xl py-4 text-xs text-neutral-600">
          © {new Date().getFullYear()} mybeans. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
