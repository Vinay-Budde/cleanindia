export class SeverityService {
    /**
     * Determine severity score based on infrastructure POIs near the complaint
     */
    static async calculateInfrastructureSeverity(latitude: number, longitude: number, category: string): Promise<{ score: number; pois: string[] }> {
        try {
            // Check Overpass API for nearby schools, hospitals, transit
            const query = `
                [out:json];
                (
                    node["amenity"~"hospital|school|college|clinic"](around:200, ${latitude}, ${longitude});
                    node["highway"~"bus_stop"](around:100, ${latitude}, ${longitude});
                );
                out;
            `;
            
            const res = await fetch(`https://overpass-api.de/api/interpreter`, {
                method: 'POST',
                body: query
            });

            if (!res.ok) throw new Error('Overpass API failed');
            
            const data = await res.json();
            const elements = data.elements || [];
            
            let score = 3; // base severity
            const pois: string[] = [];

            elements.forEach((el: any) => {
                if (el.tags?.amenity === 'hospital' || el.tags?.amenity === 'clinic') {
                    if (score < 5) score = 5; // highest
                    pois.push('hospital');
                } else if (el.tags?.amenity === 'school' || el.tags?.amenity === 'college') {
                    if (score < 4) score = 4;
                    pois.push('school');
                } else if (el.tags?.highway === 'bus_stop') {
                    if (score < 4) score = 4;
                    pois.push('transit');
                }
            });

            // Unique POIs
            const uniquePois = [...new Set(pois)];
            
            return { score, pois: uniquePois };

        } catch (error) {
            console.error('Severity Service Error:', error);
            // Default to medium severity if API fails
            return { score: 3, pois: [] };
        }
    }
}
