"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { fetchApi } from "@/utils/client/fetchApi";
import { SignGoogle } from "../Google";
import { SignNaver } from "../Naver";
import { SignKakao } from "../Kakao";
import { runSigninScenario } from "../SigninScenario";

export default function Sign() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [isSigninActive, setIsSigninActive] = useState(false);
  const [isRememberMe, setIsRememberMe] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  useEffect(() => {
    // 이메일, 패스워드 자동완성된 값 반영 (브라우저 자동완성 대응)
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const pwdInput = document.getElementById("password") as HTMLInputElement | null;
    if (emailInput?.value) setEmail(emailInput.value);
    if (pwdInput?.value) setPwd(pwdInput.value);
  }, []);

  useEffect(() => {
    // 이메일, 패스워드 값이 입력되면 활성화
    setIsSigninActive(email.length > 0 && pwd.length > 0);
  }, [email, pwd]);

  const executeSignin = async () => {
    try {
      await fetchApi<boolean>(`/be/user/signin/email`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          rememberMe: isRememberMe,
          email,
          pwd,
        },
      });

      await runSigninScenario();

      router.push(redirectTo);
    } catch (e) {
      console.error("login error", e);
    }
  };

  return (
    <section className="w-full flex flex-col items-center">
      <h2
        className="mt-30 text-2xl font-bold font-sans hover:cursor-pointer"
        onClick={() => {
          router.push("/");
        }}
      >
        mybeans
      </h2>

      <div className="mt-15 ml-57.5">
        <input
          type="checkbox"
          checked={isRememberMe}
          onChange={e => setIsRememberMe(e.target.checked)}
        />
        <label
          htmlFor="rememberMe"
          className={`select-none ${isRememberMe ? "text-black" : "text-gray-400"}`}
        >
          로그인 상태 유지
        </label>
      </div>

      <div className="border border-gray-300 rounded-md p-[1rem]">
        <form
          className="flex flex-col"
          method="POST"
          onSubmit={e => {
            e.preventDefault();
            executeSignin();
          }}
        >
          <input
            type="email"
            id="email"
            name="email"
            placeholder=" 이메일"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") executeSignin();
            }}
            className="relative w-[20rem] h-10 flex border border-gray-300 rounded-md"
          />

          <input
            type="password"
            id="password"
            name="password"
            placeholder=" 비밀번호"
            required
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            onKeyDown={e => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") executeSignin();
            }}
            className="relative w-[20rem] h-10 flex border border-gray-300 rounded-md border-t-0"
          />

          <button
            type="submit"
            disabled={!isSigninActive}
            className={`relative w-[20rem] h-10 mt-1.5 rounded-md text-white transition-all duration-300
              ${isSigninActive ? "bg-black font-bold cursor-pointer" : "bg-gray-400 font-normal"}`}
          >
            로그인
          </button>
        </form>
        <div className="mt-3 flex justify-center text-sm space-x-2 text-neutral-700">
          <button>비밀번호 찾기</button>
          <span>|</span>
          <button>아이디 찾기</button>
          <span>|</span>
          <button>회원가입</button>
        </div>

        <div className="mt-7 flex justify-center items-center gap-20">
          <SignGoogle rememberMe={isRememberMe} redirectTo={redirectTo} />
          <SignNaver rememberMe={isRememberMe} redirectTo={redirectTo} />
          <SignKakao rememberMe={isRememberMe} redirectTo={redirectTo} />
        </div>
      </div>
    </section>
  );
}
