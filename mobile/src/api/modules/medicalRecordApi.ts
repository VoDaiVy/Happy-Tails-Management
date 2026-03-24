import { axiosClient } from "../axiosClient";
import { extractPayload } from "../responseParser";

export interface MedicalRecordItem {
  _id: string;
  userPet?: string | Record<string, unknown>;
  user?: string | Record<string, unknown>;
  booking?: string | Record<string, unknown>;
  recordType?: string;
  condition?: string;
  diagnosis?: string;
  treatment?: string;
  medications?: unknown[];
  vitals?: Record<string, unknown>;
  notes?: string;
  followUpDate?: string;
  workflowStage?: "received" | "processing" | "completed";
  receivedPhotos?: string[];
  processingPhotos?: string[];
  completedPhotos?: string[];
  images?: string[];
  stageHistory?: Array<{
    stage?: "received" | "processing" | "completed";
    notes?: string;
    updatedAt?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicalRecordsQuery {
  userId?: string;
  petId?: string;
  bookingId?: string;
  recordType?: string;
  page?: number;
  limit?: number;
}

export async function getAllMedicalRecords(query: MedicalRecordsQuery = {}) {
  const response = await axiosClient.get("/medical-records", { params: query });
  const payload = extractPayload<{
    records?: MedicalRecordItem[];
    pagination?: Record<string, unknown>;
  }>(response.data);

  return {
    records: payload.records || [],
    pagination: payload.pagination,
  };
}

export async function getMyPetsMedicalRecords(query: MedicalRecordsQuery = {}) {
  const response = await axiosClient.get("/medical-records/my-pets", { params: query });
  const payload = extractPayload<{
    records?: MedicalRecordItem[];
  }>(response.data);

  return payload.records || [];
}

export async function getMedicalRecordById(recordId: string) {
  const response = await axiosClient.get(`/medical-records/${recordId}`);
  const payload = extractPayload<{ record?: MedicalRecordItem }>(response.data);
  return payload.record as MedicalRecordItem;
}

export async function createMedicalRecord(payload: {
  userPet: string;
  user: string;
  booking?: string;
  recordType?: string;
  condition: string;
  diagnosis: string;
  treatment: string;
  medications?: unknown[];
  vitals?: Record<string, unknown>;
  notes?: string;
  followUpDate?: string;
}) {
  const response = await axiosClient.post("/medical-records", payload);
  const data = extractPayload<{ record?: MedicalRecordItem }>(response.data);
  return data.record as MedicalRecordItem;
}

export async function updateMedicalRecord(recordId: string, payload: Partial<{
  recordType: string;
  condition: string;
  diagnosis: string;
  treatment: string;
  medications: unknown[];
  vitals: Record<string, unknown>;
  notes: string;
  followUpDate: string;
}>) {
  const response = await axiosClient.put(`/medical-records/${recordId}`, payload);
  const data = extractPayload<{ record?: MedicalRecordItem }>(response.data);
  return data.record as MedicalRecordItem;
}

export async function updateMedicalRecordStage(recordId: string, payload: {
  stage: "received" | "processing" | "completed";
  notes?: string;
  photos?: string[];
}) {
  const response = await axiosClient.patch(`/medical-records/${recordId}/stage`, payload);
  const data = extractPayload<{ record?: MedicalRecordItem }>(response.data);
  return data.record as MedicalRecordItem;
}

export async function deleteMedicalRecord(recordId: string) {
  const response = await axiosClient.delete(`/medical-records/${recordId}`);
  return extractPayload<null>(response.data);
}
