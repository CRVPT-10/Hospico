import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../api';

interface Message {
    role: 'system' | 'user' | 'assistant' | 'bot';
    content: string;
}

interface ChatWidgetProps {
    autoOpen?: boolean;
    embedMode?: boolean;
}

const ChatWidget = ({ autoOpen = false, embedMode = false }: ChatWidgetProps) => {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (autoOpen || embedMode || (typeof window !== 'undefined' && window.self !== window.top)) {
            if (embedMode || autoOpen) {
                setIsOpen(true);
            }
        }
    }, [autoOpen, embedMode]);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.parent) {
            window.parent.postMessage({ type: 'CHATBOT_STATE', isOpen }, '*');
        }
    }, [isOpen]);

    const [messages, setMessages] = useState<Message[]>([
        { role: 'system', content: "Hi! I'm your health assistant. I can provide general symptom information, but please note that I may not be fully accurate. For a proper diagnosis, please always consult a doctor." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages
                .filter(msg => msg.role !== 'system')
                .map(msg => ({
                    role: msg.role === 'bot' ? 'assistant' : msg.role,
                    content: msg.content
                }));

            history.push({ role: 'user', content: userMessage.content });

            const response = await apiRequest<{ reply?: string; error?: string }, { messages: any[] }>(
                '/api/chat',
                'POST',
                { messages: history }
            );

            if (response.reply) {
                setMessages(prev => [...prev, { role: 'bot', content: response.reply || "" }]);
            } else if (response.error) {
                console.error("Backend Error:", response.error);
                setMessages(prev => [...prev, { role: 'bot', content: `Error: ${response.error}` }]);
            } else {
                setMessages(prev => [...prev, { role: 'bot', content: "Received empty response from server." }]);
            }
        } catch (error) {
            console.error("Error:", error);
            setMessages(prev => [...prev, { role: 'bot', content: "Sorry, I'm having trouble connecting to the server. Please check your connection." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={embedMode ? "fixed inset-0 flex items-center justify-center z-50 pointer-events-none" : `fixed z-50 flex flex-col items-end gap-4 pointer-events-none ${isOpen ? 'inset-0 sm:inset-auto sm:bottom-6 sm:right-6' : 'bottom-6 right-6'}`}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`w-full h-full sm:w-[380px] sm:h-[600px] ${theme === 'dark' ? 'bg-gray-900/95 border-gray-700' : 'bg-white/80 border-white/20'} backdrop-blur-xl sm:rounded-2xl shadow-2xl border flex flex-col overflow-hidden font-sans pointer-events-auto ${embedMode ? 'shadow-none' : ''}`}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-full">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">HealthMate Bot</h3>
                                    <span className="text-xs text-blue-100 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                        Online
                                    </span>
                                </div>
                            </div>
                            {!embedMode && (
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {/* Messages Area */}
                        <div className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50/50'}`}>
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user'
                                        ? (theme === 'dark' ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600')
                                        : (theme === 'dark' ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600')
                                        }`}>
                                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                    </div>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : (theme === 'dark' ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-white text-gray-700 border-gray-100') + ' rounded-tl-none border'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center gap-2 text-gray-400 text-sm ml-11"
                                >
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Thinking...</span>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className={`p-4 border-t ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                            <div className={`relative flex items-center border rounded-full focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-inner ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Type your symptoms..."
                                    className={`flex-1 bg-transparent border-none py-3 px-4 focus:ring-0 text-sm h-12 ${theme === 'dark' ? 'text-gray-100 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'}`}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="p-2 mr-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-md group"
                                >
                                    <Send size={18} className={`ml-0.5 group-hover:translate-x-0.5 transition-transform ${isLoading ? 'opacity-0' : 'opacity-100'}`} />
                                    {isLoading && <Loader2 size={18} className="absolute inset-2 animate-spin" />}
                                </button>
                            </div>
                            <div className="text-center mt-2">
                                <p className={`text-[10px] ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Not a professional diagnosis. Consult a doctor.</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            {!embedMode && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`p-4 rounded-full shadow-2xl transition-all duration-300 pointer-events-auto 
                        ${isOpen ? 'bg-red-500 hover:bg-red-600 rotate-90 hidden sm:flex' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-indigo-500/50 flex'}
                        `}
                >
                    {isOpen ? <X size={28} color="white" /> : <MessageCircle size={28} color="white" />}
                </motion.button>
            )}
        </div>
    );
};

export default ChatWidget;
