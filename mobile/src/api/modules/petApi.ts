import { axiosClient } from "../axiosClient";
import { extractPayload } from "../responseParser";
import type {
  Pet,
  PetListResponse,
  PetMedicalRecord,
  PetStatistics,
  PetStatisticsResponse,
  PetVaccinationRecord,
  VaccinationReminderItem,
  VaccinationReminderResponse,
} from "../../types/pet";

export async function getMyPets(active: "true" | "false" = "true") {
  const response = await axiosClient.get<PetListResponse>("/pets", {
    params: { active },
  });

  const payload = extractPayload<{ pets?: Pet[] }>(response.data);
  return payload.pets || [];
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
  const data = extractPayload<{ pet?: Pet }>(response.data);
  return data.pet as Pet;
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
  const data = extractPayload<{ pet?: Pet }>(response.data);
  return data.pet as Pet;
}

export async function deletePet(petId: string) {
  const response = await axiosClient.delete<{ status: "success" | "error"; message: string }>(`/pets/${petId}`);
  return extractPayload<null>(response.data);
}

export async function getPetStatistics(): Promise<PetStatistics> {
  const response = await axiosClient.get<PetStatisticsResponse>("/pets/statistics");
  const payload = extractPayload<{ statistics?: PetStatistics }>(response.data);
  return payload.statistics || {};
}

export async function getVaccinationReminders(days = 30): Promise<VaccinationReminderItem[]> {
  const response = await axiosClient.get<VaccinationReminderResponse>("/pets/vaccination-reminders", {
    params: { days },
  });
  const payload = extractPayload<{ reminders?: VaccinationReminderItem[] }>(response.data);
  return payload.reminders || [];
}

export async function addPetMedicalRecord(
  petId: string,
  payload: {
    diagnosis: string;
    treatment?: string;
    veterinarian?: string;
    date?: string;
    type?: "checkup" | "vaccination" | "treatment" | "surgery" | "emergency" | "other";
    clinic?: string;
    medications?: string[];
    notes?: string;
  },
): Promise<PetMedicalRecord> {
  const response = await axiosClient.post<{
    status: "success" | "error";
    message: string;
    data: {
      medicalRecord: PetMedicalRecord;
    };
  }>(`/pets/${petId}/medical-records`, payload);

  const data = extractPayload<{ medicalRecord?: PetMedicalRecord }>(response.data);
  return data.medicalRecord as PetMedicalRecord;
}

export async function addPetVaccinationRecord(
  petId: string,
  payload: {
    name: string;
    date: string;
    nextDueDate?: string;
    veterinarian?: string;
  },
): Promise<PetVaccinationRecord> {
  const response = await axiosClient.post<{
    status: "success" | "error";
    message: string;
    data: {
      vaccination: PetVaccinationRecord;
    };
  }>(`/pets/${petId}/vaccinations`, payload);

  const data = extractPayload<{ vaccination?: PetVaccinationRecord }>(response.data);
  return data.vaccination as PetVaccinationRecord;
}

export async function quickCreatePetForWalkIn(payload: {
  userID: string;
  petName: string;
  petType: "dog" | "cat" | "bird" | "fish" | "rabbit" | "hamster" | "other";
  breed: string;
  gender: "male" | "female" | "unknown";
  weight: number;
  dateOfBirth?: string;
  color?: string;
}) {
  const response = await axiosClient.post("/pets/staff/quick-create", payload);
  const data = extractPayload<{ pet?: Pet }>(response.data);
  return data.pet as Pet;
}
