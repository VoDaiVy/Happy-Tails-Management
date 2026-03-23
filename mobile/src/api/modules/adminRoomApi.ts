import { axiosClient } from "../axiosClient";
import type { Room, RoomUpsertPayload } from "../../types/room";

interface RoomListResponse {
  status: "success" | "error";
  data: {
    rooms: Room[];
  };
}

interface RoomResponse {
  status: "success" | "error";
  message?: string;
  data: {
    room: Room;
  };
}

export async function getAdminRooms(params?: { isActive?: "true" | "false" | "all"; type?: string; serviceType?: "service" | "boarding" }) {
  const response = await axiosClient.get<RoomListResponse>("/rooms", { params });
  return response.data.data.rooms;
}

export async function createAdminRoom(payload: RoomUpsertPayload) {
  const response = await axiosClient.post<RoomResponse>("/rooms", payload);
  return response.data;
}

export async function updateAdminRoom(roomId: string, payload: Partial<RoomUpsertPayload> & { isActive?: boolean; isAvailable?: boolean }) {
  const response = await axiosClient.put<RoomResponse>(`/rooms/${roomId}`, payload);
  return response.data;
}

export async function deleteAdminRoom(roomId: string) {
  const response = await axiosClient.delete<{ status: "success" | "error"; message?: string }>(`/rooms/${roomId}`);
  return response.data;
}
