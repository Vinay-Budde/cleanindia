import { useState } from 'react';
import Layout from '../components/Layout';
import { Bell, Lock, Shield, Eye, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
    const userRole = localStorage.getItem('userRole') as 'citizen' | 'admin' | null;
    const layoutType = userRole === 'admin' ? 'admin' : 'citizen';

    const [notifications, setNotifications] = useState({
        email: true,
        sms: false,
        push: true,
    });

    const [privacy, setPrivacy] = useState({
        showProfile: true,
        shareData: false,
    });

    const handleSave = () => {
        toast.success('Settings saved successfully!');
    };

    return (
        <Layout type={layoutType}>
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#115e59] mb-2">Account Settings</h1>
                    <p className="text-gray-500">Manage your notification preferences, privacy, and security.</p>
                </div>

                <div className="space-y-6">
                    {/* Notifications Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Bell className="w-5 h-5 text-[#115e59]" />
                            <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">Email Notifications</p>
                                    <p className="text-xs text-gray-500">Receive updates about your reports via email</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifications.email}
                                    onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                                    className="w-4 h-4 text-[#115e59] rounded focus:ring-[#115e59]"
                                />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">SMS Alerts</p>
                                    <p className="text-xs text-gray-500">Get text messages for critical civic updates</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifications.sms}
                                    onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })}
                                    className="w-4 h-4 text-[#115e59] rounded focus:ring-[#115e59]"
                                />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">Push Notifications</p>
                                    <p className="text-xs text-gray-500">Real-time alerts in your web browser</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifications.push}
                                    onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                                    className="w-4 h-4 text-[#115e59] rounded focus:ring-[#115e59]"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Security & Privacy */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-5 h-5 text-[#115e59]" />
                            <h2 className="text-lg font-bold text-gray-900">Privacy & Security</h2>
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                <div className="flex items-start gap-3">
                                    <Eye className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">Public Profile</p>
                                        <p className="text-xs text-gray-500">Show my name on the leaderboard</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={privacy.showProfile}
                                    onChange={(e) => setPrivacy({ ...privacy, showProfile: e.target.checked })}
                                    className="w-4 h-4 text-[#115e59] rounded focus:ring-[#115e59]"
                                />
                            </label>

                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                <div className="flex items-start gap-3">
                                    <Lock className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">Change Password</p>
                                        <p className="text-xs text-gray-500">Update your account password</p>
                                    </div>
                                </div>
                                <button className="text-sm font-semibold text-[#115e59] hover:underline">
                                    Update
                                </button>
                            </label>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            className="bg-[#115e59] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#0f4d49] transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            Save Preferences
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Settings;
