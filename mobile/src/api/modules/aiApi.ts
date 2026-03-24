import { axiosClient } from "../axiosClient";
import { extractPayload } from "../responseParser";
import type { DiagnoseImagePayload, DiagnoseImageResult } from "../../types/ai";

export async function diagnoseImageWithAI(payload: DiagnoseImagePayload): Promise<DiagnoseImageResult> {
  const formData = new FormData();

  formData.append("image", {
    uri: payload.imageUri,
    type: payload.imageType || "image/jpeg",
    name: payload.fileName || `scan-${Date.now()}.jpg`,
  } as unknown as Blob);

  if (payload.symptoms?.trim()) {
    formData.append("symptoms", payload.symptoms.trim());
  }

  if (payload.petId) {
    formData.append("petId", payload.petId);
  }

  const response = await axiosClient.post<{
    status: "success" | "error";
    data: DiagnoseImageResult;
  }>("/ai/diagnose", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return extractPayload<DiagnoseImageResult>(response.data);
}
