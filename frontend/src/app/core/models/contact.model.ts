export type ContactStatus = 'NEW' | 'CONTACTED' | 'IN_PROGRESS' | 'CLOSED';

export interface Contact {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  companyName?: string;
  projectType: string;
  budgetRange: string;
  message: string;
  status: ContactStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactCreateDto {
  fullName: string;
  email: string;
  phone: string;
  companyName?: string;
  projectType: string;
  budgetRange: string;
  message: string;
}

