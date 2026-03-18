import { axiosClient } from "../axiosClient";
import { extractPayload } from "../responseParser";

export interface WalkInUser {
  userID: string;
  name: string;
  email: string;
  isNew: boolean;
}

export async function quickRegisterWalkInGuest(payload: {
  phone: string;
  fullName: string;
}) {
  const response = await axiosClient.post("/users/staff/quick-register", payload);
  return extractPayload<WalkInUser>(response.data);
}
