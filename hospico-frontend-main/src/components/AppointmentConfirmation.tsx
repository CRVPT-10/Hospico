import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ConfirmationStatus = "loading" | "success" | "error";

interface AppointmentConfirmationProps {
    isOpen: boolean;
    status: ConfirmationStatus;
    errorMessage?: string;
    onClose: () => void;
    onRetry?: () => void;
}

const AppointmentConfirmation = ({
    isOpen,
    status,
    errorMessage,
    onClose,
    onRetry,
}: AppointmentConfirmationProps) => {
    // Disable ESC key during loading
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && status === "loading") {
                e.preventDefault();
            }
        };

        if (isOpen && status === "loading") {
            document.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, status]);

    // Handle backdrop click - only close if not loading
    const handleBackdropClick = () => {
        if (status !== "loading") {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${status === "loading" ? "cursor-not-allowed" : "cursor-pointer"
                            }`}
                        onClick={handleBackdropClick}
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <AnimatePresence mode="wait">
                            {/* Loading State */}
                            {status === "loading" && (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center"
                                >
                                    {/* Animated Spinner */}
                                    <div className="relative w-20 h-20 mx-auto mb-6">
                                        {/* Outer ring */}
                                        <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-slate-700" />
                                        {/* Spinning arc */}
                                        <motion.div
                                            className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 dark:border-t-blue-400"
                                            animate={{ rotate: 360 }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                                ease: "linear",
                                            }}
                                        />
                                        {/* Inner icon */}
                                        <motion.div
                                            className="absolute inset-3 bg-blue-50 dark:bg-slate-700 rounded-full flex items-center justify-center"
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                            }}
                                        >
                                            <svg
                                                className="w-7 h-7 text-blue-500 dark:text-blue-400"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </motion.div>
                                    </div>

                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                        Confirming your appointment...
                                    </h2>
                                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                                        Please wait while we process your booking
                                    </p>

                                    {/* Progress dots */}
                                    <div className="flex justify-center gap-1.5 mt-5">
                                        {[0, 1, 2].map((i) => (
                                            <motion.div
                                                key={i}
                                                className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"
                                                animate={{
                                                    scale: [1, 1.4, 1],
                                                    opacity: [0.4, 1, 0.4],
                                                }}
                                                transition={{
                                                    duration: 1.2,
                                                    repeat: Infinity,
                                                    delay: i * 0.2,
                                                }}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Success State */}
                            {status === "success" && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    className="bg-gradient-to-b from-emerald-500 to-green-600 rounded-2xl shadow-2xl p-8 text-center overflow-hidden"
                                >
                                    {/* Large Animated Tick */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{
                                            delay: 0.1,
                                            type: "spring",
                                            stiffness: 200,
                                            damping: 15,
                                        }}
                                        className="w-20 h-20 mx-auto mb-5 bg-white rounded-full flex items-center justify-center shadow-lg"
                                    >
                                        <svg
                                            className="w-12 h-12 text-emerald-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <motion.path
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: 1 }}
                                                transition={{
                                                    delay: 0.3,
                                                    duration: 0.4,
                                                    ease: "easeOut",
                                                }}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={3}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    </motion.div>

                                    {/* Success Text */}
                                    <motion.h2
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-xl font-bold text-white mb-2"
                                    >
                                        Appointment Booked!
                                    </motion.h2>

                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="text-green-100 text-sm mb-6"
                                    >
                                        Your appointment has been confirmed
                                    </motion.p>

                                    {/* Done Button */}
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 }}
                                        onClick={onClose}
                                        className="w-full py-3 bg-white text-emerald-600 font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                    >
                                        Done
                                    </motion.button>
                                </motion.div>
                            )}

                            {/* Error State */}
                            {status === "error" && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    className="bg-gradient-to-b from-red-500 to-rose-600 rounded-2xl shadow-2xl p-8 text-center overflow-hidden"
                                >
                                    {/* Error Icon */}
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{
                                            delay: 0.1,
                                            type: "spring",
                                            stiffness: 200,
                                            damping: 15,
                                        }}
                                        className="w-20 h-20 mx-auto mb-5 bg-white rounded-full flex items-center justify-center shadow-lg"
                                    >
                                        <svg
                                            className="w-10 h-10 text-red-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={3}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </motion.div>

                                    {/* Error Text */}
                                    <motion.h2
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-xl font-bold text-white mb-2"
                                    >
                                        Booking Failed
                                    </motion.h2>

                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-red-100 text-sm mb-6"
                                    >
                                        {errorMessage || "Something went wrong. Please try again."}
                                    </motion.p>

                                    {/* Action Buttons */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="flex flex-col gap-2"
                                    >
                                        <button
                                            onClick={onRetry || onClose}
                                            className="w-full py-3 bg-white text-red-600 font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                        >
                                            Try Again
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="w-full py-2.5 bg-transparent border border-white/40 text-white font-medium rounded-xl hover:bg-white/10 transition-all duration-200"
                                        >
                                            Cancel
                                        </button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AppointmentConfirmation;
