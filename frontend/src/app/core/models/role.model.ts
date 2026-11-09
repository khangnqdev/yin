export interface AdminRole {
  code: string;
  name: string;
  description: string;
  rank: number;
  scope: 'ADMIN';
  isActive: boolean;
  isSystem: boolean;
  permissions: string[];
}

export type RoleInput = Pick<AdminRole, 'name' | 'description' | 'rank' | 'permissions'>;
