/**
 * Fleet management module for handling vehicle and route data
 */
class FleetManager {
    constructor() {
        this.vehicles = [];
        this.routes = [];
        this.selectedVehicleId = null;
        this.dataLoaded = false;
        this.simulationInterval = null;

        // Istanbul-specific traffic congestion zones
        this.trafficCongestionZones = [
            { name: 'Boğaz Köprüsü', lat: 41.0467, lng: 29.0280, congestionLevel: 0.8 },
            { name: 'Mecidiyeköy', lat: 41.0677, lng: 28.9870, congestionLevel: 0.7 },
            { name: 'Bakırköy', lat: 40.9819, lng: 28.8778, congestionLevel: 0.6 },
            { name: 'Kadıköy', lat: 40.9929, lng: 29.0282, congestionLevel: 0.65 },
            { name: 'Levent', lat: 41.0843, lng: 29.0082, congestionLevel: 0.55 }
        ];
    }

    /**
     * Initialize with data from DataLoader
     */
    async initialize() {
        try {
            const data = await dataLoader.loadData();
            this.vehicles = data.vehicles;
            this.routes = data.routes;
            this.dataLoaded = true;

            // Start simulated movement if live tracking
            this.startLiveTracking();

            return {
                vehicles: this.vehicles,
                routes: this.routes
            };
        } catch (error) {
            console.error('Failed to initialize fleet manager:', error);
            throw error;
        }
    }

    /**
     * Get all vehicles
     */
    getAllVehicles() {
        return this.vehicles;
    }

    /**
     * Get active vehicles
     */
    getActiveVehicles() {
        return this.vehicles.filter(v => v.status === 'active');
    }

    /**
     * Get vehicle by ID
     */
    getVehicle(vehicleId) {
        return this.vehicles.find(v => v.id === vehicleId);
    }

    /**
     * Get selected vehicle
     */
    getSelectedVehicle() {
        return this.getVehicle(this.selectedVehicleId);
    }

    /**
     * Select a vehicle
     */
    selectVehicle(vehicleId) {
        this.selectedVehicleId = vehicleId;
        return this.getSelectedVehicle();
    }

    /**
     * Get vehicle route
     */
    getVehicleRoute(vehicleId) {
        const vehicle = this.getVehicle(vehicleId);
        if (!vehicle || !vehicle.current_route) return null;

        return this.routes.find(r => r.id === vehicle.current_route);
    }

    /**
     * Get fleet statistics
     */
    getFleetStats() {
        return dataLoader.getFleetStats();
    }

    /**
     * Start live tracking simulation
     */
    startLiveTracking() {
        // Clear any existing interval
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }

        // Update vehicle positions every 3 seconds
        this.simulationInterval = setInterval(() => {
            this.simulateVehicleMovement();
        }, 3000);
    }

    /**
     * Stop live tracking simulation
     */
    stopLiveTracking() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
    }

    /**
     * Simulate vehicle movement with Istanbul traffic considerations
     */
    simulateVehicleMovement() {
        // Only move active vehicles
        const activeVehicles = this.getActiveVehicles();

        activeVehicles.forEach(vehicle => {
            // Get current route
            const route = this.getVehicleRoute(vehicle.id);
            if (!route) return;

            // Find the next uncompleted stop
            const nextStop = route.stops.find(s => s.status === 'pending' || s.status === 'in_progress');
            if (!nextStop) return;

            // Check if vehicle is in a congestion zone and adjust speed
            let speedMultiplier = 1.0;
            const nearestCongestion = this.checkTrafficCongestion(vehicle.location.lat, vehicle.location.lng);
            if (nearestCongestion) {
                speedMultiplier = 1.0 - nearestCongestion.congestionLevel;

                // Add random traffic activity for realism
                if (Math.random() > 0.95) {
                    vehicle.activities.unshift({
                        id: 'activity_' + Date.now(),
                        vehicle_id: vehicle.id,
                        type: 'traffic',
                        description: `${nearestCongestion.name}'de trafik sıkışıklığı`,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            // Move vehicle slightly toward the next stop
            if (vehicle.location && nextStop.location) {
                const movementFactor = 0.1 * speedMultiplier; // Movement adjusted by traffic

                const latDiff = nextStop.location.lat - vehicle.location.lat;
                const lngDiff = nextStop.location.lng - vehicle.location.lng;

                vehicle.location.lat += latDiff * movementFactor;
                vehicle.location.lng += lngDiff * movementFactor;

                // Update speed based on distance to stop and traffic
                const distance = this.calculateDistance(
                    vehicle.location.lat,
                    vehicle.location.lng,
                    nextStop.location.lat,
                    nextStop.location.lng
                );

                // Simulate speed (faster when far from stop, slower when close)
                // Adjust for Istanbul traffic patterns
                vehicle.current_speed = Math.round(Math.min(60, Math.max(5, distance * 20))) * speedMultiplier;

                // Update fuel level - cars use more fuel in congestion
                const fuelConsumption = nearestCongestion ? 0.15 : 0.1;
                vehicle.fuel_level = Math.max(0, (vehicle.fuel_level || 100) - fuelConsumption);

                // If very close to the stop, mark it as completed
                if (distance < 0.001) {
                    nextStop.status = 'completed';

                    // Add activity for completing the stop
                    vehicle.activities.unshift({
                        id: 'activity_' + Date.now(),
                        vehicle_id: vehicle.id,
                        type: 'stop_completed',
                        description: `${nextStop.type === 'delivery' ? 'Teslimat' : nextStop.type === 'pickup' ? 'Alım' : 'Durak'} ${nextStop.location.address} adresinde tamamlandı`,
                        timestamp: new Date().toISOString()
                    });

                    // Update route completion percentage
                    const completedStops = route.stops.filter(s => s.status === 'completed').length;
                    route.completion_percentage = Math.round((completedStops / route.stops.length) * 100);

                    // If all stops are completed, move to depot
                    if (completedStops === route.stops.length) {
                        // In a real app, calculate route back to depot
                        vehicle.activities.unshift({
                            id: 'activity_' + Date.now(),
                            vehicle_id: vehicle.id,
                            type: 'route_completed',
                            description: `Tüm duraklar tamamlandı, depoya dönülüyor`,
                            timestamp: new Date().toISOString()
                        });
                    }
                }

                // Dispatch event to notify of vehicle movement
                document.dispatchEvent(new CustomEvent('vehicle-moved', {
                    detail: { vehicleId: vehicle.id }
                }));
            }
        });
    }

    /**
     * Check if a vehicle is in a traffic congestion zone
     */
    checkTrafficCongestion(lat, lng) {
        for (const zone of this.trafficCongestionZones) {
            const distance = this.calculateDistance(lat, lng, zone.lat, zone.lng);
            if (distance < 2) { // Within 2km of congestion zone
                return {
                    name: zone.name,
                    congestionLevel: zone.congestionLevel * (2 - distance) / 2 // Higher impact when closer
                };
            }
        }
        return null;
    }

    /**
     * Calculate distance between two points in km (simplified Haversine)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     */
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    /**
     * Assign a new task to a vehicle
     */
    assignTask(vehicleId, task) {
        return dataLoader.addTaskToVehicle(vehicleId, task);
    }

    /**
     * Optimize routes considering Istanbul-specific factors
     */
    optimizeRoutes(mapController) {
        // This would use the map controller to optimize routes
        // For Istanbul, we'll add special logic to avoid known congestion points

        const optimizedRoutes = [];

        for (const route of this.routes) {
            const optimizedRoute = { ...route };

            if (optimizedRoute.stops.length > 2) {
                // Sort stops to optimize around congestion zones
                // First stop is always depot, last is always return to depot
                const depotStops = optimizedRoute.stops.filter(s => s.type === 'depot');
                const otherStops = optimizedRoute.stops.filter(s => s.type !== 'depot');

                // Sort by avoiding congestion during peak hours (simulated)
                otherStops.sort((a, b) => {
                    // Check if stops are near congestion zones
                    const aTraffic = this.getTrafficScoreForLocation(a.location.lat, a.location.lng);
                    const bTraffic = this.getTrafficScoreForLocation(b.location.lat, b.location.lng);

                    // Sort by traffic score (lower is better)
                    return aTraffic - bTraffic;
                });

                // Rebuild optimized stops list
                optimizedRoute.stops = [
                    depotStops[0], // Starting depot
                    ...otherStops,  // Optimized middle stops
                    depotStops[depotStops.length - 1] // Ending depot
                ];

                // Recalculate sequence numbers
                optimizedRoute.stops.forEach((stop, index) => {
                    stop.sequence = index + 1;
                });
            }

            optimizedRoutes.push(optimizedRoute);
        }

        // Update routes with optimized ones
        this.routes = optimizedRoutes;

        return optimizedRoutes;
    }

    /**
     * Calculate traffic score for a location (lower is better)
     */
    getTrafficScoreForLocation(lat, lng) {
        let score = 0;

        // Check distance to each congestion zone
        for (const zone of this.trafficCongestionZones) {
            const distance = this.calculateDistance(lat, lng, zone.lat, zone.lng);
            if (distance < 5) { // Within 5km of congestion zone
                // Add to score based on congestion level and distance
                score += zone.congestionLevel * (5 - distance) / 5;
            }
        }

        return score;
    }

    /**
     * Search vehicles
     */
    searchVehicles(query) {
        return dataLoader.searchVehicles(query);
    }
}