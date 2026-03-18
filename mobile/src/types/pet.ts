export interface Pet {
  _id: string;
  petName: string;
  petType?: string;
  breed?: string;
  gender?: "male" | "female" | "unknown";
  weight?: number;
  dateOfBirth?: string;
  temperament?: string[];
  specialNeeds?: string;
  allergies?: string[];
  medicalRecords?: PetMedicalRecord[];
  vaccinations?: PetVaccinationRecord[];
  isActive?: boolean;
}

export interface PetMedicalRecord {
  date: string;
  type?: "checkup" | "vaccination" | "treatment" | "surgery" | "emergency" | "other";
  diagnosis: string;
  treatment?: string;
  veterinarian?: string;
  clinic?: string;
  medications?: string[];
  notes?: string;
}

export interface PetVaccinationRecord {
  name: string;
  date: string;
  nextDueDate?: string | null;
  veterinarian?: string;
}

export interface VaccinationReminderItem {
  pet: {
    id: string;
    name: string;
    breed?: string;
    category?: string;
  };
  upcomingVaccinations: PetVaccinationRecord[];
}

export interface PetStatistics {
  totalPets?: number;
  activePets?: number;
  inactivePets?: number;
  byType?: Record<string, number>;
  byGender?: Record<string, number>;
  temperamentDistribution?: Record<string, number>;
  averageAge?: number;
  oldestPet?: {
    name: string;
    age?: string;
    ageInMonths?: number;
  } | null;
  youngestPet?: {
    name: string;
    age?: string;
    ageInMonths?: number;
  } | null;
}

export interface PetListResponse {
  status: "success" | "error";
  results: number;
  data: {
    pets: Pet[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalPets: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface PetStatisticsResponse {
  status: "success" | "error";
  data: {
    statistics: PetStatistics;
  };
}

export interface VaccinationReminderResponse {
  status: "success" | "error";
  results: number;
  data: {
    reminders: VaccinationReminderItem[];
    checkPeriod?: string;
    checkDate?: string;
  };
}
