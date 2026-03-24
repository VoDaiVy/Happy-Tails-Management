import { getRooms } from "./roomApi";
import type { Room } from "../../types/room";

export async function getAdminRooms(params?: { isActive?: "true" | "false" | "all"; type?: string; serviceType?: "service" | "boarding" }) {
  const rows = await getRooms(params as Record<string, unknown>);

  return rows.map((item) => ({
    _id: item._id,
    roomNumber: item.roomNumber || "",
    name: item.name || item.roomNumber || "Room",
    type: (item.serviceType === "boarding" ? "deluxe" : "standard") as Room["type"],
    serviceType: (item.serviceType === "boarding" ? "boarding" : "service") as Room["serviceType"],
    capacity: Number(item.capacity || 0),
    pricePerNight: 0,
    isAvailable: true,
    isActive: item.isActive !== false,
    group: item.group as Room["group"],
  }));
}
