"use client";

import { useEffect, useState, useRef } from "react";

import Image from "next/image";
import banner1 from "./assets/banner_find_your_coffee.png";
import banner2 from "./assets/banner_free_shipping.png";
import banner3 from "./assets/banner_startbucks.png";
import banner4 from "./assets/banner_summer_event.png";
import btnLeft from "./assets/btn_left.png";
import btnRight from "./assets/btn_right.png";
import btnStop from "./assets/btn_stop.png";
import btnGo from "./assets/btn_go.png";

const banners = [banner1, banner2, banner3, banner4];

export default function Banner() {
  const [index, setIndex] = useState(1);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const prevIndex = (index - 1 + banners.length) % banners.length;
  const nextIndex = (index + 1) % banners.length;

  useEffect(() => {
    if (!paused) {
      intervalRef.current = setInterval(() => {
        setIndex(prev => (prev + 1) % banners.length);
      }, 3000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused]);

  const goPrev = () => {
    setIndex(prev => (prev - 1 + banners.length) % banners.length);
  };

  const goNext = () => {
    setIndex(prev => (prev + 1) % banners.length);
  };

  const togglePause = () => {
    setPaused(prev => !prev);
  };

  return (
    <div className="w-full">
      {/* 슬라이더 영역 */}
      <div className="h-96 overflow-hidden">
        <div className="flex justify-center items-center gap-4 w-full h-full">
          {/* Prev */}
          <div className="relative w-1/3 h-full opacity-50 scale-95 -translate-x-4 transition-all duration-1000">
            <Image src={banners[prevIndex]} alt="prev" fill className="object-contain" />
          </div>

          {/* Current */}
          <div className="relative w-1/3 h-full opacity-100 scale-105 transition-all duration-1000">
            <Image src={banners[index]} alt="current" fill className="object-contain" priority />
          </div>

          {/* Next */}
          <div className="relative w-1/3 h-full opacity-50 scale-95 translate-x-4 transition-all duration-1000">
            <Image src={banners[nextIndex]} alt="next" fill className="object-contain" />
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div className="mt-2 flex justify-end gap-4 items-center text-xl">
        <div className="text-sm">
          {index + 1}/{banners.length}
        </div>

        <button onClick={goPrev} title="이전" className="w-10 h-10 relative">
          <Image src={btnLeft} alt="이전" fill className="object-contain" />
        </button>

        <button onClick={togglePause} title="정지/재생" className="w-10 h-10 relative">
          <Image
            src={paused ? btnGo : btnStop}
            alt={paused ? "재생" : "정지"}
            fill
            className="object-contain"
          />
        </button>

        <button onClick={goNext} title="다음" className="w-10 h-10 relative">
          <Image src={btnRight} alt="다음" fill className="object-contain" />
        </button>
      </div>
    </div>
  );
}
