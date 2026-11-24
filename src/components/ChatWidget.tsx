import { useState, useEffect, useRef, FormEvent } from 'react';
import { MessageSquare, Send, X, Loader2 } from 'lucide-react';
import {
  ChatMessage,
  sendChatMessageToFirestore,
  subscribeToChatMessages,
} from '../services/firestoreService';
import { COMPANY_INFO } from '../types';

interface ChatWidgetProps {
  activeProductNumber?: string;
}

function createChatSessionId(): string {
  const uuid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 18)}${Math.random().toString(36).slice(2, 18)}`;
  return `chat-${uuid}`.padEnd(32, '0');
}

export function ChatWidget({ activeProductNumber }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId] = useState<string>(() => createChatSessionId());
  const [visitorName, setVisitorName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!nameConfirmed) return;
    const unsub = subscribeToChatMessages(
      chatId,
      (msgs) => {
        setMessages(msgs);
      },
      (err) => {
        setError((err as Error).message || 'Could not load chat messages.');
      }
    );
    return () => unsub();
  }, [chatId, nameConfirmed]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const cleanMsg = text.trim();
    const cleanName = visitorName.trim() || 'Visitor';
    if (!cleanMsg) return;

    setError('');
    setSending(true);
    try {
      await sendChatMessageToFirestore({
        chatId,
        visitorName: cleanName,
        productNumber: activeProductNumber || '',
        senderRole: 'customer',
        senderName: cleanName,
        text: cleanMsg,
      });
      setNameConfirmed(true);
      setText('');
    } catch (err) {
      setError((err as Error).message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open live support chat"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0B2545] hover:bg-[#133863] border border-white/20 rounded-xl shadow-lg transition-colors min-h-[44px]"
        >
          <MessageSquare className="w-4 h-4 text-[#EA580C]" aria-hidden="true" />
          <span>Chat with AGRO TRAD</span>
        </button>
      ) : (
        <div
          className="w-[calc(100vw-2rem)] sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
          role="dialog"
          aria-label="AGRO TRAD Live Chat"
        >
          <div className="bg-[#0B2545] text-white px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold font-display">AGRO TRAD Support Chat</div>
              <div className="text-xs text-slate-300">
                {activeProductNumber ? `Discussing ${activeProductNumber}` : `Call ${COMPANY_INFO.phone} anytime`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat window"
              className="p-1.5 text-slate-300 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 min-h-[220px] max-h-[340px]">
            {messages.length === 0 ? (
              <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-3 leading-relaxed">
                Ask us about machine price, motor capacity, or delivery to your district. Your messages are saved directly in Firebase so our team can reply.
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.senderRole === 'customer' ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[11px] text-slate-500 mb-0.5 px-1">
                    {msg.senderRole === 'admin' ? 'AGRO TRAD Team' : msg.senderName}
                  </div>
                  <div
                    className={`px-3 py-2 rounded-lg text-sm max-w-[85%] break-words ${
                      msg.senderRole === 'customer'
                        ? 'bg-[#0B2545] text-white'
                        : 'bg-white border border-slate-200 text-slate-900'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {error && (
            <div className="px-4 py-2 text-xs text-rose-700 bg-rose-50 border-t border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 space-y-2">
            {!nameConfirmed && (
              <input
                type="text"
                required
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Your Name (e.g. Rahim)"
                aria-label="Your Name"
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-[#0B2545] focus:outline-none"
              />
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your message..."
                aria-label="Type your message"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-[#0B2545] focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending}
                aria-label="Send message"
                className="inline-flex items-center justify-center px-3.5 py-2 bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 text-white rounded-lg min-h-[40px]"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
