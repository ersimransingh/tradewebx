export interface FamilyRow {
  id: number;
  FamilyHead: string;
  ClientCode: string;
  ClientName: string;
}

export type FamilyApiRow = Omit<FamilyRow, "id">;

export interface LoginData {
  userId: string;
  password: string;
}
