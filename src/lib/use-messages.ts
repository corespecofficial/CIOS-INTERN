"use client";

import { create } from "zustand";

export interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isMe: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  avatarGradient: string;
  initials: string;
  preview: string;
  time: string;
  unread: number;
  online: boolean;
  messages: Message[];
}

interface MessagesState {
  conversations: Conversation[];
  activeConversationId: string;
  isTyping: boolean;
  selectConversation: (id: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
  markAsRead: (conversationId: string) => void;
}

function now() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const REPLIES = [
  "Got it, thanks for the update!",
  "Sounds good. Let me check and get back to you.",
  "Appreciate you letting me know 👍",
  "Great work on that! Keep it up.",
  "Can we hop on a quick call later?",
  "I'll review it tonight and send feedback.",
  "Perfect timing — I was just thinking about that.",
  "Noted. Will follow up with the team.",
];

const INITIAL: Conversation[] = [
  {
    id: "c1",
    name: "Chidinma Okafor",
    avatarGradient: "linear-gradient(135deg, #AB47BC, #1E88E5)",
    initials: "CO",
    preview: "Can you review my UI mockups?",
    time: "2m",
    unread: 2,
    online: true,
    messages: [
      { id: "m1", senderId: "c1", text: "Hey! I just finished the new landing page mockups.", time: "10:45 AM", isMe: false },
      { id: "m2", senderId: "c1", text: "Can you review them when you get a chance?", time: "10:46 AM", isMe: false },
      { id: "m3", senderId: "me", text: "Sure! Send them over.", time: "10:50 AM", isMe: true },
      { id: "m4", senderId: "c1", text: "Just shared the Figma link. Let me know your thoughts!", time: "10:52 AM", isMe: false },
    ],
  },
  {
    id: "c2",
    name: "Emeka Nwosu",
    avatarGradient: "linear-gradient(135deg, #66BB6A, #1E88E5)",
    initials: "EN",
    preview: "Thanks for the code review!",
    time: "1h",
    unread: 0,
    online: true,
    messages: [
      { id: "m1", senderId: "c2", text: "Thanks for the detailed code review earlier!", time: "9:30 AM", isMe: false },
      { id: "m2", senderId: "me", text: "No problem! Your PR looked solid overall.", time: "9:35 AM", isMe: true },
      { id: "m3", senderId: "c2", text: "I pushed the fixes. Ready for another look?", time: "10:00 AM", isMe: false },
    ],
  },
  {
    id: "c3",
    name: "Fatima Ibrahim",
    avatarGradient: "linear-gradient(135deg, #FFC107, #FF7043)",
    initials: "FI",
    preview: "See you at the standup!",
    time: "3h",
    unread: 1,
    online: false,
    messages: [
      { id: "m1", senderId: "c3", text: "Are you joining the team standup today?", time: "Yesterday", isMe: false },
      { id: "m2", senderId: "me", text: "Yes, I'll be there at 10am sharp.", time: "Yesterday", isMe: true },
      { id: "m3", senderId: "c3", text: "Great! See you at the standup!", time: "8:15 AM", isMe: false },
    ],
  },
  {
    id: "c4",
    name: "Oluwaseun Adeyemi",
    avatarGradient: "linear-gradient(135deg, #EF5350, #AB47BC)",
    initials: "OA",
    preview: "Did you finish the deck?",
    time: "5h",
    unread: 0,
    online: false,
    messages: [
      { id: "m1", senderId: "c4", text: "Did you finish the presentation deck?", time: "Yesterday", isMe: false },
      { id: "m2", senderId: "me", text: "Almost done — just polishing the final slides.", time: "Yesterday", isMe: true },
    ],
  },
  {
    id: "c5",
    name: "Blessing Eze",
    avatarGradient: "linear-gradient(135deg, #1E88E5, #66BB6A)",
    initials: "BE",
    preview: "Congrats on the promotion!",
    time: "1d",
    unread: 0,
    online: false,
    messages: [
      { id: "m1", senderId: "c5", text: "Heard about your promotion — huge congrats! 🎉", time: "Yesterday", isMe: false },
      { id: "m2", senderId: "me", text: "Thank you so much! Means a lot 🙏", time: "Yesterday", isMe: true },
    ],
  },
  {
    id: "c6",
    name: "Adaeze Okonkwo",
    avatarGradient: "linear-gradient(135deg, #FF7043, #FFC107)",
    initials: "AO",
    preview: "Let me know when you're free",
    time: "2d",
    unread: 0,
    online: true,
    messages: [
      { id: "m1", senderId: "c6", text: "Hey, want to pair on the backend next week?", time: "Monday", isMe: false },
      { id: "m2", senderId: "me", text: "Sounds great. Let me know when you're free.", time: "Monday", isMe: true },
    ],
  },
];

export const useMessages = create<MessagesState>((set, get) => ({
  conversations: INITIAL,
  activeConversationId: "c1",
  isTyping: false,

  selectConversation: (id) => {
    set((s) => ({
      activeConversationId: id,
      conversations: s.conversations.map(c =>
        c.id === id ? { ...c, unread: 0 } : c
      ),
    }));
  },

  markAsRead: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map(c =>
        c.id === conversationId ? { ...c, unread: 0 } : c
      ),
    })),

  sendMessage: (conversationId, text) => {
    const t = text.trim();
    if (!t) return;
    const time = now();
    const newMsg: Message = { id: `m${Date.now()}`, senderId: "me", text: t, time, isMe: true };
    set((s) => ({
      conversations: s.conversations.map(c =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, newMsg], preview: t, time: "now" }
          : c
      ),
    }));

    // Simulate typing + reply after ~2s
    set({ isTyping: true });
    setTimeout(() => {
      const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
      const replyMsg: Message = {
        id: `m${Date.now() + 1}`,
        senderId: conversationId,
        text: reply,
        time: now(),
        isMe: false,
      };
      set((s) => ({
        isTyping: false,
        conversations: s.conversations.map(c =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, replyMsg], preview: reply, time: "now" }
            : c
        ),
      }));
    }, 2200);
  },
}));
