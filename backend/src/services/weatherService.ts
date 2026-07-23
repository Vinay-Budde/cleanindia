export class WeatherService {
    /**
     * Check if current weather conditions elevate the priority of a complaint
     */
    static async checkWeatherImpact(latitude: number, longitude: number, category: string): Promise<{ hasAlert: boolean; alertType: string | null; priorityBump: boolean }> {
        const apiKey = process.env.WEATHER_API_KEY;
        if (!apiKey) return { hasAlert: false, alertType: null, priorityBump: false };

        try {
            const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`);
            if (!res.ok) throw new Error('Weather API failed');
            
            const data = await res.json();
            const weatherId = data.weather?.[0]?.id; // Weather condition codes

            // Code 2xx = Thunderstorm, 5xx = Rain, 6xx = Snow, 7xx = Atmosphere (fog, dust)
            let hasAlert = false;
            let alertType = null;
            let priorityBump = false;

            if (weatherId) {
                if (weatherId >= 200 && weatherId < 300) {
                    hasAlert = true;
                    alertType = 'Thunderstorm';
                    // Thunderstorms make electrical & drainage issues critical
                    if (['Electrical Hazard', 'Drainage', 'Road Collapse'].includes(category)) priorityBump = true;
                } else if (weatherId >= 500 && weatherId < 600) {
                    hasAlert = true;
                    alertType = 'Heavy Rain';
                    if (['Drainage', 'Potholes', 'Road Collapse', 'Electrical Hazard'].includes(category)) priorityBump = true;
                } else if (weatherId >= 700 && weatherId < 800) {
                    // Fog/Dust/Smog
                    if (category === 'Street Lights') priorityBump = true;
                }
            }

            return { hasAlert, alertType, priorityBump };

        } catch (error) {
            console.error('Weather Service Error:', error);
            return { hasAlert: false, alertType: null, priorityBump: false };
        }
    }
}
