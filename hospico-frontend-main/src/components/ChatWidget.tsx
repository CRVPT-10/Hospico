import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, MapPin, Mic, MicOff, Volume2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../api';
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { Link } from 'react-router-dom';
import SharedHospitalCard, { type Hospital as HospitalType } from './HospitalCard';

interface Hospital extends HospitalType { }

interface Message {
    role: 'system' | 'user' | 'assistant' | 'bot';
    content: string;
    hospitals?: Hospital[];
    symptomMatch?: {
        symptom: string;
        inferredIssue: string;
        specializations: string[];
        confidence: string;
        disclaimer: string;
    };
}

interface ChatWidgetProps {
    autoOpen?: boolean;
    embedMode?: boolean;
}

const ChatWidget = ({ autoOpen = false, embedMode = false }: ChatWidgetProps) => {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);

    // Get auth state from Redux store
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    // Handle auth state changes
    useEffect(() => {
        if (isAuthenticated) {
            setShowAuthPrompt(false);
        } else {
            // User logged out
            setIsOpen(false);
            setMessages([
                { role: 'system', content: "Hi! I'm your health assistant. I can provide general symptom information, but please note that I may not be fully accurate. For a proper diagnosis, please always consult a doctor." }
            ]);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (autoOpen || embedMode || (typeof window !== 'undefined' && window.self !== window.top)) {
            if (embedMode || autoOpen) {
                if (isAuthenticated) {
                    setIsOpen(true);
                }
            }
        }
    }, [autoOpen, embedMode, isAuthenticated]);

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
    const [isListening, setIsListening] = useState(false);
    const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // Get user location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.log('Geolocation error:', error.message);
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
            );
        }
    }, []);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInput(prev => prev + ' ' + transcript);
                    setIsListening(false);
                };

                recognitionRef.current.onerror = () => setIsListening(false);
                recognitionRef.current.onend = () => setIsListening(false);
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            window.speechSynthesis?.cancel();
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const getCurrentLanguage = (): string => {
        const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (select && select.value) return select.value;
        const htmlLang = document.documentElement.lang;
        if (htmlLang && htmlLang !== 'en') return htmlLang.split('-')[0];
        return 'en';
    };

    const getVoiceLocale = (langCode: string): string => {
        const localeMap: { [key: string]: string } = {
            'en': 'en-US', 'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN', 'kn': 'kn-IN',
            'ml': 'ml-IN', 'mr': 'mr-IN', 'gu': 'gu-IN', 'bn': 'bn-IN', 'pa': 'pa-IN',
            'or': 'or-IN', 'as': 'as-IN', 'ur': 'ur-IN'
        };
        return localeMap[langCode] || 'en-US';
    };

    const speakMessage = (text: string, messageIndex: number) => {
        if (!window.speechSynthesis) return;
        if (speakingMessageId === messageIndex) {
            window.speechSynthesis.cancel();
            setSpeakingMessageId(null);
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getVoiceLocale(getCurrentLanguage());
        utterance.onstart = () => setSpeakingMessageId(messageIndex);
        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onerror = () => setSpeakingMessageId(null);
        window.speechSynthesis.speak(utterance);
    };

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

            const response = await apiRequest<{
                reply?: string;
                type?: string;
                hospitals?: Hospital[];
                symptom?: string;
                inferredIssue?: string;
                specializations?: string[];
                confidence?: string;
                disclaimer?: string;
            }, any>(
                '/api/chat',
                'POST',
                {
                    messages: history,
                    language: getCurrentLanguage(),
                    latitude: userLocation?.latitude,
                    longitude: userLocation?.longitude
                }
            );

            if (response.hospitals) {
                setMessages(prev => [...prev, {
                    role: 'bot',
                    content: response.reply || "Based on your symptoms, here are some recommended hospitals:",
                    hospitals: response.hospitals,
                    symptomMatch: response.type === 'specialization_match' ? {
                        symptom: response.symptom || '',
                        inferredIssue: response.inferredIssue || '',
                        specializations: response.specializations || [],
                        confidence: response.confidence || 'medium',
                        disclaimer: response.disclaimer || 'This is not a medical diagnosis.'
                    } : undefined
                }]);
            } else {
                setMessages(prev => [...prev, { role: 'bot', content: response.reply || "I'm sorry, I couldn't process that." }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', content: "Sorry, I'm having trouble connecting to the server." }]);
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
                        className={`w-full h-full sm:w-[380px] sm:h-[600px] ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} shadow-2xl border flex flex-col overflow-hidden pointer-events-auto`}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white shadow-md">
                            <div className="flex items-center gap-3">
                                <Bot size={20} />
                                <h3 className="font-semibold text-lg">HealthMate Bot</h3>
                            </div>
                            {!embedMode && (
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {/* Messages Area */}
                        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-blue-600'} text-white`}>
                                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                        </div>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : (theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-700')} shadow-sm border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'} overflow-hidden`}>
                                            <div className="whitespace-pre-wrap break-words font-medium">{msg.content}</div>

                                            {msg.symptomMatch && (
                                                <div className="mt-3 space-y-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {msg.symptomMatch.specializations.map((spec, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] rounded-full">
                                                                {spec}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-[11px] rounded border border-amber-200/50">
                                                        ⚠️ {msg.symptomMatch.disclaimer}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hospitals scroll outside bubbles for better layout */}
                                    {msg.hospitals && msg.hospitals.length > 0 && (
                                        <div className="ml-10 mt-2 space-y-2 max-w-[calc(100%-40px)] overflow-hidden">
                                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x w-full">
                                                {msg.hospitals.map((h, hIdx) => (
                                                    <div key={`${h.clinicId || h.id}-${hIdx}`} className="min-w-[240px] max-w-[240px] snap-start">
                                                        <SharedHospitalCard hospital={h} theme={theme} showDistance={true} />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Map Link */}
                                            <a
                                                href={`https://www.google.com/maps/search/hospitals+near+${msg.hospitals[0].latitude},${msg.hospitals[0].longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200/50 dark:border-blue-800/50"
                                            >
                                                <MapPin size={12} />
                                                VIEW ALL ON GOOGLE MAPS
                                            </a>
                                        </div>
                                    )}
                                    {(msg.role === 'bot' || msg.role === 'system') && (
                                        <button onClick={() => speakMessage(msg.content, idx)} className="ml-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                            <Volume2 size={14} className={speakingMessageId === idx ? 'text-indigo-500 animate-pulse' : ''} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-center gap-2 text-gray-400 text-xs ml-10">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Thinking...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className={`p-4 border-t ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                            <div className={`flex items-center border rounded-full px-4 py-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Type symptoms..."
                                    className={`flex-1 bg-transparent border-none focus:ring-0 text-sm h-8 ${theme === 'dark' ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                                />
                                <button onClick={toggleListening} className={`p-2 rounded-full ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                                </button>
                                <button onClick={handleSend} disabled={!input.trim() || isLoading} className="p-2 text-indigo-600 disabled:opacity-50">
                                    <Send size={18} />
                                </button>
                            </div>
                            <p className="text-[11px] text-center mt-2 text-gray-400 underline">Not a professional diagnosis. Consult a doctor.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!embedMode && (
                <button
                    onClick={() => isAuthenticated ? setIsOpen(!isOpen) : setShowAuthPrompt(!showAuthPrompt)}
                    className="p-4 rounded-full bg-indigo-600 text-white shadow-xl pointer-events-auto hover:scale-105 transition-transform"
                >
                    {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
                </button>
            )}

            {showAuthPrompt && !isAuthenticated && (
                <div className={`absolute bottom-20 right-0 w-64 p-4 rounded-xl shadow-2xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'} pointer-events-auto`}>
                    <h4 className="font-bold text-sm mb-2 text-blue-500">Login Required</h4>
                    <p className="text-xs text-gray-400 mb-4">Please login to access the chatbot and other features.</p>
                    <div className="flex gap-2">
                        <Link to="/login" className="flex-1 py-2 text-center bg-blue-600 text-white text-xs rounded font-medium">Login</Link>
                        <Link to="/signup" className="flex-1 py-2 text-center border border-gray-600 text-gray-300 text-xs rounded font-medium">Sign Up</Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWidget;
