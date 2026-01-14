"use client";
import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";

interface CaptchaComponentProps {
    onCaptchaChange: (isValid: boolean) => void;
    className?: string;
}

export interface CaptchaComponentRef {
    refreshCaptcha: () => void;
}

const CaptchaComponent = forwardRef<CaptchaComponentRef, CaptchaComponentProps>(
    ({ onCaptchaChange, className = "" }, ref) => {
        const [captchaQuestion, setCaptchaQuestion] = useState("");
        const [captchaAnswer, setCaptchaAnswer] = useState("");
        const [userAnswer, setUserAnswer] = useState("");
        const [isValid, setIsValid] = useState(false);
        const [captchaId, setCaptchaId] = useState("");
        const [isRefreshing, setIsRefreshing] = useState(false);
        const [isAudioSupported, setIsAudioSupported] = useState(false);
        const [isAudioPlaying, setIsAudioPlaying] = useState(false);

        // const generateCaptcha = () => {
        const generateCaptcha = useCallback(() => {

            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            setIsAudioPlaying(false);
            // Simple addition only for better user experience
            const num1 = Math.floor(Math.random() * 10) + 1; // Numbers 1-10
            const num2 = Math.floor(Math.random() * 10) + 1; // Numbers 1-10

            const answer = num1 + num2;
            const question = `${num1} + ${num2}`;

            setCaptchaQuestion(question);
            setCaptchaAnswer(answer.toString());
            setUserAnswer("");
            setIsValid(false);
            onCaptchaChange(false);
            setCaptchaId(Math.random().toString(36).substring(2, 11));
         }, [onCaptchaChange]);   
        // };

        useImperativeHandle(ref, () => {

            return {
                refreshCaptcha: () => {
    
                    generateCaptcha();
                },
            };
        });

        useEffect(() => {
            generateCaptcha();
        }, [generateCaptcha]);

        useEffect(() => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                setIsAudioSupported(true);
            }

            return () => {
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }
            };
        }, []);

        const handleUserAnswerChange = (value: string) => {
            setUserAnswer(value);
            const isValidAnswer = value === captchaAnswer;
            setIsValid(isValidAnswer);
            onCaptchaChange(isValidAnswer);
        };

        const handleRefresh = () => {
            if (isRefreshing) return; // Prevent rapid clicking

            setIsRefreshing(true);
            generateCaptcha();

            // Add a small delay to prevent rapid refreshing
            setTimeout(() => {
                setIsRefreshing(false);
            }, 500);
        };

        // Generate random visual distortion styles
        const getDistortionStyle = (index: number) => {
            const rotations = [-2, 1, -1, 2, -1.5, 1.5];
            const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
            const fontWeights = ['bold', 'normal'];
            const fontSizes = ['1.1rem', '1.2rem', '1rem', '1.15rem'];

            return {
                transform: `rotate(${rotations[index % rotations.length]}deg)`,
                color: colors[index % colors.length],
                fontWeight: fontWeights[index % fontWeights.length] as 'bold' | 'normal',
                fontSize: fontSizes[index % fontSizes.length],
                textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
                userSelect: 'none' as const,
                WebkitUserSelect: 'none' as const,
                MozUserSelect: 'none' as const,
                msUserSelect: 'none' as const,
            };
        };

        const formatQuestionForAudio = (question: string) => {
            if (!question) return "";
            return `${question.replace('+', ' plus ')} equals what? Enter the answer as a number.`;
        };

        const handlePlayAudio = () => {
            if (!isAudioSupported || !captchaQuestion || typeof window === 'undefined' || !window.speechSynthesis) {
                return;
            }

            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(formatQuestionForAudio(captchaQuestion));
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.onstart = () => setIsAudioPlaying(true);
            utterance.onend = () => setIsAudioPlaying(false);
            utterance.onerror = () => setIsAudioPlaying(false);
            window.speechSynthesis.speak(utterance);
        };

        return (
            <div className={`space-y-3 ${className}`} key={captchaId}>
                <Label className="text-gray-700 dark:text-gray-300 font-medium">
                    Security Verification
                </Label>

                <div className="flex items-center space-x-3">
                    <div
                        className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 relative overflow-hidden"
                        style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
                    >
                        {/* Background noise pattern */}
                        <div className="absolute inset-0 opacity-5" key={`noise-${captchaId}`}>
                            {[...Array(20)].map((_, i) => (
                                <div
                                    key={`${captchaId}-noise-${i}`}
                                    className="absolute w-1 h-1 bg-gray-400 rounded-full"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`,
                                    }}
                                />
                            ))}
                        </div>

                        {/* CAPTCHA text with individual character styling */}
                        <div className="text-center relative z-10">
                            <div className="flex justify-center items-center space-x-1">
                                {captchaQuestion.split('').map((char, index) => (
                                    <span
                                        key={`${captchaId}-${index}`}
                                        style={getDistortionStyle(index)}
                                        className="inline-block"
                                        onContextMenu={(e) => e.preventDefault()}
                                        onCopy={(e) => e.preventDefault()}
                                        onCut={(e) => e.preventDefault()}
                                        onPaste={(e) => e.preventDefault()}
                                    >
                                        {char}
                                    </span>
                                ))}
                                <span
                                    style={getDistortionStyle(captchaQuestion.length)}
                                    className="inline-block ml-2"
                                    onContextMenu={(e) => e.preventDefault()}
                                    onCopy={(e) => e.preventDefault()}
                                    onCut={(e) => e.preventDefault()}
                                    onPaste={(e) => e.preventDefault()}
                                >
                                    = ?
                                </span>
                            </div>
                        </div>

                        {/* Additional security overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-black/5 to-transparent"></div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={`p-2 transition-colors bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 ${isRefreshing
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            title="Refresh CAPTCHA"
                            aria-label="Refresh CAPTCHA"
                        >
                            <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        {isAudioSupported && (
                            <button
                                type="button"
                                onClick={handlePlayAudio}
                                disabled={isAudioPlaying}
                                className={`p-2 transition-colors bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 ${isAudioPlaying
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                title="Play audio CAPTCHA"
                                aria-label="Play audio CAPTCHA"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 8.75C19 10 19 14 15.75 15.25M12 5.75v12.5l-4-4H5a1 1 0 01-1-1v-2.5a1 1 0 011-1h3l4-4z" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <Input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => handleUserAnswerChange(e.target.value)}
                        placeholder="Enter your answer"
                        className={`transition-all duration-200 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 ${userAnswer && !isValid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                            }`}
                        onPaste={(e) => {
                            // Prevent pasting in the answer field for additional security
                            e.preventDefault();
                            return false;
                        }}
                    />
                    {userAnswer && !isValid && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            Incorrect answer. Please try again.
                        </p>
                    )}
                    {isValid && (
                        <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                            ✓ Verification successful
                        </p>
                    )}
                </div>

                {/* Security notice */}
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    <svg className="inline w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Security verification required
                </div>
            </div>
        );
    });

CaptchaComponent.displayName = 'CaptchaComponent';

export default CaptchaComponent; 
