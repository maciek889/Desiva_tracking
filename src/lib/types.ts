// Shared types derived from Prisma schema for use in client/server code

export interface Stage {
  id: string;
  name: string;
  nameEn: string;
  position: number;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Color {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFile {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  orderId: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  orderId: string;
  stageId: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  duration: number;
  cost: number;
  isActive: boolean;
  createdAt: string;
  user?: { login: string };
  stage?: Stage;
}

export interface Order {
  id: string;
  name: string;
  price: number;
  client: string;
  status: string;
  colorId: string;
  color?: Color;
  stageId: string;
  stage?: Stage;
  categoryId: string;
  category?: Category;
  uwagi: string;
  notatki: string;
  files?: OrderFile[];
  timeEntries?: TimeEntry[];
  completedAt: string | null;
  totalOfficeTime: number | null;
  totalFactoryTime: number | null;
  totalCost: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  login: string;
  role: string;
  hourlyRate: number;
}

export interface PaginatedOrders {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
