/**
 * Data loading and processing module for the Fleet Management System
 */
class DataLoader {
    constructor() {
        this.fleetData = null;
        this.vehicles = [];
        this.routes = [];
        this.dataLoaded = false;
    }

    /**
     * Load fleet data from JSON
     */
    async loadData() {
        try {
            // Add a timeout to the fetch request to prevent hanging indefinitely
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch('data/fleet_data.json', {
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`Failed to load fleet data: ${response.status} ${response.statusText}`);
            }

            this.fleetData = await response.json();
            this.processData();
            this.dataLoaded = true;
            return {
                vehicles: this.vehicles,
                routes: this.routes
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('Error loading data: Request timed out');
                throw new Error('Network request timed out. Please check your connection and try again.');
            } else if (error.name === 'SyntaxError') {
                console.error('Error parsing JSON data:', error);
                throw new Error('The fleet data file is corrupted or invalid.');
            } else {
                console.error('Error loading data:', error);
                throw error;
            }
        }
    }

    /**
     * Process the JSON data into usable formats
     */
    processData() {
        if (!this.fleetData) return;

        // Process vehicles data
        this.vehicles = this.fleetData.vehicles.map(vehicle => {
            // Calculate distance traveled from route data
            const vehicleRoutes = this.fleetData.routes.filter(r => r.vehicle_id === vehicle.id);
            let totalDistance = 0;

            vehicleRoutes.forEach(route => {
                totalDistance += route.total_distance || 0;
            });

            // Get current route if any
            const currentRoute = vehicleRoutes.find(r => r.status === 'active');

            // Get recent activities
            const activities = this.fleetData.activities
                .filter(a => a.vehicle_id === vehicle.id)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 5);

            return {
                ...vehicle,
                distance_traveled: totalDistance,
                current_route: currentRoute ? currentRoute.id : null,
                activities
            };
        });

        // Process routes data
        this.routes = this.fleetData.routes.map(route => {
            // Get stops for this route
            const stops = this.fleetData.stops.filter(s => s.route_id === route.id)
                .sort((a, b) => a.sequence - b.sequence);

            // Calculate completion percentage
            const completedStops = stops.filter(s => s.status === 'completed').length;
            const completionPercentage = stops.length > 0
                ? Math.round((completedStops / stops.length) * 100)
                : 0;

            return {
                ...route,
                stops,
                completion_percentage: completionPercentage
            };
        });
    }

    /**
     * Get all vehicle data
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
     * Get route by ID
     */
    getRoute(routeId) {
        return this.routes.find(r => r.id === routeId);
    }

    /**
     * Get route for a vehicle
     */
    getVehicleRoute(vehicleId) {
        const vehicle = this.getVehicle(vehicleId);
        if (!vehicle || !vehicle.current_route) return null;

        return this.getRoute(vehicle.current_route);
    }

    /**
     * Get fleet statistics
     */
    getFleetStats() {
        const totalVehicles = this.vehicles.length;
        const activeVehicles = this.getActiveVehicles().length;

        let totalDistance = 0;
        let totalDeliveries = 0;

        this.vehicles.forEach(v => {
            totalDistance += v.distance_traveled || 0;
        });

        this.routes.forEach(r => {
            const completedStops = r.stops.filter(s =>
                s.status === 'completed' && s.type === 'delivery'
            ).length;
            totalDeliveries += completedStops;
        });

        // Calculate efficiency (completed deliveries per distance unit)
        const efficiency = totalDistance > 0
            ? Math.round((totalDeliveries / totalDistance) * 100)
            : 0;

        return {
            totalVehicles,
            activeVehicles,
            totalDistance: Math.round(totalDistance),
            totalDeliveries,
            efficiency
        };
    }

    /**
     * Search vehicles by name or ID
     */
    searchVehicles(query) {
        if (!query || query.trim() === '') return this.vehicles;

        const searchTerm = query.toLowerCase().trim();

        return this.vehicles.filter(vehicle =>
            vehicle.id.toLowerCase().includes(searchTerm) ||
            vehicle.name.toLowerCase().includes(searchTerm) ||
            (vehicle.driver && vehicle.driver.name.toLowerCase().includes(searchTerm))
        );
    }

    /**
     * Add a new task to a vehicle's route
     */
    addTaskToVehicle(vehicleId, task) {
        // In a real app, this would send data to the backend
        // For now, we'll just return a simulated success
        console.log(`Adding task to vehicle ${vehicleId}:`, task);

        const vehicle = this.getVehicle(vehicleId);
        const route = this.getVehicleRoute(vehicleId);

        if (!vehicle) return { success: false, message: 'Vehicle not found' };

        // Simulate adding the task
        const newStop = {
            id: 'stop_' + Date.now(),
            route_id: route ? route.id : 'new_route',
            sequence: route ? route.stops.length + 1 : 1,
            type: task.type,
            location: {
                address: task.address,
                lat: task.lat || 0,
                lng: task.lng || 0
            },
            status: 'pending',
            eta: new Date(Date.now() + 3600000).toISOString() // ETA in 1 hour
        };

        // Add activity
        const newActivity = {
            id: 'activity_' + Date.now(),
            vehicle_id: vehicleId,
            type: 'task_assigned',
            description: `New ${task.type} task assigned at ${task.address}`,
            timestamp: new Date().toISOString()
        };

        // In a real app, we would update the backend
        // For this demo, we'll update the local data
        if (route) {
            route.stops.push(newStop);
        } else {
            // Create a new route if vehicle doesn't have one
            const newRoute = {
                id: 'route_' + Date.now(),
                vehicle_id: vehicleId,
                status: 'active',
                start_time: new Date().toISOString(),
                estimated_end_time: new Date(Date.now() + 14400000).toISOString(), // 4 hours from now
                total_distance: 0,
                stops: [newStop],
                completion_percentage: 0
            };

            this.routes.push(newRoute);
            vehicle.current_route = newRoute.id;
        }

        vehicle.activities.unshift(newActivity);

        return {
            success: true,
            message: 'Task assigned successfully',
            stop: newStop
        };
    }
}

// Create and export a singleton instance
const dataLoader = new DataLoader();