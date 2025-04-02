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

        // Set current date and username in header
        const datetimeEl = document.querySelector('.datetime');
        const usernameEl = document.querySelector('.username');

        if (usernameEl) {
            usernameEl.textContent = 'erencanakyuz'; // Using the provided username
        }

        // Update the datetime every second
        if (datetimeEl) {
            const updateDateTime = () => {
                const now = new Date();
                datetimeEl.innerHTML = `<i class="far fa-clock"></i> ${now.toISOString().replace('T', ' ').substr(0, 19)} UTC`;
            };

            // Initial update
            updateDateTime();

            // Set interval to update every second
            setInterval(updateDateTime, 1000);
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

            // Add dark mode toggle to header
            this.addDarkModeToggle();

            // Load fleet data
            await this.fleetManager.initialize();

            // Display vehicles on map
            this.mapController.displayVehicles(this.fleetManager.getAllVehicles());

            // Populate vehicle list
            this.updateVehicleList();

            // Update dashboard stats
            this.updateFleetStats();

            // Load weather data
            this.loadWeatherData();

            // Set up event listeners
            this.setupEventListeners();

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

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
     * Load real-time weather data for Istanbul
     */
    async loadWeatherData() {
        try {
            // Create weather element if it doesn't exist
            let weatherEl = document.querySelector('.weather-info');
            if (!weatherEl) {
                weatherEl = document.createElement('span');
                weatherEl.classList.add('weather-info');
                weatherEl.innerHTML = '<i class="fas fa-cloud"></i> Yükleniyor...';

                // Insert after username
                const userInfoEl = document.querySelector('.user-info');
                if (userInfoEl) {
                    userInfoEl.appendChild(weatherEl);
                }
            }

            // For demo purposes, we'll use mocked weather data
            // In a real app, you would fetch this from a weather API
            const weatherData = {
                temp: 18 + Math.floor(Math.random() * 10) - 5, // 13-23°C
                condition: ['güneşli', 'parçalı bulutlu', 'yağmurlu', 'sisli'][Math.floor(Math.random() * 4)],
                humidity: 60 + Math.floor(Math.random() * 20) // 60-80%
            };

            // Set weather icons based on condition
            let weatherIcon = 'sun';
            if (weatherData.condition === 'parçalı bulutlu') weatherIcon = 'cloud-sun';
            if (weatherData.condition === 'yağmurlu') weatherIcon = 'cloud-rain';
            if (weatherData.condition === 'sisli') weatherIcon = 'smog';

            // Update weather element
            weatherEl.innerHTML = `
                <i class="fas fa-${weatherIcon}"></i> 
                İstanbul: ${weatherData.temp}°C, ${weatherData.condition}, %${weatherData.humidity} nem
            `;

            // Update every 30 minutes
            setTimeout(() => this.loadWeatherData(), 30 * 60 * 1000);
        } catch (error) {
            console.log('Weather data could not be loaded:', error);
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

        // Add speed boost button to track button area
        const trackVehicleBtn = document.getElementById('track-vehicle');
        if (trackVehicleBtn) {
            const boostBtn = document.createElement('button');
            boostBtn.id = 'boost-speed';
            boostBtn.className = 'btn primary';
            boostBtn.innerHTML = '<i class="fas fa-bolt"></i> Boost Speed';
            boostBtn.addEventListener('click', () => this.boostVehicleSpeed());

            // Insert after track button
            trackVehicleBtn.parentNode.insertBefore(boostBtn, trackVehicleBtn.nextSibling);
        }

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

        // Listen for fuel alerts
        document.addEventListener('vehicle-fuel-alert', (e) => {
            const vehicleId = e.detail.vehicleId;
            const fuelLevel = e.detail.fuelLevel;
            const vehicle = this.fleetManager.getVehicle(vehicleId);

            if (vehicle) {
                // Show a notification about low fuel
                this.showMessage(`
                    <div class="alert-message">
                        <i class="fas fa-gas-pump" style="color: #F44336;"></i>
                        <strong>${vehicle.name}</strong> yakıt seviyesi düşük! 
                        Mevcut seviye: <strong>%${Math.round(fuelLevel)}</strong>
                    </div>
                `, 5000); // Show for 5 seconds

                // Also update the vehicle in the list to show the fuel status
                this.updateVehicleList();

                // If this is the currently selected vehicle, update details
                if (vehicleId === this.fleetManager.selectedVehicleId) {
                    this.updateVehicleDetails(vehicle);
                }
            }
        });

        // Add listener for the keyboard shortcuts link in footer
        document.getElementById('show-shortcuts').addEventListener('click', (e) => {
            e.preventDefault();
            this.showKeyboardShortcuts();
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

        // Update vehicle image
        const vehicleImage = document.getElementById('vehicle-image');
        vehicleImage.src = vehicle.image_url || 'https://via.placeholder.com/60x60?text=Vehicle';

        // Update basic info
        document.getElementById('vehicle-name').textContent = vehicle.name;

        // Update status
        const statusEl = document.getElementById('vehicle-status');
        statusEl.textContent = this.capitalizeFirst(vehicle.status);
        statusEl.className = 'status ' + vehicle.status;

        // Update driver
        const driverNameEl = document.getElementById('driver-name');
        driverNameEl.textContent = vehicle.driver ? vehicle.driver.name : 'Unassigned';

        // Update fuel with color coding
        const fuelLevelEl = document.getElementById('fuel-level');
        const fuelPercent = Math.round(vehicle.fuel_level || 0);
        fuelLevelEl.textContent = `${fuelPercent}%`;

        // Add color indicator for fuel level
        if (fuelPercent <= 20) {
            fuelLevelEl.style.color = '#F44336'; // Red for low fuel
        } else if (fuelPercent <= 40) {
            fuelLevelEl.style.color = '#FFC107'; // Yellow for medium-low
        } else {
            fuelLevelEl.style.color = ''; // Default color
        }

        // Update speed with enhanced display
        const speedEl = document.getElementById('current-speed');
        const speed = vehicle.current_speed || 0;

        // Create or get speed indicator span
        let speedIndicator = speedEl.querySelector('.speed-indicator');
        if (!speedIndicator) {
            speedIndicator = document.createElement('span');
            speedIndicator.className = 'speed-indicator';
            speedEl.innerHTML = '';
            speedEl.appendChild(speedIndicator);
        }

        // Update speed text and class based on speed range
        speedIndicator.textContent = `${speed} km/h`;
        speedIndicator.classList.remove('high', 'very-high');

        if (speed > 120) {
            speedIndicator.classList.add('very-high');
        } else if (speed > 80) {
            speedIndicator.classList.add('high');
        }

        // Update distance
        document.getElementById('distance-traveled').textContent = `${Math.round(vehicle.distance_traveled || 0)} km`;

        // Update route information
        this.updateRouteInfo(vehicle);

        // Update activity list
        this.updateActivityList(vehicle);
    }

    /**
     * Update the route information in the details panel
     */
    updateRouteInfo(vehicle) {
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
    }

    /**
     * Update the activity list in the details panel
     */
    updateActivityList(vehicle) {
        const activityList = document.getElementById('activity-list');
        let activitiesHtml = '';

        if (vehicle.activities && vehicle.activities.length > 0) {
            vehicle.activities.forEach(activity => {
                // Add icon based on activity type
                let icon = 'fa-circle';
                let iconColor = '';

                switch (activity.type) {
                    case 'departure':
                        icon = 'fa-play-circle';
                        iconColor = 'color: #4CAF50;'; // Green
                        break;
                    case 'delivery_completed':
                    case 'pickup_completed':
                    case 'stop_completed':
                        icon = 'fa-check-circle';
                        iconColor = 'color: #4CAF50;'; // Green
                        break;
                    case 'stop_arrival':
                        icon = 'fa-map-marker-alt';
                        iconColor = 'color: #2196F3;'; // Blue
                        break;
                    case 'break':
                        icon = 'fa-coffee';
                        iconColor = 'color: #9C27B0;'; // Purple
                        break;
                    case 'traffic':
                        icon = 'fa-traffic-light';
                        iconColor = 'color: #FF9800;'; // Orange
                        break;
                    case 'vehicle_issue':
                        icon = 'fa-exclamation-triangle';
                        iconColor = 'color: #F44336;'; // Red
                        break;
                    case 'fuel_alert':
                        icon = 'fa-gas-pump';
                        iconColor = 'color: #F44336;'; // Red
                        break;
                    case 'route_completed':
                        icon = 'fa-flag-checkered';
                        iconColor = 'color: #4CAF50;'; // Green
                        break;
                }

                activitiesHtml += `
                    <li class="activity-item">
                        <div>
                            <i class="fas ${icon}" style="${iconColor} margin-right: 8px;"></i>
                            ${activity.description}
                        </div>
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
     * Show a temporary message to the user
     */
    showMessage(message, duration = 3000) {
        // Check if the message container already exists
        let messageContainer = document.getElementById('message-container');

        // Create the message container if it doesn't exist
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'message-container';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 300px;
                transition: opacity 0.3s ease;
                opacity: 0;
            `;
            document.body.appendChild(messageContainer);
        }

        // Create the message element
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            background-color: #fff;
            color: #333;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #0d6efd;
            font-size: 14px;
            font-weight: 500;
        `;

        // Set message content
        messageEl.innerHTML = message;

        // Add to container
        messageContainer.appendChild(messageEl);
        messageContainer.style.opacity = '1';

        // Remove after duration
        setTimeout(() => {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                messageContainer.removeChild(messageEl);
                if (messageContainer.children.length === 0) {
                    messageContainer.style.opacity = '0';
                }
            }, 300);
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

    /**
     * Add dark mode toggle button to header
     */
    addDarkModeToggle() {
        const userInfo = document.querySelector('.user-info');
        if (!userInfo) return;

        const darkModeBtn = document.createElement('button');
        darkModeBtn.className = 'dark-mode-btn';
        darkModeBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        darkModeBtn.title = 'Toggle Dark Mode';

        darkModeBtn.addEventListener('click', () => {
            const isDarkMode = document.body.classList.toggle('dark-mode');

            // Update button icon and text
            if (isDarkMode) {
                darkModeBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
                // Also toggle map if map controller exists
                if (this.mapController && typeof this.mapController.toggleDarkMode === 'function') {
                    if (!this.mapController.isDarkMode) {
                        this.mapController.toggleDarkMode();
                    }
                }
            } else {
                darkModeBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
                // Also toggle map if map controller exists
                if (this.mapController && typeof this.mapController.toggleDarkMode === 'function') {
                    if (this.mapController.isDarkMode) {
                        this.mapController.toggleDarkMode();
                    }
                }
            }
        });

        userInfo.appendChild(darkModeBtn);
    }

    /**
     * Boost the speed of the selected vehicle to demonstrate high speed capability
     */
    boostVehicleSpeed() {
        const vehicle = this.fleetManager.getSelectedVehicle();
        if (!vehicle) {
            this.showMessage('No vehicle selected to boost speed', 3000);
            return;
        }

        // Check if vehicle is active
        if (vehicle.status !== 'active') {
            this.showMessage(`
                <div class="alert-message">
                    <i class="fas fa-exclamation-triangle" style="color: #FFC107;"></i>
                    <strong>${vehicle.name}</strong> is not active. Cannot boost speed.
                </div>
            `, 3000);
            return;
        }

        // Temporary speed boost
        const originalSpeed = vehicle.current_speed;
        vehicle.current_speed = Math.min(200, originalSpeed * 3); // Triple speed up to 200 km/h

        // Update UI
        this.updateVehicleDetails(vehicle);

        // Show booster effect on marker
        const marker = this.mapController.markers[vehicle.id];
        if (marker) {
            // Add boost animation class
            marker._icon.classList.add('boosted');

            // Create speed trail effect
            const trailColor = '#0d6efd';
            const trailLine = L.polyline([
                [vehicle.location.lat, vehicle.location.lng],
                [vehicle.location.lat, vehicle.location.lng]
            ], {
                color: trailColor,
                weight: 3,
                opacity: 0.8,
                dashArray: '5, 10'
            }).addTo(this.mapController.map);

            // Show notification
            this.showMessage(`
                <div class="alert-message">
                    <i class="fas fa-bolt" style="color: #0d6efd;"></i>
                    <strong>${vehicle.name}</strong> speed boosted to <strong>${vehicle.current_speed} km/h</strong>!
                </div>
            `, 3000);

            // Reset after 5 seconds
            setTimeout(() => {
                vehicle.current_speed = originalSpeed;
                this.updateVehicleDetails(vehicle);
                marker._icon.classList.remove('boosted');
                this.mapController.map.removeLayer(trailLine);

                this.showMessage(`
                    <div class="alert-message">
                        <i class="fas fa-tachometer-alt" style="color: #4CAF50;"></i>
                        <strong>${vehicle.name}</strong> speed normalized to <strong>${vehicle.current_speed} km/h</strong>
                    </div>
                `, 3000);
            }, 5000);
        }
    }

    /**
     * Setup keyboard shortcuts for quick navigation
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore shortcuts if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            // Get selected vehicle
            const selectedVehicle = this.fleetManager.getSelectedVehicle();

            switch (e.key) {
                case 'd':
                    // Toggle dark mode
                    document.querySelector('.dark-mode-btn')?.click();
                    break;
                case 'v':
                    // View all vehicles
                    this.viewAllBtn.click();
                    break;
                case 'r':
                    // View active routes
                    this.viewRoutesBtn.click();
                    break;
                case 'h':
                    // View heatmap
                    this.viewHeatmapBtn.click();
                    break;
                case 'o':
                    // Optimize routes
                    this.optimizeRoutesBtn.click();
                    break;
                case 'l':
                    // Toggle live tracking
                    this.liveTrackingBtn.click();
                    break;
                case 'c':
                    // Clear map
                    this.clearMapBtn.click();
                    break;
                case 'b':
                    // Boost speed (if vehicle selected)
                    if (selectedVehicle) {
                        document.getElementById('boost-speed')?.click();
                    }
                    break;
                case 't':
                    // Track vehicle (if vehicle selected)
                    if (selectedVehicle) {
                        document.getElementById('track-vehicle')?.click();
                    }
                    break;
                case 'm':
                    // Message driver (if vehicle selected)
                    if (selectedVehicle) {
                        document.getElementById('message-driver')?.click();
                    }
                    break;
                case 'a':
                    // Assign task (if vehicle selected)
                    if (selectedVehicle) {
                        document.getElementById('assign-task')?.click();
                    }
                    break;
                case 'Escape':
                    // Close any open panel or modal
                    this.closeDetailsPanel();
                    this.closeTaskModal();
                    break;
                case '?':
                    // Show keyboard shortcuts help
                    this.showKeyboardShortcuts();
                    break;
            }
        });
    }

    /**
     * Show keyboard shortcuts help
     */
    showKeyboardShortcuts() {
        const shortcutsHtml = `
            <div class="shortcuts-container">
                <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
                <div class="shortcuts-grid">
                    <div class="shortcut-item">
                        <span class="shortcut-key">D</span>
                        <span class="shortcut-desc">Toggle Dark Mode</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="shortcut-key">V</span>
                        <span class="shortcut-desc">View All Vehicles</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="shortcut-key">R</span>
                        <span class="shortcut-desc">View Active Routes</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="shortcut-key">H</span>
                        <span class="shortcut-desc">View Heatmap</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="shortcut-key">O</span>
                        <span class="shortcut-desc">Optimize Routes</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="shortcut-key">L</span>
                        <span class="shortcut-desc">Toggle Live Tracking</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="shortcut-key">C</span>
                        <span class="shortcut-desc">Clear Map</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="shortcut-key">B</span>
                        <span class="shortcut-desc">Boost Vehicle Speed</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="shortcut-key">T</span>
                        <span class="shortcut-desc">Track Selected Vehicle</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="shortcut-key">M</span>
                        <span class="shortcut-desc">Message Driver</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="shortcut-key">A</span>
                        <span class="shortcut-desc">Assign Task</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="shortcut-key">ESC</span>
                        <span class="shortcut-desc">Close Panels/Modals</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="shortcut-key">?</span>
                        <span class="shortcut-desc">Show This Help</span>
                    </div>
                </div>
                <div class="shortcuts-footer">
                    Press any key to close
                </div>
            </div>
        `;

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'shortcuts-overlay';
        overlay.innerHTML = shortcutsHtml;
        document.body.appendChild(overlay);

        // Close on click or keypress
        const closeShortcuts = () => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        };

        overlay.addEventListener('click', closeShortcuts);
        window.addEventListener('keydown', closeShortcuts, { once: true });
    }
}