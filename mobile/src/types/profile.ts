export interface ProfileAddress {
  street?: string;
  city?: string;
  district?: string;
  ward?: string;
}

export interface UserProfileDetail {
  _id?: string;
  firstName?: string;
  lastName?: string;
  tel?: string;
  dob?: string;
  gender?: "male" | "female" | "other" | string;
  avatar?: string | null;
  bio?: string;
  address?: ProfileAddress;
  isProfileComplete?: boolean;
}

export interface MyProfileResponse {
  status: "success" | "error";
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      isEmailVerified?: boolean;
      lastLogin?: string;
    };
    profile: UserProfileDetail;
    completionPercentage: number;
    isProfileComplete: boolean;
  };
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  tel: string;
  dob: string;
  gender: "male" | "female" | "other" | string;
  avatar?: string | null;
  bio?: string;
  address?: ProfileAddress;
}

export interface ProfileCompletionResponse {
  status: "success" | "error";
  data: {
    completionPercentage: number;
    isProfileComplete: boolean;
    missingFields: string[];
  };
}
