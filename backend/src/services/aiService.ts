// services/aiService.ts
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Garbage': ['garbage', 'waste', 'trash', 'dump', 'litter', 'refuse', 'debris', 'filth'],
    'Potholes': ['pothole', 'road', 'crack', 'pit', 'damaged road', 'broken road', 'hole'],
    'Drainage': ['drain', 'sewage', 'waterlog', 'flooding', 'stagnant water', 'clogged', 'blocked drain'],
    'Water Leakage': ['leak', 'pipe burst', 'water leakage', 'burst pipe', 'water waste', 'leaking'],
    'Street Lights': ['street light', 'lamp', 'dark', 'light not working', 'blackout', 'no light'],
    'Water Supply': ['no water', 'water supply', 'dry tap', 'water shortage', 'no tap water'],
    'Electrical Hazard': ['electric', 'wire', 'spark', 'shock', 'power line', 'electrical', 'live wire'],
    'Road Collapse': ['road collapse', 'sinkhole', 'cave in', 'road sunk', 'collapsed road'],
};

export interface AIAnalysisResult {
    category: string;
    priority: string;
    confidence: number;
    reasoning: string;
}

export class AIService {
    static async analyzeComplaint(title: string, description: string, category?: string): Promise<AIAnalysisResult> {
        if (GEMINI_KEY) {
            try {
                return await this.analyzeWithGemini(title, description, category);
            } catch {
                // Fall through to keyword matching
            }
        }
        return this.analyzeWithKeywords(title, description);
    }

    private static async analyzeWithGemini(title: string, description: string, category?: string): Promise<AIAnalysisResult> {
        const prompt = `You are an AI assistant for a municipal complaint management system in India. Analyze this civic complaint and respond with ONLY a JSON object (no markdown, no explanation):\n\nTitle: ${title}\nDescription: ${description}\n${category ? `User selected category: ${category}` : ''}\n\nRespond with this exact JSON:\n{"category": "Garbage|Potholes|Drainage|Water Leakage|Street Lights|Water Supply|Electrical Hazard|Road Collapse|Others", "priority": "emergency|critical|high|medium|low", "confidence": 0-100, "reasoning": "brief reason"}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanText);
    }

    private static analyzeWithKeywords(title: string, description: string): AIAnalysisResult {
        const searchText = `${title} ${description}`.toLowerCase();
        let bestCategory = 'Others';
        let maxMatches = 0;

        for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            const matches = keywords.filter(kw => searchText.includes(kw)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                bestCategory = cat;
            }
        }

        const priorityMap: Record<string, string> = {
            'Electrical Hazard': 'emergency',
            'Road Collapse': 'emergency',
            'Water Leakage': 'critical',
            'Garbage': 'high',
            'Drainage': 'high',
            'Water Supply': 'high',
            'Potholes': 'medium',
            'Street Lights': 'medium',
            'Others': 'low'
        };

        return {
            category: bestCategory,
            priority: priorityMap[bestCategory] || 'medium',
            confidence: maxMatches > 0 ? Math.min(60 + maxMatches * 10, 95) : 40,
            reasoning: maxMatches > 0 ? `Detected ${maxMatches} matching keywords for ${bestCategory}` : 'No strong keyword matches found'
        };
    }

    static async getPriorityPrediction(category: string, location: string, nearbyInfrastructure: string[]): Promise<{ priority: string; reasoning: string }> {
        const hasHospital = nearbyInfrastructure.includes('hospital');
        const hasSchool = nearbyInfrastructure.includes('school');

        if (GEMINI_KEY) {
            try {
                const prompt = `Municipal complaint priority prediction for India. Respond with ONLY JSON (no markdown):\nCategory: ${category}\nLocation: ${location}\nNearby: ${nearbyInfrastructure.join(', ') || 'none'}\n\nJSON: {"priority": "emergency|critical|high|medium|low", "reasoning": "brief reason"}`;
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                const data = await res.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                return JSON.parse(clean);
            } catch { /* fallback */ }
        }

        // Fallback: if near hospital or school, bump up priority
        const baseMap: Record<string, string> = {
            'Electrical Hazard': 'emergency',
            'Road Collapse': 'emergency',
            'Water Leakage': (hasHospital || hasSchool) ? 'emergency' : 'critical',
            'Garbage': (hasHospital || hasSchool) ? 'critical' : 'high',
            'Drainage': (hasHospital || hasSchool) ? 'critical' : 'high',
        };
        return {
            priority: baseMap[category] || 'medium',
            reasoning: hasHospital ? 'Hospital nearby — elevated priority' : hasSchool ? 'School nearby — elevated priority' : 'Standard priority based on category'
        };
    }
}
