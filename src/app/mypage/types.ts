export enum SignupTypeEnum {
  EMAIL = "A", // 이메일 인증
  NAVER = "B", // 네이버 간편
  KAKAO = "C", // 카카오 간편
  GOOGLE = "D", // 구글 간편
}

export enum SignSnsTypeEnum {
  NAVER = "B", // 네이버 간편
  KAKAO = "C", // 카카오 간편
  GOOGLE = "D", // 구글 간편
}

export interface IUser {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly signupType: string;
  readonly image: string | null;
  readonly isSeller: boolean;
  readonly pwdLastUpdatedAt: Date | null;
}

export interface IUserAddress {
  id: number;
  name: string;
  receiverName: string;
  phone: string;
  address: string;
  addressDetail: string;
  postcode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
