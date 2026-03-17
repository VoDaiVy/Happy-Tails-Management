import { axiosClient } from "../axiosClient";
import type { PetListResponse } from "../../types/pet";

export async function getMyPets(active: "true" | "false" = "true") {
  const response = await axiosClient.get<PetListResponse>("/pets", {
    params: { active },
  });

  return response.data.data.pets;
}
