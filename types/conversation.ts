export interface Conversation {
  id: string;
  createdAt: string;
  duration: number;
  status: ConversationStatus;
  audioUrl: string;
  transcript?: string;
}

export type ConversationStatus = 
  | "completed"
  | "processing"
  | "failed"; 