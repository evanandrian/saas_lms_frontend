export type MessageSender = 'teacher' | 'student' | 'system';

export interface ChatMessage {
	id: string;
	sender: MessageSender;
	senderName: string;
	text: string;
	timestamp: string;
	attachmentName?: string;
}

export interface ConversationChannel {
	id: string;
	name: string;
	roleLabel: string;
	avatarInitials: string;
	unreadCount: number;
	lastMessage: string;
	lastMessageTime: string;
	isOnline: boolean;
	messages: ChatMessage[];
}

export interface StudentMessagesPageData {
	className: string;
	studentName: string;
	channels: ConversationChannel[];
}
