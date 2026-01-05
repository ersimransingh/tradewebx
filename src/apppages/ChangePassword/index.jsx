"use client";
import { useState } from "react";
import CryptoJS from 'crypto-js';

import Input from "@/components/form/input/InputField";
import { IoEye,IoEyeOff } from "react-icons/io5";

import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import apiService from "@/utils/apiService";
import { ACTION_NAME, BASE_URL, PATH_URL, BASE_PATH_FRONT_END } from "@/utils/constants";
import { useTheme } from "@/context/ThemeContext";
import { getLocalStorage } from "@/utils/helper";
import { useRouter } from "next/navigation";

// Password encryption key
const passKey = "TradeWebX1234567";

// Encryption function
function Encryption(data) {
    const key = CryptoJS.enc.Utf8.parse(passKey);
    const iv = CryptoJS.enc.Utf8.parse(passKey);
    const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(data), key,
        {
            keySize: 128 / 8,
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
    return encrypted.toString();
}

export default function ChangePassword() {
    const router = useRouter()
    const { colors } = useTheme();
    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [showPasswords, setShowPasswords] = useState({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const firstLoginFromLocalStorage = getLocalStorage('firstLogin') || '';
    const isFirstTime = firstLoginFromLocalStorage === 'Y';


    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError("");
        setSuccess("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setSuccess("");

        if (!validatePassword(formData.newPassword)) {
            setError("Password must be between 4 and 8 characters");
            setIsLoading(false);
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError("New password and confirm password do not match");
            setIsLoading(false);
            return;
        }

        const xmlData = `<dsXml>
            <J_Ui>"ActionName":"${ACTION_NAME}","Option":"ChangePassword","Level":1</J_Ui>
            <Sql></Sql>
            <X_Data>
                <EOldPassword>${Encryption(formData.currentPassword)}</EOldPassword>
                <ENewPassword>${Encryption(formData.newPassword)}</ENewPassword>
                <ClientCode>${getLocalStorage('userId')}</ClientCode>
            </X_Data>
            <X_Filter></X_Filter>
            <X_GFilter></X_GFilter>
            <J_Api></J_Api>
        </dsXml>`;

        try {
            const apiUrl = BASE_URL + PATH_URL;
            const response = await apiService.postWithAuth(apiUrl, xmlData);

            if (response.data.success && response.data.data.rs0) {
  
                const result = response.data.data.rs0

                if (result.Flag === 'S') {
                    setSuccess(result.Message);
                    setFormData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: ""
                    });

                    // Clear all authentication data
                    localStorage.clear();

                    // Redirect to sign-in page after a short delay
                    // Next.js basePath config handles the base path automatically
                    setTimeout(() => {
                        // window.location.href = '/signin';
                        router.push('/signin')
                    }, 2000);
                } else {
                    setError(result.Message);
                }
            } else {
                setError("Failed to change password");
            }
        } catch (err) {
            console.error('Error changing password:', err);
            setError("Failed to change password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const validatePassword = (password) => {
        return password.length >= 4 && password.length <= 8;
    };

    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: colors?.background2 || '#f0f0f0' }}>
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8" style={{ backgroundColor: colors?.background || '#fff' }}>
        <h1 className={`${isFirstTime ? 'text-l' : 'text-2xl'} font-bold mb-6`} style={{ color: colors.text }}> {isFirstTime ? 'Change Password (First-Time/Reset Password)': 'Change Password'} </h1>
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                            <Input
                                type={showPasswords.currentPassword ? "text" : "password"}
                                id="currentPassword"
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('currentPassword')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                style={{ color: colors.text }}
                                aria-label={showPasswords.currentPassword ? "Hide password" : "Show password"}
                            >
                                {showPasswords.currentPassword ?  <IoEye/>:<IoEyeOff/>}
                            </button>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                            <Input
                                type={showPasswords.newPassword ? "text" : "password"}
                                id="newPassword"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('newPassword')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                style={{ color: colors.text }}
                                aria-label={showPasswords.newPassword ? "Hide password" : "Show password"}
                            >
                                {showPasswords.newPassword ? <IoEye/>:<IoEyeOff/>}
                            </button>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                            <Input
                                type={showPasswords.confirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('confirmPassword')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                style={{ color: colors.text }}
                                aria-label={showPasswords.confirmPassword ? "Hide password" : "Show password"}
                            >
                                {showPasswords.confirmPassword ? <IoEye/>:<IoEyeOff/>}
                            </button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full"
                    >
                        {isLoading ? "Changing Password..." : "Change Password"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
