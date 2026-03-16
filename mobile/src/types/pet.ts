export interface Pet {
  _id: string;
  petName: string;
  petType?: string;
  breed?: string;
  isActive?: boolean;
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
