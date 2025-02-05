/**
 * Visualization module for the Particle Collision Visualizer
 */
class Visualization {
    constructor(plotElement) {
        this.plotElement = plotElement;
        this.currentData = null;
        this.currentView = '3d';
        this.colorBy = 'particle_type';
        this.particleColors = {
            'electron': '#3498db',
            'positron': '#e74c3c',
            'photon': '#f1c40f',
            'proton': '#9b59b6',
            'neutron': '#2ecc71',
            'muon': '#8e44ad',
            'pion': '#e67e22',
            'kaon': '#16a085'
        };
        
        // Default color for unknown particle types
        this.defaultColor = '#95a5a6';
    }

    /**
     * Create the visualization for the given event data
     */
    visualize(eventData, viewType, colorBy) {
        if (!eventData || !eventData.particles || eventData.particles.length === 0) {
            this.showError("No particle data available for visualization");
            return;
        }
        
        this.currentData = eventData;
        this.currentView = viewType || this.currentView;
        this.colorBy = colorBy || this.colorBy;
        
        // Clear previous plot
        Plotly.purge(this.plotElement);
        
        switch (this.currentView) {
            case '3d':
                this.create3DVisualization();
                break;
            case '2d-xy':
                this.create2DVisualization('x', 'y', 'X-Y Projection');
                break;
            case '2d-xz':
                this.create2DVisualization('x', 'z', 'X-Z Projection');
                break;
            case '2d-yz':
                this.create2DVisualization('y', 'z', 'Y-Z Projection');
                break;
            case 'energy':
                this.createEnergyVisualization();
                break;
            default:
                this.create3DVisualization();
        }
    }

    /**
     * Create a 3D visualization of particle tracks
     */
    create3DVisualization() {
        const particles = this.currentData.particles;
        const traces = [];
        
        // Create a set of unique particle types for the legend
        const uniqueTypes = new Set(particles.map(p => p.particle_type));
        
        // Group particles by type to make one trace per particle type
        uniqueTypes.forEach(type => {
            const particlesOfType = particles.filter(p => p.particle_type === type);
            
            particlesOfType.forEach(particle => {
                // Calculate the particle's momentum vector for direction
                const pMag = Math.sqrt(
                    Math.pow(particle.px || 0, 2) + 
                    Math.pow(particle.py || 0, 2) + 
                    Math.pow(particle.pz || 0, 2)
                );
                
                // Normalize momentum to get direction
                const scaleFactor = 10; // Scale factor for visualization
                let dx = 0, dy = 0, dz = 0;
                
                if (pMag > 0) {
                    dx = (particle.px || 0) / pMag * scaleFactor;
                    dy = (particle.py || 0) / pMag * scaleFactor;
                    dz = (particle.pz || 0) / pMag * scaleFactor;
                }
                
                // Start point (origin) and end point
                const x = [0, dx];
                const y = [0, dy];
                const z = [0, dz];
                
                // Color based on selected property
                let color;
                if (this.colorBy === 'particle_type') {
                    color = this.getColorForParticle(particle.particle_type);
                } else if (this.colorBy === 'energy') {
                    color = this.getColorFromScale(particle.energy, 0, 100); // Assuming max energy ~100GeV
                } else if (this.colorBy === 'momentum') {
                    color = this.getColorFromScale(pMag, 0, 100); // Assuming max momentum ~100GeV/c
                }
                
                // Create a trace for this particle
                traces.push({
                    type: 'scatter3d',
                    mode: 'lines',
                    x: x,
                    y: y,
                    z: z,
                    line: {
                        color: color,
                        width: 6
                    },
                    name: `${particle.particle_type} (ID: ${particle.particle_id})`,
                    hoverinfo: 'text',
                    hovertext: this.createHoverText(particle),
                    showlegend: false
                });
                
                // Add marker at end of track
                traces.push({
                    type: 'scatter3d',
                    mode: 'markers',
                    x: [dx],
                    y: [dy],
                    z: [dz],
                    marker: {
                        color: color,
                        size: 5,
                        opacity: 0.8
                    },
                    name: `${particle.particle_type} (ID: ${particle.particle_id})`,
                    hoverinfo: 'text',
                    hovertext: this.createHoverText(particle),
                    showlegend: false
                });
            });
            
            // Add a single legend item for this particle type
            traces.push({
                type: 'scatter3d',
                mode: 'markers',
                x: [null],
                y: [null],
                z: [null],
                name: type,
                marker: { color: this.getColorForParticle(type) },
                showlegend: true
            });
        });
        
        // Create the 3D plot
        const layout = {
            title: `Event ${this.currentData.id} - 3D Visualization`,
            scene: {
                xaxis: { title: 'X' },
                yaxis: { title: 'Y' },
                zaxis: { title: 'Z' },
                aspectmode: 'cube'
            },
            margin: { l: 0, r: 0, b: 0, t: 50 },
            legend: { 
                x: 1,
                y: 0.9
            },
            hovermode: 'closest'
        };
        
        Plotly.newPlot(this.plotElement, traces, layout, {responsive: true});
    }

    /**
     * Create a 2D visualization of particle tracks
     */
    create2DVisualization(axis1, axis2, title) {
        const particles = this.currentData.particles;
        const traces = [];
        
        // Create a set of unique particle types for the legend
        const uniqueTypes = new Set(particles.map(p => p.particle_type));
        
        // Group particles by type to make one trace per particle type
        uniqueTypes.forEach(type => {
            const particlesOfType = particles.filter(p => p.particle_type === type);
            
            particlesOfType.forEach(particle => {
                // Calculate the particle's momentum vector for direction
                const p1 = particle[`p${axis1}`] || 0;
                const p2 = particle[`p${axis2}`] || 0;
                const pMag = Math.sqrt(p1*p1 + p2*p2);
                
                // Normalize momentum to get direction
                const scaleFactor = 10; // Scale factor for visualization
                let d1 = 0, d2 = 0;
                
                if (pMag > 0) {
                    d1 = p1 / pMag * scaleFactor;
                    d2 = p2 / pMag * scaleFactor;
                }
                
                // Start point (origin) and end point
                const coord1 = [0, d1];
                const coord2 = [0, d2];
                
                // Color based on selected property
                let color;
                if (this.colorBy === 'particle_type') {
                    color = this.getColorForParticle(particle.particle_type);
                } else if (this.colorBy === 'energy') {
                    color = this.getColorFromScale(particle.energy, 0, 100);
                } else if (this.colorBy === 'momentum') {
                    color = this.getColorFromScale(
                        Math.sqrt(
                            Math.pow(particle.px || 0, 2) + 
                            Math.pow(particle.py || 0, 2) + 
                            Math.pow(particle.pz || 0, 2)
                        ),
                        0, 100
                    );
                }
                
                // Data for plotting depends on which axes we're using
                const plotData = {
                    type: 'scatter',
                    mode: 'lines+markers',
                    line: {
                        color: color,
                        width: 3
                    },
                    marker: {
                        color: color,
                        size: 6
                    },
                    name: `${particle.particle_type} (ID: ${particle.particle_id})`,
                    hoverinfo: 'text',
                    hovertext: this.createHoverText(particle),
                    showlegend: false
                };
                
                plotData[axis1] = coord1;
                plotData[axis2] = coord2;
                
                traces.push(plotData);
            });
            
            // Add a single legend item for this particle type
            const legendItem = {
                type: 'scatter',
                mode: 'markers',
                name: type,
                marker: { color: this.getColorForParticle(type) },
                showlegend: true
            };
            
            legendItem[axis1] = [null];
            legendItem[axis2] = [null];
            
            traces.push(legendItem);
        });
        
        // Create the 2D plot
        const layout = {
            title: `Event ${this.currentData.id} - ${title}`,
            xaxis: { 
                title: axis1.toUpperCase(),
                zeroline: true
            },
            yaxis: { 
                title: axis2.toUpperCase(),
                zeroline: true
            },
            margin: { l: 50, r: 50, b: 50, t: 50 },
            hovermode: 'closest',
            legend: { 
                x: 1,
                y: 0.9
            }
        };
        
        Plotly.newPlot(this.plotElement, traces, layout, {responsive: true});
    }

    /**
     * Create an energy distribution visualization
     */
    createEnergyVisualization() {
        const particles = this.currentData.particles;
        
        // Group particles by type
        const particlesByType = {};
        particles.forEach(p => {
            if (!particlesByType[p.particle_type]) {
                particlesByType[p.particle_type] = [];
            }
            particlesByType[p.particle_type].push(p);
        });
        
        const traces = [];
        
        // Create a histogram trace for each particle type
        Object.keys(particlesByType).forEach(type => {
            traces.push({
                x: particlesByType[type].map(p => p.energy),
                type: 'histogram',
                opacity: 0.7,
                name: type,
                marker: {
                    color: this.getColorForParticle(type)
                },
                autobinx: false,
                xbins: {
                    start: 0,
                    end: 100,
                    size: 5
                }
            });
        });
        
        // Create the energy distribution plot
        const layout = {
            title: `Event ${this.currentData.id} - Energy Distribution`,
            xaxis: {
                title: 'Energy (GeV)'
            },
            yaxis: {
                title: 'Count'
            },
            barmode: 'overlay',
            bargap: 0.05,
            bargroupgap: 0.2
        };
        
        Plotly.newPlot(this.plotElement, traces, layout, {responsive: true});
    }

    /**
     * Helper to get a color for a particle type
     */
    getColorForParticle(particleType) {
        return this.particleColors[particleType] || this.defaultColor;
    }

    /**
     * Helper to generate a color from a value within a range
     */
    getColorFromScale(value, min, max) {
        // Normalize value between 0 and 1
        const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
        
        // Generate color using HSL (hue shift from blue to red)
        // 240 is blue, 0 is red, higher values (higher energy/momentum) will be closer to red
        const hue = 240 * (1 - normalized);
        return `hsl(${hue}, 100%, 50%)`;
    }

    /**
     * Create hover text for a particle
     */
    createHoverText(particle) {
        return `ID: ${particle.particle_id}<br>` +
               `Type: ${particle.particle_type}<br>` +
               `Energy: ${particle.energy.toFixed(2)} GeV<br>` +
               `Momentum: (${particle.px?.toFixed(2) || 0}, ${particle.py?.toFixed(2) || 0}, ${particle.pz?.toFixed(2) || 0}) GeV/c`;
    }

    /**
     * Display an error message
     */
    showError(message) {
        Plotly.purge(this.plotElement);
        this.plotElement.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                <div style="text-align: center; color: #e74c3c; font-weight: bold;">
                    <p>${message}</p>
                </div>
            </div>
        `;
    }

    /**
     * Reset the view to default settings
     */
    resetView() {
        if (this.currentData) {
            this.visualize(this.currentData, '3d', 'particle_type');
        }
    }
}