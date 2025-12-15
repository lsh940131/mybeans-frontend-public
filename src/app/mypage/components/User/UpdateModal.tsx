"use client";

/**
 * UserUpdateModal 컴포넌트
 *
 * - "설정" 클릭 시 표시되는 사용자 정보 수정 모달
 * - signupType 에 따라 수정 가능한 필드 및 API endpoint 가 달라진다.
 *   - EMAIL(A): 이름, 이미지, 현재 비밀번호, 새 비밀번호
 *     → PUT /be/user/email
 *   - SNS(B/C/D): 이름, 이미지만
 *     → PUT /be/user/sns
 * - 이미지는 /be/upload-url 에서 presigned POST 정보를 받은 뒤 S3/MinIO에 업로드한다.
 *
 * props:
 *  - user: 현재 사용자 정보
 *  - onClose: 모달 닫기 콜백
 *  - onUpdated: 사용자 정보 수정 성공 시 상위에 변경된 user 객체 전달
 */
import { SignupTypeEnum, IUser } from "../../types";
import { useEffect, useState } from "react";
import { fetchApi } from "@/utils/client/fetchApi";

interface PresignedResponse {
  url: string;
  fields: Record<string, string>;
}

interface UserUpdateModalProps {
  user: IUser;
  onClose: () => void;
  onUpdated: (user: IUser) => void;
}

export function UserUpdateModal({ user, onClose, onUpdated }: UserUpdateModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(user.image ?? null);
  const [name, setName] = useState(user.name ?? "");
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwdConfirm, setNewPwdConfirm] = useState("");

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEmailSignup = user.signupType === SignupTypeEnum.EMAIL;

  /**
   * 이미지 파일 업로드 핸들러
   * - /be/upload-url 에서 presigned 정보 획득
   * - FormData 에 fields + file(name="file") 를 담아 S3/MinIO 로 업로드
   * - 업로드 성공 시 imageUrl 상태를 최종 URL로 갱신
   */
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setUploading(true);

    try {
      // 1) presigned URL 정보 요청
      const presigned = await fetchApi<PresignedResponse>("/be/file/upload-url", {
        method: "POST",
        body: {
          target: "USER_IMAGE",
          filename: file.name,
          contentType: file.type || "image/jpeg",
        },
      });

      const { url, fields } = presigned;

      // 2) multipart/form-data 구성
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // S3 Presigned POST 규약: 파일 필드명은 반드시 'file'
      formData.append("file", file);

      // 3) 실제 업로드
      const uploadRes = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("이미지 업로드에 실패했습니다.");
      }

      // 4) 최종 이미지 경로 구성
      //  - url: http://localhost:9000/mybeans-local
      //  - fields.key: user/1/image/...
      const finalImageUrl = `${url}/${fields.key}`;
      setImageUrl(finalImageUrl);
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error)?.message ?? "이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  /**
   * 폼 제출 핸들러
   *
   * - EMAIL(A): PUT /be/user/email
   * - SNS(B/C/D): PUT /be/user/sns
   * - 비밀번호 변경 시 프론트에서 간단한 유효성 검증 수행
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMsg(null);
    setSubmitting(true);

    try {
      // 0) 변경 여부 계산
      const nameChanged = name !== user.name;
      const imageChanged = imageUrl !== user.image;

      // 비밀번호 변경 의도 여부 (EMAIL 가입자만 의미 있음)
      const wantsPwdChange =
        isEmailSignup &&
        (curPwd.trim().length > 0 || newPwd.trim().length > 0 || newPwdConfirm.trim().length > 0);

      const hasBaseChanges = nameChanged || imageChanged;

      // 아무것도 안 바뀌었으면 서버 호출하지 않고 그냥 닫기
      if (!hasBaseChanges && !wantsPwdChange) {
        onClose();
        setSubmitting(false);
        return;
      }

      // 1) 공통 payload (name, image) - 변경된 것만 포함
      const basePayload: { name?: string | null; image?: string | null } = {};
      if (nameChanged) {
        basePayload.name = name;
      }
      if (imageChanged) {
        // imageUrl 이 null 이거나 string 인 경우 그대로 전달
        basePayload.image = imageUrl;
      }

      let endpoint = "";
      let payload: {
        name?: string | unknown;
        image?: string | null;
        curPwd?: string | unknown;
        pwd?: string | unknown;
      } = { ...basePayload };

      // 2) 이메일 가입자(A)인 경우
      if (isEmailSignup) {
        endpoint = "/be/user/email";

        if (wantsPwdChange) {
          // 비밀번호 변경 요청 시: 세 필드 모두 필요
          if (!curPwd.trim() || !newPwd.trim() || !newPwdConfirm.trim()) {
            setErrorMsg(
              "비밀번호를 변경하려면 현재 비밀번호와 새 비밀번호를 모두 입력해야 합니다."
            );
            setSubmitting(false);
            return;
          }

          // 길이 체크: 6 이상 50 미만
          const isValidLength = (pwd: string) => pwd.length >= 6 && pwd.length < 50;

          if (!isValidLength(curPwd) || !isValidLength(newPwd)) {
            setErrorMsg("비밀번호는 6자 이상 50자 미만이어야 합니다.");
            setSubmitting(false);
            return;
          }

          if (newPwd !== newPwdConfirm) {
            setErrorMsg("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
            setSubmitting(false);
            return;
          }

          payload = {
            ...payload,
            curPwd: curPwd,
            pwd: newPwd,
          };
        }
      } else {
        // 3) SNS 가입자(B/C/D)
        endpoint = "/be/user/sns";
        // 비밀번호 필드는 포함하지 않음
      }

      // 4) 실제 수정 요청
      await fetchApi<IUser>(endpoint, {
        method: "PUT",
        body: payload,
      });

      // 5) 사용자 정보 조회
      const updatedUser = await fetchApi<IUser>("/be/user", { method: "GET" });

      onUpdated(updatedUser);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(
        (err as Error)?.message ??
          "회원정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * ESC 키 입력 시 onClose 호출
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  /**
   * 모달 바깥 영역 클릭 시 onClose 호출
   */
  const handleOverlayClick = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white px-6 py-5 shadow-lg"
        onClick={e => e.stopPropagation()} // 모달 내부 클릭 시 닫힘 방지
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">회원정보 수정</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이미지 업로드 (중앙 정렬 + 더 큰 사이즈 + 클릭 시 변경) */}
          <div className="flex flex-col items-center gap-3">
            <label className="flex cursor-pointer flex-col items-center gap-2">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="프로필 이미지 미리보기"
                  className="h-24 w-24 rounded-full object-cover bg-gray-100"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 text-4xl">
                  👤
                </div>
              )}
              <span className="text-xs text-gray-500">
                {uploading ? "업로드 중..." : "이미지를 클릭해 변경"}
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                className="hidden"
                onChange={handleImageChange}
              />
            </label>

            {imageUrl && !uploading && (
              <button
                type="button"
                className="text-xs text-gray-500 underline"
                onClick={() => setImageUrl(null)}
              >
                이미지 제거
              </button>
            )}
          </div>

          {/* 이름 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              placeholder="이름을 입력하세요"
            />
          </div>

          {/* 이메일 가입자만 비밀번호 변경 필드 노출 */}
          {isEmailSignup && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={curPwd}
                  onChange={e => setCurPwd(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="현재 비밀번호"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  변경할 비밀번호
                </label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="새 비밀번호"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  변경할 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={newPwdConfirm}
                  onChange={e => setNewPwdConfirm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="새 비밀번호 확인"
                />
              </div>
            </>
          )}

          {/* 에러 메시지 */}
          {errorMsg && <div className="text-sm text-red-500">{errorMsg}</div>}

          {/* 액션 버튼 */}
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {submitting ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
