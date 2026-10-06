export interface PRDSection {
  id: string;
  number: string;
  title: string;
  content: string;
  status: 'Draf' | 'Ditinjau' | 'Disetujui';
  lastEditedBy: string;
  lastEditedAt: string;
}

export interface UserStory {
  id: string;
  persona: string;
  story: string;
  acceptanceCriteria: string[];
  priority: 'P0 - Kritis' | 'P1 - Tinggi' | 'P2 - Menengah';
  storyPoints: number;
  status: 'Backlog' | 'Dalam Pengembangan' | 'Siap QA' | 'Selesai';
  assignee: string;
  syncedTo: ('Google Stitch' | 'Trello' | 'Jira')[];
}

export interface RevisionRecord {
  id: string;
  version: string;
  timestamp: string;
  authorName: string;
  authorRole: string;
  sectionId: string;
  sectionTitle: string;
  changeSummary: string;
  previousContent: string;
  newContent: string;
}

export interface CommentItem {
  id: string;
  sectionId: string;
  authorName: string;
  authorRole: string;
  content: string;
  timestamp: string;
  resolved: boolean;
}

export interface IntegrationLog {
  id: string;
  tool: 'Google Stitch' | 'Trello' | 'Jira';
  timestamp: string;
  action: string;
  itemsCount: number;
  targetDestination: string;
  status: 'Berhasil' | 'Menunggu Konfigurasi';
  payloadPreview: string;
}

export interface PRDDocument {
  id: string;
  title: string;
  code: string;
  templateId: string;
  templateName: string;
  version: string;
  status: 'Draf' | 'Tinjauan Teknis' | 'Disetujui' | 'Siap Rilis';
  ownerName: string;
  targetReleaseDate: string;
  updatedAt: string;
  summary: string;
  sections: PRDSection[];
  userStories: UserStory[];
  revisions: RevisionRecord[];
  comments: CommentItem[];
  stitchPromptSpec: string;
  integrationLogs: IntegrationLog[];
}

export interface ActiveCollaborator {
  clientId: string;
  name: string;
  role: string;
  color: string;
  activeDocId: string;
  activeSectionId: string | null;
  lastSeen: string;
}

export interface PRDTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultSections: { number: string; title: string; placeholder: string }[];
}
