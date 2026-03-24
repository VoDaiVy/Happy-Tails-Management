export type AISeverity = "low" | "medium" | "high";
export type AIUrgency = "yes" | "no";

export interface AIHealthDiagnosis {
  symptoms: string;
  severity: AISeverity;
  possibleConditions: string[];
  advice: string;
  urgency: AIUrgency;
  recommendedServices: string[];
}

export interface DiagnoseImagePayload {
  imageUri: string;
  imageType?: string;
  fileName?: string;
  symptoms?: string;
  petId?: string;
}

export interface DiagnoseImageResult {
  diagnosis: AIHealthDiagnosis;
  fileName: string;
  fileSize: number;
  analyzedAt: string;
}
