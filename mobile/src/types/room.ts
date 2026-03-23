export interface Room {
  _id: string;
  roomNumber: string;
  name: string;
  type: "standard" | "deluxe" | "suite" | "vip";
  serviceType: "service" | "boarding";
  group?: "wet" | "dry";
  capacity: number;
  pricePerNight: number;
  isAvailable: boolean;
  isActive: boolean;
  petTypes?: string[];
  amenities?: string[];
  description?: string;
}

export interface RoomUpsertPayload {
  roomNumber: string;
  name: string;
  type: "standard" | "deluxe" | "suite" | "vip";
  serviceType: "service" | "boarding";
  group?: "wet" | "dry";
  capacity: number;
  pricePerNight: number;
  description?: string;
  petTypes?: string[];
  amenities?: string[];
}
