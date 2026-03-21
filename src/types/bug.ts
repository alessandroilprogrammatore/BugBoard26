export type BugType = 'bug' | 'feature' | 'question' | 'documentation';
export type BugStatus = 'todo' | 'in_progress' | 'resolved' | 'archived';
export type BugPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface BugAttachment {
  storedFilename: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface Bug {
  id: string;
  title: string;
  description: string;
  type: BugType;
  status: BugStatus;
  priority: BugPriority;
  labels: string[];
  assignee?: string;
  assigneeName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  attachments?: BugAttachment[];
  duplicateOf?: string;
}

export interface Comment {
  id: string;
  bugId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}

export interface HistoryEvent {
  id: string;
  bugId: string;
  userId: string;
  userName: string;
  type: 'created' | 'status_changed' | 'assigned' | 'label_changed' | 'archived' | 'duplicated';
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'assigned' | 'resolved' | 'mentioned' | 'commented';
  bugId: string;
  bugTitle: string;
  message: string;
  read: boolean;
  createdAt: Date;
}
