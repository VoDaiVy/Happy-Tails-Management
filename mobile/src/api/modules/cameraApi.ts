import { axiosClient } from "../axiosClient";
import type { CameraAccessSession, CameraItem } from "../../types/camera";

function extractPayload<T>(raw: unknown): T {
  const data = raw as { message?: unknown; data?: unknown };

  if (data && typeof data.message === "object" && data.message !== null) {
    return data.message as T;
  }

  if (data && typeof data.data === "object" && data.data !== null) {
    return data.data as T;
  }

  return raw as T;
}

export async function enableBookingCameraAccess(bookingId: string): Promise<CameraAccessSession> {
  const response = await axiosClient.post(`/camera/booking/${bookingId}/enable`);
  return extractPayload<CameraAccessSession>(response.data);
}

export async function verifyBookingCameraAccess(bookingId: string, accessToken: string) {
  const response = await axiosClient.get(`/camera/booking/${bookingId}/access`, {
    params: { accessToken },
  });

  return extractPayload<{
    booking?: { id?: string; bookingNumber?: string; status?: string };
    cameras: CameraItem[];
    accessExpiresAt?: string;
  }>(response.data);
}

export async function getBookingCameraStream(bookingId: string, cameraId: string, accessToken: string) {
  const response = await axiosClient.get(`/camera/booking/${bookingId}/stream/${cameraId}`, {
    params: { accessToken },
  });

  return extractPayload<{ streamUrl?: string; camera?: CameraItem }>(response.data);
}

export async function getAllCameras() {
  const response = await axiosClient.get("/camera");
  const payload = extractPayload<{ cameras?: CameraItem[] }>(response.data);
  return payload.cameras || [];
}
