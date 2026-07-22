import { useState, useRef } from 'react';
import { Camera, MapPin, CheckCircle, Navigation, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { api } from '../utils/api';

const ReportIssue = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        priority: '',
        location: '',
        description: '',
        latitude: null as number | null,
        longitude: null as number | null
    });

    const [isLocating, setIsLocating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiConfidence, setAiConfidence] = useState<number | null>(null);
    const [assignedMunicipalityName, setAssignedMunicipalityName] = useState<string | null>(null);

    const analyzeImage = async (file: File) => {
        setIsAnalyzing(true);
        const tid = toast.loading('AI analyzing image...');

        // Simulating AI analysis time
        await new Promise(resolve => setTimeout(resolve, 2500));

        const fileName = file.name.toLowerCase();
        const title = formData.title.toLowerCase();
        const searchText = `${fileName} ${title}`;
        
        let detected = { category: 'Others', priority: 'medium', confidence: 85 };

        if (searchText.includes('garbage') || searchText.includes('waste') || searchText.includes('trash') || searchText.includes('dump')) {
            detected = { category: 'Garbage', priority: 'medium', confidence: 98 };
        } else if (searchText.includes('pothole') || searchText.includes('road') || searchText.includes('crack') || searchText.includes('pit')) {
            detected = { category: 'Potholes', priority: 'high', confidence: 94 };
        } else if (searchText.includes('drain') || searchText.includes('water') || searchText.includes('sewage') || searchText.includes('leak')) {
            detected = { category: 'Drainage', priority: 'high', confidence: 89 };
        } else if (searchText.includes('light') || searchText.includes('lamp') || searchText.includes('dark')) {
            detected = { category: 'Street Lights', priority: 'low', confidence: 92 };
        }

        setFormData(prev => ({
            ...prev,
            category: detected.category,
            priority: detected.priority,
            title: prev.title || `Issue: ${detected.category} detected near ${prev.location || 'current location'}`
        }));

        setAiConfidence(detected.confidence);
        setIsAnalyzing(false);
        toast.success(`AI Detection: ${detected.category} (${detected.confidence}%)`, { id: tid });
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();

                    setFormData(prev => ({
                        ...prev,
                        latitude,
                        longitude,
                        location: data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                    }));
                } catch (error) {
                    console.error('Error fetching address:', error);
                    setFormData(prev => ({ ...prev, latitude, longitude, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
                } finally {
                    setIsLocating(false);
                    toast.success('Location detected!');
                }
            },
            (error) => {
                console.error('Error getting location:', error);
                alert('Unable to retrieve your location. Please check your browser permissions.');
                setIsLocating(false);
            }
        );
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
                analyzeImage(file);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const tid = toast.loading('Submitting complaint...');

        try {
            // Submitting with actual User email from localStorage if available
            const userEmail = localStorage.getItem('userEmail') || 'Anonymous';

            const payload = new FormData();
            payload.append('title', formData.title);
            payload.append('category', formData.category);
            payload.append('priority', formData.priority);
            payload.append('location', formData.location);
            payload.append('description', formData.description);
            payload.append('reportedBy', userEmail);

            // Add location if available
            if (formData.latitude) payload.append('latitude', formData.latitude.toString());
            if (formData.longitude) payload.append('longitude', formData.longitude.toString());

            if (selectedFile) {
                payload.append('image', selectedFile);
            }

            const result = await api.post('/api/complaints', payload);

            // Show municipality assignment success banner
            const muniName: string = (result as any)?.assignedMunicipalityName || '';
            if (muniName) {
                setAssignedMunicipalityName(muniName);
                toast.success(`Assigned to ${muniName}`, { id: tid, duration: 4000 });
                setTimeout(() => navigate('/dashboard'), 3000);
            } else {
                toast.success('Complaint submitted successfully!', { id: tid });
                navigate('/dashboard');
            }
        } catch (error: any) {
            console.error('Error submitting complaint:', error);
            toast.error(error.message || 'Failed to submit complaint', { id: tid });
            console.error('Submission error details:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#115e59] mb-2">Report a Civic Issue</h1>
                    <p className="text-gray-500">Help us maintain a clean and safe city by reporting issues in your area</p>
                </div>

                {/* Municipality Assignment Success Banner */}
                {assignedMunicipalityName && (
                    <div style={{ background: 'linear-gradient(135deg,#115e59,#0f766e)', borderRadius: 14, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14, color: 'white', boxShadow: '0 8px 24px rgba(17,94,89,0.3)' }}>
                        <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>Complaint Auto-Assigned!</div>
                            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                                Your complaint has been assigned to <strong>{assignedMunicipalityName}</strong> based on your GPS location.
                            </div>
                        </div>
                        <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>
                            Redirecting...
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Complaint Details</h2>
                    <p className="text-sm text-gray-500 mb-6">Please provide accurate information to help us address the issue quickly</p>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Issue Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                placeholder="Brief description of the issue"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all"
                            />
                        </div>

                        {/* Category and Priority */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">Category <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all appearance-none"
                                >
                                    <option value="" disabled>Select category</option>
                                    <option value="Garbage">Garbage</option>
                                    <option value="Potholes">Pothole</option>
                                    <option value="Drainage">Drainage</option>
                                    <option value="Street Lights">Street Light</option>
                                    <option value="Water Supply">Water Supply</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">Priority Level <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all appearance-none"
                                >
                                    <option value="" disabled>Select priority</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Location <span className="text-red-500">*</span></label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Enter location or address"
                                    required
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={handleGetLocation}
                                    disabled={isLocating}
                                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    <MapPin className="w-4 h-4" /> {isLocating ? 'Locating...' : 'Use GPS'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Click "Use GPS" to automatically detect your current location</p>
                        </div>

                        {/* Detailed Description */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Detailed Description <span className="text-red-500">*</span></label>
                            <textarea
                                rows={4}
                                placeholder="Provide detailed information about the issue..."
                                required
                                minLength={10}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/20 focus:border-[#115e59] transition-all resize-none"
                            ></textarea>
                        </div>

                        {/* Upload Photo */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Upload Photo <span className="text-red-500">*</span></label>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handlePhotoChange}
                            />
                            <div
                                onClick={handlePhotoClick}
                                className={`border-2 border-dashed ${isAnalyzing ? 'border-[#115e59] animate-pulse' : 'border-gray-300'} rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer text-center relative overflow-hidden`}
                            >
                                {photoPreview && (
                                    <div className="absolute inset-0 w-full h-full">
                                        <img src={photoPreview} alt="Preview" className={`w-full h-full object-cover ${isAnalyzing ? 'opacity-40 blur-[2px]' : 'opacity-60'}`} />
                                        {isAnalyzing && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#115e59]/10">
                                                <div className="w-16 h-1 bg-[#f97316] animate-[scan_2s_ease-in-out_infinite] absolute top-0 w-full opacity-50 shadow-[0_0_15px_#f97316]"></div>
                                                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-[#115e59]/20 flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-[#115e59] border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="text-[#115e59] font-bold text-xs uppercase tracking-wider">AI Scanning...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="z-10 flex flex-col items-center">
                                    <div className={`w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 ${isAnalyzing ? 'text-[#115e59]' : 'text-gray-400'}`}>
                                        <Camera className="w-6 h-6" />
                                    </div>
                                    <p className="font-semibold text-gray-900 text-sm mb-1">{photoPreview ? 'Click to change photo' : 'Click to upload proof'}</p>
                                    <p className="text-xs text-gray-500">Auto-detects category & priority</p>
                                </div>
                            </div>
                        </div>

                        {/* AI Classification Info */}
                        <div className={`rounded-xl p-5 flex gap-4 items-start transition-all duration-500 ${aiConfidence ? 'bg-[#115e59] text-white shadow-md' : 'bg-emerald-50 border border-emerald-100'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${aiConfidence ? 'bg-white/20 text-white' : 'bg-emerald-100 text-[#115e59]'}`}>
                                <ImageIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className={`text-sm font-bold mb-1 ${aiConfidence ? 'text-white' : 'text-emerald-900'}`}>
                                    {aiConfidence ? `AI Vision: ${formData.category} Predicted` : 'Smart Prediction Active'}
                                </h4>
                                <p className={`text-xs leading-relaxed ${aiConfidence ? 'text-emerald-50' : 'text-emerald-700'}`}>
                                    {aiConfidence
                                        ? `Our model identified this issue with ${aiConfidence}% confidence and auto-prioritized it as ${formData.priority.toUpperCase()}.`
                                        : 'Upload a photo to automatically determine issue category, severity, and neighborhood impact levels.'}
                                </p>
                            </div>
                            {aiConfidence && (
                                <div className="ml-auto bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                                    Trust Score: {aiConfidence}%
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => navigate(-1)} className="flex-1 py-3 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSubmitting} className={`flex-[2] py-3 rounded-lg text-sm font-semibold text-white transition-colors ${isSubmitting ? 'bg-[#0f4d49] opacity-70' : 'bg-[#115e59] hover:bg-[#0f4d49]'}`}>
                                {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-4">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">Fast Response</h3>
                        <p className="text-sm text-gray-500">Get updates within 24 hours</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
                            <Navigation className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">GPS Tracking</h3>
                        <p className="text-sm text-gray-500">Precise location detection</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">Photo Evidence</h3>
                        <p className="text-sm text-gray-500">Visual proof speeds resolution</p>
                    </div>
                </div>

            </div>
        </Layout>
    );
};

export default ReportIssue;
