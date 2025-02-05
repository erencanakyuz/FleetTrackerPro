/**
 * Main application controller for the Fleet Management System
 */
/**
 * Main application controller for the Fleet Management System
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize main application
    const app = new FleetTrackerApp();
    app.initialize();
});

class FleetTrackerApp {
    constructor() {
        // DOM elements
        this.mapElement = document.getElementById('map');
        this.vehicleListEl = document.getElementById('vehicle-list');
        this.vehicleSearchEl = document.getElementById('vehicle-search');
        this.activeVehiclesEl = document.getElementById('active-vehicles');
        this.totalDistanceEl = document.getElementById('total-distance');
        this.totalDeliveriesEl = document.getElementById('total-deliveries');
        this.efficiencyRatingEl = document.getElementById('efficiency-rating');

        this.detailsPanel = document.getElementById('details-panel');
        this.vehicleDetails = document.getElementById('vehicle-details');
        this.noSelectionMessage = document.getElementById('no-selection-message');

        this.viewAllBtn = document.getElementById('view-all-vehicles');
        this.viewRoutesBtn = document.getElementById('view-active-routes');
        this.viewHeatmapBtn = document.getElementById('view-delivery-heatmap');
        this.liveTrackingBtn = document.getElementById('live-tracking');
        this.historyDateEl = document.getElementById('history-date');

        this.optimizeRoutesBtn = document.getElementById('optimize-routes');
        this.clearMapBtn = document.getElementById('clear-map');
        this.playHistoryBtn = document.getElementById('play-history');
        this.pauseHistoryBtn = document.getElementById('pause-history');
        this.stopHistoryBtn = document.getElementById('stop-history');

        this.taskModal = document.getElementById('task-modal');
        this.taskForm = document.getElementById('task-form');

        // Set current date and username in header - FIX: add null checks
        const datetimeEl = document.querySelector('.datetime');
        const usernameEl = document.querySelector('.username');

        if (datetimeEl) {
            datetimeEl.textContent = '2025-03-03 20:11:03 UTC'; // Using the provided current time
        }

        if (usernameEl) {
            usernameEl.textContent = 'erencanakyuz'; // Using the provided username
        }

        // Initialize components
        this.mapController = new MapController(this.mapElement);
        this.fleetManager = new FleetManager();
    }
    /**
     * Initialize the application
     */
    async initialize() {
        try {
            // Initialize map
            this.mapController.initMap();

            // Load fleet data
            await this.fleetManager.initialize();

            // Display vehicles on map
            this.mapController.displayVehicles(this.fleetManager.getAllVehicles());

            // Populate vehicle list
            this.updateVehicleList();

            // Update dashboard stats
            this.updateFleetStats();

            // Set up event listeners
            this.setupEventListeners();

            // Set current date in history picker
            const today = new Date();
            const dateString = today.toISOString().split('T')[0];
            this.historyDateEl.value = dateString;

            console.log('Fleet Management System initialized successfully');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to load fleet data. Please try again later.');
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Vehicle selection in the list
        this.vehicleListEl.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (li) {
                const vehicleId = li.getAttribute('data-vehicle-id');
                this.selectVehicle(vehicleId);
            }
        });

        // Vehicle search
        this.vehicleSearchEl.addEventListener('input', () => {
            this.updateVehicleList(this.vehicleSearchEl.value);
        });

        // View controls
        this.viewAllBtn.addEventListener('click', () => this.changeView('all'));
        this.viewRoutesBtn.addEventListener('click', () => this.changeView('routes'));
        this.viewHeatmapBtn.addEventListener('click', () => this.changeView('heatmap'));

        // Live tracking toggle
        this.liveTrackingBtn.addEventListener('click', () => this.toggleLiveTracking());

        // History date change
        this.historyDateEl.addEventListener('change', () => this.loadHistoryData());

        // Route optimization
        this.optimizeRoutesBtn.addEventListener('click', () => this.optimizeRoutes());

        // Clear map
        this.clearMapBtn.addEventListener('click', () => this.clearMap());

        // Playback controls
        this.playHistoryBtn.addEventListener('click', () => this.playHistory());
        this.pauseHistoryBtn.addEventListener('click', () => this.pauseHistory());
        this.stopHistoryBtn.addEventListener('click', () => this.stopHistory());

        // Details panel close
        document.querySelector('.close-panel').addEventListener('click', () => {
            this.closeDetailsPanel();
        });

        // Vehicle details buttons
        document.getElementById('track-vehicle').addEventListener('click', () => {
            const vehicle = this.fleetManager.getSelectedVehicle();
            if (vehicle) this.mapController.selectVehicle(vehicle);
        });

        document.getElementById('message-driver').addEventListener('click', () => {
            alert('Messaging functionality would be implemented here');
        });

        document.getElementById('assign-task').addEventListener('click', () => {
            this.openTaskModal();
        });

        document.getElementById('vehicle-report').addEventListener('click', () => {
            alert('Report generation functionality would be implemented here');
        });

        // Task modal
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeTaskModal();
        });

        document.getElementById('cancel-task').addEventListener('click', () => {
            this.closeTaskModal();
        });

        document.getElementById('pick-on-map').addEventListener('click', () => {
            this.pickLocationOnMap();
        });

        this.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitTask();
        });

        // Listen for custom events
        document.addEventListener('view-vehicle-details', (e) => {
            this.selectVehicle(e.detail.vehicleId);
        });

        document.addEventListener('vehicle-moved', (e) => {
            const vehicleId = e.detail.vehicleId;
            const vehicle = this.fleetManager.getVehicle(vehicleId);

            // Update marker position on map
            if (vehicle && this.mapController.markers[vehicleId]) {
                this.mapController.markers[vehicleId].setLatLng([
                    vehicle.location.lat,
                    vehicle.location.lng
                ]);

                // Update vehicle details if this is the selected vehicle
                if (vehicleId === this.fleetManager.selectedVehicleId) {
                    this.updateVehicleDetails(vehicle);
                }
            }
        });
    }

    /**
     * Select a vehicle and show its details
     */
    selectVehicle(vehicleId) {
        // Update selected vehicle in fleet manager
        const vehicle = this.fleetManager.selectVehicle(vehicleId);
        if (!vehicle) return;

        // Update vehicle list UI
        this.updateSelectedVehicleInList(vehicleId);

        // Show vehicle details panel
        this.openDetailsPanel();

        // Populate vehicle details
        this.updateVehicleDetails(vehicle);

        // Focus on the vehicle in the map
        this.mapController.selectVehicle(vehicle);

        // Show the vehicle's route if available
        const route = this.fleetManager.getVehicleRoute(vehicleId);
        if (route) {
            this.mapController.displayRoute(route, vehicle);
        }
    }

    /**
     * Update UI to highlight selected vehicle in the list
     */
    updateSelectedVehicleInList(vehicleId) {
        // Remove active class from all list items
        const listItems = this.vehicleListEl.querySelectorAll('li');
        listItems.forEach(item => item.classList.remove('active'));

        // Add active class to selected item
        const selectedItem = this.vehicleListEl.querySelector(`li[data-vehicle-id="${vehicleId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
            // Scroll the item into view
            selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Update vehicle details in the details panel
     */
    updateVehicleDetails(vehicle) {
        if (!vehicle) return;

        // Hide no selection message
        this.noSelectionMessage.style.display = 'none';
        this.vehicleDetails.style.display = 'block';

        // Update vehicle info
        document.getElementById('vehicle-name').textContent = vehicle.name;
        document.getElementById('vehicle-image').src = vehicle.image_url || 'https://via.placeholder.com/60x60?text=Vehicle';

        // Update status
        const vehicleStatus = document.getElementById('vehicle-status');
        vehicleStatus.textContent = this.capitalizeFirst(vehicle.status);
        vehicleStatus.className = 'status ' + vehicle.status;

        // Update driver and stats
        document.getElementById('driver-name').textContent = vehicle.driver ? vehicle.driver.name : 'Unassigned';
        document.getElementById('fuel-level').textContent = `${vehicle.fuel_level || 0}%`;
        document.getElementById('current-speed').textContent = `${vehicle.current_speed || 0} km/h`;
        document.getElementById('distance-traveled').textContent = `${Math.round(vehicle.distance_traveled || 0)} km`;

        // Update route information
        const route = this.fleetManager.getVehicleRoute(vehicle.id);
        const routeStops = document.getElementById('route-stops');

        if (route && route.stops && route.stops.length > 0) {
            let stopsHtml = '';

            route.stops.forEach((stop, index) => {
                const icon = this.getStopIcon(stop.type);
                const statusClass = stop.status === 'completed' ? 'completed' :
                    (stop.status === 'in_progress' ? 'in-progress' : 'pending');

                stopsHtml += `
                    <div class="route-stop ${statusClass}">
                        <div class="stop-indicator">
                            <i class="${icon}"></i>
                        </div>
                        <div class="stop-details">
                            <div class="stop-address">${stop.location.address}</div>
                            <div class="stop-time">${this.formatTime(stop.eta)}</div>
                        </div>
                    </div>
                `;
            });

            routeStops.innerHTML = stopsHtml;

            // Update route stats
            const deliveries = route.stops.filter(s => s.type === 'delivery').length;
            document.getElementById('deliveries-count').textContent = deliveries;
            document.getElementById('stops-count').textContent = route.stops.length;
            document.getElementById('eta').textContent = this.formatTime(route.estimated_end_time);
        } else {
            routeStops.innerHTML = '<p>No active route</p>';
            document.getElementById('deliveries-count').textContent = '0';
            document.getElementById('stops-count').textContent = '0';
            document.getElementById('eta').textContent = 'N/A';
        }

        // Update activities
        const activityList = document.getElementById('activity-list');
        let activitiesHtml = '';

        if (vehicle.activities && vehicle.activities.length > 0) {
            vehicle.activities.forEach(activity => {
                activitiesHtml += `
                    <li class="activity-item">
                        <div>${activity.description}</div>
                        <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
                    </li>
                `;
            });
        } else {
            activitiesHtml = '<li class="activity-item">No recent activities</li>';
        }

        activityList.innerHTML = activitiesHtml;
    }

    /**
     * Update the vehicle list
     */
    updateVehicleList(searchTerm = '') {
        // Get vehicles, possibly filtered by search
        const vehicles = searchTerm ?
            this.fleetManager.searchVehicles(searchTerm) :
            this.fleetManager.getAllVehicles();

        // Clear the list
        this.vehicleListEl.innerHTML = '';

        // Add each vehicle to the list
        vehicles.forEach(vehicle => {
            const li = document.createElement('li');
            li.setAttribute('data-vehicle-id', vehicle.id);

            // Add active class if this is the selected vehicle
            if (vehicle.id === this.fleetManager.selectedVehicleId) {
                li.classList.add('active');
            }

            // Determine status indicator class
            const statusClass = `status-${vehicle.status}`;

            // Create vehicle icon based on type
            const icon = this.getVehicleIcon(vehicle.type);

            li.innerHTML = `
                <div class="vehicle-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="vehicle-status">
                    <div class="vehicle-name">${vehicle.name}</div>
                    <div class="vehicle-info">
                        ${vehicle.driver ? vehicle.driver.name : 'No Driver'} | 
                        ${Math.round(vehicle.distance_traveled || 0)} km
                    </div>
                </div>
                <div class="status-indicator ${statusClass}"></div>
            `;

            this.vehicleListEl.appendChild(li);
        });

        // Show message if no vehicles found
        if (vehicles.length === 0) {
            this.vehicleListEl.innerHTML = '<li class="no-vehicles">No vehicles found</li>';
        }
    }

    /**
     * Update fleet statistics
     */
    updateFleetStats() {
        const stats = this.fleetManager.getFleetStats();

        this.activeVehiclesEl.textContent = stats.activeVehicles;
        this.totalDistanceEl.textContent = `${stats.totalDistance} km`;
        this.totalDeliveriesEl.textContent = stats.totalDeliveries;
        this.efficiencyRatingEl.textContent = `${stats.efficiency}%`;
    }

    /**
     * Change map view mode
     */
    changeView(viewMode) {
        // Update active button
        this.viewAllBtn.classList.remove('active');
        this.viewRoutesBtn.classList.remove('active');
        this.viewHeatmapBtn.classList.remove('active');

        switch (viewMode) {
            case 'all':
                this.viewAllBtn.classList.add('active');
                break;
            case 'routes':
                this.viewRoutesBtn.classList.add('active');
                break;
            case 'heatmap':
                this.viewHeatmapBtn.classList.add('active');
                break;
        }

        // Update map view
        this.mapController.changeView(
            viewMode,
            this.fleetManager.getAllVehicles(),
            this.fleetManager.routes
        );
    }

    /**
     * Toggle live tracking mode
     */
    toggleLiveTracking() {
        const isActive = this.liveTrackingBtn.classList.toggle('active');

        if (isActive) {
            this.fleetManager.startLiveTracking();
            this.liveTrackingBtn.innerHTML = '<i class="fas fa-broadcast-tower"></i> Live Tracking';
            this.historyDateEl.disabled = true;
        } else {
            this.fleetManager.stopLiveTracking();
            this.liveTrackingBtn.innerHTML = '<i class="fas fa-history"></i> Live Tracking Off';
            this.historyDateEl.disabled = false;
        }
    }

    /**
     * Load historical data
     */
    loadHistoryData() {
        const date = this.historyDateEl.value;
        console.log(`Loading historical data for ${date} (feature would be implemented here)`);
        // In a real app, this would load data for the selected date
    }

    /**
     * Optimize routes
     */
    optimizeRoutes() {
        // Call the fleet manager to optimize routes
        const optimizedRoutes = this.fleetManager.optimizeRoutes(this.mapController);

        // Refresh the map with optimized routes
        this.changeView('routes');

        // Show success message
        this.showMessage('Routes optimized successfully!');
    }

    /**
     * Clear the map
     */
    clearMap() {
        this.mapController.clearMap();
        this.showMessage('Map cleared');
    }

    /**
     * Start playback of historical data
     */
    playHistory() {
        console.log('Play history (feature would be implemented here)');
        // In a real app, this would animate vehicle movements based on historical data
    }

    /**
     * Pause playback of historical data
     */
    pauseHistory() {
        console.log('Pause history (feature would be implemented here)');
    }

    /**
     * Stop playback of historical data
     */
    stopHistory() {
        console.log('Stop history (feature would be implemented here)');
    }

    /**
     * Open the details panel
     */
    openDetailsPanel() {
        this.detailsPanel.classList.add('active');
    }

    /**
     * Close the details panel
     */
    closeDetailsPanel() {
        this.detailsPanel.classList.remove('active');
        this.fleetManager.selectedVehicleId = null;

        // Update vehicle list to remove selected state
        this.updateSelectedVehicleInList(null);
    }

    /**
     * Open the task assignment modal
     */
    openTaskModal() {
        // Reset the form
        this.taskForm.reset();

        // Show the modal
        this.taskModal.classList.add('active');
    }

    /**
     * Close the task assignment modal
     */
    closeTaskModal() {
        this.taskModal.classList.remove('active');
    }

    /**
     * Enable picking a location on the map
     */
    pickLocationOnMap() {
        // Close the modal temporarily
        this.taskModal.classList.remove('active');

        // Show a message to the user
        this.showMessage('Click on the map to select a location', 3000);

        // Enable location picker mode
        const cancelPicker = this.mapController.enableLocationPicker((lat, lng, address) => {
            // Set the address in the form
            document.getElementById('task-address').value = address;

            // Store coordinates as data attributes
            const addressInput = document.getElementById('task-address');
            addressInput.setAttribute('data-lat', lat);
            addressInput.setAttribute('data-lng', lng);

            // Re-open the modal
            this.taskModal.classList.add('active');
        });

        // Allow canceling the picker with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                cancelPicker();
                this.taskModal.classList.add('active');
            }
        }, { once: true });
    }

    /**
     * Submit a new task assignment
     */
    submitTask() {
        const vehicle = this.fleetManager.getSelectedVehicle();
        if (!vehicle) return;

        // Get form values
        const taskType = document.getElementById('task-type').value;
        const address = document.getElementById('task-address').value;
        const priority = document.getElementById('task-priority').value;
        const notes = document.getElementById('task-notes').value;

        // Get coordinates if available
        const addressInput = document.getElementById('task-address');
        const lat = parseFloat(addressInput.getAttribute('data-lat') || '0');
        const lng = parseFloat(addressInput.getAttribute('data-lng') || '0');

        // Create task object
        const task = {
            type: taskType,
            address: address,
            priority: priority,
            notes: notes,
            lat: lat,
            lng: lng
        };

        // Assign task through fleet manager
        const result = this.fleetManager.assignTask(vehicle.id, task);

        if (result.success) {
            // Close modal
            this.closeTaskModal();

            // Show success message
            this.showMessage(`${this.capitalizeFirst(taskType)} task assigned to ${vehicle.name}`);

            // Update vehicle details
            this.updateVehicleDetails(vehicle);

            // Update map to show new route
            const route = this.fleetManager.getVehicleRoute(vehicle.id);
            if (route) {
                this.mapController.displayRoute(route, vehicle);
            }
        } else {
            // Show error message
            this.showError(result.message || 'Failed to assign task');
        }
    }

    /**
     * Show a temporary message
     */
    showMessage(message, duration = 3000) {
        // Create message element if it doesn't exist
        let messageEl = document.getElementById('app-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'app-message';
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #4CAF50;
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                z-index: 2000;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                opacity: 0;
                transition: opacity 0.3s;
            `;
            document.body.appendChild(messageEl);
        }

        // Set message text and show
        messageEl.textContent = message;
        messageEl.style.opacity = '1';

        // Hide after duration
        setTimeout(() => {
            messageEl.style.opacity = '0';
        }, duration);
    }

    /**
     * Show an error message
     */
    showError(message) {
        console.error(message);

        // Create error element if it doesn't exist
        let errorEl = document.getElementById('app-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'app-error';
            errorEl.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #F44336;
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                z-index: 2000;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            `;

            const closeBtn = document.createElement('span');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = `
                margin-left: 15px;
                font-weight: bold;
                cursor: pointer;
            `;
            closeBtn.addEventListener('click', () => {
                errorEl.style.display = 'none';
            });

            errorEl.appendChild(document.createTextNode(message));
            errorEl.appendChild(closeBtn);
            document.body.appendChild(errorEl);
        } else {
            errorEl.firstChild.textContent = message;
            errorEl.style.display = 'block';
        }

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }

    /**
     * Get icon class for vehicle type
     */
    getVehicleIcon(type) {
        switch (type) {
            case 'truck': return 'fas fa-truck';
            case 'van': return 'fas fa-shuttle-van';
            case 'car': return 'fas fa-car';
            case 'motorcycle': return 'fas fa-motorcycle';
            case 'bicycle': return 'fas fa-bicycle';
            default: return 'fas fa-truck-moving';
        }
    }

    /**
     * Get icon for stop type
     */
    getStopIcon(type) {
        switch (type) {
            case 'delivery': return 'fas fa-box';
            case 'pickup': return 'fas fa-hand-holding-box';
            case 'depot': return 'fas fa-warehouse';
            case 'service': return 'fas fa-tools';
            default: return 'fas fa-map-marker-alt';
        }
    }

    /**
     * Format time for display
     */
    formatTime(timeString) {
        if (!timeString) return 'N/A';

        const options = {
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            day: 'numeric'
        };

        return new Date(timeString).toLocaleString(undefined, options);
    }

    /**
     * Capitalize first letter
     */
    capitalizeFirst(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}