/**
 * Map handling and route visualization for Fleet Management System
 */
class MapController {
    constructor(mapElement) {
        this.mapElement = mapElement;
        this.map = null;
        this.markers = {};
        this.routes = {};
        this.heatmapLayer = null;
        this.currentView = 'all';
        this.selectedVehicle = null;

        // Icon definitions
        this.icons = {
            active: L.icon({
                iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            }),
            idle: L.icon({
                iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-gold.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            }),
            maintenance: L.icon({
                iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            }),
            delivery: L.icon({
                iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            }),
            depot: L.icon({
                iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-violet.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        };
    }

    /**
     * Initialize the map
     */
    initMap() {
        // Create the map centered on a default location (New York City)
        this.map = L.map(this.mapElement).setView([40.7128, -74.0060], 12);

        // Add the tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);

        return this.map;
    }

    /**
     * Display vehicles on the map
     */
    displayVehicles(vehicles) {
        // Clear existing vehicle markers
        this.clearVehicleMarkers();

        // Create markers for each vehicle
        vehicles.forEach(vehicle => {
            if (vehicle.location && vehicle.location.lat && vehicle.location.lng) {
                const marker = this.createVehicleMarker(vehicle);
                this.markers[vehicle.id] = marker;
                marker.addTo(this.map);
            }
        });

        // Fit map bounds to include all markers
        this.fitMapToMarkers();
    }

    /**
     * Create a marker for a vehicle
     */
    createVehicleMarker(vehicle) {
        const icon = this.icons[vehicle.status] || this.icons.idle;

        const marker = L.marker([vehicle.location.lat, vehicle.location.lng], {
            icon: icon,
            title: vehicle.name
        });

        // Create popup content
        const popupContent = `
            <div class="marker-popup">
                <h4>${vehicle.name}</h4>
                <p><strong>Status:</strong> ${this.capitalizeFirst(vehicle.status)}</p>
                <p><strong>Driver:</strong> ${vehicle.driver ? vehicle.driver.name : 'Unassigned'}</p>
                <p><strong>Speed:</strong> ${vehicle.current_speed || 0} km/h</p>
                <button class="popup-btn view-details" data-vehicle-id="${vehicle.id}">
                    View Details
                </button>
            </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
            document.querySelector(`.view-details[data-vehicle-id="${vehicle.id}"]`)
                .addEventListener('click', (e) => {
                    const vehicleId = e.target.getAttribute('data-vehicle-id');
                    document.dispatchEvent(new CustomEvent('view-vehicle-details', {
                        detail: { vehicleId }
                    }));
                    marker.closePopup();
                });
        });

        return marker;
    }

    /**
     * Display a route on the map
     */
    displayRoute(route, vehicle) {
        if (!route || !route.stops || route.stops.length === 0) return;

        // Clear existing route for this vehicle if exists
        if (this.routes[vehicle.id]) {
            this.map.removeLayer(this.routes[vehicle.id].line);
            route.stops.forEach(stop => {
                if (this.routes[vehicle.id].stopMarkers[stop.id]) {
                    this.map.removeLayer(this.routes[vehicle.id].stopMarkers[stop.id]);
                }
            });
        }

        const stopMarkers = {};
        const routePoints = [];

        // Add vehicle starting point
        if (vehicle.location) {
            routePoints.push([vehicle.location.lat, vehicle.location.lng]);
        }

        // Add markers for each stop
        route.stops.forEach(stop => {
            if (!stop.location || !stop.location.lat || !stop.location.lng) return;

            routePoints.push([stop.location.lat, stop.location.lng]);

            // Determine icon based on stop type and status
            let icon = this.icons.delivery;
            if (stop.type === 'depot') {
                icon = this.icons.depot;
            }

            const marker = L.marker([stop.location.lat, stop.location.lng], {
                icon: icon
            });

            // Create popup content for stop
            const popupContent = `
                <div class="marker-popup">
                    <h4>${this.capitalizeFirst(stop.type)}</h4>
                    <p><strong>Address:</strong> ${stop.location.address}</p>
                    <p><strong>Status:</strong> ${this.capitalizeFirst(stop.status)}</p>
                    <p><strong>ETA:</strong> ${this.formatTime(stop.eta)}</p>
                </div>
            `;

            marker.bindPopup(popupContent);
            marker.addTo(this.map);
            stopMarkers[stop.id] = marker;
        });

        // Create polyline for the route
        const routeLine = L.polyline(routePoints, {
            color: '#0d6efd',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10',
            lineJoin: 'round'
        }).addTo(this.map);

        // Store route information
        this.routes[vehicle.id] = {
            line: routeLine,
            stopMarkers: stopMarkers
        };

        // Fit map to display the entire route
        this.map.fitBounds(routeLine.getBounds(), {
            padding: [50, 50]
        });
    }

    /**
     * Create a heat map of delivery points
     */
    displayDeliveryHeatmap(routes) {
        // Clear existing heatmap layer
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
        }

        const heatPoints = [];

        // Collect all delivery points from routes
        routes.forEach(route => {
            route.stops.forEach(stop => {
                if (stop.type === 'delivery' && stop.location && stop.location.lat && stop.location.lng) {
                    heatPoints.push([
                        stop.location.lat,
                        stop.location.lng,
                        stop.status === 'completed' ? 1.0 : 0.5 // Higher intensity for completed deliveries
                    ]);
                }
            });
        });

        // Create heatmap layer if we have Leaflet.heat plugin
        if (heatPoints.length > 0 && typeof L.heatLayer === 'function') {
            this.heatmapLayer = L.heatLayer(heatPoints, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
            }).addTo(this.map);
        } else {
            console.log('Heatmap plugin not available or no delivery points to display');
        }
    }

    /**
     * Select and focus on a specific vehicle
     */
    selectVehicle(vehicle) {
        this.selectedVehicle = vehicle;

        if (vehicle && vehicle.location) {
            // Zoom to the vehicle
            this.map.setView([vehicle.location.lat, vehicle.location.lng], 15);

            // Highlight the marker
            const marker = this.markers[vehicle.id];
            if (marker) {
                marker.openPopup();
            }
        }
    }

    /**
     * Clear all vehicle markers from the map
     */
    clearVehicleMarkers() {
        Object.values(this.markers).forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = {};
    }

    /**
     * Clear all routes from the map
     */
    clearRoutes() {
        Object.values(this.routes).forEach(route => {
            this.map.removeLayer(route.line);
            Object.values(route.stopMarkers).forEach(marker => {
                this.map.removeLayer(marker);
            });
        });
        this.routes = {};
    }

    /**
     * Clear everything from the map
     */
    clearMap() {
        this.clearVehicleMarkers();
        this.clearRoutes();

        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
            this.heatmapLayer = null;
        }
    }

    /**
     * Change the map view mode
     */
    changeView(viewMode, vehicles, routes) {
        this.currentView = viewMode;
        this.clearMap();

        switch (viewMode) {
            case 'all':
                this.displayVehicles(vehicles);
                break;

            case 'routes':
                // Display only active routes
                const activeVehicles = vehicles.filter(v => v.status === 'active');
                this.displayVehicles(activeVehicles);

                // Display their routes
                activeVehicles.forEach(vehicle => {
                    if (vehicle.current_route) {
                        const route = routes.find(r => r.id === vehicle.current_route);
                        if (route) {
                            this.displayRoute(route, vehicle);
                        }
                    }
                });
                break;

            case 'heatmap':
                this.displayDeliveryHeatmap(routes);
                break;
        }
    }

    /**
     * Fit the map view to include all visible markers
     */
    fitMapToMarkers() {
        const markerBounds = L.latLngBounds();
        let hasMarkers = false;

        // Include all vehicle markers in bounds
        Object.values(this.markers).forEach(marker => {
            markerBounds.extend(marker.getLatLng());
            hasMarkers = true;
        });

        // Include all stop markers in bounds
        Object.values(this.routes).forEach(route => {
            Object.values(route.stopMarkers).forEach(marker => {
                markerBounds.extend(marker.getLatLng());
                hasMarkers = true;
            });
        });

        if (hasMarkers) {
            this.map.fitBounds(markerBounds, {
                padding: [50, 50]
            });
        }
    }

    /**
     * Add a task marker to let user pick a location on the map
     */
    enableLocationPicker(callback) {
        this.map.once('click', (e) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            // Reverse geocode to get address (in a real app)
            // For this demo, we'll just use the coordinates
            const address = `Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;

            if (callback) callback(lat, lng, address);
        });

        // Change cursor to indicate the map is clickable
        this.mapElement.style.cursor = 'crosshair';

        // Restore cursor after selection or cancel
        const resetCursor = () => {
            this.mapElement.style.cursor = '';
        };

        // Reset on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                resetCursor();
                this.map.off('click');
                document.removeEventListener('keydown', escHandler);
            }
        };

        document.addEventListener('keydown', escHandler);

        // Return a cancel function
        return () => {
            resetCursor();
            this.map.off('click');
            document.removeEventListener('keydown', escHandler);
        };
    }

    /**
     * Optimize routes (simulated)
     */
    optimizeRoutes(vehicles, routes) {
        // In a real app, this would call a routing optimization service
        // For the demo, we'll just simulate optimization
        console.log('Optimizing routes (simulated)...');

        // Return simulated optimized routes
        return routes.map(route => {
            // Simply reverse the stops order as a demonstration
            const optimizedRoute = { ...route };
            optimizedRoute.stops = [...route.stops].sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return -1;
                if (a.status !== 'completed' && b.status === 'completed') return 1;
                return a.sequence - b.sequence;
            });

            return optimizedRoute;
        });
    }

    /**
     * Helper function to format time
     */
    formatTime(timeString) {
        if (!timeString) return 'N/A';

        const options = {
            hour: '2-digit',
            minute: '2-digit',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };

        return new Date(timeString).toLocaleString(undefined, options);
    }

    /**
     * Helper function to capitalize first letter
     */
    capitalizeFirst(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}