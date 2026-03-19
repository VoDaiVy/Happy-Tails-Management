import { axiosClient } from "../axiosClient";
import type { Pet, PetListResponse } from "../../types/pet";

export async function getMyPets(active: "true" | "false" = "true") {
  const response = await axiosClient.get<PetListResponse>("/pets", {
    params: { active },
  });

  return response.data.data.pets;
}

export async function createPet(payload: {
  petName: string;
  breed: string;
  gender: "male" | "female" | "unknown";
  weight: number;
  petType?: string;
  dateOfBirth?: string;
}) {
  const response = await axiosClient.post<{ status: "success" | "error"; message: string; data: { pet: Pet } }>("/pets", payload);
  return response.data.data.pet;
}

export async function updatePet(petId: string, payload: Partial<{
  petName: string;
  breed: string;
  gender: "male" | "female" | "unknown";
  weight: number;
  petType?: string;
  dateOfBirth?: string;
}>) {
  const response = await axiosClient.put<{ status: "success" | "error"; message: string; data: { pet: Pet } }>(`/pets/${petId}`, payload);
  return response.data.data.pet;
}

export async function deletePet(petId: string) {
  const response = await axiosClient.delete<{ status: "success" | "error"; message: string }>(`/pets/${petId}`);
  return response.data;
}
