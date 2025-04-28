"use client";
import { useState } from "react";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import axios from "axios";
import { ACTION_NAME, BASE_URL, PATH_URL } from "@/utils/constants";
import { useTheme } from "@/context/ThemeContext";

export default function ChangePassword() {
    const { colors } = useTheme();
    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);

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
                <OldPassword>${formData.currentPassword}</OldPassword>
                <NewPassword>${formData.newPassword}</NewPassword>
                <ClientCode>${localStorage.getItem('userId')}</ClientCode>
            </X_Data>
            <X_Filter></X_Filter>
            <X_GFilter></X_GFilter>
            <J_Api></J_Api>
        </dsXml>`;

        try {
            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                },
                timeout: 50000
            });

            if (response.data.success && response.data.data.rs0[0]) {
                const result = JSON.parse(response.data.data.rs0[0].Column1);

                if (result.Flag === 'S') {
                    setSuccess(result.Message);
                    setFormData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: ""
                    });
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
                <h1 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>Change Password</h1>

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
                        <Input
                            type="password"
                            id="currentPassword"
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
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
