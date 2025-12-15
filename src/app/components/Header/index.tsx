"use client";

import { useRouter } from "next/navigation";

import Image from "next/image";
import btnCart from "./assets/btn_cart.png";
import btnPerson from "./assets/btn_person.png";
import Link from "next/link";
import WatchHistory from "./components/WatchHistory";
import SearchBox from "./components/ProductSearchBox";

export default function Header() {
  const router = useRouter();

  return (
    <header className="w-full flex flex-col items-center mt-5 mb-4">
      <div className="w-4/5 flex items-center justify-between">
        {/* Logo → 홈으로 */}
        <Link href="/" className="text-2xl font-bold font-sans hover:opacity-80 active:opacity-60">
          mybeans
        </Link>

        {/* Search box */}
        <SearchBox />

        {/* Icons */}
        <div className="flex items-center">
          <WatchHistory />

          <a href="#" className="mr-4">
            <Image
              src={btnCart}
              alt="btnCart"
              width={48}
              height={48}
              className="w-12 h-12"
              onClick={() => {
                router.push("/cart");
              }}
            />
          </a>

          <a href="#">
            <Image
              src={btnPerson}
              alt="btnPerson"
              width={48}
              height={48}
              className="w-12 h-12"
              onClick={() => {
                router.push("/mypage");
              }}
            />
          </a>
        </div>
      </div>
    </header>
  );
}
