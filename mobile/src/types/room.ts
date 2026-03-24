export interface Room {
  _id: string;
  roomNumber: string;
  name: string;
  type: "standard" | "deluxe" | "suite" | "vip";
  serviceType: "service" | "boarding" | "hotel";
  capacity: number;
  pricePerNight: number;
  isAvailable: boolean;
  isActive: boolean;
  group?: "wet" | "dry";
  amenities?: string[];
  petTypes?: string[];
  description?: string;
}
