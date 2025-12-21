import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, LogIn, Star, MapPin, Mic, MicOff, Volume2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../api';
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { Link, useNavigate } from 'react-router-dom';

interface Hospital {
    id: number;
    name: string;
    imageUrl: string;
    city: string;
    rating: number;
    address: string;
}

interface Message {
    role: 'system' | 'user' | 'assistant' | 'bot';
    content: string;
    hospitals?: Hospital[];
}

interface ChatWidgetProps {
    autoOpen?: boolean;
    embedMode?: boolean;
}

// Hospital Card Component
const HospitalCard = ({ hospital, onClick, theme }: { hospital: Hospital; onClick: () => void; theme: string }) => (
    <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${theme === 'dark'
            ? 'bg-gray-700/50 hover:bg-gray-700 border-gray-600'
            : 'bg-white hover:bg-gray-50 border-gray-200'
            }`}
    >
        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-200">
            {hospital.imageUrl ? (
                <img
                    src={hospital.imageUrl}
                    alt={hospital.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Hospital';
                    }}
                />
            ) : (
                <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}`}>
                    <MapPin size={20} className="text-gray-400" />
                </div>
            )}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {hospital.name}
            </h4>
            <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                <MapPin size={10} className="inline mr-1" />
                {hospital.city}
            </p>
            {hospital.rating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {hospital.rating.toFixed(1)}
                    </span>
                </div>
            )}
        </div>
    </motion.div>
);

const ChatWidget = ({ autoOpen = false, embedMode = false }: ChatWidgetProps) => {
    const { theme } = useTheme();
    const navigate = useNavigate();
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
                // Determine what to do based on auth status
                if (isAuthenticated) {
                    setIsOpen(true);
                }
                // We might want to show auth prompt for autoOpen if not authenticated
                // but let's be less intrusive for now unless explicitly requested
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

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

                recognitionRef.current.onerror = () => {
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            window.speechSynthesis?.cancel();
        };
    }, []);

    // Toggle speech recognition
    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    // Get current website language from Google Translate
    const getCurrentLanguage = (): string => {
        // Try to get language from Google Translate combo
        const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (select && select.value) {
            return select.value;
        }

        // Fallback: check the html lang attribute (Google Translate modifies this)
        const htmlLang = document.documentElement.lang;
        if (htmlLang && htmlLang !== 'en') {
            return htmlLang.split('-')[0]; // Get base language code
        }

        return 'en';
    };

    // Map language codes to speech synthesis locale codes
    const getVoiceLocale = (langCode: string): string => {
        const localeMap: { [key: string]: string } = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'te': 'te-IN',
            'ta': 'ta-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
            'mr': 'mr-IN',
            'gu': 'gu-IN',
            'bn': 'bn-IN',
            'pa': 'pa-IN',
            'or': 'or-IN',
            'as': 'as-IN',
            'ur': 'ur-IN',
        };
        return localeMap[langCode] || 'en-US';
    };

    // Text-to-speech for bot messages
    const speakMessage = (text: string, messageIndex: number) => {
        if (!window.speechSynthesis) {
            alert('Text-to-speech is not supported in your browser.');
            return;
        }

        // If already speaking this message, stop it
        if (speakingMessageId === messageIndex) {
            window.speechSynthesis.cancel();
            setSpeakingMessageId(null);
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Get the current website language
        const currentLang = getCurrentLanguage();
        const voiceLocale = getVoiceLocale(currentLang);

        console.log('Speaking in language:', currentLang, 'Locale:', voiceLocale);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.lang = voiceLocale;

        // Try to find a voice for the selected language
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(v => v.lang.startsWith(currentLang));
        if (matchingVoice) {
            utterance.voice = matchingVoice;
        }

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

            // Get current website language
            const currentLang = getCurrentLanguage();

            const response = await apiRequest<{ reply?: string; error?: string; type?: string; hospitals?: Hospital[] }, { messages: any[], language?: string }>(
                '/api/chat',
                'POST',
                { messages: history, language: currentLang }
            );

            if (response.type === 'hospitals' && response.hospitals) {
                // Hospital search response
                setMessages(prev => [...prev, {
                    role: 'bot',
                    content: response.reply || "Here are the hospitals I found:",
                    hospitals: response.hospitals
                }]);
            } else if (response.reply) {
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

    const handleHospitalClick = (hospitalId: number) => {
        navigate(`/find-hospital/${hospitalId}`);
        setIsOpen(false);
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
                                    <div className={`max-w-[80%] ${msg.role === 'user' ? '' : 'flex flex-col'}`}>
                                        <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                            : (theme === 'dark' ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-white text-gray-700 border-gray-100') + ' rounded-tl-none border'
                                            }`}>
                                            {msg.content}
                                            {/* Render hospital cards if present */}
                                            {msg.hospitals && msg.hospitals.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {msg.hospitals.map((hospital) => (
                                                        <HospitalCard
                                                            key={hospital.id}
                                                            hospital={hospital}
                                                            onClick={() => handleHospitalClick(hospital.id)}
                                                            theme={theme}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {/* Speaker button for bot messages */}
                                        {(msg.role === 'bot' || msg.role === 'system') && (
                                            <button
                                                onClick={() => speakMessage(msg.content, idx)}
                                                className={`mt-1 p-1.5 rounded-full self-start transition-all ${speakingMessageId === idx
                                                    ? 'bg-indigo-500 text-white animate-pulse'
                                                    : theme === 'dark' ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                                    }`}
                                                title={speakingMessageId === idx ? 'Stop speaking' : 'Listen to response'}
                                            >
                                                <Volume2 size={14} />
                                            </button>
                                        )}
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
                                {/* Microphone Button */}
                                <button
                                    onClick={toggleListening}
                                    className={`p-2 rounded-full transition-all ${isListening
                                        ? 'bg-red-500 text-white animate-pulse'
                                        : theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                                    title={isListening ? 'Stop listening' : 'Start voice input'}
                                >
                                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                                </button>
                                {/* Send Button */}
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
                                <p className={`text-[13px] underline ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Not a professional diagnosis. Consult a doctor.</p>
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
                    onClick={() => {
                        if (isAuthenticated) {
                            setIsOpen(!isOpen);
                        } else {
                            if (isOpen) setIsOpen(false); // Close if open (shouldn't be, but just in case)
                            setShowAuthPrompt(!showAuthPrompt);

                            // Auto hide after 5 seconds
                            if (!showAuthPrompt) {
                                setTimeout(() => setShowAuthPrompt(false), 5000);
                            }
                        }
                    }}
                    className={`p-4 rounded-full shadow-2xl transition-all duration-300 pointer-events-auto 
                        ${isOpen ? 'bg-red-500 hover:bg-red-600 rotate-90 hidden sm:flex' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-indigo-500/50 flex'}
                        `}
                >
                    {isOpen ? <X size={28} color="white" /> : <MessageCircle size={28} color="white" />}
                </motion.button>
            )}

            {/* Auth Prompt Popover */}
            <AnimatePresence>
                {showAuthPrompt && !isAuthenticated && !embedMode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10, x: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10, x: 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className={`absolute bottom-20 right-0 w-72 p-4 rounded-xl shadow-xl border z-50 pointer-events-auto
                            ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}
                        `}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <Bot size={16} className="text-blue-500" />
                                Restricted Access
                            </h4>
                            <button
                                onClick={() => setShowAuthPrompt(false)}
                                className={`p-1 rounded-full hover:bg-opacity-20 ${theme === 'dark' ? 'hover:bg-gray-500' : 'hover:bg-gray-200'}`}
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            Login or Sign up to access the Chatbot feature and explore the website.
                        </p>

                        <div className="flex gap-2">
                            <Link
                                to="/login"
                                onClick={() => setShowAuthPrompt(false)}
                                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                            >
                                <LogIn size={12} />
                                Login
                            </Link>
                            <Link
                                to="/signup"
                                onClick={() => setShowAuthPrompt(false)}
                                className={`flex-1 py-2 px-3 border text-xs font-medium rounded-lg transition-colors flex items-center justify-center
                                    ${theme === 'dark'
                                        ? 'border-gray-600 hover:bg-gray-700 text-gray-200'
                                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'}
                                `}
                            >
                                Sign Up
                            </Link>
                        </div>

                        {/* Little triangle pointer at the bottom right */}
                        <div className={`absolute -bottom-2 right-6 w-4 h-4 transform rotate-45 border-b border-r
                             ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                        `}></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatWidget;
