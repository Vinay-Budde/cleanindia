import { Complaint } from '../models/Complaint';

export class RouteService {
    /**
     * Calculate optimized route for an officer's assigned complaints using OSRM
     */
    static async getOptimizedRoute(officerId: string, startLat: number, startLng: number): Promise<any> {
        // Fetch officer's pending complaints
        const complaints = await Complaint.find({
            assignedOfficer: officerId,
            status: { $in: ['assigned', 'accepted', 'in_progress'] },
            latitude: { $exists: true },
            longitude: { $exists: true }
        }).sort({ priorityScore: -1, slaDeadline: 1 }).limit(10).lean();

        if (complaints.length === 0) return null;

        // Extract coordinates string for OSRM: lon,lat;lon,lat...
        // Start point first
        const coords = [[startLng, startLat]];
        const stops = complaints.map((c: any) => ({
            id: c._id.toString(),
            title: c.title,
            category: c.category,
            priority: c.priority,
            location: c.location,
            lat: c.latitude,
            lng: c.longitude
        }));

        stops.forEach(s => coords.push([s.lng, s.lat]));
        
        const coordString = coords.map(c => `${c[0]},${c[1]}`).join(';');

        try {
            // Use OSRM Trip API for route optimization (Traveling Salesman Problem)
            // It automatically orders the stops to minimize travel time
            const res = await fetch(`http://router.project-osrm.org/trip/v1/driving/${coordString}?roundtrip=false&source=first&geometries=geojson`);
            
            if (!res.ok) throw new Error('OSRM API failed');
            
            const data = await res.json();
            
            if (data.code !== 'Ok') throw new Error(data.message || 'OSRM Routing failed');

            // Map OSRM waypoints back to our stops
            // data.waypoints has the optimized order
            const waypoints = data.waypoints.sort((a: any, b: any) => a.waypoint_index - b.waypoint_index);
            
            // The first waypoint is the start point (officer's location), skip it for the optimized stops array
            const optimizedStops = [];
            for (let i = 1; i < waypoints.length; i++) {
                // waypoints[i].original_index maps back to our coords array
                // since coords[0] is start point, coords[original_index] corresponds to stops[original_index - 1]
                const originalStop = stops[waypoints[i].original_index - 1];
                optimizedStops.push({
                    ...originalStop,
                    stopIndex: i
                });
            }

            return {
                routeGeoJSON: data.trips[0].geometry,
                distanceMeters: data.trips[0].distance,
                durationSeconds: data.trips[0].duration,
                optimizedStops
            };

        } catch (error) {
            console.error('Route Service Error:', error);
            // Fallback: return unoptimized order if routing fails
            return {
                routeGeoJSON: null,
                distanceMeters: 0,
                durationSeconds: 0,
                optimizedStops: stops.map((s, i) => ({ ...s, stopIndex: i + 1 }))
            };
        }
    }
}
