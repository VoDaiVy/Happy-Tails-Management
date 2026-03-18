import { axiosClient } from "../axiosClient";
import { extractPayload } from "../responseParser";

export interface RoomItem {
  _id: string;
  roomNumber?: string;
  name?: string;
  serviceType?: string;
  group?: "wet" | "dry" | string;
  capacity?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getRooms(params?: Record<string, unknown>) {
  const response = await axiosClient.get("/rooms", { params });
  const payload = extractPayload<{ rooms?: RoomItem[] }>(response.data);
  return payload.rooms || [];
}

export async function getRoomById(roomId: string) {
  const response = await axiosClient.get(`/rooms/${roomId}`);
  const payload = extractPayload<{ room?: RoomItem }>(response.data);
  return payload.room as RoomItem;
}

export async function createRoom(payload: {
  roomNumber?: string;
  name: string;
  serviceType?: string;
  group?: "wet" | "dry";
  capacity?: number;
  isActive?: boolean;
}) {
  const response = await axiosClient.post("/rooms", payload);
  const data = extractPayload<{ room?: RoomItem }>(response.data);
  return data.room as RoomItem;
}

export async function updateRoom(roomId: string, payload: Partial<{
  roomNumber: string;
  name: string;
  serviceType: string;
  group: "wet" | "dry";
  capacity: number;
  isActive: boolean;
}>) {
  const response = await axiosClient.put(`/rooms/${roomId}`, payload);
  const data = extractPayload<{ room?: RoomItem }>(response.data);
  return data.room as RoomItem;
}

export async function deleteRoom(roomId: string) {
  const response = await axiosClient.delete(`/rooms/${roomId}`);
  return extractPayload<null>(response.data);
}
