import { useState, useEffect } from 'react';
import { Clock, Activity, CheckCircle, AlertCircle, Timer, Users, BarChart2, MapPin, PieChart as PieChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Layout from '../components/Layout';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';

// Priority config
const PRIORITY_CONFIG = {
    critical: { color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', label: 'Critical', dot: '#dc2626' },
    high:     { color: '#f97316', bg: '#fff7ed', border: '#fdba74', label: 'High',     dot: '#ea580c' },
    medium:   { color: '#eab308', bg: '#fefce8', border: '#fde047', label: 'Medium',   dot: '#ca8a04' },
    low:      { color: '#22c55e', bg: '#f0fdf4', border: '#86efac', label: 'Low',      dot: '#16a34a' },
} as const;

type Priority = keyof typeof PRIORITY_CONFIG;

// Creates a custom SVG pin marker for a given priority
const createPriorityIcon = (priority: string): L.DivIcon => {
    const cfg = PRIORITY_CONFIG[priority as Priority] || PRIORITY_CONFIG.low;
    const pulse = priority === 'critical' ? `
        <span style="
            position:absolute;top:-4px;left:-4px;
            width:28px;height:28px;
            border-radius:50%;
            background:${cfg.color};
            opacity:0.25;
            animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;
        "></span>` : '';
    const html = `
        <div style="position:relative;width:20px;height:20px;">
            ${pulse}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="20" height="30">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"
                    fill="${cfg.color}" stroke="white" stroke-width="1.5"/>
                <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
            </svg>
        </div>`;
    return L.divIcon({
        html,
        className: '',
        iconSize: [20, 30],
        iconAnchor: [10, 30],
        popupAnchor: [0, -32],
    });
};

// CSS keyframe injected once for critical pulse
if (!document.getElementById('ci-map-styles')) {
    const style = document.createElement('style');
    style.id = 'ci-map-styles';
    style.textContent = `
        @keyframes ping {
            75%,100% { transform:scale(2);opacity:0; }
        }
        .leaflet-popup-content-wrapper {
            border-radius: 12px !important;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15) !important;
            padding: 0 !important;
            overflow: hidden;
            border: none !important;
        }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-tip-container { margin-top: -1px; }
    `;
    document.head.appendChild(style);
}

// Heatmap Layer Component using raw Leaflet
const HeatmapLayer = ({ points }: { points: [number, number, number][] }) => {
    const map = useMap();

    useEffect(() => {
        if (!(L as any).heatLayer) return;

        const layer = (L as any).heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
        }).addTo(map);

        return () => {
            map.removeLayer(layer);
        };
    }, [map, points]);

    return null;
};


// Interface
interface ComplaintData {
    _id: string;
    complaintId: string;
    title: string;
    category: string;
    priority: string;
    location: string;
    description: string;
    status: string;
    aiScore?: number;
    assignedTo?: string;
    reportedBy?: string;
    reportedAt: string;
    resolvedAt?: string;
    latitude?: number;
    longitude?: number;
}

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        total: 0,
        resolved: 0,
        pending: 0,
        inProgress: 0,
        critical: 0,
        avgResolution: '0h',
        avgResolutionValue: '0',
        avgResolutionUnit: 'hours'
    });
    const [trendData, setTrendData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [wardData, setWardData] = useState<any[]>([]);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>('markers');
    const [activePriorities, setActivePriorities] = useState<Set<string>>(new Set(['critical', 'high', 'medium', 'low']));

    useEffect(() => {
        const fetchComplaints = async () => {
            setIsLoading(true);
            try {
                const data = await api.get<ComplaintData[]>('/api/complaints');

                const resolvedCount = data.filter(c => c.status === 'resolved').length;
                const pendingCount = data.filter(c => c.status === 'submitted' || c.status === 'verified').length;
                const inProgressCount = data.filter(c => c.status === 'assigned' || c.status === 'in progress').length;
                const criticalCount = data.filter(c => c.priority === 'critical').length;

                // Calculate Average Resolution Time
                let totalResolutionMs = 0;
                let resolvedWithDates = 0;

                data.forEach(c => {
                    if (c.status === 'resolved' && c.resolvedAt && c.reportedAt) {
                        const resolvedMs = new Date(c.resolvedAt).getTime();
                        const reportedMs = new Date(c.reportedAt).getTime();
                        totalResolutionMs += (resolvedMs - reportedMs);
                        resolvedWithDates++;
                    }
                });

                let avgResValue = '0';
                let avgResUnit = 'hours';
                let avgResText = '0h';

                if (resolvedWithDates > 0) {
                    const avgMs = totalResolutionMs / resolvedWithDates;
                    const avgHours = avgMs / (1000 * 60 * 60);
                    if (avgHours < 24) {
                        avgResValue = avgHours.toFixed(1);
                        avgResUnit = 'hours';
                        avgResText = `${Math.floor(avgHours)}h`;
                    } else {
                        const avgDays = avgHours / 24;
                        avgResValue = avgDays.toFixed(1);
                        avgResUnit = 'days';
                        avgResText = `${Math.floor(avgDays)}d`;
                    }
                }

                setStats({
                    total: data.length,
                    resolved: resolvedCount,
                    pending: pendingCount,
                    inProgress: inProgressCount,
                    critical: criticalCount,
                    avgResolution: avgResText,
                    avgResolutionValue: avgResValue,
                    avgResolutionUnit: avgResUnit
                });

                // --- AGGREGATE CHART DATA ---

                // 1. Monthly Trends
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthlyMap: any = {};

                // Initialize last 6 months
                const now = new Date();
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const label = months[d.getMonth()];
                    monthlyMap[label] = { name: label, total: 0, resolved: 0 };
                }

                data.forEach(c => {
                    const d = new Date(c.reportedAt);
                    const label = months[d.getMonth()];
                    if (monthlyMap[label]) {
                        monthlyMap[label].total++;
                        if (c.status === 'resolved') monthlyMap[label].resolved++;
                    }
                });
                setTrendData(Object.values(monthlyMap));

                // 2. Category Distribution
                const catMap: any = {};
                const colors = ['#166534', '#a855f7', '#eab308', '#22c55e', '#0ea5e9', '#f97316'];
                data.forEach(c => {
                    catMap[c.category] = (catMap[c.category] || 0) + 1;
                });
                setCategoryData(Object.entries(catMap).map(([name, value], i) => ({
                    name,
                    value,
                    color: colors[i % colors.length]
                })));

                // 3. Ward Data (Heuristic: use top 6 locations)
                const locMap: any = {};
                data.forEach(c => {
                    // Try to extract Ward number or just use location
                    const match = c.location.match(/Ward\s*(\d+)/i);
                    const key = match ? `Ward ${match[1]}` : c.location;
                    locMap[key] = (locMap[key] || 0) + 1;
                });
                setWardData(Object.entries(locMap)
                    .sort((a: any, b: any) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([name, issues]) => ({ name, issues })));

                setComplaints(data);

            } catch (error: any) {
                console.error('Failed to fetch complaints:', error);
                toast.error(error.message || 'Failed to load dashboard metrics');
            } finally {
                setIsLoading(false);
            }
        };

        fetchComplaints();
    }, []);
    return (
        <Layout type="admin">
            {/* Hero Banner */}
            <div style={{background:'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)',position:'relative',overflow:'hidden'}} className="text-white pt-10 pb-20 px-6 md:px-12 w-full">
                <div style={{position:'absolute',top:'-60px',right:'-60px',width:'280px',height:'280px',borderRadius:'50%',background:'rgba(20,184,166,0.12)',filter:'blur(50px)'}}/>
                <div style={{position:'absolute',bottom:'-40px',left:'20%',width:'200px',height:'200px',borderRadius:'50%',background:'rgba(99,102,241,0.1)',filter:'blur(40px)'}}/>
                <div className="max-w-7xl mx-auto relative">
                    <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:99,padding:'6px 16px',fontSize:12,fontWeight:600,color:'#a7f3d0',marginBottom:20}}>
                        <BarChart2 style={{width:14,height:14}}/>Municipal Corporation · Admin Portal
                    </div>
                    <h1 style={{fontSize:40,fontWeight:800,marginBottom:8,lineHeight:1.1}}>Admin <span style={{color:'#5eead4'}}>Dashboard</span></h1>
                    <p style={{color:'rgba(167,243,208,0.7)',fontSize:15}}>Real-time complaint management &amp; city analytics</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-12 relative z-10 w-full pb-12">
                {/* KPI Row 1 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
                    {[
                        {label:'Avg. Resolution',val:stats.avgResolution,sub:'Real-time based',Icon:Timer,grad:'linear-gradient(135deg,#a855f7,#7c3aed)'},
                        {label:'Pending',val:stats.pending,sub:'Needs attention',Icon:Clock,grad:'linear-gradient(135deg,#f97316,#ea580c)',border:'#f97316'},
                        {label:'In Progress',val:stats.inProgress,sub:'Active assignments',Icon:Activity,grad:'linear-gradient(135deg,#8b5cf6,#6366f1)',border:'#8b5cf6'},
                        {label:'Resolved',val:stats.resolved,sub:`${stats.total>0?Math.round(stats.resolved/stats.total*100):0}% rate`,Icon:CheckCircle,grad:'linear-gradient(135deg,#10b981,#059669)',border:'#10b981'},
                    ].map((c,i)=>(
                        <div key={i} style={{background:'white',borderRadius:16,padding:'20px 22px',boxShadow:'0 8px 32px rgba(0,0,0,0.09)',borderLeft:c.border?`4px solid ${c.border}`:undefined,border:c.border?undefined:'1px solid #f0f0f0'}} className="flex items-center gap-4">
                            <div style={{background:c.grad,borderRadius:12,width:48,height:48,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 6px 16px rgba(0,0,0,0.2)`}}>
                                <c.Icon className="w-5 h-5 text-white"/>
                            </div>
                            <div>
                                <p style={{fontSize:10,color:'#9ca3af',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>{c.label}</p>
                                <p style={{fontSize:28,fontWeight:800,color:'#111827',lineHeight:1}}>{isLoading?<Skeleton width={40} height={28}/>:c.val}</p>
                                <p style={{fontSize:11,color:'#6b7280',marginTop:2}}>{c.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* KPI Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
                    {[
                        {Icon:AlertCircle,label:'Critical Issues',val:stats.critical,grad:'linear-gradient(135deg,#ef4444,#dc2626)',bg:'#fff5f5'},
                        {Icon:Timer,label:'Avg Resolution Time',val:`${stats.avgResolutionValue} ${stats.avgResolutionUnit}`,grad:'linear-gradient(135deg,#3b82f6,#2563eb)',bg:'#eff6ff'},
                        {Icon:Users,label:'Active Citizens',val:'2,845',grad:'linear-gradient(135deg,#10b981,#059669)',bg:'#f0fdf4'},
                    ].map((c,i)=>(
                        <div key={i} style={{background:c.bg,borderRadius:16,padding:'20px',boxShadow:'0 4px 20px rgba(0,0,0,0.06)',border:'1px solid rgba(0,0,0,0.04)'}} className="flex items-center gap-4">
                            <div style={{background:c.grad,borderRadius:12,width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                <c.Icon className="w-5 h-5 text-white"/>
                            </div>
                            <div>
                                <p style={{fontSize:10,color:'#6b7280',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>{c.label}</p>
                                <p style={{fontSize:22,fontWeight:800,color:'#111827'}}>{isLoading?<Skeleton width={60} height={24}/>:c.val}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div style={{background:'white',borderRadius:16,padding:'24px',boxShadow:'0 8px 32px rgba(0,0,0,0.08)',border:'1px solid #f0f0f0'}}>
                        <h3 style={{fontWeight:700,color:'#111827',marginBottom:2}}>Monthly Complaint Trend</h3>
                        <p style={{fontSize:12,color:'#9ca3af',marginBottom:20}}>Complaints vs Resolved (Last 6 months)</p>
                        <div className="h-[280px]">
                            {isLoading?<Skeleton width="100%" height="100%"/>:(
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData} margin={{top:5,right:20,left:-20,bottom:5}}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6"/>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9ca3af',fontSize:11}} dy={8}/>
                                        <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af',fontSize:11}}/>
                                        <RechartsTooltip contentStyle={{borderRadius:10,border:'1px solid #E5E7EB',boxShadow:'0 8px 24px rgba(0,0,0,0.1)'}}/>
                                        <Legend iconType="circle" wrapperStyle={{paddingTop:16,fontSize:12}}/>
                                        <Line type="monotone" dataKey="total" name="Total" stroke="#6366f1" strokeWidth={2.5} dot={{r:4}} activeDot={{r:6}}/>
                                        <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2.5} dot={{r:4}}/>
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                    <div style={{background:'white',borderRadius:16,padding:'24px',boxShadow:'0 8px 32px rgba(0,0,0,0.08)',border:'1px solid #f0f0f0'}}>
                        <h3 style={{fontWeight:700,color:'#111827',marginBottom:2}}>Category Distribution</h3>
                        <p style={{fontSize:12,color:'#9ca3af',marginBottom:20}}>Complaints by type</p>
                        <div className="h-[280px]">
                            {isLoading?<Skeleton width="100%" height="100%"/>:(
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} innerRadius={45} dataKey="value" label={({name,percent}:any)=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                                            {categoryData.map((e:any,i:number)=><Cell key={i} fill={e.color}/>)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{borderRadius:10,border:'1px solid #E5E7EB'}}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Ward Chart */}
                <div style={{background:'white',borderRadius:16,padding:'24px',boxShadow:'0 8px 32px rgba(0,0,0,0.08)',border:'1px solid #f0f0f0',marginBottom:24}}>
                    <h3 style={{fontWeight:700,color:'#111827',marginBottom:2}}>Ward-wise Issue Distribution</h3>
                    <p style={{fontSize:12,color:'#9ca3af',marginBottom:20}}>Top 6 wards with most complaints</p>
                    <div className="h-[260px]">
                        {isLoading?<Skeleton width="100%" height="100%"/>:(
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={wardData} margin={{top:10,right:20,left:-20,bottom:5}}>
                                    <defs>
                                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1"/>
                                            <stop offset="100%" stopColor="#a855f7"/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6"/>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9ca3af',fontSize:11}} dy={8}/>
                                    <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af',fontSize:11}}/>
                                    <RechartsTooltip cursor={{fill:'#F9FAFB'}} contentStyle={{borderRadius:10,border:'1px solid #E5E7EB'}}/>
                                    <Bar dataKey="issues" name="Total Issues" fill="url(#barGrad)" radius={[6,6,0,0]} barSize={50}/>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Map Section */}
                <div style={{background:'white',borderRadius:16,padding:'24px',boxShadow:'0 8px 32px rgba(0,0,0,0.08)',border:'1px solid #f0f0f0',marginBottom:24}}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <div>
                            <h3 style={{fontWeight:700,color:'#111827',marginBottom:2}}>Geospatial Issue Analytics</h3>
                            <p style={{fontSize:12,color:'#9ca3af'}}>Live complaint visualization by priority</p>
                        </div>
                        <div style={{background:'#f3f4f6',padding:4,borderRadius:10,display:'flex'}}>
                            {(['markers','heatmap'] as const).map(m=>(
                                <button key={m} onClick={()=>setViewMode(m)} style={{padding:'6px 18px',borderRadius:8,fontSize:12,fontWeight:700,border:'none',cursor:'pointer',transition:'all 0.2s',background:viewMode===m?'white':'transparent',color:viewMode===m?'#115e59':'#9ca3af',boxShadow:viewMode===m?'0 2px 8px rgba(0,0,0,0.1)':'none'}}>
                                    {m.charAt(0).toUpperCase()+m.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {viewMode==='markers'&&(
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span style={{fontSize:11,fontWeight:600,color:'#9ca3af',marginRight:4,alignSelf:'center'}}>Filter:</span>
                            {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p=>{
                                const cfg=PRIORITY_CONFIG[p];const count=complaints.filter((c:any)=>c.priority===p&&c.latitude&&c.longitude).length;const active=activePriorities.has(p);
                                return <button key={p} onClick={()=>{setActivePriorities(prev=>{const n=new Set(prev);n.has(p)?n.delete(p):n.add(p);return n;});}} style={{background:active?cfg.bg:'#f9fafb',border:`1px solid ${active?cfg.border:'#e5e7eb'}`,color:active?cfg.color:'#9ca3af',borderRadius:99,padding:'4px 14px',fontSize:11,fontWeight:700,cursor:'pointer',opacity:active?1:0.6,display:'inline-flex',alignItems:'center',gap:6}}>
                                    <span style={{background:active?cfg.dot:'#9ca3af',width:6,height:6,borderRadius:'50%',display:'inline-block'}}/>{cfg.label} ({count})
                                </button>;
                            })}
                            <button onClick={()=>setActivePriorities(new Set(['critical','high','medium','low']))} style={{marginLeft:'auto',fontSize:11,color:'#115e59',fontWeight:600,background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Show all</button>
                        </div>
                    )}
                    <div style={{height:440,borderRadius:12,overflow:'hidden',border:'1px solid #f0f0f0',position:'relative',zIndex:0}}>
                        {isLoading?<Skeleton width="100%" height="100%"/>:(
                            <MapContainer center={[20.5937,78.9629]} zoom={5} style={{height:'100%',width:'100%'}} zoomControl>
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' maxZoom={19}/>
                                {viewMode==='markers'?(
                                    <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={50}>
                                        {complaints.filter((c:any)=>c.latitude&&c.longitude&&activePriorities.has(c.priority)).map((c:any)=>{
                                            const cfg=PRIORITY_CONFIG[c.priority as Priority]||PRIORITY_CONFIG.low;
                                            const date=new Date(c.reportedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
                                            return <Marker key={c._id} position={[c.latitude,c.longitude]} icon={createPriorityIcon(c.priority)}>
                                                <Popup minWidth={220}>
                                                    <div style={{fontFamily:'system-ui',minWidth:220}}>
                                                        <div style={{background:cfg.color,padding:'10px 14px',margin:'-8px -12px 10px',borderRadius:'8px 8px 0 0'}}>
                                                            <span style={{background:'rgba(255,255,255,0.2)',color:'#fff',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:99,textTransform:'uppercase'}}>{cfg.label} Priority</span>
                                                            <div style={{color:'#fff',fontWeight:700,fontSize:13,marginTop:4}}>{c.title}</div>
                                                        </div>
                                                        <div style={{padding:'0 2px 4px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 12px',fontSize:11}}>
                                                            <div><div style={{fontSize:9,color:'#9ca3af',fontWeight:600,textTransform:'uppercase',marginBottom:1}}>Category</div><div style={{color:'#374151',fontWeight:600}}>{c.category}</div></div>
                                                            <div><div style={{fontSize:9,color:'#9ca3af',fontWeight:600,textTransform:'uppercase',marginBottom:1}}>Status</div><div style={{color:cfg.color,fontWeight:700,textTransform:'capitalize'}}>{c.status}</div></div>
                                                            <div><div style={{fontSize:9,color:'#9ca3af',fontWeight:600,textTransform:'uppercase',marginBottom:1}}>Location</div><div style={{color:'#374151',fontWeight:600}}>{c.location}</div></div>
                                                            <div><div style={{fontSize:9,color:'#9ca3af',fontWeight:600,textTransform:'uppercase',marginBottom:1}}>Reported</div><div style={{color:'#374151',fontWeight:600}}>{date}</div></div>
                                                        </div>
                                                        {c.reportedBy&&<div style={{fontSize:10,color:'#6b7280',borderTop:'1px solid #f3f4f6',paddingTop:6,marginTop:4}}>By <b style={{color:'#374151'}}>{c.reportedBy}</b></div>}
                                                    </div>
                                                </Popup>
                                            </Marker>;
                                        })}
                                    </MarkerClusterGroup>
                                ):<HeatmapLayer points={complaints.filter((c:any)=>c.latitude&&c.longitude).map((c:any)=>[c.latitude,c.longitude,c.priority==='critical'?1:c.priority==='high'?0.75:c.priority==='medium'?0.5:0.3])}/>}
                                {viewMode==='markers'&&(
                                    <div style={{position:'absolute',bottom:20,left:12,zIndex:1000,background:'rgba(255,255,255,0.95)',backdropFilter:'blur(8px)',borderRadius:10,padding:'10px 14px',boxShadow:'0 4px 16px rgba(0,0,0,0.12)',border:'1px solid #e5e7eb',minWidth:110}}>
                                        <div style={{fontSize:9,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Priority</div>
                                        {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p=>(
                                            <div key={p} style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                                                <span style={{width:8,height:8,borderRadius:'50%',background:PRIORITY_CONFIG[p].color,flexShrink:0}}/>
                                                <span style={{fontSize:11,fontWeight:600,color:'#374151'}}>{PRIORITY_CONFIG[p].label}</span>
                                                <span style={{marginLeft:'auto',fontSize:10,color:'#9ca3af',fontWeight:700}}>{complaints.filter((c:any)=>c.priority===p&&c.latitude&&c.longitude).length}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </MapContainer>
                        )}
                    </div>
                    {!isLoading&&complaints.filter((c:any)=>!c.latitude||!c.longitude).length>0&&(
                        <p style={{fontSize:11,color:'#9ca3af',marginTop:8,display:'flex',alignItems:'center',gap:4}}><AlertCircle style={{width:12,height:12}}/>{complaints.filter((c:any)=>!c.latitude||!c.longitude).length} complaint(s) without GPS not shown.</p>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                        {Icon:BarChart2,label:'Generate Report',sub:'Export analytics',grad:'linear-gradient(135deg,#3b82f6,#2563eb)'},
                        {Icon:MapPin,label:'Map View',sub:'View heatmap',grad:'linear-gradient(135deg,#10b981,#059669)'},
                        {Icon:Users,label:'Team Management',sub:'Assign workers',grad:'linear-gradient(135deg,#f97316,#ea580c)'},
                        {Icon:PieChartIcon,label:'SLA Tracking',sub:'Monitor timelines',grad:'linear-gradient(135deg,#a855f7,#7c3aed)'},
                    ].map((c,i)=>(
                        <button key={i} style={{background:'white',borderRadius:16,padding:'24px',boxShadow:'0 4px 20px rgba(0,0,0,0.07)',border:'1px solid #f0f0f0',cursor:'pointer',width:'100%',transition:'all 0.2s'}} className="hover:shadow-lg hover:-translate-y-0.5 flex flex-col items-center text-center">
                            <div style={{background:c.grad,borderRadius:12,width:48,height:48,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
                                <c.Icon className="w-5 h-5 text-white"/>
                            </div>
                            <p style={{fontWeight:700,color:'#111827',fontSize:14}}>{c.label}</p>
                            <p style={{fontSize:11,color:'#9ca3af',marginTop:2}}>{c.sub}</p>
                        </button>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default AdminDashboard;
