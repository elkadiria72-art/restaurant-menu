export type TableSession = {
  table_id: number;
  table_number: number;
  qr_token: string;
  status?: string | null;
};

export type Category = {
  id: number;
  name: string;
  sort_order?: number | null;
  is_active?: boolean | null;
};

export type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category_id?: number | null;
  category?: string | null;
  image_url?: string | null;
  is_available?: boolean;
};

export type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export type Language = 'en' | 'fr' | 'ar';

export type WaiterRequestType = 'bill' | 'help';

export type OrderItem = {
  item_id?: number;
  name: string;
  quantity: number;
  unit_price: number;
};

export type OrderRecord = {
  id: number;
  table_id: number;
  table_number: number;
  items: OrderItem[];
  total_price: number;
  status: string;
  customer_notes?: string | null;
  created_at?: string | null;
};
