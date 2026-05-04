export type GradeLevel = '9' | '10' | '11' | '12' | 'Staff';

export interface Category {
  id: string;
  name: string;
  description?: string;
  actions: string[];
  issues?: string[];
  active: boolean;
}

export interface LogEntry {
  id?: string;
  studentName: string;
  studentEmail: string;
  gradeLevel: GradeLevel;
  categoryId: string;
  categoryName: string;
  actionType: string;
  issueType?: string;
  status: string;
  notes?: string;
  timestamp: any; // Firestore Timestamp
  adminId?: string;
}

export interface DashboardStats {
  totalLogs: number;
  logsByCategory: Record<string, number>;
  logsByAction: Record<string, number>;
  recentLogs: LogEntry[];
}
