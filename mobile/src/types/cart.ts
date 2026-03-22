export interface CartItem {
  _id: string;
  serviceId: string;
  name: string;
  price: number;
  duration: number;
  imageUrl?: string | null;
  quantity: number;
  subtotal: number;
  note?: string;
}

export interface Cart {
  _id?: string;
  userId?: string;
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
  updatedAt?: string;
}

export interface CartEnvelope {
  success: boolean;
  message: string;
  data: Cart;
}
