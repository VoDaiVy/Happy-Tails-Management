import { axiosClient } from "../axiosClient";
import { extractPayload } from "../responseParser";
import type { CameraAccessSession, CameraItem } from "../../types/camera";

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

export async function getCamerasByRoom(roomId: string) {
  const response = await axiosClient.get(`/camera/room/${roomId}`);
  const payload = extractPayload<{ cameras?: CameraItem[] }>(response.data);
  return payload.cameras || [];
}

export async function getCameraById(cameraId: string) {
  const response = await axiosClient.get(`/camera/${cameraId}`);
  return extractPayload<CameraItem>(response.data);
}

export interface CreateCameraPayload {
  room: string;
  cameraName: string;
  streamUrl?: string;
  position?: string;
  resolution?: string;
  cameraType?: string;
  isOnline?: boolean;
  isActive?: boolean;
}

export async function createCamera(payload: CreateCameraPayload) {
  const response = await axiosClient.post("/camera", payload);
  return extractPayload<CameraItem>(response.data);
}

export async function updateCamera(cameraId: string, payload: Partial<CreateCameraPayload>) {
  const response = await axiosClient.patch(`/camera/${cameraId}`, payload);
  return extractPayload<CameraItem>(response.data);
}

export async function deleteCamera(cameraId: string) {
  const response = await axiosClient.delete(`/camera/${cameraId}`);
  return extractPayload<null>(response.data);
}
