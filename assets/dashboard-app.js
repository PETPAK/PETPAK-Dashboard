        // Data comes from data/dashboard-data.js (file:// safe). Keep arrays if already set.
        var mainDataRaw = (typeof mainDataRaw !== 'undefined' && Array.isArray(mainDataRaw)) ? mainDataRaw : [];
        var productDataRaw = (typeof productDataRaw !== 'undefined' && Array.isArray(productDataRaw)) ? productDataRaw : [];
        var eremaDataRaw = (typeof eremaDataRaw !== 'undefined' && Array.isArray(eremaDataRaw)) ? eremaDataRaw : [];
        var offlineDataRaw = (typeof offlineDataRaw !== 'undefined' && Array.isArray(offlineDataRaw)) ? offlineDataRaw : [];
        var dispatchDataRaw = (typeof dispatchDataRaw !== 'undefined' && Array.isArray(dispatchDataRaw)) ? dispatchDataRaw : [];

        // Register the datalabels plugin globally
        Chart.register(ChartDataLabels);

        // Global Chart.js overrides for dark neon cyber theme
        Chart.defaults.color = '#7e8b9b'; // --text-muted
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
        Chart.defaults.font.family = 'Inter';
        Chart.defaults.plugins.legend.labels.color = '#f0f3ff'; // --text-main
        Chart.defaults.plugins.legend.labels.font = { family: 'Space Grotesk', weight: '500', size: 11 };
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(4, 4, 6, 0.95)';
        Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
        Chart.defaults.plugins.tooltip.titleFont = { family: 'Space Grotesk', weight: '600' };
        Chart.defaults.plugins.tooltip.bodyColor = '#f0f3ff';
        Chart.defaults.plugins.tooltip.bodyFont = { family: 'Inter' };
        Chart.defaults.plugins.tooltip.borderColor = 'rgba(0, 240, 255, 0.2)';
        Chart.defaults.plugins.tooltip.borderWidth = 1;
        Chart.defaults.plugins.tooltip.padding = 10;
        Chart.defaults.plugins.tooltip.cornerRadius = 4;

        // Set global datalabels configuration — show values on all charts
        Chart.defaults.plugins.datalabels = {
            color: function(context) {
                const type = context.chart.config.type;
                if (type === 'doughnut' || type === 'polarArea' || type === 'pie') {
                    return '#ffffff';
                }
                return context.dataset.borderColor || '#dee2f6';
            },
            font: function(context) {
                const type = context.chart.config.type;
                return {
                    family: 'Space Grotesk',
                    size: (type === 'doughnut' || type === 'polarArea' || type === 'pie') ? 10 : 9,
                    weight: '700'
                };
            },
            align: function(context) {
                const type = context.chart.config.type;
                if (type === 'doughnut' || type === 'polarArea' || type === 'pie') {
                    return 'center';
                }
                if (context.chart.options.indexAxis === 'y') {
                    return 'right';
                }
                return 'top';
            },
            anchor: function(context) {
                const type = context.chart.config.type;
                if (type === 'doughnut' || type === 'polarArea' || type === 'pie') {
                    return 'center';
                }
                if (context.chart.options.indexAxis === 'y') {
                    return 'end';
                }
                return 'end';
            },
            formatter: function(value, context) {
                if (value === null || value === undefined) return '';
                if (value === 0) return '';

                const type = context.chart.config.type;
                const kpiKey = context.dataset.kpiKey;
                const units = {
                    prod: ' t',
                    oee: '%',
                    days: ' d',
                    accidents: '',
                    waste: ' t',
                    waste_pct: '%',
                    downtime: ' h',
                    breaks: '',
                    stoppages: '',
                    recovery: ' m',
                    grades: '',
                    microns: '',
                    erema: ' kg',
                    dispatch: ' t',
                    downtime_cat: ' h',
                    kg: ' kg',
                    hrs: ' h',
                    tons: ' t'
                };
                const unit = (kpiKey && units[kpiKey] !== undefined) ? units[kpiKey] : '';

                if (type === 'doughnut' || type === 'polarArea' || type === 'pie') {
                    const sum = context.chart.data.datasets[0].data.reduce((a, b) => a + (b || 0), 0);
                    if (sum === 0) return '';
                    const pct = (value / sum) * 100;
                    if (pct < 4) return '';
                    const num = value >= 100
                        ? Math.round(value).toLocaleString()
                        : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
                    return [`${num}${unit}`, `${pct.toFixed(1)}%`];
                }

                if (typeof value === 'number') {
                    let formatted = '';
                    if (Math.abs(value) >= 1000) {
                        formatted = Math.round(value).toLocaleString();
                    } else if (Number.isInteger(value) || Math.abs(value) >= 100) {
                        formatted = value.toLocaleString(undefined, { maximumFractionDigits: 0 });
                    } else {
                        formatted = value.toLocaleString(undefined, { maximumFractionDigits: 1 });
                    }
                    return formatted + unit;
                }
                return value + unit;
            },
            offset: 2,
            clip: false,
            display: function(context) {
                const v = context.dataset.data[context.dataIndex];
                return v !== null && v !== undefined && v !== 0;
            },
            textStrokeColor: 'rgba(0,0,0,0.45)',
            textStrokeWidth: 2
        };

        // Active state and selectors
        let activeTab = 'executive';


        const yearFilter = document.getElementById('yearFilter');
        const monthFilter = document.getElementById('monthFilter');
        const navItems = document.querySelectorAll('.nav-item');
        const tabPanels = document.querySelectorAll('.tab-panel');
        const headerTitle = document.getElementById('header-title');
        const headerSubtitle = document.getElementById('header-subtitle');
        const headerPeriodPill = document.getElementById('header-period-pill');
        const headerCoveragePill = document.getElementById('header-coverage-pill');

        const tabMeta = {
            overview: { title: "Operations Command Deck", subtitle: "MAIN DATA TELEMETRY" },
            executive: { title: "Plant Overview", subtitle: "Real-time overview of plant operations and key performance indicators" },
            losses: { title: "Loss & Downtime Deep-Dive", subtitle: "INCIDENTS & WASTAGE METRICS" },
            products: { title: "Products Performance", subtitle: "PRODUCTION BY PRODUCT" },
            erema: { title: "Recycling", subtitle: "RECLAIMED MATERIAL THROUGHPUT" },
            offline: { title: "Offline Operations Deck", subtitle: "PS, SS & METALLIZER PERFORMANCE" },
            dispatch: { title: "Dispatch", subtitle: "EXPORT · LOCAL · Q2 DISPATCHED" },
            comparison: { title: "Telemetry Comparison Engine", subtitle: "KPI & DOWNTIME ANALYSIS" },
            forecast: { title: "Statistical Forecast", subtitle: "LINEAR / HOLT / MOVING-AVERAGE OUTLOOK" },
            skutrends: { title: "Product Growth & Decline Analysis", subtitle: "5-MONTH OPERATIONS TREND ENGINE" },
            savings: { title: "Cost & Savings", subtitle: "OPERATIONAL ECONOMICS SIMULATOR" },
            advsim: { title: "Advanced Operations Simulator", subtitle: "WHAT-IF TUNER & PRESETS" }
        };

        // Master List of 12 KPIs
        const kpiOptions = [
            { key: 'prod', label: 'Production' },
            { key: 'oee', label: 'Avg OEE %' },
            { key: 'days', label: 'Running Days' },
            { key: 'accidents', label: 'Accidents' },
            { key: 'waste', label: 'Material Waste' },
            { key: 'waste_pct', label: 'Avg Waste %' },
            { key: 'downtime', label: 'Total Downtime' },
            { key: 'breaks', label: 'Line Breaks' },
            { key: 'stoppages', label: 'Stoppages/Day' },
            { key: 'recovery', label: 'Recovery Time' },
            { key: 'grades', label: 'Grade Changes' },
            { key: 'microns', label: 'Micron Changes' },
            { key: 'kwh_line', label: 'KWh/Kg Line' },
            { key: 'kwh_plant', label: 'KWh/Kg Plant' },
            { key: 'rs_line', label: 'Rs/Kg Line' },
            { key: 'rs_plant', label: 'Rs/Kg Plant' },
            { key: 'sim_total_savings', label: 'Sim. Total Savings' },
            { key: 'sim_energy_saving', label: 'Sim. Energy Saving' },
            { key: 'sim_recycle_saving', label: 'Sim. Recycle Saving' },
            { key: 'sim_waste_saving', label: 'Sim. Waste Saving' },
            { key: 'sim_downtime_saving', label: 'Sim. Downtime Saving' }
        ];

        // List of visible KPIs (by key)
        const DEFAULT_VISIBLE_KPIS = ['prod', 'oee', 'days', 'accidents', 'waste'];
        const DEFAULT_ACTIVE_TRENDS = ['prod', 'waste'];

        let visibleKPIs = [];
        try {
            const stored = localStorage.getItem('petpak_visible_kpis');
            visibleKPIs = stored ? JSON.parse(stored) : [...DEFAULT_VISIBLE_KPIS];
        } catch (e) {
            visibleKPIs = [...DEFAULT_VISIBLE_KPIS];
        }
        visibleKPIs = visibleKPIs.filter(key => kpiOptions.some(o => o.key === key));
        
        // Active Trend line keys shown in Overview chart
        let activeTrends = [];
        try {
            const stored = localStorage.getItem('petpak_active_trends');
            activeTrends = stored ? JSON.parse(stored) : [...DEFAULT_ACTIVE_TRENDS];
        } catch (e) {
            activeTrends = [...DEFAULT_ACTIVE_TRENDS];
        }        // Theme switcher logic
        function changeTheme(theme) {
            document.body.classList.remove(
                'theme-bopet', 'theme-steel', 'theme-solar', 
                'theme-purple', 'theme-matrix', 'theme-arctic', 'theme-abyss', 'theme-carbon'
            );
            
            if (['bopet', 'steel', 'solar', 'purple', 'matrix', 'arctic', 'abyss', 'carbon'].includes(theme)) {
                document.body.classList.add(`theme-${theme}`);
            }
            
            try {
                localStorage.setItem('petpak_theme', theme);
            } catch (e) {
                console.error("Failed to save theme in localStorage:", e);
            }
            
            const themeFilter = document.getElementById('themeFilter');
            if (themeFilter) {
                themeFilter.value = theme;
            }
            
            updateChartThemeColors(theme);
        }

        function updateChartThemeColors(theme) {
            let textColor, labelColor, tooltipBg, tooltipBorder;
            if (theme === 'steel') {
                textColor = '#9ca3af'; // --text-muted
                labelColor = '#f3f4f6'; // --text-main
                tooltipBg = 'rgba(17, 24, 39, 0.95)';
                tooltipBorder = 'rgba(56, 189, 248, 0.3)';
            } else if (theme === 'solar') {
                textColor = '#a69480'; // --text-muted
                labelColor = '#fffae6'; // --text-main
                tooltipBg = 'rgba(14, 7, 0, 0.95)';
                tooltipBorder = 'rgba(255, 170, 0, 0.3)';
            } else if (theme === 'purple') {
                textColor = '#8e82a6';
                labelColor = '#f1eafd';
                tooltipBg = 'rgba(10, 4, 23, 0.95)';
                tooltipBorder = 'rgba(186, 104, 200, 0.3)';
            } else if (theme === 'matrix') {
                textColor = '#7a997a';
                labelColor = '#e5ffe5';
                tooltipBg = 'rgba(2, 10, 2, 0.95)';
                tooltipBorder = 'rgba(57, 255, 20, 0.3)';
            } else if (theme === 'arctic') {
                textColor = '#80a5b8';
                labelColor = '#e6f7ff';
                tooltipBg = 'rgba(8, 20, 36, 0.95)';
                tooltipBorder = 'rgba(0, 191, 255, 0.3)';
            } else if (theme === 'abyss') {
                textColor = '#7a91b5';
                labelColor = '#ecf3ff';
                tooltipBg = 'rgba(2, 13, 32, 0.95)';
                tooltipBorder = 'rgba(30, 144, 255, 0.3)';
            } else if (theme === 'carbon') {
                textColor = '#888888';
                labelColor = '#f5f5f5';
                tooltipBg = 'rgba(18, 18, 18, 0.95)';
                tooltipBorder = 'rgba(255, 255, 255, 0.3)';
            } else { // dark or bopet
                textColor = '#7e8b9b'; // --text-muted
                labelColor = '#f0f3ff'; // --text-main
                tooltipBg = 'rgba(4, 4, 6, 0.95)';
                tooltipBorder = 'rgba(0, 240, 255, 0.2)';
            }
            
            if (window.Chart) {
                Chart.defaults.color = textColor;
                Chart.defaults.plugins.legend.labels.color = labelColor;
                Chart.defaults.plugins.tooltip.backgroundColor = tooltipBg;
                Chart.defaults.plugins.tooltip.borderColor = tooltipBorder;
            }
            
            if (window.isDashboardInitialized && typeof updateDashboard === 'function') {
                updateDashboard();
            }
        }

        // Block shape switcher logic
        window.changeBlockShape = function(shape) {
            document.body.classList.remove(
                'shape-standard', 'shape-asymmetric', 'shape-cyberpunk', 
                'shape-hex-corner', 'shape-double-border', 'shape-sharp',
                'shape-hexagonal', 'shape-octagonal', 'shape-slanted', 'shape-leaf'
            );
            
            if (['standard', 'asymmetric', 'cyberpunk', 'hex-corner', 'double-border', 'sharp', 'hexagonal', 'octagonal', 'slanted', 'leaf'].includes(shape)) {
                document.body.classList.add(`shape-${shape}`);
            } else {
                document.body.classList.add('shape-standard');
                shape = 'standard';
            }
            
            try {
                localStorage.setItem('petpak_block_shape', shape);
            } catch (e) {
                console.error("Failed to save block shape in localStorage:", e);
            }
            
            const shapeFilter = document.getElementById('blockShapeFilter');
            if (shapeFilter) {
                shapeFilter.value = shape;
            }
        };

        // Initialize Theme from localStorage
        let currentTheme = 'dark';
        try {
            currentTheme = localStorage.getItem('petpak_theme') || 'dark';
        } catch (e) {
            currentTheme = 'dark';
        }
        changeTheme(currentTheme);

        // Initialize Block Shape from localStorage
        let currentBlockShape = 'standard';
        try {
            currentBlockShape = localStorage.getItem('petpak_block_shape') || 'standard';
        } catch (e) {
            currentBlockShape = 'standard';
        }
        changeBlockShape(currentBlockShape);

        // Sidebar collapsible helpers
        window.toggleSidebar = function() {
            document.body.classList.toggle('sidebar-collapsed');
            const btn = document.getElementById('sidebar-toggle');
            if (!btn) return;
            if (document.body.classList.contains('sidebar-collapsed')) {
                btn.innerHTML = '▶';
                try { localStorage.setItem('petpak_sidebar_collapsed', 'true'); } catch(e) {}
            } else {
                btn.innerHTML = '◀';
                try { localStorage.setItem('petpak_sidebar_collapsed', 'false'); } catch(e) {}
            }
            resizeDashboardCharts();
        };

        function resizeDashboardCharts() {
            setTimeout(() => {
                if (overviewChart) overviewChart.resize();
                if (wasteChart) wasteChart.resize();
                if (downtimeChart) downtimeChart.resize();
                if (productTypeChart) productTypeChart.resize();
                if (activeTrendChart) activeTrendChart.resize();
                if (eremaChart) eremaChart.resize();
                if (dispatchChart) dispatchChart.resize();
                if (kpiComparisonChart) kpiComparisonChart.resize();
                if (downtimeComparisonChart) downtimeComparisonChart.resize();
                if (window.forecastChart) window.forecastChart.resize();
                if (offlineOverviewChart) offlineOverviewChart.resize();
                if (offlinePSChart) offlinePSChart.resize();
                if (offlinePSWasteChart) offlinePSWasteChart.resize();
                if (offlinePSDtChart) offlinePSDtChart.resize();
                if (offlineSSChart) offlineSSChart.resize();
                if (offlineSSWasteChart) offlineSSWasteChart.resize();
                if (offlineSSDtChart) offlineSSDtChart.resize();
                if (offlineMetChart) offlineMetChart.resize();
                if (offlineMetWasteChart) offlineMetWasteChart.resize();
            }, 310);
        }

        // Initialize Sidebar collapsible state from localStorage
        try {
            const sidebarCollapsed = localStorage.getItem('petpak_sidebar_collapsed') === 'true';
            if (sidebarCollapsed) {
                document.body.classList.add('sidebar-collapsed');
                // We'll update the button content on load
                document.addEventListener('DOMContentLoaded', () => {
                    const btn = document.getElementById('sidebar-toggle');
                    if (btn) btn.innerHTML = '▶';
                });
            }
        } catch(e) {}
        function saveKpiPreferences() {
            try {
                localStorage.setItem('petpak_visible_kpis', JSON.stringify(visibleKPIs));
                localStorage.setItem('petpak_active_trends', JSON.stringify(activeTrends));
            } catch (e) {
                console.error("Failed to save KPI preferences:", e);
            }
        }

        // Temporary storage for KPI selection before applying
        let tempVisibleKPIs = [];

        function openKpiModal() {
            // Clone current visible KPIs to temp array
            tempVisibleKPIs = [...visibleKPIs];
            
            // Build the modal contents dynamically
            renderKpiModalGrid();
            
            const modal = document.getElementById('kpiModal');
            modal.classList.add('show');
        }

        function closeKpiModal() {
            const modal = document.getElementById('kpiModal');
            modal.classList.remove('show');
        }
        function formatDowntimeRemarks(text) {
            if (!text) return '';
            text = polishRemarkText(text);
            
            const blocks = text.split(/\s*\|\s*/);
            let html = '';
            
            blocks.forEach(block => {
                let blockText = block.trim();
                if (!blockText) return;
                
                let sectionTitle = '';
                const prefixMatch = blockText.match(/^(Plant|Utilities|Mech Plant|Mech Utilities|Elect Plant|Elect Utilities|Machine|Line|General):\s*([\s\S]*)$/i);
                if (prefixMatch) {
                    sectionTitle = prefixMatch[1].trim();
                    blockText = prefixMatch[2].trim();
                }
                
                // Parse embedded dates and split them into separate lines
                // Matches either: DD/MM/YYYY or D-MMM-YY
                const datePattern = /(\b\d{1,2}-\w{3}-\d{2,4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b)/;
                const parts = blockText.split(datePattern);
                
                let lines = [];
                let currentPrefix = "";
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i].trim();
                    if (!part) continue;
                    
                    if (part.match(/^(\d{1,2}-\w{3}-\d{2,4}|\d{1,2}\/\d{1,2}\/\d{2,4})$/)) {
                        let dateStr = part;
                        let descStr = "";
                        if (i + 1 < parts.length) {
                            descStr = parts[i + 1].trim();
                            i++;
                        }
                        
                        // Normalize slash dates to DD-MMM-YY
                        let formattedDate = dateStr;
                        const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
                        if (slashMatch) {
                            const d = parseInt(slashMatch[1], 10);
                            const m = parseInt(slashMatch[2], 10);
                            let y = slashMatch[3];
                            if (y.length === 4) y = y.substring(2);
                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            const mName = monthNames[m - 1] || "Jun";
                            formattedDate = `${d}-${mName}-${y}`;
                        }
                        
                        descStr = descStr.replace(/^[\s\t\-\–\—\.\:\,]+/, '').trim();
                        lines.push({ date: formattedDate, desc: descStr });
                    } else {
                        currentPrefix = part;
                    }
                }
                
                let listHTML = '<ul style="margin: 0; padding-left: 20px; list-style-type: disc; display: flex; flex-direction: column; gap: 6px;">';
                let hasPoints = false;
                
                if (lines.length === 0) {
                    const rawLines = blockText.split(/\n+/);
                    rawLines.forEach(line => {
                        let trimmed = line.trim();
                        if (!trimmed) return;
                        hasPoints = true;
                        
                        const inlinePrefixMatch = trimmed.match(/^([A-Za-z0-9\s]+):\s*(.*)$/);
                        let formattedLine = trimmed;
                        if (inlinePrefixMatch) {
                            formattedLine = `<span style="color: var(--text-muted); font-weight: 500;">${inlinePrefixMatch[1]}: </span><span style="color: var(--text-muted);">${inlinePrefixMatch[2]}</span>`;
                        } else {
                            formattedLine = `<span style="color: var(--text-muted);">${trimmed}</span>`;
                        }
                        listHTML += `<li style="line-height: 1.4; font-size: 13px;">${formattedLine}</li>`;
                    });
                } else {
                    hasPoints = true;
                    lines.forEach(item => {
                        let formattedLine = `<strong style="color: var(--color-primary); font-family: monospace;">${item.date}</strong> &ndash; <span style="color: var(--text-muted);">${item.desc}</span>`;
                        listHTML += `<li style="line-height: 1.4; font-size: 13px;">${formattedLine}</li>`;
                    });
                }
                
                listHTML += '</ul>';
                
                if (hasPoints) {
                    if (sectionTitle) {
                        html += `
                            <div style="margin-top: 8px; margin-bottom: 6px;">
                                <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--color-secondary); background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 4px; display: inline-block;">
                                    ${sectionTitle}
                                </span>
                            </div>
                        `;
                    }
                    html += listHTML;
                }
            });
            
            return html || text;
        }        function openDowntimeRemarksModal(catKey, catLabel, catColor) {
            const modal = document.getElementById('downtimeRemarksModal');
            const titleEl = document.getElementById('downtimeRemarksModalTitle');
            const contentEl = document.getElementById('downtimeRemarksModalContent');
            if (!modal || !titleEl || !contentEl) return;

            titleEl.innerHTML = `<span style="color: ${catColor}; text-shadow: 0 0 10px ${catColor}66;">${catLabel}</span> Remarks`;

            const remarksKey = catKey + '_Remarks';
            contentEl.innerHTML = '';

            const data = window.currentLossesData || [];
            let remarksFound = false;

            data.forEach(item => {
                const dateStr = item['Dates'];
                const dateObj = new Date(dateStr + "T00:00:00");
                const monthName = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                const val = item[remarksKey];
                if (val && String(val).trim()) {
                    remarksFound = true;
                    const remarkHTML = `
                        <div class="month-remarks-card" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 12px 16px;">
                            <div style="font-weight: 600; color: ${catColor}; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px; font-family: var(--font-display); font-size: 13px;">
                                ${monthName}
                            </div>
                            <div style="font-size: 13px; line-height: 1.5; color: var(--text-muted);">
                                ${formatDowntimeRemarks(String(val).trim())}
                            </div>
                        </div>
                    `;
                    contentEl.insertAdjacentHTML('beforeend', remarkHTML);
                }
            });

            if (!remarksFound) {
                contentEl.innerHTML = `
                    <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 14px;">
                        No remarks logged for <strong>${catLabel}</strong> during the selected period.
                    </div>
                `;
            }

            modal.classList.add('show');
        }

        function closeDowntimeRemarksModal() {
            const modal = document.getElementById('downtimeRemarksModal');
            if (modal) {
                modal.classList.remove('show');
            }
        }

        function showGaugeExplanation(metric) {
            const modal = document.getElementById('metricExplanationModal');
            const titleEl = document.getElementById('metricExplanationTitle');
            const contentEl = document.getElementById('metricExplanationContent');
            if (!modal || !titleEl || !contentEl) return;

            let title = '';
            let contentHTML = '';

            if (metric === 'oee') {
                title = 'Overall Equipment Effectiveness (OEE)';
                contentHTML = `
                    <div style="font-family: var(--font-body); line-height: 1.6; color: var(--text-main);">
                        <div style="font-size: 28px; font-weight: 700; color: var(--color-secondary); text-align: center; margin-bottom: 16px; font-family: var(--font-display); text-shadow: 0 0 15px rgba(57, 255, 20, 0.3);">
                            Avg OEE
                        </div>
                        <p style="margin-bottom: 16px; font-size: 13.5px; color: var(--text-muted);">
                            Overall Equipment Effectiveness (OEE) is the industry standard for measuring manufacturing productivity. It evaluates how effectively the production line is utilized compared to its absolute capacity.
                        </p>
                        
                        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;">
                            <strong style="font-family: var(--font-display); font-size: 11px; text-transform: uppercase; color: var(--color-secondary); letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Calculation Formula:</strong>
                            <code style="font-size: 12.5px; font-weight: 600; color: #ffffff;">OEE % = (Availability × Performance × Quality) × 100</code>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
                            <div>
                                <strong style="color: #ffffff;">1. Availability:</strong> Actual run time vs. planned production time (takes into account downtime stoppages).
                            </div>
                            <div>
                                <strong style="color: #ffffff;">2. Performance:</strong> Actual production speed vs. maximum design/theoretical speed.
                            </div>
                            <div>
                                <strong style="color: #ffffff;">3. Quality:</strong> Good output (usable film) vs. total produced tonnage (takes into account process waste).
                            </div>
                        </div>
                    </div>
                `;
            } else if (metric === 'waste') {
                title = 'Waste Ratio';
                contentHTML = `
                    <div style="font-family: var(--font-body); line-height: 1.6; color: var(--text-main);">
                        <div style="font-size: 28px; font-weight: 700; color: var(--color-error); text-align: center; margin-bottom: 16px; font-family: var(--font-display); text-shadow: 0 0 15px rgba(255, 0, 85, 0.3);">
                            Waste Ratio
                        </div>
                        <p style="margin-bottom: 16px; font-size: 13.5px; color: var(--text-muted);">
                            The Waste Ratio represents the percentage of raw material and product tonnage that is discarded as scrap or process waste during extrusion and slitting.
                        </p>
                        
                        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;">
                            <strong style="font-family: var(--font-display); font-size: 11px; text-transform: uppercase; color: var(--color-error); letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Calculation Formula:</strong>
                            <code style="font-size: 12.5px; font-weight: 600; color: #ffffff;">Waste Ratio % = (Waste (Tons) / Total Production (Tons)) × 100</code>
                        </div>

                        <p style="font-size: 13px; color: var(--text-muted);">
                            A lower waste percentage reflects tighter process controls, fewer film breaks, and higher operational cost-efficiency.
                        </p>
                    </div>
                `;
            } else if (metric === 'util') {
                title = 'Utilization Index';
                contentHTML = `
                    <div style="font-family: var(--font-body); line-height: 1.6; color: var(--text-main);">
                        <div style="font-size: 28px; font-weight: 700; color: var(--color-primary); text-align: center; margin-bottom: 16px; font-family: var(--font-display); text-shadow: 0 0 15px rgba(0, 240, 255, 0.3);">
                            Utilization Index
                        </div>
                        <p style="margin-bottom: 16px; font-size: 13.5px; color: var(--text-muted);">
                            The Utilization Index reflects the percentage of days the production line was actively running during the selected period, compared to a full monthly baseline of 30 days.
                        </p>
                        
                        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;">
                            <strong style="font-family: var(--font-display); font-size: 11px; text-transform: uppercase; color: var(--color-primary); letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Calculation Formula:</strong>
                            <code style="font-size: 12.5px; font-weight: 600; color: #ffffff;">Util Index % = (Average Running Days / 30) × 100</code>
                        </div>

                        <p style="font-size: 13px; color: var(--text-muted);">
                            This gauge tracks asset utilization. If the line runs for an average of 24 days in a month, the utilization index is 80%. Value is capped at a maximum of 100%.
                        </p>
                    </div>
                `;
            } else if (metric === 'energy') {
                title = 'Specific Energy Consumption';
                contentHTML = `
                    <div style="font-family: var(--font-body); line-height: 1.6; color: var(--text-main);">
                        <div style="font-size: 24px; font-weight: 700; color: #00d2ff; text-align: center; margin-bottom: 16px; font-family: var(--font-display); text-shadow: 0 0 15px rgba(0, 210, 255, 0.3);">
                            Specific Energy
                        </div>
                        <p style="margin-bottom: 16px; font-size: 13.5px; color: var(--text-muted);">
                            Specific Energy measures the electrical energy consumed by the plant in kilowatt-hours (KWh) per kilogram (Kg) of sellable BOPET film produced.
                        </p>
                        
                        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;">
                            <strong style="font-family: var(--font-display); font-size: 11px; text-transform: uppercase; color: #00d2ff; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Target Baseline:</strong>
                            <code style="font-size: 12.5px; font-weight: 600; color: #ffffff;">1.0 KWh/Kg (Lower is better)</code>
                        </div>
                        
                        <p style="font-size: 13px; color: var(--text-muted);">
                            A lower specific energy value indicates higher plant efficiency, optimal extruder loading, and reduced carbon footprint.
                        </p>
                    </div>
                `;
            } else if (metric === 'cost') {
                title = 'Specific Energy Cost';
                contentHTML = `
                    <div style="font-family: var(--font-body); line-height: 1.6; color: var(--text-main);">
                        <div style="font-size: 24px; font-weight: 700; color: #ff9800; text-align: center; margin-bottom: 16px; font-family: var(--font-display); text-shadow: 0 0 15px rgba(255, 152, 0, 0.3);">
                            Specific Cost
                        </div>
                        <p style="margin-bottom: 16px; font-size: 13.5px; color: var(--text-muted);">
                            Specific Cost tracks the total energy financial expenditure in Pakistani Rupees (PKR) per kilogram (Kg) of BOPET film produced.
                        </p>
                        
                        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;">
                            <strong style="font-family: var(--font-display); font-size: 11px; text-transform: uppercase; color: #ff9800; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Target Baseline:</strong>
                            <code style="font-size: 12.5px; font-weight: 600; color: #ffffff;">40.0 PKR/Kg (Lower is better)</code>
                        </div>
                        
                        <p style="font-size: 13px; color: var(--text-muted);">
                            This index directly influences product margins. High values indicate expensive energy supply mix (e.g. diesel generators, rental power) or low production throughput.
                        </p>
                    </div>
                `;
            } else if (metric === 'reclaim') {
                title = 'Reclaim Yield Index';
                contentHTML = `
                    <div style="font-family: var(--font-body); line-height: 1.6; color: var(--text-main);">
                        <div style="font-size: 24px; font-weight: 700; color: #a855f7; text-align: center; margin-bottom: 16px; font-family: var(--font-display); text-shadow: 0 0 15px rgba(168, 85, 247, 0.3);">
                            Reclaim Index
                        </div>
                        <p style="margin-bottom: 16px; font-size: 13.5px; color: var(--text-muted);">
                            The Reclaim Index measures the actual monthly recycled and reclaimed pellet production from the Erema recycling extruder against the target monthly recycling rate.
                        </p>
                        
                        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;">
                            <strong style="font-family: var(--font-display); font-size: 11px; text-transform: uppercase; color: #a855f7; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">Monthly Capacity Target:</strong>
                            <code style="font-size: 12.5px; font-weight: 600; color: #ffffff;">50,000 kg (50 Tons) / Month</code>
                        </div>
                        
                        <p style="font-size: 13px; color: var(--text-muted);">
                            Achieving a higher reclaim index helps recycle plant scrap back into raw material, substantially lowering the overall production cost.
                        </p>
                    </div>
                `;
            }

            titleEl.textContent = title;
            contentEl.innerHTML = contentHTML;
            modal.classList.add('show');
        }

        function closeMetricExplanationModal() {
            const modal = document.getElementById('metricExplanationModal');
            if (modal) {
                modal.classList.remove('show');
            }
        }



        function editWasteNote() {
            const currentNote = localStorage.getItem('petpak_waste_note') || "";
            const newNote = prompt("Enter note for Waste Breakdown:", currentNote);
            if (newNote !== null) {
                const trimmed = newNote.trim();
                if (trimmed) {
                    localStorage.setItem('petpak_waste_note', trimmed);
                } else {
                    localStorage.removeItem('petpak_waste_note');
                }
                updateWasteNoteUI();
            }
        }

        function deleteWasteNote() {
            if (confirm("Are you sure you want to remove this note?")) {
                localStorage.removeItem('petpak_waste_note');
                updateWasteNoteUI();
            }
        }

        function updateWasteNoteUI() {
            const note = localStorage.getItem('petpak_waste_note');
            const noteContainer = document.getElementById('waste-note-container');
            const addContainer = document.getElementById('waste-add-note-container');
            const noteText = document.getElementById('waste-note-text');
            
            if (!noteContainer || !addContainer || !noteText) return;

            if (note) {
                noteText.innerHTML = `<strong>Note:</strong> ${note}`;
                noteContainer.style.display = 'flex';
                addContainer.style.display = 'none';
            } else {
                noteContainer.style.display = 'none';
                addContainer.style.display = 'block';
            }
        }

        function renderKpiModalGrid() {
            const grid = document.getElementById('modalKpiGrid');
            if (!grid) return;
            grid.innerHTML = '';

            kpiOptions.forEach(opt => {
                const isSelected = tempVisibleKPIs.includes(opt.key);
                const def = kpiDef[opt.key];
                
                const cardHTML = `
                    <div class="modal-kpi-card color-${def.colorClass} ${isSelected ? 'selected' : ''}" 
                         onclick="toggleModalKpi('${opt.key}')" 
                         id="modal-card-${opt.key}">
                        <div class="modal-kpi-checkmark">✓</div>
                        <div class="modal-kpi-label">${opt.label}</div>
                        <div class="modal-kpi-desc">${def.subtext}</div>
                    </div>
                `;
                grid.insertAdjacentHTML('beforeend', cardHTML);
            });
        }

        function toggleModalKpi(key) {
            const idx = tempVisibleKPIs.indexOf(key);
            const cardEl = document.getElementById(`modal-card-${key}`);
            
            if (idx > -1) {
                // If it is selected, try to deselect it
                if (tempVisibleKPIs.length === 1) {
                    alert("At least one KPI card must remain selected.");
                    return;
                }
                tempVisibleKPIs.splice(idx, 1);
                if (cardEl) {
                    cardEl.classList.remove('selected');
                }
            } else {
                // Select it
                tempVisibleKPIs.push(key);
                if (cardEl) {
                    cardEl.classList.add('selected');
                }
            }
        }

        function applyKpiChanges() {
            if (tempVisibleKPIs.length === 0) {
                alert("At least one KPI card must remain active.");
                return;
            }
            // Save state
            visibleKPIs = [...tempVisibleKPIs];
            
            // Clean up active trends to ensure they only contain visible KPIs
            activeTrends = activeTrends.filter(key => visibleKPIs.includes(key));
            if (activeTrends.length === 0 && visibleKPIs.length > 0) {
                activeTrends = [visibleKPIs[0]];
            }
            
            saveKpiPreferences();
            
            // Update button text
            document.getElementById('kpiBtnText').textContent = `${visibleKPIs.length} Active`;
            
            // Rebuild cards and update
            rebuildKPICards();
            updateDashboard();
            
            // Close modal
            closeKpiModal();
        }

        // Toggle trend line on/off when card is clicked
        function toggleTrend(key) {
            const idx = activeTrends.indexOf(key);
            if (idx > -1) {
                if (activeTrends.length === 1) {
                    alert("At least one trend line must remain visible on the chart.");
                    return;
                }
                activeTrends.splice(idx, 1);
            } else {
                activeTrends.push(key);
            }
            saveKpiPreferences();
            rebuildKPICards();
            updateDashboard();
        }

        // Month Names
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        function formatMonthYear(dateStr) {
            const info = parseYearMonth(dateStr);
            if (!info.year || !info.monthNum) return dateStr || 'Unknown';
            return `${shortMonths[info.monthNum - 1]} ${info.year}`;
        }

        function formatSelectedPeriod(year, month) {
            if (year === 'All' && month === 'All') return 'Period: All data';
            if (year !== 'All' && month === 'All') return `Period: ${year}`;
            if (year === 'All' && month !== 'All') return `Period: ${shortMonths[parseInt(month, 10) - 1] || month} across all years`;
            return `Period: ${shortMonths[parseInt(month, 10) - 1] || month} ${year}`;
        }

        function updateHeaderContext(mainData, productData, eremaData, offlineData, year, month) {
            if (headerPeriodPill) {
                headerPeriodPill.textContent = formatSelectedPeriod(year, month);
            }

            if (!headerCoveragePill) return;

            const coverageSource = mainData.length ? mainData : (productData.length ? productData : (eremaData.length ? eremaData : offlineData));
            if (!coverageSource.length) {
                headerCoveragePill.textContent = 'Coverage: No records';
                return;
            }

            const firstDate = coverageSource[0]['Dates'];
            const lastDate = coverageSource[coverageSource.length - 1]['Dates'];
            const firstLabel = formatMonthYear(firstDate);
            const lastLabel = formatMonthYear(lastDate);
            const rangeLabel = firstLabel === lastLabel ? firstLabel : `${firstLabel} to ${lastLabel}`;

            if (mainData.length) {
                const totalProd = mainData.reduce((sum, row) => sum + (row['Prod. (Tons)'] || 0), 0);
                headerCoveragePill.textContent = `Coverage: ${rangeLabel} | ${mainData.length} records | ${totalProd.toLocaleString(undefined, { maximumFractionDigits: 0 })} t`;
            } else {
                headerCoveragePill.textContent = `Coverage: ${rangeLabel} | ${coverageSource.length} records`;
            }
        }

        function polishRemarkText(text) {
            if (!text) return '';

            let polished = String(text).replace(/\s+/g, ' ').trim();
            const replacements = [
                [/\blekage\b/gi, 'leakage'],
                [/\bassembley\b/gi, 'assembly'],
                [/\bstoped\b/gi, 'stopped'],
                [/\btemperauture\b/gi, 'temperature'],
                [/\bbraker\b/gi, 'breaker'],
                [/\bcommnuication\b/gi, 'communication'],
                [/\bcoter\b/gi, 'Coater'],
                [/\bcontroler\b/gi, 'controller'],
                [/\blosse\b/gi, 'loose'],
                [/\bmultifunctioning\b/gi, 'malfunctioning'],
                [/\b2 time\b/gi, '2 times'],
                [/\bniproll\b/gi, 'nip roll'],
                [/\bpower house\b/gi, 'Power House'],
                [/\btdo\b/g, 'TDO'],
                [/\bmdo\b/g, 'MDO']
            ];

            replacements.forEach(([pattern, replacement]) => {
                polished = polished.replace(pattern, replacement);
            });

            polished = polished
                .replace(/\s+([.,:/])/g, '$1')
                .replace(/([.,])([A-Za-z])/g, '$1 $2')
                .replace(/\s{2,}/g, ' ')
                .trim();

            polished = polished.replace(/(^|[.!?]\s+|[–-]\s+)([a-z])/g, (match, prefix, letter) => {
                return prefix + letter.toUpperCase();
            });

            return polished;
        }

        function get3DIcon(key) {
            if (key === 'prod') {
                return `
                <svg viewBox="0 0 100 60" style="width: 52px; height: 32px; filter: drop-shadow(0 0 8px rgba(0, 229, 255, 0.45)); display: block;">
                    <defs>
                        <linearGradient id="filmBodyProd" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#00e5ff"/>
                            <stop offset="15%" stop-color="#ffffff"/>
                            <stop offset="50%" stop-color="#0088cc"/>
                            <stop offset="85%" stop-color="#003366"/>
                            <stop offset="100%" stop-color="#001133"/>
                        </linearGradient>
                        <linearGradient id="metalCoreProd" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#e0e0e0"/>
                            <stop offset="50%" stop-color="#888888"/>
                            <stop offset="100%" stop-color="#444444"/>
                        </linearGradient>
                    </defs>
                    <rect x="5" y="27" width="90" height="6" rx="1.5" fill="url(#metalCoreProd)"/>
                    <rect x="20" y="12" width="60" height="36" fill="url(#filmBodyProd)" stroke="rgba(0, 229, 255, 0.3)" stroke-width="0.5"/>
                    <ellipse cx="20" cy="30" rx="3.5" ry="18" fill="#002244" stroke="#00e5ff" stroke-width="1"/>
                    <circle cx="20" cy="30" r="2.5" fill="url(#metalCoreProd)"/>
                    <ellipse cx="80" cy="30" rx="3.5" ry="18" fill="url(#filmBodyProd)" stroke="#00e5ff" stroke-width="1"/>
                    <circle cx="80" cy="30" r="2.5" fill="url(#metalCoreProd)"/>
                </svg>`;
            } else if (key === 'oee') {
                return `
                <svg viewBox="0 0 40 40" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px rgba(57, 255, 20, 0.45));">
                    <defs>
                        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#39ff14"/>
                            <stop offset="50%" stop-color="#008f11"/>
                            <stop offset="100%" stop-color="#003f00"/>
                        </linearGradient>
                        <linearGradient id="needleGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#ffffff"/>
                            <stop offset="100%" stop-color="#ff3330"/>
                        </linearGradient>
                    </defs>
                    <path d="M 8 30 A 15 15 0 1 1 32 30" fill="none" stroke="#222" stroke-width="4" stroke-linecap="round"/>
                    <path d="M 8 30 A 15 15 0 0 1 28 13" fill="none" stroke="url(#gaugeGrad)" stroke-width="4" stroke-linecap="round"/>
                    <circle cx="20" cy="24" r="4" fill="#555"/>
                    <line x1="20" y1="24" x2="28" y2="14" stroke="url(#needleGrad)" stroke-width="2.5" stroke-linecap="round"/>
                    <circle cx="20" cy="24" r="2" fill="#fff"/>
                </svg>`;
            } else if (key === 'days') {
                return `
                <svg viewBox="0 0 40 40" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px rgba(0, 229, 255, 0.4));">
                    <defs>
                        <linearGradient id="gearGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#00e5ff"/>
                            <stop offset="50%" stop-color="#0066cc"/>
                            <stop offset="100%" stop-color="#002244"/>
                        </linearGradient>
                    </defs>
                    <circle cx="20" cy="20" r="10" fill="url(#gearGrad)" stroke="#00e5ff" stroke-width="0.5"/>
                    <circle cx="20" cy="20" r="4" fill="#0c101b"/>
                    <path d="M 18 6 L 22 6 L 21 10 L 19 10 Z" fill="url(#gearGrad)"/>
                    <path d="M 18 30 L 22 30 L 21 26 L 19 26 Z" fill="url(#gearGrad)"/>
                    <path d="M 6 18 L 6 22 L 10 21 L 10 19 Z" fill="url(#gearGrad)"/>
                    <path d="M 30 18 L 30 22 L 26 21 L 26 19 Z" fill="url(#gearGrad)"/>
                    <path d="M 10 10 L 13 13 L 15 11 L 12 8 Z" fill="url(#gearGrad)"/>
                    <path d="M 27 27 L 30 30 L 28 32 L 25 29 Z" fill="url(#gearGrad)"/>
                    <path d="M 10 30 L 13 27 L 15 29 L 12 32 Z" fill="url(#gearGrad)"/>
                    <path d="M 27 13 L 30 10 L 28 8 L 25 11 Z" fill="url(#gearGrad)"/>
                </svg>`;
            } else if (key === 'accidents') {
                return `
                <svg viewBox="0 0 40 40" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px rgba(255, 176, 0, 0.45));">
                    <defs>
                        <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#ffd28a"/>
                            <stop offset="55%" stop-color="#ff9f0a"/>
                            <stop offset="100%" stop-color="#7a3b00"/>
                        </linearGradient>
                    </defs>
                    <path d="M 20 4 C 28 4, 34 6, 34 6 C 34 18, 28 28, 20 36 C 12 28, 6 18, 6 6 C 6 6, 12 4, 20 4 Z" fill="url(#shieldGrad)" stroke="#ffb000" stroke-width="1.5"/>
                    <path d="M 20 7 L 20 33 C 25 26, 31 18, 31 7 Z" fill="rgba(255,255,255,0.15)"/>
                    <path d="M 17 12 L 23 12 L 22 20 L 18 20 Z" fill="#fff"/>
                    <circle cx="20" cy="24" r="2" fill="#fff"/>
                </svg>`;
            } else if (key === 'waste' || key === 'waste_pct') {
                return `
                <svg viewBox="0 0 40 40" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px rgba(255, 120, 0, 0.45));">
                    <defs>
                        <linearGradient id="basketGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#ffaa00"/>
                            <stop offset="50%" stop-color="#d46a00"/>
                            <stop offset="100%" stop-color="#661100"/>
                        </linearGradient>
                    </defs>
                    <path d="M 10 12 L 30 12 L 26 34 L 14 34 Z" fill="url(#basketGrad)" stroke="#ffaa00" stroke-width="1"/>
                    <ellipse cx="20" cy="12" rx="10" ry="3" fill="#ffaa00" stroke="#ffaa00" stroke-width="0.5"/>
                    <ellipse cx="20" cy="12" rx="8" ry="2.2" fill="#3a1100"/>
                    <line x1="15" y1="14" x2="17" y2="32" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
                    <line x1="20" y1="14" x2="20" y2="32" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
                    <line x1="25" y1="14" x2="23" y2="32" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
                </svg>`;
            } else if (key === 'downtime') {
                return `
                <svg viewBox="0 0 40 40" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px rgba(255, 170, 0, 0.45));">
                    <defs>
                        <linearGradient id="clockGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#ffb000"/>
                            <stop offset="60%" stop-color="#cc7a00"/>
                            <stop offset="100%" stop-color="#4a2a00"/>
                        </linearGradient>
                    </defs>
                    <circle cx="20" cy="20" r="14" fill="url(#clockGrad)" stroke="#ffb000" stroke-width="1.5"/>
                    <circle cx="20" cy="20" r="11" fill="#0d101a"/>
                    <line x1="20" y1="20" x2="20" y2="11" stroke="#ffb000" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="20" y1="20" x2="26" y2="20" stroke="#ffd28a" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="20" cy="20" r="2.5" fill="#fff"/>
                </svg>`;
            } else if (key === 'breaks' || key === 'stoppages') {
                return `
                <svg viewBox="0 0 40 40" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px rgba(255, 176, 0, 0.4));">
                    <defs>
                        <linearGradient id="boltGrad" x1="0" y1="0" x2="1" y2="0.8">
                            <stop offset="0%" stop-color="#ffcc00"/>
                            <stop offset="50%" stop-color="#ff6600"/>
                            <stop offset="100%" stop-color="#b33c00"/>
                        </linearGradient>
                    </defs>
                    <polygon points="22,4 10,22 18,22 14,36 30,16 20,16" fill="url(#boltGrad)" stroke="#ffcc00" stroke-width="1"/>
                </svg>`;
            } else if (key === 'recovery') {
                return `
                <svg viewBox="0 0 40 40" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px rgba(0, 229, 255, 0.45));">
                    <defs>
                        <linearGradient id="toolGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#00e5ff"/>
                            <stop offset="50%" stop-color="#0088cc"/>
                            <stop offset="100%" stop-color="#003366"/>
                        </linearGradient>
                    </defs>
                    <path d="M 8 32 L 24 16 M 22 14 C 20 12, 20 8, 25 5 C 30 2, 34 5, 34 5 C 34 5, 36 9, 33 14 C 30 19, 26 19, 24 17 Z" stroke="url(#toolGrad)" stroke-width="4.5" stroke-linecap="round" fill="none"/>
                    <circle cx="8" cy="32" r="3.5" fill="url(#toolGrad)" stroke="#00e5ff" stroke-width="1"/>
                    <circle cx="28" cy="10" r="3" fill="#0c101a"/>
                </svg>`;
            } else if (key === 'grades' || key === 'microns') {
                return `
                <svg viewBox="0 0 40 40" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px rgba(0, 229, 255, 0.4));">
                    <defs>
                        <linearGradient id="layerGrad1" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stop-color="#00e5ff"/>
                            <stop offset="100%" stop-color="#0055aa"/>
                        </linearGradient>
                        <linearGradient id="layerGrad2" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stop-color="#00aaff"/>
                            <stop offset="100%" stop-color="#002266"/>
                        </linearGradient>
                    </defs>
                    <polygon points="20,8 32,14 20,20 8,14" fill="url(#layerGrad1)" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
                    <polygon points="20,15 32,21 20,27 8,21" fill="url(#layerGrad2)" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
                    <polygon points="20,22 32,28 20,34 8,28" fill="url(#layerGrad1)" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
                </svg>`;
            } else if (key === 'kwh_line' || key === 'kwh_plant') {
                return `
                <svg viewBox="0 0 40 40" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.45));">
                    <defs>
                        <linearGradient id="energyGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#9af7ff"/>
                            <stop offset="45%" stop-color="#00e5ff"/>
                            <stop offset="100%" stop-color="#006688"/>
                        </linearGradient>
                    </defs>
                    <polygon points="23,4 9,21 17,21 13,36 31,15 21,15" fill="url(#energyGrad)" stroke="#00f0ff" stroke-width="0.5"/>
                </svg>`;
            } else if (key === 'rs_line' || key === 'rs_plant') {
                return `
                <svg viewBox="0 0 40 40" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px rgba(255, 204, 0, 0.45));">
                    <defs>
                        <linearGradient id="coinGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#ffffff"/>
                            <stop offset="30%" stop-color="#ffcc00"/>
                            <stop offset="70%" stop-color="#cc8800"/>
                            <stop offset="100%" stop-color="#4a3000"/>
                        </linearGradient>
                    </defs>
                    <ellipse cx="20" cy="28" rx="10" ry="4" fill="url(#coinGrad)" stroke="#ffcc00" stroke-width="0.5"/>
                    <rect x="10" y="22" width="20" height="6" fill="url(#coinGrad)"/>
                    <ellipse cx="20" cy="22" rx="10" ry="4" fill="url(#coinGrad)" stroke="#ffcc00" stroke-width="0.5"/>
                    <rect x="10" y="16" width="20" height="6" fill="url(#coinGrad)"/>
                    <ellipse cx="20" cy="16" rx="10" ry="4" fill="url(#coinGrad)" stroke="#ffcc00" stroke-width="0.5"/>
                </svg>`;
            }
            return '';
        }

        function getNormalizedProductType(type) {
            if (!type) return 'Plain PET';
            const t = String(type).trim().toLowerCase();
            if (t.includes('opaque') || t.includes('pown')) {
                return 'White Opaque';
            }
            if (t.includes('chemical') || t.includes('chem')) {
                return 'Chemical PET';
            }
            if (t.includes('twist')) {
                return 'Plain Twist';
            }
            return 'Plain PET';
        }

        function parseYearMonth(dateStr) {
            if (!dateStr) return { year: null, month: null, monthNum: null };
            const dt = new Date(dateStr);
            const y = dt.getFullYear().toString();
            const mNum = dt.getMonth() + 1;
            const m = mNum < 10 ? '0' + mNum : mNum.toString();
            return { year: y, month: m, monthNum: mNum };
        }

        // Global Chart options
        Chart.defaults.color = '#849396';
        Chart.defaults.font.family = 'Inter';

        // Chart References
        let overviewChart = null;
        let wasteChart = null;
        let downtimeChart = null;
        let productTypeChart = null;
        let eremaChart = null;
        let dispatchChart = null;
        let kpiComparisonChart = null;
        let downtimeComparisonChart = null;
        let activeTrendChart = null;
        let activeTrendChartSkus = [];
        
        // Executive Summary Chart References
        let execProductionChart = null;
        let execOfflineChart = null;
        let execEnergyCompareChart = null;
        let execPackingChart = null;
        let execProductAllocationChart = null;
        let execRecyclingChart = null;
        let execDowntimeChart = null;
        let execEnergyChart = null;
        // Dynamic KPI Card Builder (max 5 columns per row constraint)
        function rebuildKPICards() {
            const container = document.getElementById('kpi-container');
            if (!container) return;
            container.innerHTML = '';

            const count = visibleKPIs.length;
            // Enforce max 5 cards per row grid
            if (count <= 5) {
                container.style.gridTemplateColumns = `repeat(${count}, 1fr)`;
            } else {
                container.style.gridTemplateColumns = `repeat(5, 1fr)`;
            }

            visibleKPIs.forEach(key => {
                const opt = kpiOptions.find(o => o.key === key);
                const def = kpiDef[key];
                const isPlotted = activeTrends.includes(key);

                const cardHTML = `
                    <div class="metric-card color-${def.colorClass} ${isPlotted ? 'active-trend' : ''}" 
                          id="kpi-card-${key}" 
                          style="cursor: pointer; position: relative; overflow: hidden; padding-bottom: ${(isPlotted && overviewChartType === 'mixed') ? '10px' : '14px'}; --kpi-glow: ${def.colorClass === 'green' ? 'rgba(57, 255, 20, 0.22)' : def.colorClass === 'amber' ? 'rgba(255, 170, 0, 0.22)' : 'rgba(0, 240, 255, 0.22)'};" 
                          onclick="toggleTrend('${key}')">
                        <span class="trend-indicator">⬤ PLOTTED</span>
                        <div class="kpi-3d-icon">
                            ${get3DIcon(key)}
                        </div>
                        <div class="metric-label" style="max-width: calc(100% - 80px); z-index: 2; position: relative;">${opt.label}</div>
                        <div class="metric-val ${def.colorClass}" id="kpi-val-${key}" style="max-width: calc(100% - 80px); z-index: 2; position: relative;">0.00</div>
                        <div class="metric-subtext" id="kpi-sub-${key}" style="max-width: calc(100% - 80px); z-index: 2; position: relative;">Loading...</div>
                        ${(isPlotted && overviewChartType === 'mixed') ? `
                        <div class="kpi-chart-type-selector" onclick="event.stopPropagation()">
                            <span style="font-size: 9px; color: var(--text-muted); font-weight: 500; text-transform: uppercase; margin-right: auto; letter-spacing: 0.3px; font-family: var(--font-body);">Plot:</span>
                            <button class="kpi-type-pill ${getKpiChartType(key) === 'line' ? 'active' : ''}" onclick="setKpiChartType('${key}', 'line')" title="Line chart">Line</button>
                            <button class="kpi-type-pill ${getKpiChartType(key) === 'bar' ? 'active' : ''}" onclick="setKpiChartType('${key}', 'bar')" title="Bar chart">Bar</button>
                            <button class="kpi-type-pill ${getKpiChartType(key) === 'area' ? 'active' : ''}" onclick="setKpiChartType('${key}', 'area')" title="Area chart">Area</button>
                        </div>
                        ` : ''}
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', cardHTML);
            });
        }

        // Init/Update charts & dashboard data
        function updateDashboard() {
            const selectedYear = yearFilter.value;
            const selectedMonth = monthFilter.value;

            // Filter data sets and sort chronologically by date
            const mainFiltered = mainDataRaw.filter(item => {
                const info = parseYearMonth(item['Dates']);
                const matchY = selectedYear === 'All' || info.year === selectedYear;
                const matchM = selectedMonth === 'All' || info.month === selectedMonth;
                const hasData = item['Prod. (Tons)'] !== null;
                return matchY && matchM && hasData;
            }).sort((a, b) => new Date(a['Dates']) - new Date(b['Dates']));

            const eremaFiltered = eremaDataRaw.filter(item => {
                const info = parseYearMonth(item['Dates']);
                const matchY = selectedYear === 'All' || info.year === selectedYear;
                const matchM = selectedMonth === 'All' || info.month === selectedMonth;
                return matchY && matchM;
            }).sort((a, b) => new Date(a['Dates']) - new Date(b['Dates']));

            const productFiltered = productDataRaw.filter(item => {
                const info = parseYearMonth(item['Dates']);
                const matchY = selectedYear === 'All' || info.year === selectedYear;
                const matchM = selectedMonth === 'All' || info.month === selectedMonth;
                return matchY && matchM;
            }).sort((a, b) => new Date(a['Dates']) - new Date(b['Dates']));

            const offlineFiltered = offlineDataRaw.filter(item => {
                const info = parseYearMonth(item['Dates']);
                const matchY = selectedYear === 'All' || info.year === selectedYear;
                const matchM = selectedMonth === 'All' || info.month === selectedMonth;
                return matchY && matchM;
            }).sort((a, b) => new Date(a['Dates']) - new Date(b['Dates']));

            const dispatchFiltered = dispatchDataRaw.filter(item => {
                const info = parseYearMonth(item['Dates']);
                const matchY = selectedYear === 'All' || info.year === selectedYear;
                const matchM = selectedMonth === 'All' || info.month === selectedMonth;
                return matchY && matchM;
            }).sort((a, b) => new Date(a['Dates']) - new Date(b['Dates']));

            updateHeaderContext(mainFiltered, productFiltered, eremaFiltered, offlineFiltered, selectedYear, selectedMonth);

            // Update respective views
            updateOverviewTab(mainFiltered, selectedYear, selectedMonth);
            updateLossesTab(mainFiltered, selectedYear, selectedMonth);
            updateProductsTab(productFiltered, selectedYear, selectedMonth);
            updateEremaTab(eremaFiltered, selectedYear, selectedMonth);
            updateOfflineTab(offlineFiltered, selectedYear, selectedMonth);
            updateDispatchTab(dispatchFiltered, selectedYear, selectedMonth);
            updateComparisonTab(mainFiltered, selectedYear, selectedMonth);
            
            if (activeTab === 'forecast') {
                renderForecastTab(window.currentForecastMetric || 'Production');
            }
            if (activeTab === 'skutrends') {
                updateSkuTrendsTab(productFiltered, selectedYear, selectedMonth);
            }
            if (activeTab === 'advsim') {
                if (typeof window.updateAdvancedSimulation === 'function') {
                    window.updateAdvancedSimulation();
                }
            }
            if (activeTab === 'executive') {
                updateExecutiveSummaryTab(mainFiltered, selectedYear, selectedMonth, productFiltered, eremaFiltered, offlineFiltered);
            }

            scheduleChartResize();
        }

        function resizeAllCharts() {
            if (typeof Chart === 'undefined' || !Chart.instances) return;
            Object.values(Chart.instances).forEach((chart) => {
                try { chart.resize(); } catch (e) {}
            });
        }

        function scheduleChartResize() {
            requestAnimationFrame(() => setTimeout(resizeAllCharts, 80));
        }

        function createEmptyState(h3Text, pText) {
            return `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17 12H7v2h10v-2z"/></svg>
                    <h3>${h3Text}</h3>
                    <p>${pText}</p>
                </div>
            `;
        }

        // ==========================================
        // 4.5. OFFLINE OPERATIONS TAB
        // ==========================================
        let activeOfflineSubSection = 'overview';
        let offlineOverviewChart = null;
        let offlinePSChart = null;
        let offlinePSWasteChart = null;
        let offlinePSDtChart = null;
        let offlineSSChart = null;
        let offlineSSWasteChart = null;
        let offlineSSDtChart = null;
        let offlineMetChart = null;
        let offlineMetWasteChart = null;

        /** Chart mass labels: tons when >= 1000 kg, otherwise kg. Never use M/k shorthand. */
        function formatOfflineMass(v, withUnit = true) {
            const n = Number(v) || 0;
            if (Math.abs(n) >= 1000) {
                const tons = n / 1000;
                const text = tons >= 100
                    ? Math.round(tons).toLocaleString()
                    : tons.toLocaleString(undefined, { maximumFractionDigits: 1 });
                return withUnit ? `${text} t` : text;
            }
            const text = Math.round(n).toLocaleString();
            return withUnit ? `${text} kg` : text;
        }

        function kgSeriesToTons(series) {
            return (series || []).map((v) => (Number(v) || 0) / 1000);
        }

        /** Production bars only — own scale so height matches magnitude. */
        function buildOfflineProdOnlyChart(canvas, labels, prodSeries) {
            if (!canvas) return null;
            const ctx = canvas.getContext('2d');
            const prodTons = kgSeriesToTons(prodSeries);
            return new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Production (t)',
                        kpiKey: 'tons',
                        data: prodTons,
                        backgroundColor: 'rgba(0, 240, 255, 0.72)',
                        borderColor: '#00f0ff',
                        borderWidth: 1,
                        borderRadius: 4,
                        maxBarThickness: 42
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(8, 12, 20, 0.94)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            callbacks: {
                                label: (c) => {
                                    const tons = Number(c.parsed.y || 0);
                                    const kg = Math.round(tons * 1000).toLocaleString();
                                    return ` Production: ${tons.toLocaleString(undefined, { maximumFractionDigits: 1 })} t (${kg} kg)`;
                                }
                            }
                        },
                        datalabels: {
                            display: true,
                            anchor: 'end',
                            align: 'top',
                            clamp: true,
                            color: '#9af7ff',
                            font: { size: 8, weight: '700' },
                            formatter: (v) => (v ? `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })} t` : '')
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.03)' },
                            ticks: { color: '#a8b8c8', maxRotation: 0, font: { size: 10, weight: '600' } }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0, 229, 255, 0.06)' },
                            ticks: {
                                color: '#7defff',
                                font: { size: 10 },
                                callback: (v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })
                            },
                            title: {
                                display: true,
                                text: 'Production (t)',
                                color: '#7defff',
                                font: { size: 10, weight: '700' }
                            }
                        }
                    }
                }
            });
        }

        /** Waste (t) bars + Waste % bars — separate from production. */
        function buildOfflineWasteTrendChart(canvas, labels, wasteSeriesKg, wastePctSeries) {
            if (!canvas) return null;
            const ctx = canvas.getContext('2d');
            const wasteTons = kgSeriesToTons(wasteSeriesKg);
            const pct = (wastePctSeries || []).map((v) => Number(v) || 0);
            return new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Waste (t)',
                            kpiKey: 'tons',
                            data: wasteTons,
                            backgroundColor: 'rgba(255, 170, 0, 0.72)',
                            borderColor: '#ffaa00',
                            borderWidth: 1,
                            borderRadius: 4,
                            maxBarThickness: 36,
                            yAxisID: 'yWaste'
                        },
                        {
                            type: 'bar',
                            label: 'Waste %',
                            kpiKey: 'pct',
                            data: pct,
                            backgroundColor: 'rgba(255, 102, 136, 0.72)',
                            borderColor: '#ff6688',
                            borderWidth: 1,
                            borderRadius: 4,
                            maxBarThickness: 28,
                            yAxisID: 'yPct'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            position: 'top',
                            align: 'end',
                            labels: { color: '#d5e0ec', boxWidth: 10, font: { size: 10, weight: '600' } }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(8, 12, 20, 0.94)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            callbacks: {
                                label: (c) => {
                                    if (c.dataset.yAxisID === 'yPct') {
                                        return ` Waste %: ${Number(c.parsed.y || 0).toFixed(2)}%`;
                                    }
                                    const tons = Number(c.parsed.y || 0);
                                    const kg = Math.round(tons * 1000).toLocaleString();
                                    return ` Waste: ${tons.toLocaleString(undefined, { maximumFractionDigits: 1 })} t (${kg} kg)`;
                                }
                            }
                        },
                        datalabels: {
                            display: true,
                            clamp: true,
                            font: { size: 8, weight: '700' },
                            color: (c) => (c.dataset.yAxisID === 'yPct' ? '#ff9aab' : '#ffd28a'),
                            align: 'top',
                            anchor: 'end',
                            formatter: (v, c) => {
                                if (v == null) return '';
                                if (c.dataset.yAxisID === 'yPct') return `${Number(v).toFixed(1)}%`;
                                return `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })} t`;
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.03)' },
                            ticks: { color: '#a8b8c8', maxRotation: 0 }
                        },
                        yWaste: {
                            position: 'left',
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.04)' },
                            ticks: {
                                color: '#ffd28a',
                                callback: (v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })
                            },
                            title: { display: true, text: 'Waste (t)', color: '#ffd28a', font: { size: 10, weight: '700' } }
                        },
                        yPct: {
                            position: 'right',
                            beginAtZero: true,
                            suggestedMax: Math.max(5, Math.ceil(Math.max(...pct, 0) * 1.25) || 5),
                            grid: { drawOnChartArea: false },
                            ticks: { color: '#ff9aab', callback: (v) => `${v}%` },
                            title: { display: true, text: 'Waste %', color: '#ff9aab', font: { size: 10, weight: '700' } }
                        }
                    }
                }
            });
        }

        function setOfflineSubSection(subSec) {
            activeOfflineSubSection = subSec;

            document.querySelectorAll('#offline-tab .offline-toggle-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = document.getElementById(`btn-offline-${subSec}`);
            if (activeBtn) activeBtn.classList.add('active');

            document.getElementById('offline-overview-panel').style.display = (subSec === 'overview') ? 'flex' : 'none';
            ['ps', 'ss', 'met'].forEach(id => {
                const panel = document.getElementById(`offline-${id}-panel`);
                if (panel) panel.classList.toggle('is-active', subSec === id);
            });

            updateDashboard();
        }

        function updateOfflineTab(data, year, month) {
            if (activeTab !== 'offline') return;

            // Common variables
            const months = data.map(item => {
                const info = parseYearMonth(item['Dates']);
                return `${monthNames[info.monthNum - 1].slice(0, 3)} ${info.year.slice(2)}`;
            });

            // 0. Offline Overview Section
            if (activeOfflineSubSection === 'overview') {
                const psProd = data.reduce((sum, r) => sum + (r['PS_Production'] || 0), 0);
                const psWaste = data.reduce((sum, r) => sum + (r['PS_Waste'] || 0), 0);
                const psWastePct = psProd > 0 ? (psWaste / psProd) * 100 : 0;
                const psDowntime = data.reduce((sum, r) => sum + (r['PS_Downtime'] || 0), 0);

                const ssProd = data.reduce((sum, r) => sum + (r['SS_Production'] || 0), 0);
                const ssWaste = data.reduce((sum, r) => sum + (r['SS_Waste'] || 0), 0);
                const ssWastePct = ssProd > 0 ? (ssWaste / ssProd) * 100 : 0;
                const ssDowntime = data.reduce((sum, r) => sum + (r['SS_Downtime'] || 0), 0);

                const metProd = data.reduce((sum, r) => sum + (r['Met_Production'] || 0), 0);
                const metWaste = data.reduce((sum, r) => sum + (r['Met_Waste'] || 0), 0);
                const metWastePct = metProd > 0 ? (metWaste / metProd) * 100 : 0;
                
                const validTotalWasteData = data.filter(r => r['Offline_Total_Waste'] !== null && r['Offline_Total_Waste'] > 0);
                const avgTotalWaste = validTotalWasteData.length > 0 
                    ? (validTotalWasteData.reduce((sum, r) => sum + r['Offline_Total_Waste'], 0) / validTotalWasteData.length) * 100
                    : 0;

                const validPackingData = data.filter(r => r['Offline_Packing_Cost'] !== null && r['Offline_Packing_Cost'] > 0);
                const avgPacking = validPackingData.length > 0 
                    ? validPackingData.reduce((sum, r) => sum + r['Offline_Packing_Cost'], 0) / validPackingData.length 
                    : 0;

                const q2 = data.reduce((sum, r) => sum + (r['Offline_Q2_Data'] || 0), 0);

                // Update Overview Cards
                document.getElementById('offline-overview-kpi-ps-prod').textContent = `${psProd.toLocaleString()} kg`;
                document.getElementById('offline-overview-kpi-ps-sub').textContent = `Waste: ${psWastePct.toFixed(2)}% (${psWaste.toLocaleString()} kg) | DT: ${psDowntime.toLocaleString()} hrs`;
                document.getElementById('offline-overview-kpi-ps-progress').style.width = `${Math.max(0, Math.min(100, 100 - psWastePct))}%`;

                document.getElementById('offline-overview-kpi-ss-prod').textContent = `${ssProd.toLocaleString()} kg`;
                document.getElementById('offline-overview-kpi-ss-sub').textContent = `Waste: ${ssWastePct.toFixed(2)}% (${ssWaste.toLocaleString()} kg) | DT: ${ssDowntime.toLocaleString()} hrs`;
                document.getElementById('offline-overview-kpi-ss-progress').style.width = `${Math.max(0, Math.min(100, 100 - ssWastePct))}%`;

                document.getElementById('offline-overview-kpi-met-prod').textContent = `${metProd.toLocaleString()} kg`;
                document.getElementById('offline-overview-kpi-met-sub').textContent = `Waste: ${metWastePct.toFixed(2)}% (${metWaste.toLocaleString()} kg)`;
                document.getElementById('offline-overview-kpi-met-progress').style.width = `${Math.max(0, Math.min(100, 100 - metWastePct))}%`;

                document.getElementById('offline-overview-kpi-total-waste').textContent = `${avgTotalWaste.toFixed(2)}%`;
                document.getElementById('offline-overview-kpi-total-waste-progress').style.width = `${Math.max(0, Math.min(100, avgTotalWaste * 10))}%`;

                document.getElementById('offline-overview-kpi-packing').textContent = `PKR ${avgPacking.toFixed(2)}`;
                document.getElementById('offline-overview-kpi-packing-progress').style.width = `${Math.max(0, Math.min(100, (avgPacking / 20) * 100))}%`;

                document.getElementById('offline-overview-kpi-q2').textContent = `${Math.round(q2).toLocaleString()} kg`;
                document.getElementById('offline-overview-kpi-q2-progress').style.width = `${Math.max(0, Math.min(100, (q2 / 50000) * 100))}%`;

                // Populate Overview Ledger Table
                const overviewLedgerBody = document.getElementById('offline-overview-ledger-body');
                if (overviewLedgerBody) {
                    overviewLedgerBody.innerHTML = data.map((r, i) => {
                        const totalWasteVal = (r['Offline_Total_Waste'] || 0) * 100;
                        const packingVal = r['Offline_Packing_Cost'] || 0;
                        const q2Val = r['Offline_Q2_Data'] || 0;
                        return `
                            <tr>
                                <td style="font-weight: 600; color: var(--color-primary);">${months[i]}</td>
                                <td>${(r['PS_Production'] || 0).toLocaleString()} kg</td>
                                <td>${(r['SS_Production'] || 0).toLocaleString()} kg</td>
                                <td>${(r['Met_Production'] || 0).toLocaleString()} kg</td>
                                <td><span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: rgba(255, 82, 82, 0.1); border: 1px solid rgba(255, 82, 82, 0.3); color: #ff5252; box-shadow: 0 0 10px rgba(255, 82, 82, 0.2); text-shadow: 0 0 4px rgba(255, 82, 82, 0.3);">${totalWasteVal.toFixed(2)}%</span></td>
                                <td style="font-weight: 600; color: #e040fb;">PKR ${packingVal.toFixed(2)}</td>
                                <td style="color: #ffc107; font-weight: 600;">${Math.round(q2Val).toLocaleString()} kg</td>
                            </tr>
                        `;
                    }).join('');
                }

                // Combined Chart: PS (left axis) vs SS & Met (right axis) — values in tons
                const overviewCtx = document.getElementById('offlineOverviewChart').getContext('2d');
                if (offlineOverviewChart) offlineOverviewChart.destroy();

                const psSeries = kgSeriesToTons(data.map(r => r['PS_Production'] || 0));
                const ssSeries = kgSeriesToTons(data.map(r => r['SS_Production'] || 0));
                const metSeries = kgSeriesToTons(data.map(r => r['Met_Production'] || 0));
                const showOfflineLabels = true;

                const makeBarGradient = (ctx, colorTop, colorBottom) => {
                    const chartArea = ctx.chart.chartArea;
                    if (!chartArea) return colorTop;
                    const g = ctx.chart.ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    g.addColorStop(0, colorBottom);
                    g.addColorStop(1, colorTop);
                    return g;
                };

                offlineOverviewChart = new Chart(overviewCtx, {
                    type: 'bar',
                    data: {
                        labels: months,
                        datasets: [
                            {
                                label: 'PS Production (t)',
                                data: psSeries,
                                yAxisID: 'y',
                                backgroundColor: (c) => makeBarGradient(c, 'rgba(0, 229, 255, 0.95)', 'rgba(0, 100, 140, 0.55)'),
                                borderColor: '#00e5ff',
                                borderWidth: 1.5,
                                borderRadius: 5,
                                borderSkipped: false,
                                barPercentage: 0.75,
                                categoryPercentage: 0.7,
                                order: 2
                            },
                            {
                                label: 'SS Production (t)',
                                data: ssSeries,
                                yAxisID: 'y1',
                                backgroundColor: (c) => makeBarGradient(c, 'rgba(255, 193, 7, 0.95)', 'rgba(180, 90, 0, 0.55)'),
                                borderColor: '#ffc107',
                                borderWidth: 1.5,
                                borderRadius: 5,
                                borderSkipped: false,
                                barPercentage: 0.75,
                                categoryPercentage: 0.7,
                                order: 1
                            },
                            {
                                label: 'Met Production (t)',
                                data: metSeries,
                                yAxisID: 'y1',
                                backgroundColor: (c) => makeBarGradient(c, 'rgba(191, 90, 242, 0.95)', 'rgba(90, 30, 140, 0.55)'),
                                borderColor: '#bf5af2',
                                borderWidth: 1.5,
                                borderRadius: 5,
                                borderSkipped: false,
                                barPercentage: 0.75,
                                categoryPercentage: 0.7,
                                order: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
                                align: 'end',
                                labels: {
                                    boxWidth: 10,
                                    boxHeight: 10,
                                    padding: 14,
                                    color: '#c8d4e6',
                                    font: { size: 11, weight: '600' },
                                    usePointStyle: true,
                                    pointStyle: 'rectRounded'
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(8, 12, 20, 0.94)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderWidth: 1,
                                titleColor: '#fff',
                                bodyColor: '#d0dae8',
                                padding: 10,
                                callbacks: {
                                    label: (ctx) => {
                                        const tons = Number(ctx.parsed.y || 0);
                                        const kg = Math.round(tons * 1000).toLocaleString();
                                        return ` ${ctx.dataset.label}: ${tons.toLocaleString(undefined, { maximumFractionDigits: 1 })} t (${kg} kg)`;
                                    }
                                }
                            },
                            datalabels: {
                                display: showOfflineLabels,
                                anchor: 'end',
                                align: 'top',
                                offset: 2,
                                clamp: true,
                                color: (ctx) => ctx.dataset.borderColor,
                                font: { size: 8, weight: '700' },
                                formatter: (v) => (v ? `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })} t` : '')
                            }
                        },
                        scales: {
                            x: {
                                grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
                                ticks: { color: '#9aa8bc', font: { size: 11, weight: '600' } }
                            },
                            y: {
                                position: 'left',
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'PS (t)',
                                    color: '#00e5ff',
                                    font: { size: 10, weight: '700' }
                                },
                                grid: { color: 'rgba(0, 229, 255, 0.06)' },
                                ticks: {
                                    color: '#7ec8d6',
                                    font: { size: 10 },
                                    callback: (v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })
                                }
                            },
                            y1: {
                                position: 'right',
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'SS / Met (t)',
                                    color: '#c9a0ff',
                                    font: { size: 10, weight: '700' }
                                },
                                grid: { drawOnChartArea: false },
                                ticks: {
                                    color: '#b89ad4',
                                    font: { size: 10 },
                                    callback: (v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })
                                }
                            }
                        }
                    }
                });
            }

            // 1. Primary Slitter (PS) Section
            if (activeOfflineSubSection === 'ps') {
                // KPIs
                const prod = data.reduce((sum, r) => sum + (r['PS_Production'] || 0), 0);
                const waste = data.reduce((sum, r) => sum + (r['PS_Waste'] || 0), 0);
                const wastePct = prod > 0 ? (waste / prod) * 100 : 0;
                const downtime = data.reduce((sum, r) => sum + (r['PS_Downtime'] || 0), 0);

                document.getElementById('offline-ps-kpi-prod').textContent = `${prod.toLocaleString()} kg`;
                document.getElementById('offline-ps-kpi-prod-progress').style.width = `${Math.max(0, Math.min(100, 100 - wastePct))}%`;
                
                document.getElementById('offline-ps-kpi-waste').textContent = `${waste.toLocaleString()} kg`;
                document.getElementById('offline-ps-kpi-waste-progress').style.width = prod > 0 ? `${Math.max(0, Math.min(100, (waste / prod) * 100 * 5))}%` : '0%';

                document.getElementById('offline-ps-kpi-waste-pct').textContent = `${wastePct.toFixed(2)}%`;
                document.getElementById('offline-ps-kpi-waste-pct-progress').style.width = `${Math.max(0, Math.min(100, wastePct * 10))}%`;

                document.getElementById('offline-ps-kpi-downtime').textContent = `${downtime.toLocaleString()} hrs`;
                document.getElementById('offline-ps-kpi-downtime-progress').style.width = `${Math.max(0, Math.min(100, (downtime / 200) * 100))}%`;

                const psProdSeries = data.map(r => r['PS_Production'] || 0);
                const psWasteSeries = data.map(r => r['PS_Waste'] || 0);
                const psWastePctSeries = data.map((r) => {
                    const p = Number(r['PS_Production'] || 0);
                    const w = Number(r['PS_Waste'] || 0);
                    if (r['PS_Waste_Pct'] != null && !isNaN(r['PS_Waste_Pct'])) return Number(r['PS_Waste_Pct']);
                    return p > 0 ? (w / p) * 100 : 0;
                });

                if (offlinePSChart) offlinePSChart.destroy();
                offlinePSChart = buildOfflineProdOnlyChart(
                    document.getElementById('offlinePSChart'),
                    months,
                    psProdSeries
                );

                if (offlinePSWasteChart) offlinePSWasteChart.destroy();
                offlinePSWasteChart = buildOfflineWasteTrendChart(
                    document.getElementById('offlinePSWasteChart'),
                    months,
                    psWasteSeries,
                    psWastePctSeries
                );

                // Chart 3: Downtime breakdown
                const psDtCtx = document.getElementById('offlinePSDtChart').getContext('2d');
                if (offlinePSDtChart) offlinePSDtChart.destroy();
                
                const totalMech = data.reduce((sum, r) => sum + (r['PS_DT_Mechanical'] || 0), 0);
                const totalElec = data.reduce((sum, r) => sum + (r['PS_DT_Electrical'] || 0), 0);
                const totalPower = data.reduce((sum, r) => sum + (r['PS_DT_PowerHouse'] || 0), 0);
                const totalPlan = data.reduce((sum, r) => sum + (r['PS_DT_Planning'] || 0), 0);

                offlinePSDtChart = new Chart(psDtCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Mechanical', 'Electrical', 'Power House', 'Planning'],
                        datasets: [{
                            kpiKey: 'hrs',
                            data: [totalMech, totalElec, totalPower, totalPlan],
                            backgroundColor: [
                                'rgba(255, 82, 82, 0.8)',
                                'rgba(41, 121, 255, 0.8)',
                                'rgba(255, 193, 7, 0.8)',
                                'rgba(224, 64, 251, 0.8)'
                            ],
                            borderWidth: 1,
                            borderColor: '#121214'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } },
                            datalabels: {
                                display: true,
                                color: '#fff',
                                font: { size: 9, weight: '700' },
                                formatter: (v, ctx) => {
                                    const sum = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1;
                                    if (!v || (v / sum) < 0.05) return '';
                                    return [`${Number(v).toFixed(0)}h`, `${((v / sum) * 100).toFixed(0)}%`];
                                }
                            }
                        }
                    }
                });

                // Populate PS Ledger Table
                const psLedgerBody = document.getElementById('offline-ps-ledger-body');
                if (psLedgerBody) {
                    psLedgerBody.innerHTML = data.map((r, i) => {
                        return `
                            <tr>
                                <td style="font-weight: 600; color: var(--color-primary);">${months[i]}</td>
                                <td>${(r['PS_Production'] || 0).toLocaleString()} kg</td>
                                <td>${(r['PS_Waste'] || 0).toLocaleString()} kg</td>
                                <td><span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: rgba(255, 82, 82, 0.1); border: 1px solid rgba(255, 82, 82, 0.3); color: #ff5252; box-shadow: 0 0 10px rgba(255, 82, 82, 0.2); text-shadow: 0 0 4px rgba(255, 82, 82, 0.3);">${(r['PS_Waste_Pct'] || 0).toFixed(2)}%</span></td>
                                <td>${(r['PS_Downtime'] || 0).toLocaleString()} hrs</td>
                            </tr>
                        `;
                    }).join('');
                }
            }

            // 2. Secondary Slitter (SS) Section
            if (activeOfflineSubSection === 'ss') {
                // KPIs
                const prod = data.reduce((sum, r) => sum + (r['SS_Production'] || 0), 0);
                const waste = data.reduce((sum, r) => sum + (r['SS_Waste'] || 0), 0);
                const wastePct = prod > 0 ? (waste / prod) * 100 : 0;
                const downtime = data.reduce((sum, r) => sum + (r['SS_Downtime'] || 0), 0);

                document.getElementById('offline-ss-kpi-prod').textContent = `${prod.toLocaleString()} kg`;
                document.getElementById('offline-ss-kpi-prod-progress').style.width = `${Math.max(0, Math.min(100, 100 - wastePct))}%`;
                
                document.getElementById('offline-ss-kpi-waste').textContent = `${waste.toLocaleString()} kg`;
                document.getElementById('offline-ss-kpi-waste-progress').style.width = prod > 0 ? `${Math.max(0, Math.min(100, (waste / prod) * 100 * 5))}%` : '0%';

                document.getElementById('offline-ss-kpi-waste-pct').textContent = `${wastePct.toFixed(2)}%`;
                document.getElementById('offline-ss-kpi-waste-pct-progress').style.width = `${Math.max(0, Math.min(100, wastePct * 10))}%`;

                document.getElementById('offline-ss-kpi-downtime').textContent = `${downtime.toLocaleString()} hrs`;
                document.getElementById('offline-ss-kpi-downtime-progress').style.width = `${Math.max(0, Math.min(100, (downtime / 200) * 100))}%`;

                const ssProdSeries = data.map(r => r['SS_Production'] || 0);
                const ssWasteSeries = data.map(r => r['SS_Waste'] || 0);
                const ssWastePctSeries = data.map((r) => {
                    const p = Number(r['SS_Production'] || 0);
                    const w = Number(r['SS_Waste'] || 0);
                    if (r['SS_Waste_Pct'] != null && !isNaN(r['SS_Waste_Pct'])) return Number(r['SS_Waste_Pct']);
                    return p > 0 ? (w / p) * 100 : 0;
                });

                if (offlineSSChart) offlineSSChart.destroy();
                offlineSSChart = buildOfflineProdOnlyChart(
                    document.getElementById('offlineSSChart'),
                    months,
                    ssProdSeries
                );

                if (offlineSSWasteChart) offlineSSWasteChart.destroy();
                offlineSSWasteChart = buildOfflineWasteTrendChart(
                    document.getElementById('offlineSSWasteChart'),
                    months,
                    ssWasteSeries,
                    ssWastePctSeries
                );

                // Chart 3: Downtime breakdown
                const ssDtCtx = document.getElementById('offlineSSDtChart').getContext('2d');
                if (offlineSSDtChart) offlineSSDtChart.destroy();
                
                const totalMech = data.reduce((sum, r) => sum + (r['SS_DT_Mechanical'] || 0), 0);
                const totalElec = data.reduce((sum, r) => sum + (r['SS_DT_Electrical'] || 0), 0);
                const totalPower = data.reduce((sum, r) => sum + (r['SS_DT_PowerHouse'] || 0), 0);
                const totalPlan = data.reduce((sum, r) => sum + (r['SS_DT_Planning'] || 0), 0);

                offlineSSDtChart = new Chart(ssDtCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Mechanical', 'Electrical', 'Power House', 'Planning'],
                        datasets: [{
                            kpiKey: 'hrs',
                            data: [totalMech, totalElec, totalPower, totalPlan],
                            backgroundColor: [
                                'rgba(255, 82, 82, 0.8)',
                                'rgba(41, 121, 255, 0.8)',
                                'rgba(255, 193, 7, 0.8)',
                                'rgba(224, 64, 251, 0.8)'
                            ],
                            borderWidth: 1,
                            borderColor: '#121214'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } },
                            datalabels: {
                                display: true,
                                color: '#fff',
                                font: { size: 9, weight: '700' },
                                formatter: (v, ctx) => {
                                    const sum = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1;
                                    if (!v || (v / sum) < 0.05) return '';
                                    return [`${Number(v).toFixed(0)}h`, `${((v / sum) * 100).toFixed(0)}%`];
                                }
                            }
                        }
                    }
                });

                // Populate SS Ledger Table
                const ssLedgerBody = document.getElementById('offline-ss-ledger-body');
                if (ssLedgerBody) {
                    ssLedgerBody.innerHTML = data.map((r, i) => {
                        return `
                            <tr>
                                <td style="font-weight: 600; color: var(--color-primary);">${months[i]}</td>
                                <td>${(r['SS_Production'] || 0).toLocaleString()} kg</td>
                                <td>${(r['SS_Waste'] || 0).toLocaleString()} kg</td>
                                <td><span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: rgba(255, 82, 82, 0.1); border: 1px solid rgba(255, 82, 82, 0.3); color: #ff5252; box-shadow: 0 0 10px rgba(255, 82, 82, 0.2); text-shadow: 0 0 4px rgba(255, 82, 82, 0.3);">${(r['SS_Waste_Pct'] || 0).toFixed(2)}%</span></td>
                                <td>${(r['SS_Downtime'] || 0).toLocaleString()} hrs</td>
                            </tr>
                        `;
                    }).join('');
                }
            }

            // 3. Metallizer Section
            if (activeOfflineSubSection === 'met') {
                // KPIs
                const prod = data.reduce((sum, r) => sum + (r['Met_Production'] || 0), 0);
                const waste = data.reduce((sum, r) => sum + (r['Met_Waste'] || 0), 0);
                const wastePct = prod > 0 ? (waste / prod) * 100 : 0;

                document.getElementById('offline-met-kpi-prod').textContent = `${prod.toLocaleString()} kg`;
                document.getElementById('offline-met-kpi-prod-progress').style.width = `${Math.max(0, Math.min(100, 100 - wastePct))}%`;
                
                document.getElementById('offline-met-kpi-waste').textContent = `${waste.toLocaleString()} kg`;
                document.getElementById('offline-met-kpi-waste-progress').style.width = prod > 0 ? `${Math.max(0, Math.min(100, (waste / prod) * 100 * 5))}%` : '0%';

                document.getElementById('offline-met-kpi-waste-pct').textContent = `${wastePct.toFixed(2)}%`;
                document.getElementById('offline-met-kpi-waste-pct-progress').style.width = `${Math.max(0, Math.min(100, wastePct * 10))}%`;

                const metProdSeries = data.map(r => r['Met_Production'] || 0);
                const metWasteSeries = data.map(r => r['Met_Waste'] || 0);
                const metWastePctSeries = data.map((r) => {
                    const p = Number(r['Met_Production'] || 0);
                    const w = Number(r['Met_Waste'] || 0);
                    if (r['Met_Waste_Pct'] != null && !isNaN(r['Met_Waste_Pct'])) return Number(r['Met_Waste_Pct']);
                    return p > 0 ? (w / p) * 100 : 0;
                });

                if (offlineMetChart) offlineMetChart.destroy();
                offlineMetChart = buildOfflineProdOnlyChart(
                    document.getElementById('offlineMetChart'),
                    months,
                    metProdSeries
                );

                if (offlineMetWasteChart) offlineMetWasteChart.destroy();
                offlineMetWasteChart = buildOfflineWasteTrendChart(
                    document.getElementById('offlineMetWasteChart'),
                    months,
                    metWasteSeries,
                    metWastePctSeries
                );

                // Populate Metallizer Ledger Table
                const metLedgerBody = document.getElementById('offline-met-ledger-body');
                if (metLedgerBody) {
                    metLedgerBody.innerHTML = data.map((r, i) => {
                        return `
                            <tr>
                                <td style="font-weight: 600; color: var(--color-primary);">${months[i]}</td>
                                <td>${(r['Met_Production'] || 0).toLocaleString()} kg</td>
                                <td>${(r['Met_Waste'] || 0).toLocaleString()} kg</td>
                                <td><span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: rgba(255, 82, 82, 0.1); border: 1px solid rgba(255, 82, 82, 0.3); color: #ff5252; box-shadow: 0 0 10px rgba(255, 82, 82, 0.2); text-shadow: 0 0 4px rgba(255, 82, 82, 0.3);">${(r['Met_Waste_Pct'] || 0).toFixed(2)}%</span></td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        }

        // ==========================================
        // 5. COMPARISON TAB
        // ===============================================================================
        // 1. OVERVIEW TAB & KPI CARD CALCULATIONS
        // ==========================================
        const initialOverviewContentHTML = document.getElementById('overview-content').innerHTML;
        
        const kpiDef = {
            prod: {
                calculate: (data) => data.reduce((sum, r) => sum + (r['Prod. (Tons)'] || 0), 0),
                format: (val) => `${val.toLocaleString(undefined, {maximumFractionDigits: 0})} t`,
                subtext: "Total Production Output",
                colorClass: "cyan"
            },
            oee: {
                calculate: (data) => {
                    const valid = data.filter(r => r['OEE %'] !== null);
                    return valid.length > 0 ? valid.reduce((sum, r) => sum + r['OEE %'], 0) / valid.length : 0;
                },
                format: (val) => `${val.toFixed(1)}%`,
                subtext: "Average OEE %",
                colorClass: "green"
            },
            days: {
                calculate: (data) => {
                    const valid = data.filter(r => r['Running Days'] !== null);
                    return valid.length > 0 ? valid.reduce((sum, r) => sum + r['Running Days'], 0) / valid.length : 0;
                },
                format: (val) => `${val.toFixed(1)} d`,
                subtext: "Average Running Days",
                colorClass: "cyan"
            },
            accidents: {
                calculate: (data) => data.reduce((sum, r) => sum + (r['No of Accident'] || 0), 0),
                format: (val) => `${val.toFixed(0)}`,
                subtext: "Total Incidents / Accidents",
                colorClass: "amber"
            },
            waste: {
                calculate: (data) => data.reduce((sum, r) => sum + (r['Waste ( Tons)'] || 0), 0),
                format: (val) => `${val.toLocaleString(undefined, {maximumFractionDigits: 0})} t`,
                subtext: "Total Material Waste",
                colorClass: "amber"
            },
            waste_pct: {
                calculate: (data) => {
                    const valid = data.filter(r => r['Waste %'] !== null);
                    return valid.length > 0 ? valid.reduce((sum, r) => sum + r['Waste %'], 0) / valid.length : 0;
                },
                format: (val) => `${val.toFixed(1)}%`,
                subtext: "Average Waste %",
                colorClass: "amber"
            },
            downtime: {
                calculate: (data) => data.reduce((sum, r) => sum + (r['Total Down Time ( hrs.)'] || 0), 0),
                format: (val) => `${val.toLocaleString(undefined, {maximumFractionDigits: 0})} h`,
                subtext: "Total Down Time",
                colorClass: "amber"
            },
            breaks: {
                calculate: (data) => data.reduce((sum, r) => sum + (r['#of Breaks/Stoppages'] || 0), 0),
                format: (val) => `${val.toLocaleString(undefined, {maximumFractionDigits: 0})}`,
                subtext: "Total Line Breaks",
                colorClass: "amber"
            },
            stoppages: {
                calculate: (data) => {
                    const valid = data.filter(r => r['Avg. Stoppage/day'] !== null);
                    return valid.length > 0 ? valid.reduce((sum, r) => sum + r['Avg. Stoppage/day'], 0) / valid.length : 0;
                },
                format: (val) => `${val.toFixed(1)} / day`,
                subtext: "Avg. Stoppages / Day",
                colorClass: "cyan"
            },
            recovery: {
                calculate: (data) => data.reduce((sum, r) => sum + (r['Line Recovery Time(Mint)'] || 0), 0),
                format: (val) => `${val.toLocaleString(undefined, {maximumFractionDigits: 0})} m`,
                subtext: "Total Recovery Time",
                colorClass: "cyan"
            },
            grades: {
                calculate: (data) => data.reduce((sum, r) => sum + (r['Grade Changes'] || 0), 0),
                format: (val) => `${val.toLocaleString(undefined, {maximumFractionDigits: 0})}`,
                subtext: "Total Grade Changes",
                colorClass: "cyan"
            },
            microns: {
                calculate: (data) => data.reduce((sum, r) => sum + (r['Micron Changes'] || 0), 0),
                format: (val) => `${val.toLocaleString(undefined, {maximumFractionDigits: 0})}`,
                subtext: "Total Micron Changes",
                colorClass: "cyan"
            },
            kwh_line: {
                calculate: (data) => {
                    const valid = data.filter(r => r['KWh/Kg Line'] !== null && r['KWh/Kg Line'] !== undefined);
                    return valid.length > 0 ? valid.reduce((sum, r) => sum + r['KWh/Kg Line'], 0) / valid.length : 0;
                },
                format: (val) => `${val.toFixed(2)} KWh`,
                subtext: "Avg. KWh/Kg Line",
                colorClass: "cyan"
            },
            kwh_plant: {
                calculate: (data) => {
                    const valid = data.filter(r => r['KWh/Kg Plant'] !== null && r['KWh/Kg Plant'] !== undefined);
                    return valid.length > 0 ? valid.reduce((sum, r) => sum + r['KWh/Kg Plant'], 0) / valid.length : 0;
                },
                format: (val) => `${val.toFixed(2)} KWh`,
                subtext: "Avg. KWh/Kg Plant",
                colorClass: "cyan"
            },
            rs_line: {
                calculate: (data) => {
                    const valid = data.filter(r => r['Rs/Kg Line'] !== null && r['Rs/Kg Line'] !== undefined);
                    return valid.length > 0 ? valid.reduce((sum, r) => sum + r['Rs/Kg Line'], 0) / valid.length : 0;
                },
                format: (val) => `PKR ${val.toFixed(2)}`,
                subtext: "Avg. Rs/Kg Line",
                colorClass: "amber"
            },
            rs_plant: {
                calculate: (data) => {
                    const valid = data.filter(r => r['Rs/Kg Plant'] !== null && r['Rs/Kg Plant'] !== undefined);
                    return valid.length > 0 ? valid.reduce((sum, r) => sum + r['Rs/Kg Plant'], 0) / valid.length : 0;
                },
                format: (val) => `PKR ${val.toFixed(2)}`,
                subtext: "Avg. Rs/Kg Plant",
                colorClass: "amber"
            },
            sim_total_savings: {
                calculate: (data) => window.lastCalculatedSimSavings?.sim_total_savings || 0,
                format: (val) => `PKR ${Math.round(val).toLocaleString()}`,
                subtext: "Total Sim. Savings",
                colorClass: "cyan"
            },
            sim_energy_saving: {
                calculate: (data) => window.lastCalculatedSimSavings?.sim_energy_saving || 0,
                format: (val) => `PKR ${Math.round(val).toLocaleString()}`,
                subtext: "Sim. Energy Savings",
                colorClass: "cyan"
            },
            sim_recycle_saving: {
                calculate: (data) => window.lastCalculatedSimSavings?.sim_recycle_saving || 0,
                format: (val) => `PKR ${Math.round(val).toLocaleString()}`,
                subtext: "Sim. Recycling Savings",
                colorClass: "purple"
            },
            sim_waste_saving: {
                calculate: (data) => window.lastCalculatedSimSavings?.sim_waste_saving || 0,
                format: (val) => `PKR ${Math.round(val).toLocaleString()}`,
                subtext: "Sim. Waste Savings",
                colorClass: "amber"
            },
            sim_downtime_saving: {
                calculate: (data) => window.lastCalculatedSimSavings?.sim_downtime_saving || 0,
                format: (val) => `PKR ${Math.round(val).toLocaleString()}`,
                subtext: "Sim. Downtime Savings",
                colorClass: "cyan"
            }
        };

        function getMonthlyKpiVal(item, key) {
            switch(key) {
                case 'prod': return item['Prod. (Tons)'] || 0;
                case 'oee': return item['OEE %'] || 0;
                case 'days': return item['Running Days'] || 0;
                case 'accidents': return item['No of Accident'] || 0;
                case 'waste': return item['Waste ( Tons)'] || 0;
                case 'waste_pct': return item['Waste %'] || 0;
                case 'downtime': return item['Total Down Time ( hrs.)'] || 0;
                case 'breaks': return item['#of Breaks/Stoppages'] || 0;
                case 'stoppages': return item['Avg. Stoppage/day'] || 0;
                case 'recovery': return item['Line Recovery Time(Mint)'] || 0;
                case 'grades': return item['Grade Changes'] || 0;
                case 'microns': return item['Micron Changes'] || 0;
                case 'kwh_line': return item['KWh/Kg Line'] || 0;
                case 'kwh_plant': return item['KWh/Kg Plant'] || 0;
                case 'rs_line': return item['Rs/Kg Line'] || 0;
                case 'rs_plant': return item['Rs/Kg Plant'] || 0;
                default: return 0;
            }
        }

        let overviewChartType = 'mixed';
        try {
            const storedType = localStorage.getItem('petpak_overview_chart_preset');
            if (storedType) {
                overviewChartType = storedType;
            }
        } catch(e) {}

        window.changeOverviewChartType = function(type) {
            overviewChartType = type;
            try {
                localStorage.setItem('petpak_overview_chart_preset', type);
            } catch(e) {}
            rebuildKPICards();
            updateDashboard();
        };

        // Individual KPI chart types for Mixed mode
        let kpiChartTypes = {};
        try {
            const stored = localStorage.getItem('petpak_kpi_chart_types');
            kpiChartTypes = stored ? JSON.parse(stored) : {};
        } catch (e) {
            kpiChartTypes = {};
        }

        const defaultKpiChartTypes = {
            prod: 'bar',
            oee: 'line',
            days: 'line',
            accidents: 'bar',
            waste: 'bar',
            waste_pct: 'line',
            downtime: 'bar',
            breaks: 'bar',
            stoppages: 'line',
            recovery: 'line',
            grades: 'bar',
            microns: 'bar',
            kwh_line: 'line',
            kwh_plant: 'line',
            rs_line: 'line',
            rs_plant: 'line'
        };

        function getKpiChartType(key) {
            if (overviewChartType === 'mixed') {
                return kpiChartTypes[key] || defaultKpiChartTypes[key] || 'line';
            }
            return overviewChartType; // 'line', 'bar', 'area'
        }

        window.lastCalculatedSimSavings = {
            sim_total_savings: 0,
            sim_energy_saving: 0,
            sim_recycle_saving: 0,
            sim_waste_saving: 0,
            sim_downtime_saving: 0
        };

        window.simVariables = {
            electricity: 45.0,
            virgin: 350.0,
            recycled: 180.0,
            scrap: 80.0,
            downtime: 50000.0,
            baseSec: 1.20,
            baseWaste: 8.0
        };

        window.hasManualMetricOverride = false;

        function getSimulatedRecycledFlakesKg() {
            const selectedYear = document.getElementById('yearFilter').value;
            const selectedMonth = document.getElementById('monthFilter').value;
            if (typeof eremaDataRaw === 'undefined') return 0;
            const eremaFiltered = eremaDataRaw.filter(item => {
                const info = parseYearMonth(item['Dates']);
                const matchY = selectedYear === 'All' || info.year === selectedYear;
                const matchM = selectedMonth === 'All' || info.month === selectedMonth;
                return matchY && matchM;
            });
            return eremaFiltered.reduce((sum, item) => sum + (item['Production'] || 0), 0);
        }

        window.togglePinnedSavingCard = function(metricKey, isChecked) {
            const kpiKey = `sim_${metricKey}`;
            const idx = visibleKPIs.indexOf(kpiKey);
            if (isChecked && idx === -1) {
                visibleKPIs.push(kpiKey);
            } else if (!isChecked && idx !== -1) {
                visibleKPIs.splice(idx, 1);
            }
            try {
                localStorage.setItem('petpak_visible_kpis', JSON.stringify(visibleKPIs));
            } catch (e) {}
            rebuildKPICards();
            updateDashboard();
        };

        window.setKpiChartType = function(key, type) {
            kpiChartTypes[key] = type;
            try {
                localStorage.setItem('petpak_kpi_chart_types', JSON.stringify(kpiChartTypes));
            } catch (e) {}
            rebuildKPICards();
            updateDashboard();
        };

        window.updateOverviewPinnedCards = function(recycle, energy, waste, downtime, total, specCost, avgSec) {
            window.lastCalculatedSimSavings = {
                sim_total_savings: total,
                sim_energy_saving: energy,
                sim_recycle_saving: recycle,
                sim_waste_saving: waste,
                sim_downtime_saving: downtime
            };

            // Update live pinned overview cards directly
            const totalSavingsVal = document.getElementById('kpi-val-sim_total_savings');
            if (totalSavingsVal) totalSavingsVal.textContent = `PKR ${Math.round(total).toLocaleString()}`;
            
            const energySavingVal = document.getElementById('kpi-val-sim_energy_saving');
            if (energySavingVal) energySavingVal.textContent = `PKR ${Math.round(energy).toLocaleString()}`;

            const recycleSavingVal = document.getElementById('kpi-val-sim_recycle_saving');
            if (recycleSavingVal) recycleSavingVal.textContent = `PKR ${Math.round(recycle).toLocaleString()}`;

            const wasteSavingVal = document.getElementById('kpi-val-sim_waste_saving');
            if (wasteSavingVal) wasteSavingVal.textContent = `PKR ${Math.round(waste).toLocaleString()}`;

            const downtimeSavingVal = document.getElementById('kpi-val-sim_downtime_saving');
            if (downtimeSavingVal) downtimeSavingVal.textContent = `PKR ${Math.round(downtime).toLocaleString()}`;
        };

        window.onSliderChange = function(key) {
            const slider = document.getElementById('sim-input-' + key);
            const numInput = document.getElementById('sim-input-num-' + key);
            if (slider && numInput) {
                numInput.value = slider.value;
            }
            window.updateSavingsCalculation();
        };

        window.onManualInputChange = function(key) {
            const numInput = document.getElementById('sim-input-num-' + key);
            const slider = document.getElementById('sim-input-' + key);
            if (numInput && slider) {
                const val = parseFloat(numInput.value) || 0;
                slider.value = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), val));
            }
            window.updateSavingsCalculation();
        };

        window.onCustomMetricChange = function() {
            window.hasManualMetricOverride = true;
            window.updateSavingsCalculation();
        };

        window.resetMetricOverrides = function() {
            window.hasManualMetricOverride = false;
            window.updateSavingsCalculation();
        };

        window.updateSavingsCalculation = function() {
            const inputElectricity = document.getElementById('sim-input-num-electricity');
            const inputVirgin = document.getElementById('sim-input-num-virgin');
            const inputRecycled = document.getElementById('sim-input-num-recycled');
            const inputScrap = document.getElementById('sim-input-num-scrap');
            const inputDowntime = document.getElementById('sim-input-num-downtime');
            const inputBaseSec = document.getElementById('sim-input-num-base-sec');
            const inputBaseWaste = document.getElementById('sim-input-num-base-waste');

            if (!inputElectricity) return;

            const rateElectricity = parseFloat(inputElectricity.value) || 0;
            const priceVirgin = parseFloat(inputVirgin.value) || 0;
            const costRecycled = parseFloat(inputRecycled.value) || 0;
            const valueScrap = parseFloat(inputScrap.value) || 0;
            const rateDowntime = parseFloat(inputDowntime.value) || 0;
            const baseSec = parseFloat(inputBaseSec.value) || 0;
            const baseWaste = parseFloat(inputBaseWaste.value) || 0;

            // Sync checkboxes
            document.getElementById('pin-energy-saving').checked = visibleKPIs.includes('sim_energy_saving');
            document.getElementById('pin-recycle-saving').checked = visibleKPIs.includes('sim_recycle_saving');
            document.getElementById('pin-waste-saving').checked = visibleKPIs.includes('sim_waste_saving');
            document.getElementById('pin-downtime-saving').checked = visibleKPIs.includes('sim_downtime_saving');

            const data = window.currentActiveData;
            if (!data || data.length === 0) return;

            const count = data.length;
            const totalProductionTons = data.reduce((sum, item) => sum + (item['Prod. (Tons)'] || 0), 0);
            const totalProductionKg = totalProductionTons * 1000;

            // 1. Recycle Flakes Savings
            const recycledKg = getSimulatedRecycledFlakesKg();
            const recycleSaving = recycledKg * (priceVirgin - costRecycled);
            document.getElementById('sim-val-recycle-saving').textContent = "PKR " + Math.round(recycleSaving).toLocaleString();

            // 2. Energy Efficiency Savings
            const avgSecLine = kpiDef.kwh_line.calculate(data);
            const energySaving = totalProductionKg * (baseSec - avgSecLine) * rateElectricity;
            document.getElementById('sim-val-energy-saving').textContent = "PKR " + Math.round(energySaving).toLocaleString();

            // 3. Waste Reduction Savings
            const avgWastePct = kpiDef.waste_pct.calculate(data);
            const wasteSaving = totalProductionKg * ((baseWaste - avgWastePct) / 100) * (priceVirgin - valueScrap);
            document.getElementById('sim-val-waste-saving').textContent = "PKR " + Math.round(wasteSaving).toLocaleString();

            // 4. Downtime Savings
            const actualDowntime = kpiDef.downtime.calculate(data);
            const baseDowntime = 24 * count; // baseline 24 hours downtime per month
            const downtimeSaving = Math.max(0, (baseDowntime - actualDowntime)) * rateDowntime;
            document.getElementById('sim-val-downtime-saving').textContent = "PKR " + Math.round(downtimeSaving).toLocaleString();

            // 5. Total Savings
            const totalSimSavings = recycleSaving + energySaving + wasteSaving + downtimeSaving;
            document.getElementById('sim-total-savings').textContent = "PKR " + Math.round(totalSimSavings).toLocaleString();

            // 6. Outputs Rs/Kg
            let specEnergyCost = 0;
            let specResinCost = 0;
            let specTotalCost = 0;
            let finalSec = 0;

            if (window.hasManualMetricOverride) {
                finalSec = parseFloat(document.getElementById('sim-metric-seckwh').value) || 0;
                specResinCost = parseFloat(document.getElementById('sim-metric-resinrskg').value) || 0;
                specTotalCost = specResinCost + (finalSec * rateElectricity);
                
                const inputTotal = document.getElementById('sim-metric-rskg');
                if (inputTotal) inputTotal.value = specTotalCost.toFixed(2);
            } else {
                finalSec = kpiDef.kwh_plant.calculate(data);
                specEnergyCost = finalSec * rateElectricity;
                specResinCost = priceVirgin * (1 - (recycledKg / (totalProductionKg || 1))) + costRecycled * (recycledKg / (totalProductionKg || 1));
                specTotalCost = specResinCost + specEnergyCost;

                const inputSec = document.getElementById('sim-metric-seckwh');
                const inputResin = document.getElementById('sim-metric-resinrskg');
                const inputTotal = document.getElementById('sim-metric-rskg');
                
                if (inputSec) inputSec.value = finalSec.toFixed(2);
                if (inputResin) inputResin.value = specResinCost.toFixed(2);
                if (inputTotal) inputTotal.value = specTotalCost.toFixed(2);
            }

            updateOverviewPinnedCards(recycleSaving, energySaving, wasteSaving, downtimeSaving, totalSimSavings, specTotalCost, finalSec);
        };

        /* ==========================================
           ADVANCED OPERATIONS SIMULATOR LOGIC
           ========================================== */
        window.onAdvSliderChange = function(key) {
            const slider = document.getElementById('adv-slide-' + key);
            const input = document.getElementById('adv-in-' + key);
            if (slider && input) {
                input.value = slider.value;
            }
            // Remove active state from preset buttons since they customized
            document.querySelectorAll('.advsim-preset-btn').forEach(btn => btn.classList.remove('active'));
            window.updateAdvancedSimulation();
        };

        window.onAdvInputChange = function(key) {
            const slider = document.getElementById('adv-slide-' + key);
            const input = document.getElementById('adv-in-' + key);
            if (slider && input) {
                const val = parseFloat(input.value) || 0;
                slider.value = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), val));
            }
            // Remove active state from preset buttons
            document.querySelectorAll('.advsim-preset-btn').forEach(btn => btn.classList.remove('active'));
            window.updateAdvancedSimulation();
        };

        window.applyAdvPreset = function(preset) {
            // Remove active class from all preset buttons
            document.querySelectorAll('.advsim-preset-btn').forEach(btn => btn.classList.remove('active'));
            const activeBtn = document.getElementById('preset-btn-' + preset);
            if (activeBtn) activeBtn.classList.add('active');

            const presets = {
                baseline: {
                    electricity: 55.0, virgin: 425.0, flakes: 230.0, scrap: 180.0, downtime: 45000,
                    'erema-feed': 400, 'erema-hours': 620, 'erema-yield': 97.0, 'erema-power': 0.22,
                    'line-speed': 320, 'line-micron': 18.5, 'line-width': 6.7, 'line-maint': 48
                },
                inflation: {
                    electricity: 80.0, virgin: 550.0, flakes: 320.0, scrap: 220.0, downtime: 60000,
                    'erema-feed': 400, 'erema-hours': 620, 'erema-yield': 97.0, 'erema-power': 0.22,
                    'line-speed': 320, 'line-micron': 18.5, 'line-width': 6.7, 'line-maint': 48
                },
                recycle: {
                    electricity: 55.0, virgin: 425.0, flakes: 200.0, scrap: 180.0, downtime: 45000,
                    'erema-feed': 500, 'erema-hours': 720, 'erema-yield': 99.0, 'erema-power': 0.18,
                    'line-speed': 320, 'line-micron': 18.5, 'line-width': 6.7, 'line-maint': 48
                },
                bopet: {
                    electricity: 55.0, virgin: 425.0, flakes: 230.0, scrap: 180.0, downtime: 45000,
                    'erema-feed': 400, 'erema-hours': 620, 'erema-yield': 97.0, 'erema-power': 0.22,
                    'line-speed': 400, 'line-micron': 12.0, 'line-width': 6.7, 'line-maint': 24
                }
            };

            let vals = {...presets[preset]};
            if (!vals) return;

            // Dynamic baseline calculations based on database averages for the selected period
            if (preset === 'baseline') {
                const data = window.currentActiveData;
                if (data && data.length > 0) {
                    // Try to get average microns
                    const avgMicrons = data.reduce((sum, r) => sum + (r['Microns (Avg)'] || 0), 0) / data.length;
                    if (avgMicrons > 0) {
                        vals['line-micron'] = parseFloat(avgMicrons.toFixed(1));
                    }
                    // Try to get average OEE to scale line speed
                    const avgOee = kpiDef.oee ? kpiDef.oee.calculate(data) : 82.4;
                    // Scale line speed slightly based on OEE
                    vals['line-speed'] = Math.round(320 * (avgOee / 82.4));

                    // Get average Erema running hours
                    const totalEremaKg = data.reduce((sum, r) => sum + (r['Erema Pellets (Kg)'] || 0), 0);
                    if (totalEremaKg > 0) {
                        const calculatedHours = Math.round(totalEremaKg / 400);
                        vals['erema-hours'] = Math.min(744, Math.max(100, calculatedHours));
                    }
                    
                    // Get average downtime hours
                    const totalDowntime = kpiDef.downtime ? kpiDef.downtime.calculate(data) : 0;
                    const avgDowntime = data.length > 0 ? (totalDowntime / data.length) : 48;
                    vals['line-maint'] = Math.min(120, Math.max(12, Math.round(avgDowntime)));
                }
            }

            Object.keys(vals).forEach(key => {
                const input = document.getElementById('adv-in-' + key);
                const slider = document.getElementById('adv-slide-' + key);
                if (input && slider) {
                    input.value = vals[key];
                    slider.value = vals[key];
                }
            });

            window.updateAdvancedSimulation();
        };

        window.updateAdvancedSimulation = function() {
            const getVal = (id) => parseFloat(document.getElementById(id).value) || 0;

            const electricity = getVal('adv-in-electricity');
            const virgin = getVal('adv-in-virgin');
            const flakes = getVal('adv-in-flakes');
            const scrap = getVal('adv-in-scrap');
            const downtime = getVal('adv-in-downtime');

            const eremaFeed = getVal('adv-in-erema-feed');
            const eremaHours = getVal('adv-in-erema-hours');
            const eremaYield = getVal('adv-in-erema-yield');
            const eremaPower = getVal('adv-in-erema-power');

            const lineSpeed = getVal('adv-in-line-speed');
            const lineMicron = getVal('adv-in-line-micron');
            const lineWidth = getVal('adv-in-line-width');
            const lineMaint = getVal('adv-in-line-maint');

            // 1. Calculate Simulated Production Output (Tons/Month)
            // Production Rate (Kg/hr) = Speed (m/min) * Width (m) * Thickness (meters) * Density (kg/m^3) * 60
            // For BOPET, Density = 1395 kg/m^3
            // Production Rate = Speed * Width * Micron * 10^-6 * 1395 * 60
            const productionRateKgHr = lineSpeed * lineWidth * lineMicron * 0.000001 * 1395 * 60;
            const operatingHours = Math.max(0, 720 - lineMaint);
            const simulatedProductionKg = productionRateKgHr * operatingHours;
            const simulatedProductionTons = simulatedProductionKg / 1000;

            // 2. Calculate Simulated SEC (KWh/Kg)
            // BOPET Power Draw = 1500 + 2.5 * Speed (KW)
            const bopetPowerKW = 1500 + (2.5 * lineSpeed);
            // Erema Power Draw = Feed * SpecPower (KW)
            const eremaPowerKW = eremaFeed * eremaPower;
            const totalPowerKW = bopetPowerKW + eremaPowerKW;
            const simulatedSEC = simulatedProductionKg > 0 ? (totalPowerKW / productionRateKgHr) : 0;

            // 3. Calculate Specific Resin Cost (PKR/Kg)
            // Recycled Flakes Output (Kg) = Erema Feed * Hours * Yield
            const recycledKg = eremaFeed * eremaHours * (eremaYield / 100);
            const recycleRatio = Math.min(0.5, simulatedProductionKg > 0 ? (recycledKg / simulatedProductionKg) : 0); // Cap at 50% max recycle
            const specResinCost = (1 - recycleRatio) * virgin + recycleRatio * flakes;

            // 4. Calculate Simulated Unit Rate (PKR/Kg)
            const simulatedUnitRate = specResinCost + (simulatedSEC * electricity);

            // 5. Calculate Simulated Cost Savings (PKR)
            // Baseline Unit Rate is 465.0 PKR/Kg
            const baselineUnitRate = 465.0;
            const estimatedSavings = Math.max(0, (baselineUnitRate - simulatedUnitRate) * simulatedProductionKg);

            // Render Output Fields
            const outProd = document.getElementById('adv-out-prod');
            const outSec = document.getElementById('adv-out-sec');
            const outResin = document.getElementById('adv-out-resin');
            const outUnitRate = document.getElementById('adv-out-unitrate');
            const outSavings = document.getElementById('adv-out-savings');

            if (outProd) outProd.textContent = `${simulatedProductionTons.toLocaleString(undefined, {maximumFractionDigits: 1})} t`;
            if (outSec) outSec.textContent = `${simulatedSEC.toFixed(2)} KWh/Kg`;
            if (outResin) outResin.textContent = `PKR ${specResinCost.toFixed(2)}`;
            if (outUnitRate) outUnitRate.textContent = `PKR ${simulatedUnitRate.toFixed(2)}`;
            if (outSavings) outSavings.textContent = `PKR ${Math.round(estimatedSavings).toLocaleString()}`;
        };

        function updateSparkline(svgId, data, key, color) {
            const svg = document.getElementById(svgId);
            if (!svg) return;
            svg.innerHTML = '';
            if (!data || data.length < 2) return;
            
            // Map data to array of values
            const values = data.map(item => item[key] || 0);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min || 1;
            
            const width = 100;
            const height = 25;
            const padding = 2;
            
            const points = values.map((val, index) => {
                const x = padding + (index / (values.length - 1)) * (width - 2 * padding);
                const y = (height - padding) - ((val - min) / range) * (height - 2 * padding);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
            });
            
            const pathData = `M ${points.join(' L ')}`;
            
            // Add defs with glow filter and gradient fill
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            
            const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            grad.setAttribute('id', `sparkline-grad-${svgId}`);
            grad.setAttribute('x1', '0');
            grad.setAttribute('y1', '0');
            grad.setAttribute('x2', '0');
            grad.setAttribute('y2', '1');
            
            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('stop-color', color);
            stop1.setAttribute('stop-opacity', '0.22');
            
            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', '100%');
            stop2.setAttribute('stop-color', color);
            stop2.setAttribute('stop-opacity', '0');
            
            grad.appendChild(stop1);
            grad.appendChild(stop2);
            defs.appendChild(grad);
            
            const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
            filter.setAttribute('id', `glow-${svgId}`);
            filter.setAttribute('x', '-20%');
            filter.setAttribute('y', '-20%');
            filter.setAttribute('width', '140%');
            filter.setAttribute('height', '140%');
            
            const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
            blur.setAttribute('stdDeviation', '1.2');
            blur.setAttribute('result', 'blur');
            
            const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
            const node1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
            node1.setAttribute('in', 'blur');
            const node2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
            node2.setAttribute('in', 'SourceGraphic');
            
            merge.appendChild(node1);
            merge.appendChild(node2);
            filter.appendChild(blur);
            filter.appendChild(merge);
            defs.appendChild(filter);
            
            svg.appendChild(defs);
            
            // Area fill path
            const fillPathData = `${pathData} L ${points[points.length - 1].split(',')[0]},${height} L ${points[0].split(',')[0]},${height} Z`;
            const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            fillPath.setAttribute('d', fillPathData);
            fillPath.setAttribute('fill', `url(#sparkline-grad-${svgId})`);
            fillPath.setAttribute('stroke', 'none');
            svg.appendChild(fillPath);
            
            // Stroke line path
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', color);
            path.setAttribute('stroke-width', '1.5');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('filter', `url(#glow-${svgId})`);
            svg.appendChild(path);
        }

        // TOP only on a month slide when that machine hits its own peak for the year
        // (never compare PS vs SS vs Met absolute tons — PS would always win)
        function markMachineYearPeakMonth(rootSelector, year, month) {
            const root = document.querySelector(rootSelector);
            if (!root) return;
            const cards = {
                ps: root.querySelector('.exec-machine-card.machine-ps'),
                ss: root.querySelector('.exec-machine-card.machine-ss'),
                met: root.querySelector('.exec-machine-card.machine-met')
            };
            Object.values(cards).forEach((card) => card && card.classList.remove('is-prod-peak'));

            const monthPad = String(month).padStart(2, '0');
            const yearRows = (typeof offlineDataRaw !== 'undefined' ? offlineDataRaw : [])
                .filter((r) => parseYearMonth(r['Dates']).year === String(year));
            if (!yearRows.length) return;

            const byMonth = {};
            yearRows.forEach((r) => {
                const m = parseYearMonth(r['Dates']).month;
                if (!m) return;
                if (!byMonth[m]) byMonth[m] = { ps: 0, ss: 0, met: 0 };
                byMonth[m].ps += Number(r['PS_Production'] || 0);
                byMonth[m].ss += Number(r['SS_Production'] || 0);
                byMonth[m].met += Number(r['Met_Production'] || 0);
            });

            const peakOf = (key) => {
                let best = 0;
                let bestMonths = [];
                Object.keys(byMonth).forEach((m) => {
                    const v = byMonth[m][key] || 0;
                    if (v > best) {
                        best = v;
                        bestMonths = [m];
                    } else if (v > 0 && v === best) {
                        bestMonths.push(m);
                    }
                });
                return { best, bestMonths };
            };

            ['ps', 'ss', 'met'].forEach((key) => {
                const { best, bestMonths } = peakOf(key);
                if (best > 0 && bestMonths.includes(monthPad) && cards[key]) {
                    cards[key].classList.add('is-prod-peak');
                }
            });
        }

        function clearMachineProdPeak(rootSelector) {
            const root = document.querySelector(rootSelector);
            if (!root) return;
            root.querySelectorAll('.exec-machine-card.is-prod-peak').forEach((card) => {
                card.classList.remove('is-prod-peak');
            });
        }

        function updateExecutiveSummaryTab(mainData, year, month, productData, eremaData, offlineData) {
            offlineData = offlineData || [];

            const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
            const avgField = (rows, key) => {
                const vals = rows.map(r => r[key]).filter(v => v !== null && v !== undefined && !isNaN(v) && v > 0);
                return avg(vals);
            };

            // --- Line KPIs ---
            const totalProd = mainData.reduce((sum, r) => sum + (r['Prod. (Tons)'] || 0), 0);
            const avgWaste = kpiDef.waste_pct.calculate(mainData);
            const avgOee = kpiDef.oee.calculate(mainData);
            const avgRsPlant = kpiDef.rs_plant.calculate(mainData);

            // --- Dispatch KPIs ---
            const dispatchRows = (typeof dispatchDataRaw !== 'undefined' ? dispatchDataRaw : []).filter(item => {
                const info = parseYearMonth(item['Dates']);
                const matchY = year === 'All' || info.year === String(year);
                const matchM = month === 'All' || info.month === String(month).padStart(2, '0');
                return matchY && matchM;
            });
            const dispatchTotal = dispatchRows.reduce((sum, r) => sum + (Number(r['Total']) || 0), 0);
            const dispatchExport = dispatchRows.reduce((sum, r) => sum + (Number(r['Export']) || 0), 0);
            const dispatchLocal = dispatchRows.reduce((sum, r) => sum + (Number(r['Local']) || 0), 0);
            const dispatchExportShare = dispatchTotal > 0 ? (dispatchExport / dispatchTotal) * 100 : 0;

            // Golden highlight when selected month is the year's highest dispatch
            let isDispatchPeak = false;
            if (year !== 'All' && month !== 'All') {
                const yearDispatch = (typeof dispatchDataRaw !== 'undefined' ? dispatchDataRaw : []).filter(item => {
                    const info = parseYearMonth(item['Dates']);
                    return info.year === String(year);
                });
                let peakDispatch = 0;
                let peakMonthPad = '';
                yearDispatch.forEach(r => {
                    const t = Number(r['Total']) || 0;
                    if (t > peakDispatch) {
                        peakDispatch = t;
                        peakMonthPad = parseYearMonth(r['Dates']).month;
                    }
                });
                isDispatchPeak = peakDispatch > 0 && String(month).padStart(2, '0') === String(peakMonthPad).padStart(2, '0');
            }

            // --- Offline KPIs (per machine) ---
            const psProd = offlineData.reduce((sum, r) => sum + (r['PS_Production'] || 0), 0);
            const ssProd = offlineData.reduce((sum, r) => sum + (r['SS_Production'] || 0), 0);
            const metProd = offlineData.reduce((sum, r) => sum + (r['Met_Production'] || 0), 0);
            const psWaste = offlineData.reduce((sum, r) => sum + (r['PS_Waste'] || 0), 0);
            const ssWaste = offlineData.reduce((sum, r) => sum + (r['SS_Waste'] || 0), 0);
            const metWaste = offlineData.reduce((sum, r) => sum + (r['Met_Waste'] || 0), 0);

            let psWastePct = avgField(offlineData, 'PS_Waste_Pct');
            if (!psWastePct && psProd > 0) psWastePct = (psWaste / psProd) * 100;
            let ssWastePct = avgField(offlineData, 'SS_Waste_Pct');
            if (!ssWastePct && ssProd > 0) ssWastePct = (ssWaste / ssProd) * 100;
            let metWastePct = avgField(offlineData, 'Met_Waste_Pct');
            if (!metWastePct && metProd > 0) metWastePct = (metWaste / metProd) * 100;

            const validPackingData = offlineData.filter(r => r['Offline_Packing_Cost'] !== null && r['Offline_Packing_Cost'] > 0);
            const avgPacking = validPackingData.length
                ? validPackingData.reduce((sum, r) => sum + r['Offline_Packing_Cost'], 0) / validPackingData.length
                : 0;

            const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
            const formatMass = (kg) => {
                const n = Number(kg) || 0;
                if (Math.abs(n) >= 1000) return `${Math.round(n / 1000).toLocaleString()} t`;
                return `${Math.round(n).toLocaleString()} kg`;
            };

            setTxt('exec-val-prod', `${totalProd.toLocaleString(undefined, { maximumFractionDigits: 0 })} t`);
            setTxt('exec-val-waste', `${avgWaste.toFixed(1)}%`);
            setTxt('exec-val-oee', `${avgOee.toFixed(1)}%`);
            setTxt('exec-val-dispatch', `${dispatchTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t`);
            setTxt('exec-meta-dispatch', `Local ${dispatchLocal.toLocaleString(undefined, { maximumFractionDigits: 1 })} t · Export ${dispatchExport.toLocaleString(undefined, { maximumFractionDigits: 1 })} t`);
            const execDispatchCard = document.getElementById('exec-card-dispatch');
            if (execDispatchCard) execDispatchCard.classList.toggle('is-dispatch-peak', isDispatchPeak);
            const execDispatchBadge = document.getElementById('exec-badge-dispatch');
            if (execDispatchBadge) execDispatchBadge.textContent = isDispatchPeak ? 'PEAK' : 't';
            setTxt('exec-val-rs-plant', avgRsPlant ? avgRsPlant.toFixed(2) : '0.00');

            setTxt('exec-val-ps-prod', formatMass(psProd));
            setTxt('exec-val-ps-waste', `${psWastePct.toFixed(2)}%`);
            setTxt('exec-val-ss-prod', formatMass(ssProd));
            setTxt('exec-val-ss-waste', `${ssWastePct.toFixed(2)}%`);
            setTxt('exec-val-met-prod', formatMass(metProd));
            setTxt('exec-val-met-waste', `${metWastePct.toFixed(2)}%`);
            // No TOP badge on year / multi-month Plant Overview
            clearMachineProdPeak('#executive-tab');
            setTxt('exec-val-packing', `PKR ${avgPacking.toFixed(2)}`);
            const packToneExec = !avgPacking ? ''
                : avgPacking <= 12 ? 'pack-tone-good'
                : avgPacking <= 16 ? 'pack-tone-fair'
                : 'pack-tone-high';
            const packCardExec = document.querySelector('#executive-tab .exec-machine-card.machine-pack');
            if (packCardExec) {
                packCardExec.classList.remove('pack-tone-good', 'pack-tone-fair', 'pack-tone-high');
                if (packToneExec) packCardExec.classList.add(packToneExec);
            }

            const setMeter = (id, pct) => {
                const el = document.getElementById(id);
                if (el) el.style.width = `${Math.max(0, Math.min(100, pct || 0))}%`;
            };
            const setRing = (id, pct) => {
                const el = document.getElementById(id);
                if (!el) return;
                const c = 2 * Math.PI * 14;
                const p = Math.max(0, Math.min(100, pct || 0)) / 100;
                el.style.strokeDasharray = `${(p * c).toFixed(2)} ${c.toFixed(2)}`;
            };

            const sparkRows = (mainData || []).filter(r => r['Prod. (Tons)'] !== null && r['Prod. (Tons)'] !== undefined)
                .slice()
                .sort((a, b) => new Date(a['Dates']) - new Date(b['Dates']));
            updateSparkline('exec-spark-prod', sparkRows, 'Prod. (Tons)', '#00e5ff');

            const monthCount = sparkRows.length || 0;
            const avgMo = monthCount ? totalProd / monthCount : 0;
            setTxt('exec-stat-months', monthCount ? String(monthCount) : '—');
            setTxt('exec-stat-avg', monthCount ? `${Math.round(avgMo).toLocaleString()} t` : '—');
            let trend = '—';
            if (sparkRows.length >= 2) {
                const last = sparkRows[sparkRows.length - 1]['Prod. (Tons)'] || 0;
                const prev = sparkRows[sparkRows.length - 2]['Prod. (Tons)'] || 0;
                if (prev > 0) {
                    const delta = ((last - prev) / prev) * 100;
                    trend = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
                }
            }
            setTxt('exec-stat-trend', trend);

            setRing('exec-ring-waste', Math.min(100, (avgWaste / 10) * 100));
            setRing('exec-ring-oee', avgOee);
            setMeter('exec-meter-waste', Math.min(100, (avgWaste / 10) * 100));
            setMeter('exec-meter-oee', avgOee);

            setMeter('exec-meter-dispatch', dispatchExportShare || (dispatchTotal > 0 ? 100 : 0));
            const rsMax = Math.max(avgRsPlant || 0, 1) * 1.15;
            setMeter('exec-meter-rs-plant', ((avgRsPlant || 0) / rsMax) * 100);

            const setYield = (id, lbl, wastePct) => {
                const yieldPct = Math.max(0, Math.min(100, 100 - (Number(wastePct) || 0)));
                setMeter(id, yieldPct);
                setTxt(lbl, `Yield ${yieldPct.toFixed(1)}%`);
            };
            setYield('exec-yield-ps', 'exec-yield-ps-lbl', psWastePct);
            setYield('exec-yield-ss', 'exec-yield-ss-lbl', ssWastePct);
            setYield('exec-yield-met', 'exec-yield-met-lbl', metWastePct);
            const packBand = Math.min(100, Math.max(0, 100 - ((avgPacking || 0) / 20) * 100));
            setMeter('exec-yield-pack', packBand);
            const packRatingExec = !avgPacking ? '—'
                : avgPacking <= 12 ? 'Good · lower is better'
                : avgPacking <= 16 ? 'Fair · watch cost'
                : 'High · reduce cost';
            setTxt('exec-yield-pack-lbl', avgPacking ? packRatingExec : 'Rating —');

            // --- Monthly cards (full selected/latest year — not month-filtered) ---
            const monthlyHost = document.getElementById('exec-monthly-cards');
            const yearLabelEl = document.getElementById('exec-monthly-year-label');

            const pageColsFor = (count) => {
                if (count <= 0) return 1;
                if (count <= 8) return count;
                if (count <= 12) return 6;
                return 6;
            };

            let targetYear = year;
            if (!targetYear || targetYear === 'All') {
                const years = mainDataRaw
                    .map(r => parseYearMonth(r['Dates']).year)
                    .filter(Boolean);
                targetYear = years.length ? String(Math.max(...years.map(Number))) : '';
            }

            const monthRows = mainDataRaw
                .filter(r => {
                    const info = parseYearMonth(r['Dates']);
                    return info.year === String(targetYear) && r['Prod. (Tons)'] !== null;
                })
                .slice()
                .sort((a, b) => new Date(a['Dates']) - new Date(b['Dates']));

            if (yearLabelEl) yearLabelEl.textContent = targetYear ? `Year ${targetYear}` : 'No year data';

            const pageCols = pageColsFor(monthRows.length);

            if (monthlyHost) {
                monthlyHost.style.gridTemplateColumns = `repeat(${pageCols}, minmax(0, 1fr))`;
                if (!monthRows.length) {
                    monthlyHost.innerHTML = `<div class="exec-month-card" style="grid-column: 1 / -1; opacity: 0.7;"><div class="exec-month-label">No months</div><div class="exec-month-meta">No line data for this year</div></div>`;
                } else {
                    const prods = monthRows.map(r => Number(r['Prod. (Tons)'] || 0));
                    const peakProd = Math.max(...prods, 0);
                    const peakIdx = prods.findIndex(v => v === peakProd && peakProd > 0);
                    monthlyHost.innerHTML = monthRows.map((r, i) => {
                        const pm = parseYearMonth(r['Dates']);
                        const label = `${shortMonths[pm.monthNum - 1] || ''}-${String(pm.year).slice(2)}`;
                        const prod = r['Prod. (Tons)'] || 0;
                        const waste = r['Waste %'] || 0;
                        const oee = r['OEE %'] || 0;
                        const latest = i === monthRows.length - 1 ? ' is-latest' : '';
                        const peak = i === peakIdx ? ' is-peak' : '';
                        return `
                            <div class="exec-month-card${latest}${peak}">
                                <div class="exec-month-shine" aria-hidden="true"></div>
                                <div class="exec-month-label">${label}</div>
                                <div class="exec-month-prod">${Math.round(prod).toLocaleString()}<span>t</span></div>
                                <div class="exec-month-badge"><span class="exec-ind-sign" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg></span>Peak month</div>
                                <div class="exec-month-meta">
                                    <span>Waste <strong>${Number(waste).toFixed(1)}%</strong></span>
                                    <span>OEE <strong>${Number(oee).toFixed(1)}%</strong></span>
                                </div>
                            </div>`;
                    }).join('');
                }
            }

            const mainMonths = mainData.map(d => {
                const pm = parseYearMonth(d['Dates']);
                return (shortMonths[pm.monthNum - 1] || '') + '-' + pm.year.slice(2);
            });
            const prodDataPoints = mainData.map(d => d['Prod. (Tons)'] || 0);
            const wasteDataPoints = mainData.map(d => d['Waste %'] || 0);

            const offMonths = offlineData.map(d => {
                const pm = parseYearMonth(d['Dates']);
                return (shortMonths[pm.monthNum - 1] || '') + '-' + pm.year.slice(2);
            });
            const psSeries = offlineData.map(r => r['PS_Production'] || 0);
            const ssSeries = offlineData.map(r => r['SS_Production'] || 0);
            const metSeries = offlineData.map(r => r['Met_Production'] || 0);

            setTimeout(() => {
                const execTick = document.body.classList.contains('dashboard-fit-view') ? 7 : 9;
                const gridColor = 'rgba(255,255,255,0.05)';
                const tickColor = '#8a97a8';

                const ctxProd = document.getElementById('execProductionChart')?.getContext('2d');
                if (ctxProd) {
                    if (execProductionChart instanceof Chart) execProductionChart.destroy();
                    const peakProdVal = prodDataPoints.length ? Math.max(...prodDataPoints) : 0;
                    const prodPointColors = prodDataPoints.map(v =>
                        (peakProdVal > 0 && v === peakProdVal) ? '#ffd60a' : '#00e5ff'
                    );
                    const prodPointRadii = prodDataPoints.map(v =>
                        (peakProdVal > 0 && v === peakProdVal) ? 6 : 3
                    );
                    execProductionChart = new Chart(ctxProd, {
                        type: 'line',
                        data: {
                            labels: mainMonths,
                            datasets: [
                                {
                                    label: 'Production (Tons)',
                                    data: prodDataPoints,
                                    backgroundColor: 'rgba(0, 229, 255, 0.14)',
                                    borderColor: '#00e5ff',
                                    borderWidth: 2.4,
                                    pointRadius: prodPointRadii,
                                    pointHoverRadius: prodPointRadii.map(r => r + 2),
                                    pointBackgroundColor: prodPointColors,
                                    pointBorderColor: prodPointColors.map(c => c === '#ffd60a' ? '#fff3a8' : '#00e5ff'),
                                    pointBorderWidth: prodDataPoints.map(v =>
                                        (peakProdVal > 0 && v === peakProdVal) ? 2 : 1
                                    ),
                                    fill: true,
                                    tension: 0.35,
                                    yAxisID: 'yProd',
                                    datalabels: {
                                        display: true,
                                        anchor: 'end',
                                        align: 'top',
                                        color: (ctx) => {
                                            const v = ctx.dataset.data[ctx.dataIndex];
                                            return (peakProdVal > 0 && v === peakProdVal) ? '#ffd60a' : '#7defff';
                                        },
                                        font: (ctx) => {
                                            const v = ctx.dataset.data[ctx.dataIndex];
                                            const peak = peakProdVal > 0 && v === peakProdVal;
                                            return { weight: 'bold', size: peak ? 10 : 8 };
                                        },
                                        formatter: (v) => {
                                            if (!v) return '';
                                            const tag = (peakProdVal > 0 && v === peakProdVal) ? ' ★' : '';
                                            return Math.round(v).toLocaleString() + tag;
                                        }
                                    }
                                },
                                {
                                    label: 'Waste %',
                                    data: wasteDataPoints,
                                    type: 'bar',
                                    backgroundColor: wasteDataPoints.map(v => v <= 5 ? 'rgba(255, 176, 0, 0.72)' : 'rgba(255, 68, 102, 0.78)'),
                                    borderColor: wasteDataPoints.map(v => v <= 5 ? '#ffb000' : '#ff4466'),
                                    borderWidth: 1,
                                    borderRadius: 4,
                                    yAxisID: 'yWaste',
                                    datalabels: {
                                        display: true,
                                        anchor: 'end',
                                        align: 'top',
                                        color: '#ffe0a0',
                                        font: { weight: 'bold', size: 8 },
                                        formatter: (v) => (v != null) ? Number(v).toFixed(1) + '%' : ''
                                    }
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: { padding: { top: 10, right: 4, bottom: 0, left: 0 } },
                            plugins: { legend: { display: false }, datalabels: { display: true } },
                            scales: {
                                x: { grid: { display: false }, ticks: { color: tickColor, font: { size: execTick } } },
                                yProd: {
                                    position: 'left',
                                    grid: { color: gridColor },
                                    ticks: { color: tickColor, font: { size: execTick } },
                                    suggestedMax: prodDataPoints.length ? Math.max(...prodDataPoints) * 1.18 : undefined
                                },
                                yWaste: {
                                    position: 'right',
                                    grid: { display: false },
                                    ticks: { color: tickColor, font: { size: execTick }, callback: (v) => v + '%' },
                                    suggestedMax: wasteDataPoints.length ? Math.max(...wasteDataPoints.filter(v => v != null), 1) * 1.35 : undefined
                                }
                            }
                        }
                    });
                }

                const ctxOff = document.getElementById('execOfflineChart')?.getContext('2d');
                if (ctxOff) {
                    if (execOfflineChart instanceof Chart) execOfflineChart.destroy();
                    execOfflineChart = new Chart(ctxOff, {
                        type: 'bar',
                        data: {
                            labels: offMonths,
                            datasets: [
                                {
                                    label: 'PS',
                                    data: psSeries,
                                    backgroundColor: 'rgba(45, 212, 191, 0.75)',
                                    borderColor: '#2dd4bf',
                                    borderWidth: 1,
                                    borderRadius: 3,
                                    datalabels: { display: false }
                                },
                                {
                                    label: 'SS',
                                    data: ssSeries,
                                    backgroundColor: 'rgba(255, 176, 0, 0.75)',
                                    borderColor: '#ffb000',
                                    borderWidth: 1,
                                    borderRadius: 3,
                                    datalabels: { display: false }
                                },
                                {
                                    label: 'Metallizer',
                                    data: metSeries,
                                    backgroundColor: 'rgba(191, 90, 242, 0.75)',
                                    borderColor: '#bf5af2',
                                    borderWidth: 1,
                                    borderRadius: 3,
                                    datalabels: { display: false }
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'top',
                                    align: 'end',
                                    labels: { color: '#c8d4e6', boxWidth: 10, boxHeight: 10, font: { size: 9, weight: '600' }, usePointStyle: true, pointStyle: 'rectRounded' }
                                },
                                datalabels: { display: false }
                            },
                            scales: {
                                x: { grid: { display: false }, ticks: { color: tickColor, font: { size: execTick } } },
                                y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, font: { size: execTick } } }
                            }
                        }
                    });
                }

                [execProductionChart, execOfflineChart]
                    .filter(Boolean)
                    .forEach(chart => { try { chart.resize(); } catch (e) {} });
            }, 50);
        }

        function updateOverviewTab(data, year, month) {
            const contentCard = document.getElementById('overview-content');
            
            // Loop through currently visible KPIs and update their cards
            visibleKPIs.forEach(key => {
                const cardEl = document.getElementById(`kpi-card-${key}`);
                const valEl = document.getElementById(`kpi-val-${key}`);
                const subEl = document.getElementById(`kpi-sub-${key}`);
                const def = kpiDef[key];
                
                if (!cardEl || !valEl || !subEl) return;

                // Update highlight active-trend state
                const isPlotted = activeTrends.includes(key);
                if (isPlotted) {
                    cardEl.classList.add('active-trend');
                } else {
                    cardEl.classList.remove('active-trend');
                }

                if (data.length === 0) {
                    valEl.textContent = key === 'oee' || key === 'waste_pct' ? "0.0%" : "0";
                    subEl.textContent = "No data in selected range";
                    return;
                }

                // Run calculation
                const rawVal = def.calculate(data);
                
                // Update value & text
                valEl.textContent = def.format(rawVal);
                subEl.textContent = def.subtext;
            });

            if (data.length === 0) {
                contentCard.innerHTML = createEmptyState("No Production Data", "No monthly production logs match the selected filter.");
                return;
            }

            contentCard.innerHTML = initialOverviewContentHTML;

            // Restore the select drop-down value
            const typeSelect = document.getElementById('overviewChartType');
            if (typeSelect) {
                typeSelect.value = overviewChartType;
            }

            // Update Scorecard gauges
            const avgOee = kpiDef.oee.calculate(data);
            document.getElementById('gauge-val-oee').textContent = `${avgOee.toFixed(1)}%`;
            const oeeCircle = document.getElementById('gauge-circle-oee');
            if (oeeCircle) {
                const circumference = 213.62;
                const offset = circumference - (Math.min(100, Math.max(0, avgOee)) / 100) * circumference;
                oeeCircle.style.strokeDashoffset = offset;
            }

            const avgWaste = kpiDef.waste_pct.calculate(data);
            document.getElementById('gauge-val-waste').textContent = `${avgWaste.toFixed(1)}%`;
            const wasteCircle = document.getElementById('gauge-circle-waste');
            if (wasteCircle) {
                const circumference = 213.62;
                const offset = circumference - (Math.min(100, Math.max(0, avgWaste)) / 100) * circumference;
                wasteCircle.style.strokeDashoffset = offset;
            }

            const avgRunningDays = kpiDef.days.calculate(data);
            const utilIndex = (avgRunningDays / 30) * 100;
            document.getElementById('gauge-val-util').textContent = `${utilIndex.toFixed(1)}%`;
            const utilCircle = document.getElementById('gauge-circle-util');
            if (utilCircle) {
                const circumference = 213.62;
                const offset = circumference - (Math.min(100, Math.max(0, utilIndex)) / 100) * circumference;
                utilCircle.style.strokeDashoffset = offset;
            }



            // Production Adjustments average
            const count = data.length;
            const totalGrades = data.reduce((sum, item) => sum + (item['Grade Changes'] || 0), 0);
            const totalMicrons = data.reduce((sum, item) => sum + (item['Micron Changes'] || 0), 0);
            const totalBreaks = data.reduce((sum, item) => sum + (item['#of Breaks/Stoppages'] || 0), 0);

            const isSingleMonth = year !== 'All' && month !== 'All';
            document.getElementById('param-grade').textContent = (totalGrades / (isSingleMonth ? 1 : count)).toFixed(1);
            const paramGradeDesc = document.getElementById('param-grade-desc');
            if (paramGradeDesc) {
                paramGradeDesc.textContent = isSingleMonth ? "Total grade changes" : "Average adjustments / month";
            }
            
            document.getElementById('param-micron').textContent = (totalMicrons / (isSingleMonth ? 1 : count)).toFixed(1);
            const paramMicronDesc = document.getElementById('param-micron-desc');
            if (paramMicronDesc) {
                paramMicronDesc.textContent = isSingleMonth ? "Total micron changes" : "Average thickness changes / month";
            }
            
            document.getElementById('param-breaks').textContent = (totalBreaks / (isSingleMonth ? 1 : count)).toFixed(1);
            const paramBreaksDesc = document.getElementById('param-breaks-desc');
            if (paramBreaksDesc) {
                paramBreaksDesc.textContent = isSingleMonth ? "Total line breaks" : "Average incidents / month";
            }

            // Draw sparklines for parameter cards
            try {
                updateSparkline('sparkline-grade', data, 'Grade Changes', '#00d2ff');
                updateSparkline('sparkline-micron', data, 'Micron Changes', '#bf5af2');
                updateSparkline('sparkline-breaks', data, '#of Breaks/Stoppages', '#ff9f0a');
            } catch (e) {
                console.error("Error updating sparklines:", e);
            }

            // Save active data to global variable for savings calculations
            window.currentActiveData = data;

            // Update Card 2: Utilities & Cost Scorecard gauges
            try {
                const valKwhLine = kpiDef.kwh_line.calculate(data);
                const valKwhLineEl = document.getElementById('gauge-val-kwhline');
                if (valKwhLineEl) valKwhLineEl.textContent = valKwhLine.toFixed(2);
                const kwhLineCircle = document.getElementById('gauge-circle-kwhline');
                if (kwhLineCircle) {
                    const circumference = 157.08;
                    const pct = Math.min(100, Math.max(0, (valKwhLine / 1.5) * 100));
                    kwhLineCircle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
                }

                const valKwhPlant = kpiDef.kwh_plant.calculate(data);
                const valKwhPlantEl = document.getElementById('gauge-val-kwhplant');
                if (valKwhPlantEl) valKwhPlantEl.textContent = valKwhPlant.toFixed(2);
                const kwhPlantCircle = document.getElementById('gauge-circle-kwhplant');
                if (kwhPlantCircle) {
                    const circumference = 157.08;
                    const pct = Math.min(100, Math.max(0, (valKwhPlant / 2.0) * 100));
                    kwhPlantCircle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
                }

                const valRsLine = kpiDef.rs_line.calculate(data);
                const valRsLineEl = document.getElementById('gauge-val-rsline');
                if (valRsLineEl) valRsLineEl.textContent = valRsLine.toFixed(1);
                const rsLineCircle = document.getElementById('gauge-circle-rsline');
                if (rsLineCircle) {
                    const circumference = 157.08;
                    const pct = Math.min(100, Math.max(0, (valRsLine / 60) * 100));
                    rsLineCircle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
                }

                const valRsPlant = kpiDef.rs_plant.calculate(data);
                const valRsPlantEl = document.getElementById('gauge-val-rsplant');
                if (valRsPlantEl) valRsPlantEl.textContent = valRsPlant.toFixed(1);
                const rsPlantCircle = document.getElementById('gauge-circle-rsplant');
                if (rsPlantCircle) {
                    const circumference = 157.08;
                    const pct = Math.min(100, Math.max(0, (valRsPlant / 90) * 100));
                    rsPlantCircle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
                }
            } catch (e) {
                console.error("Error updating Utilities gauges:", e);
            }

            // Update Cost Savings Calculations
            try {
                if (typeof updateSavingsCalculation === 'function') {
                    updateSavingsCalculation();
                }
            } catch (e) {
                console.error("Error running savings calculation:", e);
            }

            // Chart Render
            const chartLabels = data.map(item => {
                const info = parseYearMonth(item['Dates']);
                return `${monthNames[info.monthNum - 1].slice(0, 3)} ${info.year.slice(2)}`;
            });

            // Color palette map for dataset rendering
            const colorMap = {
                prod: '#00e5ff',
                oee: '#00ff66',
                days: '#0088ff',
                accidents: '#ff3b30',
                waste: '#ffb000',
                waste_pct: '#ff7300',
                downtime: '#ff5722',
                breaks: '#ffeb3b',
                stoppages: '#009688',
                recovery: '#3f51b5',
                grades: '#e91e63',
                microns: '#9c27b0',
                kwh_line: '#00bcd4',
                kwh_plant: '#03a9f4',
                rs_line: '#ff9800',
                rs_plant: '#ff5722'
            };

            const rightAxisKeys = ['oee', 'waste_pct', 'days', 'accidents', 'stoppages', 'grades', 'microns', 'kwh_line', 'kwh_plant', 'rs_line', 'rs_plant'];
            const hasRightAxisDataset = activeTrends.some(key => rightAxisKeys.includes(key));

            // Update subtitle desc dynamically based on scale
            const descEl = document.getElementById('overview-chart-desc');
            if (descEl) {
                descEl.textContent = hasRightAxisDataset ? "Multi-scale Time Series" : "Tons (Time series)";
            }

            const chartDatasets = activeTrends.map(key => {
                const opt = kpiOptions.find(o => o.key === key);
                const color = colorMap[key] || '#ffffff';
                const yVals = data.map(item => getMonthlyKpiVal(item, key));
                const isRightAxis = rightAxisKeys.includes(key);

                const currentType = getKpiChartType(key);
                let datasetType = 'line';
                let fillVal = false;
                let bgColor = `${color}05`; // very subtle fill for standard lines
                let borderWidth = 2.5;

                if (currentType === 'area') {
                    datasetType = 'line';
                    fillVal = true;
                    bgColor = (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                        gradient.addColorStop(1, color + '25');
                        return gradient;
                    };
                } else if (currentType === 'bar') {
                    datasetType = 'bar';
                    bgColor = `${color}c0`; // semi-solid fill for bars
                    borderWidth = 1.5;
                }

                return {
                    type: datasetType,
                    label: opt.label,
                    kpiKey: key,
                    data: yVals,
                    borderColor: color,
                    backgroundColor: bgColor,
                    borderWidth: borderWidth,
                    fill: fillVal,
                    tension: 0.35,
                    borderRadius: datasetType === 'bar' ? 4 : 0,
                    pointRadius: datasetType === 'bar' ? 0 : (data.length > 1 ? 3 : 5),
                    pointHoverRadius: 6,
                    yAxisID: key === 'prod' ? 'yProd' :
                             (key === 'waste' ? 'yWaste' :
                             (key === 'downtime' ? 'yDowntime' : 'yRight'))
                };
            });

            let leftAxisTitle = 'Volume / Hours / Minutes';
            const activeLeftKeys = activeTrends.filter(key => !rightAxisKeys.includes(key));
            if (activeLeftKeys.length === 1) {
                const key = activeLeftKeys[0];
                const def = kpiDef[key];
                if (def && def.subtext) {
                    leftAxisTitle = def.subtext;
                }
            } else if (activeLeftKeys.length > 1) {
                const allTons = activeLeftKeys.every(k => k === 'prod' || k === 'waste');
                if (allTons) {
                    leftAxisTitle = 'Weight (Tons)';
                }
            }

            let rightAxisTitle = 'Percentage / Days / Counts / Energy / Cost';
            const activeRightKeys = activeTrends.filter(key => rightAxisKeys.includes(key));
            if (activeRightKeys.length === 1) {
                const key = activeRightKeys[0];
                const def = kpiDef[key];
                if (def && def.subtext) {
                    rightAxisTitle = def.subtext;
                }
            } else if (activeRightKeys.length > 1) {
                const allPct = activeRightKeys.every(k => k === 'oee' || k === 'waste_pct');
                if (allPct) {
                    rightAxisTitle = 'Percentage (%)';
                } else {
                    rightAxisTitle = 'Metrics / Scale';
                }
            }

            const canvasEl = document.getElementById('overviewChart');
            if (!canvasEl) return;
            const overviewCtx = canvasEl.getContext('2d');
            if (overviewChart) overviewChart.destroy();

            overviewChart = new Chart(overviewCtx, {
                type: (overviewChartType === 'bar' || overviewChartType === 'mixed') ? 'bar' : 'line',
                data: {
                    labels: chartLabels,
                    datasets: chartDatasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { boxWidth: 12, padding: 15 } },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        const key = activeTrends[context.datasetIndex];
                                        const def = kpiDef[key];
                                        if (def) {
                                            label += def.format(context.parsed.y);
                                        } else {
                                            label += context.parsed.y;
                                        }
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.03)' },
                            ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { family: 'Inter', size: 10 } }
                        },
                        yProd: {
                            type: 'linear',
                            position: 'left',
                            display: activeTrends.includes('prod'),
                            min: 0,
                            grid: { color: 'rgba(255, 255, 255, 0.03)' },
                            ticks: { color: '#00e5ff', font: { family: 'Inter', size: 10 } },
                            title: {
                                display: true,
                                text: 'Production (Tons)',
                                color: '#00e5ff',
                                font: { size: 10, weight: '600' }
                            }
                        },
                        yWaste: {
                            type: 'linear',
                            position: 'left',
                            display: activeTrends.includes('waste'),
                            min: 0,
                            grid: { drawOnChartArea: false },
                            ticks: { color: '#ffb300', font: { family: 'Inter', size: 10 } },
                            title: {
                                display: true,
                                text: 'Waste (Tons)',
                                color: '#ffb300',
                                font: { size: 10, weight: '600' }
                            }
                        },
                        yRight: {
                            type: 'linear',
                            position: 'right',
                            display: activeTrends.some(k => k !== 'prod' && k !== 'waste' && k !== 'downtime'),
                            min: 0,
                            grid: { drawOnChartArea: false },
                            ticks: { color: '#00e676', font: { family: 'Inter', size: 10 } },
                            title: {
                                display: true,
                                text: rightAxisTitle,
                                color: '#00e676',
                                font: { size: 10, weight: '600' }
                            }
                        },
                        yDowntime: {
                            type: 'linear',
                            position: 'right',
                            display: activeTrends.includes('downtime'),
                            min: 0,
                            grid: { drawOnChartArea: false },
                            ticks: { color: '#ff3b30', font: { family: 'Inter', size: 10 } },
                            title: {
                                display: true,
                                text: 'Downtime (Hours)',
                                color: '#ff3b30',
                                font: { size: 10, weight: '600' }
                            }
                        }
                    }
                }
            });
        }

        // ==========================================
        // 2. WASTE & DOWNTIME TAB
        // ==========================================
        const initialLossesContentHTML = document.getElementById('losses-content').innerHTML;
        function updateLossesTab(data, year, month) {
            window.currentLossesData = data; // Save for modal access
            const contentCard = document.getElementById('losses-content');
            if (data.length === 0) {
                document.getElementById('m2-waste').textContent = "0.00 t";
                document.getElementById('m2-downtime').textContent = "0.00 h";
                document.getElementById('m2-breaks').textContent = "0.00/d";
                document.getElementById('m2-recovery').textContent = "0.00 m";
                if (wasteChart) { wasteChart.destroy(); wasteChart = null; }
                if (downtimeChart) { downtimeChart.destroy(); downtimeChart = null; }
                contentCard.innerHTML = createEmptyState("No Losses Data", "No monthly wastage logs match the selected filter.");
                return;
            }

            if (wasteChart) { wasteChart.destroy(); wasteChart = null; }
            if (downtimeChart) { downtimeChart.destroy(); downtimeChart = null; }
            contentCard.innerHTML = initialLossesContentHTML;

            // KPIs
            const totalWaste = data.reduce((sum, item) => sum + (item['Waste ( Tons)'] || 0), 0);
            const totalDowntime = data.reduce((sum, item) => sum + (item['Total Down Time ( hrs.)'] || 0), 0);
            
            const breakRateItems = data.filter(item => item['Avg. Stoppage/day'] !== null);
            const avgBreakRate = breakRateItems.length > 0 ? breakRateItems.reduce((sum, item) => sum + item['Avg. Stoppage/day'], 0) / breakRateItems.length : 0;
            
            const recoveryItems = data.filter(item => item['Line Recovery Time / Break'] !== null);
            const avgRecovery = recoveryItems.length > 0 ? recoveryItems.reduce((sum, item) => sum + item['Line Recovery Time / Break'], 0) / recoveryItems.length : 0;

            document.getElementById('m2-waste').textContent = `${totalWaste.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} t`;
            document.getElementById('m2-downtime').textContent = `${totalDowntime.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} h`;
            document.getElementById('m2-breaks').textContent = `${avgBreakRate.toFixed(2)}/d`;
            document.getElementById('m2-recovery').textContent = `${avgRecovery.toFixed(2)} m`;

            // Waste breakdown sums
            const wProcess = data.reduce((sum, item) => sum + (item['Waste_Process'] || 0), 0);
            const wPlanning = data.reduce((sum, item) => sum + (item['Waste_Planning'] || 0), 0);
            const wElectrical = data.reduce((sum, item) => sum + (item['Waste_Electrical'] || 0), 0);
            const wMechanical = data.reduce((sum, item) => sum + (item['Waste_Mechanical'] || 0), 0);
            const wPowerHouse = data.reduce((sum, item) => sum + (item['Waste_PowerHouse'] || 0), 0);
            const wShortages = data.reduce((sum, item) => sum + (item['Waste_Shortages'] || 0), 0);

            const wSums = [wProcess, wMechanical, wShortages, wElectrical, wPowerHouse, wPlanning];
            const wLabels = ['Process', 'Mechanical', 'No. Job Order', 'Electrical', 'Power House', 'Planning'];
            const wColors = [
                'rgba(0, 229, 255, 0.85)',
                'rgba(255, 176, 0, 0.85)',
                'rgba(0, 255, 102, 0.85)',
                'rgba(255, 59, 48, 0.85)',
                'rgba(168, 85, 247, 0.85)',
                'rgba(249, 115, 22, 0.85)'
            ];
            const wTotal = wSums.reduce((a, b) => a + b, 0) || 1;

            const wasteLegendEl = document.getElementById('waste-chart-legend');
            if (wasteLegendEl) {
                wasteLegendEl.innerHTML = wLabels.map((label, i) => {
                    const v = wSums[i] || 0;
                    const pct = ((v / wTotal) * 100).toFixed(1);
                    return `
                        <div class="waste-legend-row">
                            <div class="waste-legend-name">
                                <span class="waste-legend-swatch" style="background:${wColors[i]};"></span>
                                <span>${label}</span>
                            </div>
                            <div class="waste-legend-meta">${v.toFixed(1)} t · ${pct}%</div>
                        </div>
                    `;
                }).join('');
            }

            // Waste breakdown — pie chart with values on slices
            const wasteCtx = document.getElementById('wasteChart').getContext('2d');
            if (wasteChart) wasteChart.destroy();
            wasteChart = new Chart(wasteCtx, {
                type: 'pie',
                data: {
                    labels: wLabels,
                    datasets: [{
                        kpiKey: 'tons',
                        label: 'Waste (Tons)',
                        data: wSums,
                        backgroundColor: wColors,
                        borderColor: '#0a0c12',
                        borderWidth: 2,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: 4 },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const v = ctx.parsed || 0;
                                    const pct = ((v / wTotal) * 100).toFixed(1);
                                    const name = wLabels[ctx.dataIndex] || '';
                                    return ` ${name}: ${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} t (${pct}%)`;
                                }
                            }
                        },
                        datalabels: {
                            display: (ctx) => {
                                const v = ctx.dataset.data[ctx.dataIndex] || 0;
                                return (v / wTotal) >= 0.04;
                            },
                            color: '#ffffff',
                            font: { size: 10, weight: '700' },
                            textStrokeColor: 'rgba(0,0,0,0.55)',
                            textStrokeWidth: 3,
                            formatter: (v) => {
                                const pct = ((v / wTotal) * 100).toFixed(0);
                                return [`${Number(v).toFixed(0)} t`, `${pct}%`];
                            }
                        }
                    }
                }
            });

            // Downtime — same department names/colors as waste where shared, plus DT-only categories
            const dtCats = [
                { key: 'Downtime_Process', label: 'Process', color: '#00e5ff' },
                { key: 'Downtime_Mechanical', label: 'Mechanical', color: '#ffb000' },
                { key: 'Downtime_Shortages', label: 'No. Job Order', color: '#00ff66' },
                { key: 'Downtime_Electrical', label: 'Electrical', color: '#ff3b30' },
                { key: 'Downtime_PowerHouse', label: 'Power House', color: '#a855f7' },
                { key: 'Downtime_Planning', label: 'Planning', color: '#f97316' },
                { key: 'Downtime_Maintenance', label: 'Planned Maintenance', color: '#3b82f6' },
                { key: 'Downtime_RentalPower', label: 'Rental Power', color: '#ec4899' }
            ];

            const dtSums = dtCats.map(cat => data.reduce((sum, item) => sum + (item[cat.key] || 0), 0));
            const sumAllDT = dtSums.reduce((a, b) => a + b, 0) || 1;

            const dtCanvas = document.getElementById('downtimeChart');
            if (dtCanvas) {
                const dtCtx = dtCanvas.getContext('2d');
                if (downtimeChart) downtimeChart.destroy();
                downtimeChart = new Chart(dtCtx, {
                    type: 'bar',
                    data: {
                        labels: dtCats.map(c => c.label),
                        datasets: [{
                            kpiKey: 'hrs',
                            label: 'Downtime (hrs)',
                            data: dtSums,
                            backgroundColor: dtCats.map(c => c.color + 'd9'),
                            borderColor: dtCats.map(c => c.color),
                            borderWidth: 1,
                            borderRadius: 4,
                            barPercentage: 0.72,
                            categoryPercentage: 0.82
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { left: 4, right: 48, top: 2, bottom: 2 } },
                        onClick: (_evt, elements) => {
                            if (!elements.length) return;
                            const idx = elements[0].index;
                            const cat = dtCats[idx];
                            openDowntimeRemarksModal(cat.key, cat.label, cat.color);
                        },
                        onHover: (evt, elements) => {
                            if (evt.native && evt.native.target) {
                                evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => {
                                        const v = ctx.parsed.x || 0;
                                        const pct = ((v / sumAllDT) * 100).toFixed(1);
                                        return ` ${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} hrs (${pct}%)`;
                                    }
                                }
                            },
                            datalabels: {
                                display: (ctx) => (ctx.dataset.data[ctx.dataIndex] || 0) > 0,
                                anchor: 'end',
                                align: 'right',
                                clamp: true,
                                clip: false,
                                color: '#e8eef8',
                                font: { size: 10, weight: '700' },
                                formatter: (v) => {
                                    if (!v) return '';
                                    const pct = ((v / sumAllDT) * 100).toFixed(0);
                                    return `${Number(v).toFixed(0)} h · ${pct}%`;
                                }
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                grace: '8%',
                                grid: { color: 'rgba(255,255,255,0.04)' },
                                ticks: {
                                    color: '#849396',
                                    font: { size: 10 },
                                    callback: (v) => v + ' h'
                                }
                            },
                            y: {
                                grid: { display: false },
                                ticks: {
                                    color: '#f0f3ff',
                                    font: { size: 10, weight: '600' },
                                    autoSkip: false,
                                    crossAlign: 'far'
                                }
                            }
                        }
                    }
                });
            }

            // Populate Department Remarks
            const remarksContainer = document.getElementById('downtime-remarks-list');
            remarksContainer.innerHTML = '';

            let hasAnyRemarks = false;

            data.forEach(item => {
                const dateStr = item['Dates'];
                const dateObj = new Date(dateStr + "T00:00:00");
                const monthName = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                const itemRemarks = [];

                const remarkFields = [
                    { key: 'Downtime_Process_Remarks', label: 'Process' },
                    { key: 'Downtime_Mechanical_Remarks', label: 'Mechanical' },
                    { key: 'Downtime_Electrical_Remarks', label: 'Electrical' },
                    { key: 'Downtime_Planning_Remarks', label: 'Planning' },
                    { key: 'Downtime_Shortages_Remarks', label: 'No. Job Order' },
                    { key: 'Downtime_Maintenance_Remarks', label: 'Maintenance' },
                    { key: 'Downtime_PowerHouse_Remarks', label: 'Power House' },
                    { key: 'Downtime_RentalPower_Remarks', label: 'Rental Power' },
                    { key: 'Remarks', label: 'General' }
                ];

                remarkFields.forEach(f => {
                    const val = item[f.key];
                    if (val && String(val).trim()) {
                        itemRemarks.push({ dept: f.label, text: String(val).trim() });
                    }
                });

                if (itemRemarks.length > 0) {
                    hasAnyRemarks = true;
                    let remarksHTML = `
                        <div class="month-remarks-card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 4px; padding: 16px;">
                            <div style="font-weight: 600; color: var(--color-primary); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px; display: flex; justify-content: space-between;">
                                <span>${monthName}</span>
                                <span style="font-size: 11px; color: var(--text-muted);">Remarks</span>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                    `;

                    itemRemarks.forEach(r => {
                        remarksHTML += `
                                <div style="font-size: 13px; line-height: 1.4; display: flex; flex-direction: column; gap: 4px;">
                                    <strong style="color: var(--color-secondary); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">${r.dept}:</strong>
                                    <div style="color: var(--text-muted); margin-top: 4px;">
                                        ${formatDowntimeRemarks(r.text)}
                                    </div>
                                </div>
                        `;
                    });

                    remarksHTML += `
                            </div>
                        </div>
                    `;
                    remarksContainer.insertAdjacentHTML('beforeend', remarksHTML);
                }
            });

            if (!hasAnyRemarks) {
                remarksContainer.innerHTML = `
                    <div style="grid-column: span 3; text-align: center; padding: 24px; color: var(--text-muted); font-size: 14px;">
                        No department remarks logged for the selected period.
                    </div>
                `;
            }
            
            updateWasteNoteUI();
        }

        // ==========================================
        // 3. PRODUCTS TAB
        // ==========================================
        let skuViewMode = 'cards'; // default view mode

        function setSkuViewMode(mode) {
            skuViewMode = mode;
            const tableWrap = document.getElementById('sku-table-wrapper');
            const cardsWrap = document.getElementById('sku-cards-wrapper');
            const btnTable = document.getElementById('btn-view-table');
            const btnCards = document.getElementById('btn-view-cards');
            
            if (mode === 'table') {
                if (tableWrap) tableWrap.style.display = 'block';
                if (cardsWrap) cardsWrap.style.display = 'none';
                if (btnTable) btnTable.classList.add('active');
                if (btnCards) btnCards.classList.remove('active');
            } else {
                if (tableWrap) tableWrap.style.display = 'none';
                if (cardsWrap) cardsWrap.style.display = 'grid';
                if (btnTable) btnTable.classList.remove('active');
                if (btnCards) btnCards.classList.add('active');
            }
        }

        const initialProductsContentHTML = document.getElementById('products-content').innerHTML;
        function updateProductsTab(data, year, month) {
            const contentCard = document.getElementById('products-content');
            if (data.length === 0) {
                document.getElementById('m3-prod').textContent = "0.00 kg";
                document.getElementById('m3-skus').textContent = "0 Products";
                document.getElementById('m3-cat').textContent = "-";
                document.getElementById('m3-cat-share').textContent = "0% output share";
                document.getElementById('m3-lead').textContent = "-";
                document.getElementById('m3-lead-output').textContent = "0 kg";
                contentCard.innerHTML = createEmptyState("No Product Data", "No product performance details match the selected filter.");
                return;
            }

            contentCard.innerHTML = initialProductsContentHTML;

            // Group by SKU code and sum production to aggregate records
            const skuAggregated = {};
            data.forEach(item => {
                const code = item['Product'];
                if (!skuAggregated[code]) {
                    skuAggregated[code] = {
                        Product: code,
                        'Product Type': item['Product Type'],
                        Production: 0
                    };
                }
                skuAggregated[code].Production += (item['Production'] || 0);
            });

            const skuList = Object.values(skuAggregated);

            // KPIs
            const totalProd = skuList.reduce((sum, item) => sum + (item['Production'] || 0), 0);
            const activeSkus = skuList.length;

            const typeSums = {};
            skuList.forEach(item => {
                const rawType = item['Product Type'] || 'Other';
                const t = getNormalizedProductType(rawType);
                typeSums[t] = (typeSums[t] || 0) + (item['Production'] || 0);
            });

            // Find top category
            let topCat = "-";
            let topCatVal = 0;
            for (let t in typeSums) {
                if (typeSums[t] > topCatVal) {
                    topCatVal = typeSums[t];
                    topCat = t;
                }
            }
            const topCatPct = totalProd > 0 ? (topCatVal / totalProd) * 100 : 0;

            const sortedSKUs = skuList.sort((a, b) => b['Production'] - a['Production']);
            const topSKU = sortedSKUs[0];

            document.getElementById('m3-prod').textContent = `${totalProd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg`;
            document.getElementById('m3-skus').textContent = `${activeSkus} Products`;
            document.getElementById('m3-cat').textContent = topCat;
            const formattedCatVal = topCatVal.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' kg';
            document.getElementById('m3-cat-share').textContent = `${topCatPct.toFixed(1)}% total output share (${formattedCatVal})`;
            const leadPct = (topSKU && totalProd > 0) ? ((topSKU['Production'] / totalProd) * 100) : 0;
            document.getElementById('m3-lead').textContent = topSKU ? topSKU['Product'] : "-";
            document.getElementById('m3-lead-output').textContent = topSKU ? `${topSKU['Production'].toLocaleString(undefined, {maximumFractionDigits: 0})} kg (${leadPct.toFixed(1)}% share)` : "0 kg";

            // Render table ledger rows
            const tableBody = document.getElementById('sku-ledger-body');
            if (tableBody) {
                tableBody.innerHTML = '';
                sortedSKUs.forEach(item => {
                    const pct = (item['Production'] / totalProd) * 100;
                    const rowHTML = `
                        <tr>
                            <td class="sku-code">${item['Product']}</td>
                            <td>${getNormalizedProductType(item['Product Type'])}</td>
                            <td>${item['Production'].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg</td>
                            <td>${pct.toFixed(1)}%</td>
                            <td class="bar-cell">
                                <div class="progress-track"><div class="progress-bar" style="width: ${pct}%;"></div></div>
                            </td>
                        </tr>
                    `;
                    tableBody.insertAdjacentHTML('beforeend', rowHTML);
                });
            }

            // Render cards grid
            const cardsGrid = document.getElementById('sku-cards-wrapper');
            if (cardsGrid) {
                cardsGrid.innerHTML = '';
                sortedSKUs.forEach(item => {
                    const pct = (item['Production'] / totalProd) * 100;
                    const rawType = item['Product Type'] || 'Other';
                    const type = getNormalizedProductType(rawType);
                    
                    let catClass = 'cat-plain';
                    if (type === 'White Opaque') {
                        catClass = 'cat-chem-twist'; // purple
                    } else if (type === 'Chemical PET') {
                        catClass = 'cat-chem'; // green
                    } else if (type === 'Plain Twist') {
                        catClass = 'cat-twist'; // orange
                    }

                    const cardHTML = `
                        <div class="sku-card ${catClass}">
                            <div class="sku-card-header">
                                <span class="sku-card-code">${item['Product']}</span>
                                <span class="sku-card-badge ${catClass}">${type}</span>
                            </div>
                            <div class="sku-card-body">
                                <span class="sku-card-label">Production Output</span>
                                <span class="sku-card-value">${item['Production'].toLocaleString(undefined, {maximumFractionDigits: 0})} kg</span>
                            </div>
                            <div class="sku-card-footer">
                                <div class="sku-card-share-row">
                                    <span>Volume Share</span>
                                    <span class="sku-card-share-val">${pct.toFixed(1)}%</span>
                                </div>
                                <div class="progress-track">
                                    <div class="progress-bar" style="width: ${pct}%;"></div>
                                </div>
                            </div>
                        </div>
                    `;
                    cardsGrid.insertAdjacentHTML('beforeend', cardHTML);
                });
            }

            setSkuViewMode(skuViewMode);

            // Populate Top 3 and Bottom 3 Products
            const topProductsList = document.getElementById('top-products-list');
            const bottomProductsList = document.getElementById('bottom-products-list');
            
            if (topProductsList && bottomProductsList) {
                topProductsList.innerHTML = '';
                bottomProductsList.innerHTML = '';

                const top3 = sortedSKUs.slice(0, 3);
                const bottom3 = sortedSKUs.slice(-3).reverse();

                top3.forEach((item, idx) => {
                    const pct = (item['Production'] / totalProd) * 100;
                    const type = item['Product Type'];
                    const shortType = getNormalizedProductType(type);
                    
                    const itemHTML = `
                        <div class="product-performer-row">
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-family: var(--font-display); font-weight: 600; font-size: 13px; color: #ffffff;">
                                    <span style="color: var(--text-muted); font-size: 11px; margin-right: 6px;">#${idx + 1}</span>${item['Product']}
                                </span>
                                <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px;">${shortType}</span>
                            </div>
                            <div class="param-value-badge" style="background: rgba(0, 255, 102, 0.08); border-color: rgba(0, 255, 102, 0.2); color: var(--color-secondary); font-size: 13px; padding: 4px 10px; min-width: auto; font-weight: 600;">
                                ${item['Production'].toLocaleString(undefined, {maximumFractionDigits: 0})} kg
                                <span style="font-size: 10px; color: var(--text-muted); font-weight: 400; margin-left: 4px;">(${pct.toFixed(1)}%)</span>
                            </div>
                        </div>
                    `;
                    topProductsList.insertAdjacentHTML('beforeend', itemHTML);
                });

                bottom3.forEach((item, idx) => {
                    const rank = sortedSKUs.length - idx;
                    const pct = (item['Production'] / totalProd) * 100;
                    const type = item['Product Type'];
                    const shortType = getNormalizedProductType(type);
                    
                    const itemHTML = `
                        <div class="product-performer-row">
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-family: var(--font-display); font-weight: 600; font-size: 13px; color: #ffffff;">
                                    <span style="color: var(--text-muted); font-size: 11px; margin-right: 6px;">#${rank}</span>${item['Product']}
                                </span>
                                <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px;">${shortType}</span>
                            </div>
                            <div class="param-value-badge" style="background: rgba(255, 87, 34, 0.08); border-color: rgba(255, 87, 34, 0.2); color: #ff5722; font-size: 13px; padding: 4px 10px; min-width: auto; font-weight: 600;">
                                ${item['Production'].toLocaleString(undefined, {maximumFractionDigits: 0})} kg
                                <span style="font-size: 10px; color: var(--text-muted); font-weight: 400; margin-left: 4px;">(${pct.toFixed(1)}%)</span>
                            </div>
                        </div>
                    `;
                    bottomProductsList.insertAdjacentHTML('beforeend', itemHTML);
                });
            }

            // Render Product Type Allocation Chart
            const typeLabels = Object.keys(typeSums);
            const typeData = Object.values(typeSums);

            const productTypeCtx = document.getElementById('productTypeChart').getContext('2d');
            if (productTypeChart) productTypeChart.destroy();
            const productsCompact = document.body.classList.contains('dashboard-fit-view');
            productTypeChart = new Chart(productTypeCtx, {
                type: 'polarArea',
                data: {
                    labels: typeLabels,
                    datasets: [{
                        kpiKey: 'kg',
                        data: typeData,
                        backgroundColor: [
                            'rgba(0, 229, 255, 0.7)',
                            'rgba(0, 255, 102, 0.7)',
                            'rgba(255, 176, 0, 0.7)',
                            'rgba(255, 59, 48, 0.7)',
                            'rgba(168, 85, 247, 0.7)'
                        ],
                        borderColor: 'rgba(255, 255, 255, 0.08)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: productsCompact ? 2 : 8 },
                    plugins: {
                        legend: {
                            display: !productsCompact,
                            position: 'bottom',
                            labels: { boxWidth: 10, padding: 8, color: '#f0f3ff', font: { size: 10, weight: '600' } }
                        },
                        datalabels: {
                            display: true,
                            color: '#fff',
                            font: { size: productsCompact ? 8 : 9, weight: '700' },
                            formatter: (v, ctx) => {
                                const sum = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1;
                                if (!v || (v / sum) < 0.04) return '';
                                return [`${Math.round(v).toLocaleString()}`, `${((v / sum) * 100).toFixed(0)}%`];
                            }
                        }
                    },
                    scales: {
                        r: {
                            grid: { color: 'rgba(255, 255, 255, 0.03)' },
                            angleLines: { color: 'rgba(255, 255, 255, 0.03)' },
                            ticks: { display: false }
                        }
                    }
                }
            });
            setTimeout(() => {
                if (productTypeChart) productTypeChart.resize();
            }, 320);
        }

        function updateSkuTrendsTab(data, year, month) {
            const contentCard = document.getElementById('skutrends-content');
            if (productDataRaw.length === 0) {
                contentCard.innerHTML = createEmptyState("No Data Available", "Raw product production data is empty.");
                return;
            }

            // Save scroll positions to prevent reset on rebuild
            const growingBody = document.getElementById('growing-ledger-body');
            const decliningBody = document.getElementById('declining-ledger-body');
            const growingScroll = growingBody ? growingBody.scrollTop : 0;
            const decliningScroll = decliningBody ? decliningBody.scrollTop : 0;

            // 1. Determine end month and 5-month window based on filters
            let endYear = year;
            let endMonth = month;
            if (endYear === 'All' || endMonth === 'All') {
                const matchingDates = productDataRaw
                    .map(item => item.Dates)
                    .filter(dStr => {
                        const info = parseYearMonth(dStr);
                        const matchY = year === 'All' || info.year === year;
                        const matchM = month === 'All' || info.month === month;
                        return matchY && matchM;
                    });

                let latestDate = "";
                if (matchingDates.length > 0) {
                    latestDate = matchingDates.reduce((latest, d) => {
                        return (!latest || new Date(d) > new Date(latest)) ? d : latest;
                    }, "");
                } else {
                    latestDate = productDataRaw.reduce((latest, item) => {
                        return (!latest || new Date(item.Dates) > new Date(latest)) ? item.Dates : latest;
                    }, "");
                }

                if (latestDate) {
                    endYear = latestDate.slice(0, 4);
                    endMonth = latestDate.slice(5, 7);
                } else {
                    endYear = "2026";
                    endMonth = "05";
                }
            }
            const endMonthStr = `${endYear}-${endMonth}`;

            function getLast5Months(endMonthStr) {
                const parts = endMonthStr.split('-');
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10);
                const list = [];
                for (let i = 4; i >= 0; i--) {
                    const d = new Date(y, m - 1 - i, 15);
                    const yr = d.getFullYear();
                    const mn = d.getMonth() + 1;
                    const mnStr = mn < 10 ? '0' + mn : mn.toString();
                    list.push(`${yr}-${mnStr}`);
                }
                return list;
            }
            const trendMonthList = getLast5Months(endMonthStr);

            // 2. Identify all unique SKUs active in the last 5 months
            const skusInWindow = new Set();
            productDataRaw.forEach(d => {
                const m = d.Dates.slice(0, 7);
                if (trendMonthList.includes(m)) {
                    skusInWindow.add(d.Product);
                }
            });

            // 3. For each SKU, calculate 5-month production values and regression trend
            const skuTrends = [];
            skusInWindow.forEach(skuName => {
                const sample = productDataRaw.find(d => d.Product === skuName);
                const category = sample ? sample['Product Type'] : 'Unknown';

                const values = trendMonthList.map(m => {
                    const records = productDataRaw.filter(d => d.Product === skuName && d.Dates.slice(0, 7) === m);
                    return records.reduce((sum, r) => sum + (r.Production || 0), 0);
                });

                const sumY = values.reduce((a, b) => a + b, 0);
                if (sumY === 0) return; // Skip completely inactive

                const sumXY = values[0]*0 + values[1]*1 + values[2]*2 + values[3]*3 + values[4]*4;
                const slope = (sumXY - 2 * sumY) / 10;
                
                const avg = sumY / 5;
                const pct = avg > 0 ? (slope / avg) * 100 : 0;

                // Total Change: from first non-zero to last month
                let firstValIdx = -1;
                for (let i = 0; i < 5; i++) {
                    if (values[i] > 0) {
                        firstValIdx = i;
                        break;
                    }
                }
                let totalChange = 0;
                if (firstValIdx !== -1 && firstValIdx < 4) {
                    const startVal = values[firstValIdx];
                    const endVal = values[4];
                    totalChange = ((endVal - startVal) / startVal) * 100;
                } else if (firstValIdx === 4) {
                    totalChange = 100;
                }

                let direction = 'Stable';
                let colorClass = 'text-muted';
                let icon = '➡️';
                let color = 'var(--text-muted)';

                if (slope > 0.1) {
                    direction = 'Growing';
                    colorClass = 'green';
                    icon = '📈';
                    color = 'var(--color-secondary)';
                } else if (slope < -0.1) {
                    direction = 'Declining';
                    colorClass = 'red';
                    icon = '📉';
                    color = 'var(--color-error)';
                }

                skuTrends.push({
                    Product: skuName,
                    Category: category,
                    values: values,
                    sumY: sumY,
                    slope: slope,
                    pct: pct,
                    totalChange: totalChange,
                    direction: direction,
                    colorClass: colorClass,
                    icon: icon,
                    color: color
                });
            });

            // 4. Separate into growing and declining lists
            const growingSkus = skuTrends.filter(s => s.direction === 'Growing').sort((a, b) => b.slope - a.slope);
            const decliningSkus = skuTrends.filter(s => s.direction === 'Declining').sort((a, b) => a.slope - b.slope);

            // Find Max Growth and Max Decline
            const sortedByGrowthPct = [...skuTrends].sort((a, b) => b.totalChange - a.totalChange);
            const maxGrowthSku = sortedByGrowthPct[0] && sortedByGrowthPct[0].totalChange > 0 ? sortedByGrowthPct[0] : null;
            
            const sortedByDeclinePct = [...skuTrends].sort((a, b) => a.totalChange - b.totalChange);
            const maxDeclineSku = sortedByDeclinePct[0] && sortedByDeclinePct[0].totalChange < 0 ? sortedByDeclinePct[0] : null;

            // Render Layout HTML inside content area if it's not already there
            contentCard.innerHTML = `
                <div class="metrics-row" style="grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 8px;">
                    <div class="metric-card">
                        <div class="metric-label">Growing Products</div>
                        <div class="metric-val green" id="m7-growing-count">${growingSkus.length}</div>
                        <div class="metric-subtext">Positive production slope</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Declining Products</div>
                        <div class="metric-val red" id="m7-declining-count">${decliningSkus.length}</div>
                        <div class="metric-subtext">Negative production slope</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Max Growth Product</div>
                        <div class="metric-val green" style="font-size: 14px; line-height: 1.25; word-break: break-all;" id="m7-max-growth-sku">${maxGrowthSku ? maxGrowthSku.Product : '-'}</div>
                        <div class="metric-subtext" id="m7-max-growth-val">${maxGrowthSku ? '+' + maxGrowthSku.totalChange.toFixed(1) + '%' : '0%'} over 5m</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Max Decline Product</div>
                        <div class="metric-val red" style="font-size: 14px; line-height: 1.25; word-break: break-all;" id="m7-max-decline-sku">${maxDeclineSku ? maxDeclineSku.Product : '-'}</div>
                        <div class="metric-subtext" id="m7-max-decline-val">${maxDeclineSku ? maxDeclineSku.totalChange.toFixed(1) + '%' : '0%'} over 5m</div>
                    </div>
                </div>

                <div class="panel-layout equal sku-trends-ledgers">
                    <!-- Growing Products Ledger -->
                    <div class="panel-card" style="min-height: 0; flex: 1; display: flex; flex-direction: column;">
                        <div class="panel-title" id="growing-ledger-title" style="color: var(--color-secondary); font-family: var(--font-display); font-size: 12px; font-weight: 700; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                            <!-- Dynamic Title: RISING PRODUCTS (count) -->
                        </div>
                        <div class="cards-wrapper" id="growing-ledger-body" style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 4px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; margin-top: 8px; align-content: start;">
                            <!-- Injected Dynamic Cards -->
                        </div>
                    </div>

                    <!-- Declining Products Ledger -->
                    <div class="panel-card" style="min-height: 0; flex: 1; display: flex; flex-direction: column;">
                        <div class="panel-title" id="declining-ledger-title" style="color: var(--color-error); font-family: var(--font-display); font-size: 12px; font-weight: 700; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                            <!-- Dynamic Title: DECLINING PRODUCTS (count) -->
                        </div>
                        <div class="cards-wrapper" id="declining-ledger-body" style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 4px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; margin-top: 8px; align-content: start;">
                            <!-- Injected Dynamic Cards -->
                        </div>
                    </div>
                </div>
            `;

            // 5. Populate SKU Trend Cards
            const renderTrendCards = (containerId, list, isDecline = false) => {
                const container = document.getElementById(containerId);
                if (!container) return;
                container.innerHTML = '';
                if (list.length === 0) {
                    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">No products in this category</div>`;
                    return;
                }

                const formatShortVal = (v) => {
                    if (!v || v === 0) return '-';
                    if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.0', '') + 'M';
                    if (v >= 1000) return (v / 1000).toFixed(0) + 'k';
                    return Math.round(v).toString();
                };

                list.forEach(item => {
                    const monthsCount = trendMonthList.length;
                    const maxVal = Math.max(...item.values, 0.0001);
                    const avgVal = item.values.reduce((sum, v) => sum + v, 0) / monthsCount;

                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const formattedMonths = trendMonthList.map(mStr => {
                        const parts = mStr.split('-');
                        const m = parseInt(parts[1], 10);
                        return monthNames[m - 1];
                    });

                    const barsHTML = item.values.map((val, idx) => {
                        const pct = (val / maxVal) * 100;
                        const shortVal = formatShortVal(val);
                        const displayVal = val > 0
                            ? Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' kg'
                            : '0 kg';
                        return `
                            <div class="trend-card-col" title="${item.Product} - ${formattedMonths[idx]}: ${displayVal}">
                                <span class="trend-card-val">${shortVal}</span>
                                <div style="flex: 1; min-height: 0; display: flex; align-items: flex-end; justify-content: center; width: 100%;">
                                    <div class="trend-card-bar-shape ${isDecline ? 'decline' : ''}" style="height: ${Math.max(pct, 2)}%;"></div>
                                </div>
                                <span class="trend-card-label">${formattedMonths[idx]}</span>
                            </div>
                        `;
                    }).join('');

                    const percentageText = `${item.totalChange >= 0 ? '+' : ''}${item.totalChange.toFixed(1)}%`;
                    const badgeColor = isDecline ? 'var(--color-error)' : 'var(--color-secondary)';
                    const slopeTons = item.slope / 1000;
                    const slopeTonsText = `${slopeTons >= 0 ? '▲ ' : '▼ '}${Math.abs(slopeTons).toFixed(2)} t/mo`;

                    const cardHTML = `
                        <div class="trend-card ${isDecline ? 'decline' : ''}">
                            <div class="trend-card-header">
                                <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
                                    <span class="trend-card-sku">${item.Product}</span>
                                </div>
                                <div style="text-align: right; flex-shrink: 0;">
                                    <div class="trend-card-pct" style="color: ${badgeColor};">${percentageText}</div>
                                    <div class="trend-card-subtitle" style="color: ${badgeColor}; font-weight: 600;">${slopeTonsText}</div>
                                </div>
                            </div>
                            <div class="trend-card-bars">
                                ${barsHTML}
                            </div>
                            <div class="trend-card-footer">
                                <span class="trend-card-avg-label">Avg</span>
                                <span class="trend-card-avg-val">${(avgVal / 1000).toFixed(1)} t</span>
                            </div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', cardHTML);
                });
            };

            // Set section titles with counts
            const growingTitle = document.getElementById('growing-ledger-title');
            if (growingTitle) {
                growingTitle.innerHTML = `<span style="font-size: 13px; margin-right: 4px;">📈</span> RISING PRODUCTS (${growingSkus.length})`;
            }
            const decliningTitle = document.getElementById('declining-ledger-title');
            if (decliningTitle) {
                decliningTitle.innerHTML = `<span style="font-size: 13px; margin-right: 4px;">📉</span> DECLINING PRODUCTS (${decliningSkus.length})`;
            }

            renderTrendCards('growing-ledger-body', growingSkus, false);
            renderTrendCards('declining-ledger-body', decliningSkus, true);

            if (activeTrendChart) {
                activeTrendChart.destroy();
                activeTrendChart = null;
            }

            // Restore scroll positions after rebuild
            const newGrowingBody = document.getElementById('growing-ledger-body');
            const newDecliningBody = document.getElementById('declining-ledger-body');
            if (newGrowingBody) newGrowingBody.scrollTop = growingScroll;
            if (newDecliningBody) newDecliningBody.scrollTop = decliningScroll;
        }

        window.filterProductCards = function(query) {
            const searchQuery = query.toLowerCase().trim();
            const clearBtn = document.getElementById('product-search-clear');
            if (clearBtn) {
                clearBtn.style.display = searchQuery ? 'inline-block' : 'none';
            }
            const cards = document.querySelectorAll('.trend-card');
            cards.forEach(card => {
                const skuName = card.querySelector('.trend-card-sku').textContent.toLowerCase();
                const match = skuName.includes(searchQuery);
                card.style.display = match ? 'flex' : 'none';
            });
        };

        window.clearProductSearch = function() {
            const input = document.getElementById('product-search-input');
            if (input) {
                input.value = "";
                filterProductCards("");
            }
        };

        // ==========================================
        // 4. RECYCLING TAB
        // ==========================================
        const initialEremaContentHTML = document.getElementById('erema-content').innerHTML;
        function updateEremaTab(data, year, month) {
            const contentCard = document.getElementById('erema-content');
            if (data.length === 0) {
                document.getElementById('m4-prod').textContent = "0.00 kg";
                contentCard.innerHTML = createEmptyState("No Recycling Yield", "No recycling monthly yield logs match the selected filter.");
                return;
            }

            contentCard.innerHTML = initialEremaContentHTML;

            // KPIs
            const totalRecycled = data.reduce((sum, item) => sum + (item['Production'] || 0), 0);

            document.getElementById('m4-prod').textContent = `${totalRecycled.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg`;

            // Render table register
            const tableBody = document.getElementById('erema-ledger-body');
            tableBody.innerHTML = '';

            data.forEach(item => {
                const yieldVal = item['Production'] || 0;
                const info = parseYearMonth(item['Dates']);
                const formattedDate = `${monthNames[info.monthNum - 1]} ${info.year}`;

                const rowHTML = `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${yieldVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg</td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', rowHTML);
            });

            // Render Erema Throughput Chart — highlight highest & lowest months
            const chartLabels = data.map(item => {
                const info = parseYearMonth(item['Dates']);
                return `${monthNames[info.monthNum - 1].slice(0, 3)} ${info.year.slice(2)}`;
            });
            const yields = data.map(item => item['Production'] || 0);
            const maxYield = yields.length ? Math.max(...yields) : 0;
            const minYield = yields.length ? Math.min(...yields) : 0;
            const eremaBg = yields.map(v => {
                if (v === maxYield && maxYield !== minYield) return 'rgba(0, 229, 255, 0.9)';
                if (v === minYield && maxYield !== minYield) return 'rgba(255, 82, 82, 0.85)';
                return 'rgba(57, 255, 20, 0.7)';
            });
            const eremaBorder = yields.map(v => {
                if (v === maxYield && maxYield !== minYield) return '#00e5ff';
                if (v === minYield && maxYield !== minYield) return '#ff5252';
                return '#39ff14';
            });

            const eremaCtx = document.getElementById('eremaChart').getContext('2d');
            if (eremaChart) eremaChart.destroy();
            eremaChart = new Chart(eremaCtx, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        kpiKey: 'erema',
                        data: yields,
                        backgroundColor: eremaBg,
                        borderColor: eremaBorder,
                        borderWidth: 1.5,
                        hoverBackgroundColor: eremaBg.map(c => c.replace(/0\.\d+\)/, '1)')),
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                afterLabel: (ctx) => {
                                    const v = ctx.parsed.y;
                                    if (v === maxYield && maxYield !== minYield) return 'Highest month';
                                    if (v === minYield && maxYield !== minYield) return 'Lowest month';
                                    return '';
                                }
                            }
                        },
                        datalabels: {
                            display: true,
                            anchor: 'end',
                            align: 'top',
                            color: (ctx) => {
                                const v = ctx.dataset.data[ctx.dataIndex];
                                if (v === maxYield && maxYield !== minYield) return '#00e5ff';
                                if (v === minYield && maxYield !== minYield) return '#ff8a80';
                                return '#39ff14';
                            },
                            font: { size: 9, weight: '700' },
                            formatter: (v, ctx) => {
                                if (!v) return '';
                                const tag = (v === maxYield && maxYield !== minYield) ? ' HIGH'
                                    : (v === minYield && maxYield !== minYield) ? ' LOW' : '';
                                return Math.round(v).toLocaleString() + ' kg' + tag;
                            }
                        }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255, 255, 255, 0.03)' } },
                        y: { grid: { color: 'rgba(255, 255, 255, 0.03)' } }
                    }
                }
            });
        }

        // ==========================================
        // 4.7. DISPATCH TAB
        // ==========================================
        const initialDispatchContentHTML = document.getElementById('dispatch-content')
            ? document.getElementById('dispatch-content').innerHTML
            : '';

        function formatDispatchTons(v) {
            const n = Number(v) || 0;
            return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t`;
        }

        function updateDispatchTab(data, year, month) {
            const contentCard = document.getElementById('dispatch-content');
            if (!contentCard) return;

            const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

            if (!data || data.length === 0) {
                const zero = formatDispatchTons(0);
                setTxt('dispatch-kpi-total', zero);
                setTxt('dispatch-kpi-export', zero);
                setTxt('dispatch-kpi-local', zero);
                setTxt('dispatch-kpi-q2', zero);
                setTxt('dispatch-kpi-export-sub', 'Share of total');
                setTxt('dispatch-kpi-local-sub', 'Share of total');
                ['dispatch-kpi-total-progress', 'dispatch-kpi-export-progress', 'dispatch-kpi-local-progress', 'dispatch-kpi-q2-progress'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.width = '0%';
                });
                contentCard.innerHTML = createEmptyState("No Dispatch Data", "No monthly dispatch logs match the selected filter.");
                return;
            }

            contentCard.innerHTML = initialDispatchContentHTML;

            const total = data.reduce((sum, r) => sum + (Number(r['Total']) || 0), 0);
            const exportTotal = data.reduce((sum, r) => sum + (Number(r['Export']) || 0), 0);
            const localTotal = data.reduce((sum, r) => sum + (Number(r['Local']) || 0), 0);
            const q2Total = data.reduce((sum, r) => sum + (Number(r['Q2 Dispatched']) || 0), 0);
            const exportShare = total > 0 ? (exportTotal / total) * 100 : 0;
            const localShare = total > 0 ? (localTotal / total) * 100 : 0;

            setTxt('dispatch-kpi-total', formatDispatchTons(total));
            setTxt('dispatch-kpi-export', formatDispatchTons(exportTotal));
            setTxt('dispatch-kpi-local', formatDispatchTons(localTotal));
            setTxt('dispatch-kpi-q2', formatDispatchTons(q2Total));
            setTxt('dispatch-kpi-export-sub', `${exportShare.toFixed(1)}% of total`);
            setTxt('dispatch-kpi-local-sub', `${localShare.toFixed(1)}% of total`);

            const setBar = (id, pct) => {
                const el = document.getElementById(id);
                if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
            };
            setBar('dispatch-kpi-total-progress', 100);
            setBar('dispatch-kpi-export-progress', exportShare);
            setBar('dispatch-kpi-local-progress', localShare);
            setBar('dispatch-kpi-q2-progress', total > 0 ? Math.min(100, (q2Total / total) * 100 * 20) : 0);

            const chartLabels = data.map(item => {
                const info = parseYearMonth(item['Dates']);
                return `${monthNames[info.monthNum - 1].slice(0, 3)} ${info.year.slice(2)}`;
            });
            const exportSeries = data.map(r => Number(r['Export']) || 0);
            const localSeries = data.map(r => Number(r['Local']) || 0);
            const q2Series = data.map(r => Number(r['Q2 Dispatched']) || 0);
            const totalSeries = data.map(r => Number(r['Total']) || ((Number(r['Export']) || 0) + (Number(r['Local']) || 0)));
            const maxTotal = totalSeries.length ? Math.max(...totalSeries) : 0;
            const isPeakIdx = (i) => maxTotal > 0 && totalSeries[i] === maxTotal
                && totalSeries.filter(v => v === maxTotal).length < totalSeries.length;

            const exportColors = exportSeries.map((_, i) => isPeakIdx(i) ? 'rgba(255, 214, 10, 0.88)' : 'rgba(41, 121, 255, 0.75)');
            const exportBorders = exportSeries.map((_, i) => isPeakIdx(i) ? '#ffd60a' : '#2979ff');
            const localColors = localSeries.map((_, i) => isPeakIdx(i) ? 'rgba(255, 196, 0, 0.72)' : 'rgba(57, 255, 20, 0.65)');
            const localBorders = localSeries.map((_, i) => isPeakIdx(i) ? '#ffc400' : '#39ff14');

            const chartCanvas = document.getElementById('dispatchChart');
            if (!chartCanvas) return;
            const dispatchCtx = chartCanvas.getContext('2d');
            if (dispatchChart) dispatchChart.destroy();
            dispatchChart = new Chart(dispatchCtx, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [
                        {
                            label: 'Export',
                            kpiKey: 'dispatch',
                            data: exportSeries,
                            backgroundColor: exportColors,
                            borderColor: exportBorders,
                            borderWidth: 1.5,
                            borderRadius: 4,
                            stack: 'dispatch',
                            order: 2
                        },
                        {
                            label: 'Local',
                            kpiKey: 'dispatch',
                            data: localSeries,
                            backgroundColor: localColors,
                            borderColor: localBorders,
                            borderWidth: 1.5,
                            borderRadius: 4,
                            stack: 'dispatch',
                            order: 2
                        },
                        {
                            type: 'line',
                            label: 'Q2 Dispatched',
                            kpiKey: 'dispatch',
                            data: q2Series,
                            borderColor: '#ffc107',
                            backgroundColor: 'rgba(255, 193, 7, 0.15)',
                            borderWidth: 2.5,
                            pointRadius: q2Series.map((_, i) => isPeakIdx(i) ? 6 : 4),
                            pointHoverRadius: 6,
                            pointBackgroundColor: q2Series.map((_, i) => isPeakIdx(i) ? '#ffd60a' : '#ffc107'),
                            tension: 0.25,
                            yAxisID: 'y1',
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            align: 'end',
                            labels: { color: 'rgba(255,255,255,0.75)', boxWidth: 12, font: { size: 11 }, padding: 12 }
                        },
                        tooltip: {
                            callbacks: {
                                footer: (items) => {
                                    const idx = items[0]?.dataIndex ?? 0;
                                    const exportVal = items.find(i => i.dataset.label === 'Export')?.parsed?.y || 0;
                                    const localVal = items.find(i => i.dataset.label === 'Local')?.parsed?.y || 0;
                                    const peakTag = isPeakIdx(idx) ? ' · ★ Peak month' : '';
                                    return `Total: ${(exportVal + localVal).toLocaleString(undefined, { maximumFractionDigits: 2 })} t${peakTag}`;
                                }
                            }
                        },
                        datalabels: {
                            display: (ctx) => ctx.dataset.type !== 'line' && ctx.dataset.data[ctx.dataIndex] > 0,
                            color: (ctx) => isPeakIdx(ctx.dataIndex) ? '#1a1500' : '#fff',
                            font: (ctx) => ({ size: isPeakIdx(ctx.dataIndex) ? 10 : 9, weight: '700' }),
                            formatter: (v, ctx) => {
                                if (!v) return '';
                                const tag = (ctx.dataset.label === 'Local' && isPeakIdx(ctx.dataIndex)) ? ' ★' : '';
                                return Math.round(v).toLocaleString() + tag;
                            }
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                            grid: { color: 'rgba(255, 255, 255, 0.03)' },
                            ticks: { color: 'rgba(255,255,255,0.55)', font: { size: 11 } }
                        },
                        y: {
                            stacked: true,
                            position: 'left',
                            title: { display: true, text: 'Export / Local (t)', color: 'rgba(255,255,255,0.45)', font: { size: 11 } },
                            grid: { color: 'rgba(255, 255, 255, 0.04)' },
                            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } }
                        },
                        y1: {
                            position: 'right',
                            title: { display: true, text: 'Q2 (t)', color: 'rgba(255,193,7,0.75)', font: { size: 11 } },
                            grid: { drawOnChartArea: false },
                            beginAtZero: true,
                            ticks: { color: 'rgba(255,193,7,0.65)', font: { size: 10 } }
                        }
                    }
                }
            });
        }

        // ==========================================
        // 5. COMPARISON TAB
        // ==========================================
        window.comparisonPeriodPreset = window.comparisonPeriodPreset || 'selected';

        function setComparisonPeriodPreset(preset) {
            window.comparisonPeriodPreset = preset || 'selected';
            document.querySelectorAll('#comp-period-presets .comp-preset-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-preset') === window.comparisonPeriodPreset);
            });
            updateDashboard();
        }

        function getComparisonChartData(filteredData, year, month) {
            const preset = window.comparisonPeriodPreset || 'selected';
            const allWithData = (mainDataRaw || [])
                .filter(item => item['Prod. (Tons)'] !== null && item['Prod. (Tons)'] !== undefined)
                .sort((a, b) => new Date(a['Dates']) - new Date(b['Dates']));

            if (preset === 'selected') {
                return filteredData.slice();
            }

            if (preset === 'mom') {
                const base = filteredData.length >= 2 ? filteredData : allWithData;
                return base.slice(-2);
            }

            let targetYear = year;
            if (!targetYear || targetYear === 'All') {
                const years = [...new Set((filteredData.length ? filteredData : allWithData)
                    .map(r => parseYearMonth(r['Dates']).year)
                    .filter(Boolean))].sort();
                targetYear = years.length ? years[years.length - 1] : null;
            }
            if (!targetYear) return filteredData.slice();

            if (preset === 'ytd') {
                const yearRows = allWithData.filter(r => parseYearMonth(r['Dates']).year === targetYear);
                if (month && month !== 'All') {
                    const monthNum = parseInt(month, 10);
                    return yearRows.filter(r => parseYearMonth(r['Dates']).monthNum <= monthNum);
                }
                return yearRows;
            }

            if (preset === 'yoy') {
                const priorYear = String(Number(targetYear) - 1);
                let monthsWanted = new Set(
                    (filteredData.length
                        ? filteredData
                        : allWithData.filter(r => parseYearMonth(r['Dates']).year === targetYear)
                    ).map(r => parseYearMonth(r['Dates']).monthNum)
                );
                if (month && month !== 'All') {
                    monthsWanted = new Set([parseInt(month, 10)]);
                }
                return allWithData.filter(r => {
                    const info = parseYearMonth(r['Dates']);
                    return (info.year === targetYear || info.year === priorYear) && monthsWanted.has(info.monthNum);
                });
            }

            return filteredData.slice();
        }

        function toggleExportMenu(event) {
            if (event) event.stopPropagation();
            const menu = document.getElementById('export-menu');
            if (!menu) return;
            menu.classList.toggle('open');
        }

        function getExportTargetElement() {
            if (document.body.classList.contains('presentation-mode')) {
                const slide = document.querySelector('.presentation-slide.is-active, .presentation-slide.active, .tab-panel.presentation-active, .tab-panel.active');
                if (slide) return slide;
            }
            return document.querySelector('.tab-panel.active') || document.querySelector('.content-body');
        }

        function prepareExportClone(doc) {
            // Google Fonts / remote CSS taint file:// captures — strip them in the clone only
            doc.querySelectorAll(
                'link[href*="fonts.googleapis"], link[href*="fonts.gstatic"], link[rel="preconnect"]'
            ).forEach((el) => el.remove());
            const style = doc.createElement('style');
            style.textContent = `
                * {
                    font-family: "Segoe UI", Tahoma, Arial, sans-serif !important;
                    text-shadow: none !important;
                }
                .export-menu { display: none !important; }
            `;
            doc.head.appendChild(style);
        }

        async function captureExportCanvas(target) {
            const scale = Math.min(1.75, window.devicePixelRatio || 1.25);
            const attempts = [
                {
                    backgroundColor: '#0a0e16',
                    scale,
                    logging: false,
                    useCORS: true,
                    allowTaint: false,
                    imageTimeout: 1500,
                    removeContainer: true,
                    foreignObjectRendering: false,
                    onclone: prepareExportClone
                },
                {
                    backgroundColor: '#0a0e16',
                    scale: 1.25,
                    logging: false,
                    useCORS: true,
                    allowTaint: false,
                    imageTimeout: 1500,
                    removeContainer: true,
                    foreignObjectRendering: true,
                    onclone: prepareExportClone
                },
                {
                    backgroundColor: '#0a0e16',
                    scale: 1,
                    logging: false,
                    useCORS: false,
                    allowTaint: false,
                    imageTimeout: 1000,
                    removeContainer: true,
                    foreignObjectRendering: false,
                    ignoreElements: (el) => el && (el.tagName === 'LINK' || el.classList?.contains('export-menu')),
                    onclone: prepareExportClone
                }
            ];

            let lastErr = null;
            for (const opts of attempts) {
                try {
                    const canvas = await html2canvas(target, opts);
                    // Prove the canvas is exportable (untainted)
                    canvas.toDataURL('image/png');
                    return canvas;
                } catch (err) {
                    lastErr = err;
                    console.warn('Export capture attempt failed:', err);
                }
            }
            throw lastErr || new Error('Capture failed');
        }

        async function exportDashboardView(format) {
            const menu = document.getElementById('export-menu');
            if (menu) menu.classList.remove('open');
            const target = getExportTargetElement();
            if (!target) {
                alert('Nothing to export.');
                return;
            }
            if (typeof html2canvas !== 'function') {
                alert('Export library failed to load. Check your network connection, or open via Open Dashboard.bat.');
                return;
            }
            try {
                const canvas = await captureExportCanvas(target);
                const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
                const baseName = `petpak-${activeTab || 'view'}-${stamp}`;
                if (format === 'png') {
                    const link = document.createElement('a');
                    link.download = `${baseName}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    return;
                }
                const jsPdfNS = window.jspdf;
                if (!jsPdfNS || !jsPdfNS.jsPDF) {
                    alert('PDF library failed to load. Check your network connection.');
                    return;
                }
                const { jsPDF } = jsPdfNS;
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
                    unit: 'pt',
                    format: 'a4'
                });
                const pageW = pdf.internal.pageSize.getWidth();
                const pageH = pdf.internal.pageSize.getHeight();
                const margin = 18;
                const usableW = pageW - margin * 2;
                const usableH = pageH - margin * 2;
                const ratio = Math.min(usableW / canvas.width, usableH / canvas.height);
                const drawW = canvas.width * ratio;
                const drawH = canvas.height * ratio;
                const widthFit = usableW / canvas.width;
                const scaledH = canvas.height * widthFit;
                if (scaledH <= usableH) {
                    pdf.addImage(imgData, 'PNG', margin + (usableW - drawW) / 2, margin, drawW, drawH);
                } else {
                    const sliceCanvas = document.createElement('canvas');
                    const sliceCtx = sliceCanvas.getContext('2d');
                    const pageSlicePx = Math.floor(usableH / widthFit);
                    let y = 0;
                    let page = 0;
                    while (y < canvas.height) {
                        const h = Math.min(pageSlicePx, canvas.height - y);
                        sliceCanvas.width = canvas.width;
                        sliceCanvas.height = h;
                        sliceCtx.clearRect(0, 0, canvas.width, h);
                        sliceCtx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
                        if (page > 0) pdf.addPage();
                        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, usableW, h * widthFit);
                        y += h;
                        page += 1;
                    }
                }
                pdf.save(`${baseName}.pdf`);
            } catch (err) {
                console.error(err);
                const isFile = String(location.protocol).startsWith('file');
                alert(
                    isFile
                        ? 'Export failed in file mode.\n\nUse Open Dashboard.bat (local server), then try Export again.\nOr open the live site and export from there.'
                        : 'Export failed. Refresh the page and try again.'
                );
            }
        }

        document.addEventListener('click', () => {
            const menu = document.getElementById('export-menu');
            if (menu) menu.classList.remove('open');
        });

        function updateComparisonTab(data, year, month) {
            if (activeTab !== 'comparison') return;

            data = getComparisonChartData(data, year, month);

            if (data.length === 0) {
                if (kpiComparisonChart) kpiComparisonChart.destroy();
                kpiComparisonChart = null;
                if (downtimeComparisonChart) downtimeComparisonChart.destroy();
                downtimeComparisonChart = null;
                return;
            }

            // 1. General KPI Comparison Chart
            const checkedBoxes = Array.from(document.querySelectorAll('#kpi-comparison-checkboxes input[type="checkbox"]:checked'));
            const allBoxes = document.querySelectorAll('#kpi-comparison-checkboxes input[type="checkbox"]');
            
            // Enforce limit of 8 selected KPIs
            const maxAllowed = 8;
            if (checkedBoxes.length > maxAllowed) {
                checkedBoxes.slice(maxAllowed).forEach(cb => {
                    cb.checked = false;
                });
                checkedBoxes.splice(maxAllowed);
            }

            // Update badge count
            const countBadge = document.getElementById('comp-kpis-count-badge');
            if (countBadge) {
                countBadge.textContent = `${checkedBoxes.length} Selected (Max 8)`;
            }

            // Disable other checkboxes if limit reached
            allBoxes.forEach(cb => {
                if (checkedBoxes.length >= maxAllowed) {
                    if (!cb.checked) cb.disabled = true;
                } else {
                    cb.disabled = false;
                }
            });

            const labels = data.map(item => {
                const info = parseYearMonth(item['Dates']);
                return `${monthNames[info.monthNum - 1].slice(0, 3)} ${info.year.slice(2)}`;
            });

            if (checkedBoxes.length === 0) {
                if (kpiComparisonChart) kpiComparisonChart.destroy();
                kpiComparisonChart = null;
            } else {
                const chartType = document.getElementById('compChartType').value;

                const rowValueMap = {
                    prod: { label: 'Production (Tons)', val: r => r['Prod. (Tons)'] || 0, color: '#00e5ff' },
                    oee: { label: 'Avg OEE %', val: r => r['OEE %'] || 0, color: '#00ff66' },
                    days: { label: 'Running Days', val: r => r['Running Days'] || 0, color: '#dee2f6' },
                    accidents: { label: 'Accidents', val: r => r['No of Accident'] || 0, color: '#ef4444' },
                    waste: { label: 'Material Waste (Tons)', val: r => r['Waste ( Tons)'] || 0, color: '#f43f5e' },
                    waste_pct: { label: 'Avg Waste %', val: r => r['Waste %'] || 0, color: '#ff7300' },
                    downtime: { label: 'Total Downtime (hrs)', val: r => r['Total Down Time ( hrs.)'] || 0, color: '#ffb000' },
                    breaks: { label: 'Line Breaks', val: r => r['#of Breaks/Stoppages'] || 0, color: '#a855f7' },
                    stoppages: { label: 'Stoppages/Day', val: r => r['Avg. Stoppage/day'] || 0, color: '#009688' },
                    recovery: { label: 'Recovery Time (m)', val: r => r['Line Recovery Time(Mint)'] || 0, color: '#3f51b5' },
                    grades: { label: 'Grade Changes', val: r => r['Grade Changes'] || 0, color: '#ec4899' },
                    microns: { label: 'Micron Changes', val: r => r['Micron Changes'] || 0, color: '#d946ef' }
                };

                const volumeKeys = ['prod', 'waste'];
                const durationKeys = ['downtime', 'recovery'];

                const axisFor = (key) => {
                    if (volumeKeys.includes(key)) return 'yVol';
                    if (durationKeys.includes(key)) return 'yDur';
                    return 'yMetric';
                };

                const isBar = chartType === 'bar';
                const isArea = chartType === 'area';
                const baseChartType = isBar ? 'bar' : 'line';

                const niceScale = (vals, preferredTicks = 5) => {
                    const max = Math.max(0, ...vals.map(v => Number(v) || 0));
                    if (max <= 0) return { max: 10, step: 2 };
                    const padded = max * 1.15;
                    const rough = padded / preferredTicks;
                    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
                    const residual = rough / mag;
                    const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
                    const step = niceResidual * mag;
                    return { max: Math.ceil(padded / step) * step, step };
                };

                const volSeries = [];
                const durSeries = [];
                const metricSeries = [];

                const kpiDatasets = checkedBoxes.map(cb => {
                    const key = cb.value;
                    const config = rowValueMap[key];
                    if (!config) return null;
                    const seriesData = data.map(config.val);
                    const yAxisID = axisFor(key);
                    if (yAxisID === 'yVol') volSeries.push(...seriesData);
                    else if (yAxisID === 'yDur') durSeries.push(...seriesData);
                    else metricSeries.push(...seriesData);

                    let bgColor = isBar ? config.color + 'd8' : (isArea ? config.color + '40' : 'transparent');
                    if (isArea) {
                        bgColor = (context) => {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return config.color + '30';
                            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                            gradient.addColorStop(0, config.color + '08');
                            gradient.addColorStop(1, config.color + '55');
                            return gradient;
                        };
                    }

                    return {
                        label: config.label,
                        kpiKey: key,
                        data: seriesData,
                        type: baseChartType,
                        yAxisID,
                        borderColor: config.color,
                        backgroundColor: bgColor,
                        borderWidth: isBar ? 0 : 2.75,
                        borderRadius: isBar ? 6 : 0,
                        borderSkipped: false,
                        fill: isArea,
                        tension: 0.32,
                        pointRadius: isBar ? 0 : 3.5,
                        pointHoverRadius: isBar ? 0 : 6,
                        pointBackgroundColor: '#0a0e16',
                        pointBorderColor: config.color,
                        pointBorderWidth: 2,
                        maxBarThickness: 36,
                        minBarLength: isBar ? 4 : undefined
                    };
                }).filter(Boolean);

                const hasVol = volSeries.length > 0;
                const hasDur = durSeries.length > 0;
                const hasMetric = metricSeries.length > 0;
                const durOnRight = hasDur && !hasMetric;

                const compCtx = document.getElementById('kpiComparisonChart').getContext('2d');
                if (kpiComparisonChart) kpiComparisonChart.destroy();

                const volScale = hasVol ? niceScale(volSeries, 5) : { max: 10, step: 2 };
                const durScale = hasDur ? niceScale(durSeries, 5) : { max: 10, step: 2 };
                const metricScale = hasMetric ? niceScale(metricSeries, 5) : { max: 100, step: 20 };
                const showKpiLabels = !isBar && kpiDatasets.length <= 2;

                kpiComparisonChart = new Chart(compCtx, {
                    type: baseChartType,
                    data: {
                        labels: labels,
                        datasets: kpiDatasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        layout: {
                            padding: { top: 14, right: 10, bottom: 4, left: 4 }
                        },
                        datasets: {
                            bar: {
                                categoryPercentage: 0.68,
                                barPercentage: 0.82
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'top',
                                align: 'start',
                                labels: {
                                    color: '#d5e0ec',
                                    boxWidth: 12,
                                    boxHeight: 12,
                                    padding: 14,
                                    usePointStyle: true,
                                    pointStyle: isBar ? 'rectRounded' : 'circle',
                                    font: { family: 'Inter', size: 10, weight: '600' }
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(8, 12, 20, 0.96)',
                                titleColor: '#ffffff',
                                bodyColor: '#d7e2ee',
                                borderColor: 'rgba(0, 229, 255, 0.28)',
                                borderWidth: 1,
                                padding: 12,
                                displayColors: true,
                                callbacks: {
                                    label: (ctx) => {
                                        const key = ctx.dataset.kpiKey;
                                        const v = ctx.parsed.y;
                                        if (v == null) return ctx.dataset.label;
                                        let formatted = Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 });
                                        if (key === 'oee' || key === 'waste_pct') formatted = Number(v).toFixed(1) + '%';
                                        else if (key === 'prod' || key === 'waste') formatted = Math.round(Number(v)).toLocaleString() + ' t';
                                        else if (key === 'downtime') formatted = Number(v).toFixed(1) + ' h';
                                        else if (key === 'recovery') formatted = Number(v).toFixed(1) + ' m';
                                        return ` ${ctx.dataset.label}: ${formatted}`;
                                    }
                                }
                            },
                            datalabels: {
                                display: (ctx) => {
                                    if (!showKpiLabels) return false;
                                    const v = ctx.dataset.data[ctx.dataIndex];
                                    return v !== null && v !== undefined && Number(v) !== 0;
                                },
                                anchor: 'end',
                                align: 'top',
                                offset: 4,
                                clamp: true,
                                color: '#e8eef8',
                                font: { size: 9, weight: '700' },
                                formatter: (v, ctx) => {
                                    const key = ctx.dataset.kpiKey;
                                    if (key === 'oee' || key === 'waste_pct') return Number(v).toFixed(1) + '%';
                                    if (key === 'prod' || key === 'waste') return Math.round(Number(v)).toLocaleString() + ' t';
                                    if (key === 'downtime') return Number(v).toFixed(0) + 'h';
                                    return Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 });
                                }
                            }
                        },
                        scales: {
                            x: {
                                offset: true,
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.04)',
                                    drawTicks: false
                                },
                                border: { display: false },
                                ticks: {
                                    color: '#a8b8c8',
                                    maxRotation: 0,
                                    autoSkip: true,
                                    maxTicksLimit: 12,
                                    font: { size: 10, weight: '600' },
                                    padding: 8
                                }
                            },
                            yVol: {
                                type: 'linear',
                                position: 'left',
                                display: hasVol,
                                beginAtZero: true,
                                min: 0,
                                max: volScale.max,
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.06)',
                                    drawTicks: false,
                                    drawOnChartArea: true
                                },
                                border: { display: false },
                                ticks: {
                                    color: '#7fdfff',
                                    stepSize: volScale.step,
                                    maxTicksLimit: 6,
                                    padding: 8,
                                    font: { size: 10, weight: '600' },
                                    callback: (v) => Number.isInteger(v) ? Number(v).toLocaleString() : Number(v).toFixed(1)
                                },
                                title: {
                                    display: hasVol,
                                    text: 'Tons',
                                    color: '#7fdfff',
                                    font: { size: 10, weight: '700' },
                                    padding: { bottom: 6 }
                                }
                            },
                            yDur: {
                                type: 'linear',
                                position: durOnRight ? 'right' : 'left',
                                display: hasDur,
                                beginAtZero: true,
                                min: 0,
                                max: durScale.max,
                                offset: hasDur && hasVol && !durOnRight,
                                grid: {
                                    drawOnChartArea: !hasVol && !hasMetric,
                                    color: 'rgba(255, 176, 0, 0.08)',
                                    drawTicks: false
                                },
                                border: { display: false },
                                ticks: {
                                    color: '#ffd28a',
                                    stepSize: durScale.step,
                                    maxTicksLimit: 6,
                                    padding: 8,
                                    font: { size: 10, weight: '600' },
                                    callback: (v) => Number.isInteger(v) ? Number(v).toLocaleString() : Number(v).toFixed(1)
                                },
                                title: {
                                    display: hasDur,
                                    text: 'Hours / Min',
                                    color: '#ffd28a',
                                    font: { size: 10, weight: '700' },
                                    padding: { bottom: 6 }
                                }
                            },
                            yMetric: {
                                type: 'linear',
                                position: 'right',
                                display: hasMetric,
                                beginAtZero: true,
                                min: 0,
                                max: metricScale.max,
                                offset: hasMetric && hasDur && !durOnRight,
                                grid: {
                                    drawOnChartArea: !hasVol && !hasDur,
                                    color: 'rgba(255, 255, 255, 0.05)',
                                    drawTicks: false
                                },
                                border: { display: false },
                                ticks: {
                                    color: '#8dff9d',
                                    stepSize: metricScale.step,
                                    maxTicksLimit: 6,
                                    padding: 8,
                                    font: { size: 10, weight: '600' },
                                    callback: (v) => Number.isInteger(v) ? Number(v).toLocaleString() : Number(v).toFixed(1)
                                },
                                title: {
                                    display: hasMetric,
                                    text: '% / Days / Counts',
                                    color: '#8dff9d',
                                    font: { size: 10, weight: '700' },
                                    padding: { bottom: 6 }
                                }
                            }
                        }
                    }
                });
            }

            // 2. Downtime Breakdown Comparison Chart
            const dtCheckboxes = document.querySelectorAll('#downtime-comparison-checkboxes input[type="checkbox"]');
            const dtChartType = document.getElementById('downtimeChartType').value;
            const dtIsBar = dtChartType === 'bar';
            const dtIsArea = dtChartType === 'area';
            const dtBaseType = dtIsBar ? 'bar' : 'line';

            const dtColors = [
                '#00e5ff',
                '#39ff14',
                '#ffb000',
                '#bf5af2',
                '#ff4466',
                '#3b82f6',
                '#f59e0b',
                '#ec4899',
                '#10b981',
                '#94a3b8'
            ];

            const dtDatasets = [];
            const dtAllVals = [];
            const dtMonthTotals = labels.map(() => 0);
            let colorIndex = 0;

            dtCheckboxes.forEach(cb => {
                if (!cb.checked) return;
                const key = cb.value;
                const labelEl = cb.parentNode.querySelector('span');
                const label = (cb.parentNode.getAttribute('title') || (labelEl && labelEl.textContent) || key).trim();
                const color = dtColors[colorIndex % dtColors.length];
                colorIndex++;

                const dtSeriesData = data.map(r => Number(r[key]) || 0);
                dtSeriesData.forEach((v, i) => { dtMonthTotals[i] += v; });
                dtAllVals.push(...dtSeriesData);

                dtDatasets.push({
                    label: label,
                    kpiKey: 'downtime_cat',
                    data: dtSeriesData.slice(),
                    rawHours: dtSeriesData.slice(),
                    borderColor: color,
                    backgroundColor: dtIsBar ? color + 'e0' : (dtIsArea ? color + '45' : 'transparent'),
                    borderWidth: dtIsBar ? 0 : 2.5,
                    borderRadius: dtIsBar ? 3 : 0,
                    borderSkipped: false,
                    fill: dtIsArea,
                    tension: 0.32,
                    pointRadius: dtIsBar ? 0 : 3,
                    pointHoverRadius: dtIsBar ? 0 : 5,
                    pointBackgroundColor: '#0a0e16',
                    pointBorderColor: color,
                    pointBorderWidth: 2,
                    maxBarThickness: 48,
                    minBarLength: dtIsBar ? 6 : undefined,
                    stack: dtIsBar ? 'dt' : undefined,
                    yAxisID: 'y'
                });
            });

            // Give minor stack segments a larger visual share (totals stay exact)
            if (dtIsBar && dtDatasets.length > 1) {
                const MIN_SHARE = 0.06;
                for (let i = 0; i < labels.length; i++) {
                    const total = dtMonthTotals[i];
                    if (total <= 0) continue;
                    const active = dtDatasets.filter(ds => (ds.rawHours[i] || 0) > 0);
                    if (active.length <= 1) continue;
                    const floor = total * Math.min(MIN_SHARE, 0.8 / active.length);
                    const boosted = active.map(ds => Math.max(ds.rawHours[i], floor));
                    const bSum = boosted.reduce((a, b) => a + b, 0) || 1;
                    active.forEach((ds, j) => {
                        ds.data[i] = boosted[j] * (total / bSum);
                    });
                }
            }

            const dtNiceScale = (() => {
                const vals = dtIsBar ? dtMonthTotals : dtAllVals;
                const max = Math.max(0, ...vals.map(v => Number(v) || 0));
                if (max <= 0) return { max: 50, step: 10 };
                const padded = max * 1.12;
                const rough = padded / 5;
                const mag = Math.pow(10, Math.floor(Math.log10(rough)));
                const residual = rough / mag;
                const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
                const step = niceResidual * mag;
                return { max: Math.ceil(padded / step) * step, step };
            })();

            const dtCtx = document.getElementById('downtimeComparisonChart').getContext('2d');
            if (downtimeComparisonChart) downtimeComparisonChart.destroy();

            downtimeComparisonChart = new Chart(dtCtx, {
                type: dtBaseType,
                data: {
                    labels: labels,
                    datasets: dtDatasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    layout: {
                        padding: { top: 14, right: 8, bottom: 2, left: 2 }
                    },
                    datasets: {
                        bar: {
                            categoryPercentage: 0.55,
                            barPercentage: 0.9
                        }
                    },
                    scales: {
                        x: {
                            stacked: dtIsBar,
                            offset: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.04)',
                                drawTicks: false
                            },
                            border: { display: false },
                            ticks: {
                                color: '#a8b8c8',
                                maxRotation: 0,
                                autoSkip: true,
                                font: { size: 10, weight: '600' },
                                padding: 8
                            }
                        },
                        y: {
                            stacked: dtIsBar,
                            position: 'left',
                            beginAtZero: true,
                            min: 0,
                            max: dtNiceScale.max,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.06)',
                                drawTicks: false
                            },
                            border: { display: false },
                            ticks: {
                                color: '#ffd28a',
                                stepSize: dtNiceScale.step,
                                maxTicksLimit: 6,
                                padding: 8,
                                font: { size: 10, weight: '600' },
                                callback: (v) => Number.isInteger(v) ? Number(v).toLocaleString() : Number(v).toFixed(1)
                            },
                            title: {
                                display: true,
                                text: 'Downtime Hours',
                                color: '#ffd28a',
                                font: { family: 'Space Grotesk', size: 11, weight: '700' },
                                padding: { bottom: 6 }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            align: 'start',
                            labels: {
                                color: '#d5e0ec',
                                boxWidth: 12,
                                boxHeight: 12,
                                padding: 12,
                                usePointStyle: true,
                                pointStyle: dtIsBar ? 'rectRounded' : 'circle',
                                font: { family: 'Inter', size: 10, weight: '600' }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(8, 12, 20, 0.96)',
                            titleColor: '#ffffff',
                            bodyColor: '#d7e2ee',
                            borderColor: 'rgba(255, 176, 0, 0.3)',
                            borderWidth: 1,
                            padding: 12,
                            callbacks: {
                                footer: (items) => {
                                    if (!dtIsBar || !items.length) return '';
                                    const idx = items[0].dataIndex;
                                    const total = dtMonthTotals[idx] || 0;
                                    return `Total: ${total.toFixed(1)} h`;
                                },
                                label: (ctx) => {
                                    const raw = ctx.dataset.rawHours
                                        ? ctx.dataset.rawHours[ctx.dataIndex]
                                        : ctx.parsed.y;
                                    if (raw == null) return ctx.dataset.label;
                                    return ` ${ctx.dataset.label}: ${Number(raw).toFixed(1)} h`;
                                }
                            }
                        },
                        datalabels: {
                            // Only show stacked month totals on the top-most non-zero segment
                            display: (ctx) => {
                                if (!dtIsBar || !dtDatasets.length) return false;
                                const idx = ctx.dataIndex;
                                let top = -1;
                                for (let i = dtDatasets.length - 1; i >= 0; i--) {
                                    if ((Number(dtDatasets[i].data[idx]) || 0) > 0) {
                                        top = i;
                                        break;
                                    }
                                }
                                return ctx.datasetIndex === top;
                            },
                            anchor: 'end',
                            align: 'top',
                            offset: 2,
                            clamp: true,
                            color: '#f0f4fa',
                            font: { size: 9, weight: '700' },
                            formatter: (_v, ctx) => {
                                const total = dtMonthTotals[ctx.dataIndex] || 0;
                                return total ? total.toFixed(0) + 'h' : '';
                            }
                        }
                    }
                }
            });
        }

        // ==========================================
        // 5. AI FORECASTING TAB
        // ==========================================
        function formatMonthLabel(dateStr) {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            if (parts.length < 2) return dateStr;
            const year = parts[0];
            const monthIdx = parseInt(parts[1], 10) - 1;
            if (monthIdx >= 0 && monthIdx < 12) {
                return `${monthNames[monthIdx]} ${year}`;
            }
            return dateStr;
        }

        function renderForecastTab(metric = 'Production') {
            const container = document.getElementById('forecast-content');
            if (!container) return;

            window.currentForecastMetric = metric;
            const model = window.currentForecastModel || 'Linear Regression';

            // 1. Prepare Data (respect Year/Month filters; fall back to all history if too short)
            const metricKey = metric === 'Production' ? 'Prod. (Tons)' : metric;
            const selectedYear = yearFilter ? yearFilter.value : 'All';
            const selectedMonth = monthFilter ? monthFilter.value : 'All';
            let usedAllHistoryFallback = false;

            const buildHistory = (rows) => rows
                .filter(d => d[metricKey] !== null && d[metricKey] !== undefined)
                .map(d => ({ month: d.Dates.slice(0, 7), val: d[metricKey] }))
                .sort((a, b) => new Date(a.month) - new Date(b.month));

            let historyRows = mainDataRaw.filter(item => {
                const info = parseYearMonth(item['Dates']);
                const matchY = selectedYear === 'All' || info.year === selectedYear;
                const matchM = selectedMonth === 'All' || info.month === selectedMonth;
                return matchY && matchM;
            });
            let sortedHistory = buildHistory(historyRows);
            if (sortedHistory.length < 2) {
                usedAllHistoryFallback = true;
                sortedHistory = buildHistory(mainDataRaw);
            }

            const n = sortedHistory.length;
            if (n < 2) {
                container.innerHTML = '<div class="empty-state"><h3>Not Enough Data</h3><p>At least 2 historical months are needed to generate a forecast.</p></div>';
                return;
            }

            const xValues = sortedHistory.map((_, i) => i);
            const yValues = sortedHistory.map(d => d.val);
            const sumY = yValues.reduce((a, b) => a + b, 0);
            const avgY = sumY / n;

            // Generate Forecast (Next 4 Months) based on Selected Model
            let forecastPoints = [];
            let slope = 0;
            let stdError = 1;
            let modelLabel = 'Linear Projection';

            if (model === 'Exponential Smoothing') {
                modelLabel = "Holt's Exponential Smoothing";
                let L = [];
                let T = [];
                L[0] = yValues[0];
                T[0] = yValues[1] - yValues[0];
                const alpha = 0.5;
                const beta = 0.3;
                for (let t = 1; t < n; t++) {
                    L[t] = alpha * yValues[t] + (1 - alpha) * (L[t-1] + T[t-1]);
                    T[t] = beta * (L[t] - L[t-1]) + (1 - beta) * T[t-1];
                }
                
                let sumSqResiduals = 0;
                for (let t = 1; t < n; t++) {
                    const pred = L[t-1] + T[t-1];
                    sumSqResiduals += Math.pow(yValues[t] - pred, 2);
                }
                stdError = Math.sqrt(sumSqResiduals / (n - 2)) || 1;
                
                const lastDate = new Date(sortedHistory[n - 1].month + "-02T00:00:00");
                for (let i = 1; i <= 4; i++) {
                    const nextDate = new Date(lastDate);
                    nextDate.setMonth(lastDate.getMonth() + i);
                    const nextMonthStr = nextDate.toISOString().slice(0, 7);
                    
                    const predictedVal = L[n-1] + i * T[n-1];
                    const uncertaintyWidth = stdError * (1 + (i * 0.25));
                    
                    forecastPoints.push({
                        month: nextMonthStr,
                        val: Math.max(0, predictedVal),
                        upper: Math.max(0, predictedVal + uncertaintyWidth),
                        lower: Math.max(0, predictedVal - uncertaintyWidth)
                    });
                }
                slope = T[n-1];

            } else if (model === 'Moving Average') {
                modelLabel = '3-Month Moving Average';
                let sumSqResiduals = 0;
                let countResiduals = 0;
                for (let t = 3; t < n; t++) {
                    const pred = (yValues[t-3] + yValues[t-2] + yValues[t-1]) / 3;
                    sumSqResiduals += Math.pow(yValues[t] - pred, 2);
                    countResiduals++;
                }
                stdError = countResiduals > 0 ? Math.sqrt(sumSqResiduals / countResiduals) : 1;
                
                const historyVals = [...yValues];
                const lastDate = new Date(sortedHistory[n - 1].month + "-02T00:00:00");
                for (let i = 1; i <= 4; i++) {
                    const nextDate = new Date(lastDate);
                    nextDate.setMonth(lastDate.getMonth() + i);
                    const nextMonthStr = nextDate.toISOString().slice(0, 7);
                    
                    const len = historyVals.length;
                    const windowVals = historyVals.slice(Math.max(0, len - 3));
                    const predictedVal = windowVals.reduce((a, b) => a + b, 0) / windowVals.length;
                    historyVals.push(predictedVal);
                    
                    const uncertaintyWidth = stdError * (1 + (i * 0.25));
                    
                    forecastPoints.push({
                        month: nextMonthStr,
                        val: Math.max(0, predictedVal),
                        upper: Math.max(0, predictedVal + uncertaintyWidth),
                        lower: Math.max(0, predictedVal - uncertaintyWidth)
                    });
                }
                slope = forecastPoints[3].val - yValues[n-1];

            } else {
                // Linear Regression (default)
                modelLabel = 'Linear Regression';
                const sumX = xValues.reduce((a, b) => a + b, 0);
                const sumY_reg = yValues.reduce((a, b) => a + b, 0);
                const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
                const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

                slope = (n * sumXY - sumX * sumY_reg) / (n * sumXX - sumX * sumX);
                const intercept = (sumY_reg - slope * sumX) / n;

                let sumSqResiduals = 0;
                yValues.forEach((y, i) => {
                    const yPred = slope * xValues[i] + intercept;
                    sumSqResiduals += Math.pow(y - yPred, 2);
                });
                stdError = Math.sqrt(sumSqResiduals / (n - 2)) || 1;

                const lastDate = new Date(sortedHistory[n - 1].month + "-02T00:00:00");
                for (let i = 1; i <= 4; i++) {
                    const nextDate = new Date(lastDate);
                    nextDate.setMonth(lastDate.getMonth() + i);
                    const nextMonthStr = nextDate.toISOString().slice(0, 7);
                    const x = n - 1 + i;
                    const predictedVal = slope * x + intercept;

                    const uncertaintyWidth = stdError * (1 + (i * 0.25));

                    forecastPoints.push({
                        month: nextMonthStr,
                        val: Math.max(0, predictedVal),
                        upper: Math.max(0, predictedVal + uncertaintyWidth),
                        lower: Math.max(0, predictedVal - uncertaintyWidth)
                    });
                }
            }

            const lastActual = sortedHistory[n - 1].val;
            const finalForecast = forecastPoints[forecastPoints.length - 1].val;
            const totalPredictedGrowth = lastActual > 0 ? ((finalForecast - lastActual) / lastActual) * 100 : 0;
            const trendDirection = slope > 0 ? 'Upward' : 'Downward';
            const trendColorClass = slope > 0 ? 'green' : 'amber';
            const trendIcon = slope > 0 ? '📈' : '📉';

            const unit = metric.includes('%') ? '%' : ' t';

            container.innerHTML = `
                <div class="panel-layout" style="grid-template-columns: 1fr; gap: 8px; margin-top: 0;">
                    <div class="panel-card" style="min-height: 0;">
                        <div class="forecast-controls" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                            <div class="panel-title-section" style="border-left: 3px solid var(--color-primary); padding-left: 10px;">
                                <h3 style="font-family: var(--font-display); font-size: 14px; font-weight: 600; color: #ffffff; margin-bottom: 0;">Statistical Forecast</h3>
                                <p style="font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Linear / Holt / moving-average outlook for key metrics</p>
                                ${usedAllHistoryFallback ? '<p style="font-size: 10px; color: #ffb000; margin-top: 4px;">Using all history (selected period too short)</p>' : ''}
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                <div class="control-group" style="display: flex; align-items: center; gap: 8px;">
                                    <label style="font-family: var(--font-display); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Metric:</label>
                                    <select onchange="renderForecastTab(this.value)" class="comparison-select">
                                        <option value="Production" ${metric === 'Production' ? 'selected' : ''}>Production (Volume)</option>
                                        <option value="OEE %" ${metric === 'OEE %' ? 'selected' : ''}>OEE (Efficiency)</option>
                                        <option value="Waste %" ${metric === 'Waste %' ? 'selected' : ''}>Waste (Loss %)</option>
                                    </select>
                                </div>
                                <div class="control-group" style="display: flex; align-items: center; gap: 8px;">
                                    <label style="font-family: var(--font-display); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Model:</label>
                                    <select onchange="window.currentForecastModel = this.value; renderForecastTab(window.currentForecastMetric);" class="comparison-select">
                                        <option value="Linear Regression" ${model === 'Linear Regression' ? 'selected' : ''}>Linear Regression</option>
                                        <option value="Exponential Smoothing" ${model === 'Exponential Smoothing' ? 'selected' : ''}>Exponential Smoothing</option>
                                        <option value="Moving Average" ${model === 'Moving Average' ? 'selected' : ''}>Moving Average (3-Mo)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Summary Cards -->
                        <div class="metrics-row" style="grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 8px;">
                            <div class="metric-card color-cyan">
                                <div class="metric-label">Trend Trajectory</div>
                                <div class="metric-val ${trendColorClass}" style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 16px;">${trendIcon}</span>
                                    <span>${trendDirection}</span>
                                </div>
                                <div class="metric-subtext">Calculated slope trajectory</div>
                            </div>
                            <div class="metric-card color-cyan">
                                <div class="metric-label">4-Month Projected Change</div>
                                <div class="metric-val cyan">${(totalPredictedGrowth > 0 ? '+' : '')}${totalPredictedGrowth.toFixed(2)}%</div>
                                <div class="metric-subtext">vs last historical month</div>
                            </div>
                            <div class="metric-card color-green">
                                <div class="metric-label">Model Precision</div>
                                <div class="metric-val green">${(Math.max(0, 100 - (stdError / Math.max(1, avgY)) * 100)).toFixed(2)}%</div>
                                <div class="metric-subtext">Accuracy score based on variance</div>
                            </div>
                        </div>

                        <!-- Dynamic Insight -->
                        <div class="forecast-insight" style="margin-bottom: 8px; padding: 8px 10px; background: rgba(168, 85, 247, 0.08); border-radius: 4px; border-left: 3px solid #a855f7; backdrop-filter: blur(16px);">
                            <h4 style="font-family: var(--font-display); font-size: 9px; font-weight: 700; color: #a855f7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">AI Forecast Insight</h4>
                            <p style="font-size: 11px; line-height: 1.4; color: var(--text-main); margin: 0;">
                                Based on <strong style="color: #ffffff;">${n} months</strong> via <strong style="color: #ffffff;">${modelLabel}</strong>, ${metric === 'Production' ? 'Production' : metric} is trending <span style="color: ${slope > 0 ? 'var(--color-secondary)' : 'var(--color-tertiary)'}; font-weight: 700;">${trendDirection.toLowerCase()}</span>.
                                By ${formatMonthLabel(forecastPoints[3].month)}: 
                                <strong style="color: #ffffff;">${metric.includes('%') ? finalForecast.toFixed(2) + '%' : Math.round(finalForecast).toLocaleString() + ' t'}</strong>
                                (<strong style="color: #ffffff;">${(totalPredictedGrowth > 0 ? '+' : '')}${totalPredictedGrowth.toFixed(1)}%</strong>).
                                ${totalPredictedGrowth > 5 ? 'Growth phase — plan capacity.' : (totalPredictedGrowth < -5 ? 'Declining — review process/demand.' : 'Stable — maintain operations.')}
                            </p>
                        </div>

                        <div class="chart-container" style="position: relative; flex: 1; min-height: 160px; width: 100%; margin-bottom: 0;">
                            <canvas id="forecast-chart"></canvas>
                        </div>
                    </div>

                    <!-- Breakdown Table Card -->
                    <div class="panel-card" style="margin-top: 0; min-height: 0;">
                        <div class="panel-title">
                            Projection Breakdown Ledger
                            <span class="panel-title-desc">Next 4 months model data</span>
                        </div>
                        <div class="table-container" style="overflow: auto; margin-top: 6px; flex: 1; min-height: 0;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>Forecasted ${metric}</th>
                                        <th>Possible Range (Low   High)</th>
                                        <th>Timeline</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${forecastPoints.map((p, i) => {
                                        const change = ((p.val - lastActual) / lastActual * 100).toFixed(2);
                                        const statusColor = p.val >= lastActual ? 'var(--color-secondary)' : 'var(--color-tertiary)';

                                        return `
                                            <tr style="transition: background-color 0.2s ease;">
                                                <td style="font-weight: 600; color: #ffffff;">${formatMonthLabel(p.month)}</td>
                                                <td style="font-weight: 700; color: var(--color-primary);">${metric.includes('%') ? p.val.toFixed(2) + '%' : Math.round(p.val).toLocaleString() + ' t'}</td>
                                                <td style="color: var(--text-muted);">
                                                    ${metric.includes('%') ? p.lower.toFixed(2) + '%' : Math.round(p.lower).toLocaleString() + ' t'} 
                                                    &mdash; 
                                                    ${metric.includes('%') ? p.upper.toFixed(2) + '%' : Math.round(p.upper).toLocaleString() + ' t'}
                                                </td>
                                                <td>
                                                    <span class="status-badge" style="background-color: ${statusColor}15; color: ${statusColor}; border-color: ${statusColor}33; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 10px; min-height: auto;">
                                                        <span class="status-dot" style="background-color: ${statusColor}; width: 6px; height: 6px; border-radius: 50%;"></span>
                                                        Month +${i + 1} (${(parseFloat(change) >= 0 ? '+' : '')}${change}%)
                                                    </span>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            // Render Chart
            setTimeout(() => {
                const ctx = document.getElementById('forecast-chart')?.getContext('2d');
                if (!ctx) return;

                if (window.forecastChart instanceof Chart) {
                    window.forecastChart.destroy();
                }

                const historyLabels = sortedHistory.map(d => formatMonthLabel(d.month));
                const forecastLabels = forecastPoints.map(d => formatMonthLabel(d.month));
                const combinedLabels = [...historyLabels, ...forecastLabels];

                const historyDataParams = sortedHistory.map(d => d.val);

                const forecastLine = Array(historyLabels.length - 1).fill(null);
                forecastLine.push(lastActual);
                forecastPoints.forEach(d => forecastLine.push(d.val));

                const upperBounds = Array(historyLabels.length - 1).fill(null);
                upperBounds.push(lastActual);
                forecastPoints.forEach(d => upperBounds.push(d.upper));

                const lowerBounds = Array(historyLabels.length - 1).fill(null);
                lowerBounds.push(lastActual);
                forecastPoints.forEach(d => lowerBounds.push(d.lower));

                window.forecastChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: combinedLabels,
                        datasets: [
                            {
                                label: 'Historical Actuals',
                                data: historyDataParams,
                                borderColor: '#3b82f6',
                                backgroundColor: (context) => {
                                    const chart = context.chart;
                                    const { ctx, chartArea } = chart;
                                    if (!chartArea) return null;
                                    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                                    gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
                                    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
                                    return gradient;
                                },
                                borderWidth: 3,
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointBackgroundColor: '#3b82f6',
                                z: 10
                            },
                            {
                                label: modelLabel + ' Projection',
                                data: forecastLine,
                                borderColor: '#a855f7',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                fill: false,
                                tension: 0.4,
                                pointRadius: 6,
                                pointBackgroundColor: '#a855f7',
                                z: 15
                            },
                            {
                                label: 'Confidence Interval (95%)',
                                data: upperBounds,
                                borderColor: 'transparent',
                                backgroundColor: 'rgba(168, 85, 247, 0.06)',
                                fill: '+1',
                                tension: 0.4,
                                pointRadius: 0,
                                z: 5
                            },
                            {
                                label: 'Confidence Interval (Lower)',
                                data: lowerBounds,
                                borderColor: 'transparent',
                                fill: false,
                                tension: 0.4,
                                pointRadius: 0,
                                z: 5
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                            legend: {
                                labels: {
                                    color: '#dee2f6',
                                    font: { family: 'Inter' },
                                    filter: (item) => !item.text.includes('(Lower)')
                                }
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                callbacks: {
                                    label: function (context) {
                                        const datasetLabel = (context && context.dataset && context.dataset.label) || '';
                                        if (datasetLabel.includes('Lower') || datasetLabel.includes('Confidence')) return null;
                                        const val = context.parsed.y;
                                        if (val === null || val === undefined) return null;
                                        const formatted = metric.includes('%')
                                            ? val.toFixed(2) + '%'
                                            : val.toLocaleString(undefined, {maximumFractionDigits: 1}) + ' t';
                                        return `${datasetLabel}: ${formatted}`;
                                    }
                                }
                            },
                            datalabels: {
                                display: function (context) {
                                    const label = context.dataset.label || '';
                                    if (label.includes('Lower') || label.includes('Confidence')) return false;
                                    if (label.includes('Historical')) return context.dataIndex % 2 === 0;
                                    return true;
                                },
                                formatter: function (value) {
                                    if (value === null || value === undefined) return null;
                                    if (metric.includes('%')) return value.toFixed(1) + '%';
                                    return value.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' t';
                                },
                                color: '#fff',
                                font: { size: 9, weight: 'bold', family: 'Space Grotesk' },
                                backgroundColor: 'rgba(14, 19, 33, 0.85)',
                                borderRadius: 4,
                                padding: { top: 3, bottom: 3, left: 5, right: 5 },
                                anchor: 'end',
                                align: 'top',
                                offset: 4,
                                clamp: true
                            }
                        },
                        scales: {
                            x: {
                                ticks: { color: '#849396', font: { family: 'Inter', weight: 'bold', size: 10 } },
                                grid: { color: 'rgba(255,255,255,0.03)' }
                            },
                            y: {
                                ticks: {
                                    color: '#dee2f6',
                                    font: { family: 'Inter', size: 10 },
                                    callback: (val) => {
                                        if (metric.includes('%')) return val.toFixed(0) + '%';
                                        return val.toLocaleString() + ' t';
                                    }
                                },
                                grid: { color: 'rgba(255,255,255,0.03)' }
                            }
                        }
                    }
                });
                setTimeout(() => {
                    if (window.forecastChart) window.forecastChart.resize();
                }, 280);
            }, 50);
        }

        function onComparisonChange() {
            updateDashboard();
        }

        function onDowntimeCompChange() {
            updateDashboard();
        }

        // ==========================================
        // PRESENTATION / WALL MODE (same views, timed rotation)
        // ==========================================
        const PRESENTATION_INTERVAL_MS = 20000;
        const PRESENTATION_MONTH_INTERVAL_MS = 12000;
        const OFFLINE_PRESENTATION_SUBS = [
            { offlineSub: 'overview', label: 'Offline Overview' },
            { offlineSub: 'ps', label: 'Primary Slitter (PS)' },
            { offlineSub: 'ss', label: 'Secondary Slitter (SS)' },
            { offlineSub: 'met', label: 'Metallizer' }
        ];
        const fullMonthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        function getPresentationTargetYear() {
            let targetYear = yearFilter ? yearFilter.value : 'All';
            if (!targetYear || targetYear === 'All') {
                const years = mainDataRaw
                    .map(r => parseYearMonth(r['Dates']).year)
                    .filter(Boolean);
                targetYear = years.length ? String(Math.max(...years.map(Number))) : '';
            }
            return targetYear;
        }

        function getPresentationYearMonths(source = 'main') {
            const targetYear = getPresentationTargetYear();
            if (!targetYear) return [];

            let rows = [];
            if (source === 'products') {
                rows = productDataRaw.filter(r => {
                    const info = parseYearMonth(r['Dates']);
                    return info.year === String(targetYear) && r['Production'] !== null && r['Production'] !== undefined;
                });
            } else if (source === 'offline') {
                rows = offlineDataRaw.filter(r => {
                    const info = parseYearMonth(r['Dates']);
                    return info.year === String(targetYear);
                });
            } else {
                rows = mainDataRaw.filter(r => {
                    const info = parseYearMonth(r['Dates']);
                    return info.year === String(targetYear) && r['Prod. (Tons)'] !== null;
                });
            }

            const seen = new Set();
            return rows
                .slice()
                .sort((a, b) => new Date(a['Dates']) - new Date(b['Dates']))
                .map(r => {
                    const pm = parseYearMonth(r['Dates']);
                    return {
                        year: pm.year,
                        month: pm.month,
                        monthNum: pm.monthNum,
                        fullName: fullMonthNames[pm.monthNum - 1] || shortMonths[pm.monthNum - 1],
                        label: `${fullMonthNames[pm.monthNum - 1] || ''} ${pm.year}`
                    };
                })
                .filter(m => {
                    const key = `${m.year}-${m.month}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
        }

        function pushMonthlyOverlaySlides(slides, tab, source, labelPrefix, overlayKind) {
            getPresentationYearMonths(source).forEach(m => {
                slides.push({
                    tab,
                    overlay: 'month-detail',
                    overlayKind,
                    year: m.year,
                    month: m.month,
                    monthNum: m.monthNum,
                    label: `${labelPrefix} · ${m.label}`
                });
            });
        }

        function buildPresentationSlides() {
            const slides = [
                { tab: 'executive', overlay: 'intro', label: 'PETPAK' }
            ];
            document.querySelectorAll('.nav-list .nav-item[data-tab]').forEach(nav => {
                const li = nav.closest('li');
                if (li && li.style.display === 'none') return;

                const tab = nav.getAttribute('data-tab');
                const navLabel = nav.querySelector('span')?.textContent?.trim() || tabMeta[tab]?.title || tab;

                if (tab === 'executive') {
                    slides.push({ tab: 'executive', label: navLabel });
                    getPresentationYearMonths().forEach(m => {
                        slides.push({
                            tab: 'executive',
                            overlay: 'month-detail',
                            year: m.year,
                            month: m.month,
                            monthNum: m.monthNum,
                            label: m.label
                        });
                    });
                } else if (tab === 'offline') {
                    OFFLINE_PRESENTATION_SUBS.forEach(sub => {
                        slides.push({ tab: 'offline', offlineSub: sub.offlineSub, label: sub.label });
                    });
                } else {
                    slides.push({ tab, label: navLabel });
                }
            });
            return slides;
        }
        let PRESENTATION_SLIDES = buildPresentationSlides();

        function setPresentationIntroOverlay(open) {
            document.body.classList.toggle('presentation-intro-open', !!open);
            const overlay = document.getElementById('presentation-intro-overlay');
            if (overlay) overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
        }

        function setPresentationMonthlyOverlay(open) {
            document.body.classList.toggle('presentation-monthly-open', !!open);
            const overlay = document.getElementById('presentation-monthly-overlay');
            if (overlay) overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
        }

        function fillPresentationIntro() {
            const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
            const year = yearFilter ? yearFilter.value : 'All';
            const month = monthFilter ? monthFilter.value : 'All';
            const monthLabel = month === 'All'
                ? 'All months'
                : (fullMonthNames[parseInt(month, 10) - 1] || month);
            const periodText = year === 'All'
                ? `All years · ${monthLabel}`
                : `${year} · ${monthLabel}`;
            setTxt('pres-intro-period', periodText);

            const rows = (mainDataRaw || []).filter((item) => {
                const info = parseYearMonth(item['Dates']);
                const matchY = year === 'All' || info.year === year;
                const matchM = month === 'All' || info.month === month;
                return matchY && matchM && item['Prod. (Tons)'] !== null;
            });
            const totalProd = rows.reduce((sum, r) => sum + (r['Prod. (Tons)'] || 0), 0);
            const avgOee = typeof kpiDef !== 'undefined' && kpiDef.oee
                ? kpiDef.oee.calculate(rows)
                : 0;
            const avgWaste = typeof kpiDef !== 'undefined' && kpiDef.waste_pct
                ? kpiDef.waste_pct.calculate(rows)
                : 0;

            setTxt('pres-intro-prod', rows.length ? `${Math.round(totalProd).toLocaleString()} t` : '—');
            setTxt('pres-intro-oee', rows.length ? `${Number(avgOee || 0).toFixed(1)}%` : '—');
            setTxt('pres-intro-waste', rows.length ? `${Number(avgWaste || 0).toFixed(1)}%` : '—');
        }

        function formatPresMass(kg) {
            const n = Number(kg) || 0;
            if (Math.abs(n) >= 1000) return `${Math.round(n / 1000).toLocaleString()} t`;
            return `${Math.round(n).toLocaleString()} kg`;
        }

        function formatPresDelta(curr, prev) {
            if (prev === null || prev === undefined || isNaN(prev)) return { text: 'new', cls: 'flat' };
            const d = (Number(curr) || 0) - (Number(prev) || 0);
            if (Math.abs(d) < 0.0001) return { text: 'flat', cls: 'flat' };
            const pct = prev ? (d / Math.abs(prev)) * 100 : 0;
            const arrow = d > 0 ? '▲' : '▼';
            return {
                text: `${arrow} ${Math.abs(d) >= 1000 ? formatPresMass(Math.abs(d)) : Math.abs(d).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${Math.abs(pct).toFixed(0)}%)`,
                cls: d > 0 ? 'up' : 'down',
                delta: d,
                pct
            };
        }

        function renderPresDeptBars(elId, items, unit, warn) {
            const el = document.getElementById(elId);
            if (!el) return;
            const max = Math.max(...items.map(i => i.value), 0.0001);
            const nonempty = items.filter(i => i.value > 0);
            if (!nonempty.length) {
                el.innerHTML = '<div class="pres-empty-note">No department data this month.</div>';
                return;
            }
            el.innerHTML = items.map((item, i) => {
                const pct = Math.max(0, Math.min(100, (item.value / max) * 100));
                return `<div class="pres-dept-bar-row ${i === 0 && item.value ? 'top' : ''}">
                    <div class="pres-dept-label">${item.label}</div>
                    <div class="pres-dept-track"><div class="pres-dept-fill ${warn ? 'warn' : ''}" style="width:${pct.toFixed(1)}%"></div></div>
                    <div class="pres-dept-val">${item.value.toFixed(1)} ${unit}</div>
                </div>`;
            }).join('');
        }

        function fillPresentationMonthDetail(year, month) {
            const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
            const titleEl = document.getElementById('pres-month-title');
            const subEl = document.getElementById('pres-month-sub');
            const yearEl = document.getElementById('presentation-monthly-year');

            const monthNum = parseInt(month, 10);
            const fullName = fullMonthNames[monthNum - 1] || shortMonths[monthNum - 1] || month;
            if (titleEl) titleEl.textContent = `${fullName} ${year}`;
            if (subEl) subEl.textContent = 'Line · Dispatch · Offline · Products · Waste · Downtime';
            if (yearEl) yearEl.textContent = `Year ${year}`;

            const mainRows = mainDataRaw.filter(r => {
                const info = parseYearMonth(r['Dates']);
                return info.year === String(year) && info.month === String(month).padStart(2, '0') && r['Prod. (Tons)'] !== null;
            });
            const offRows = offlineDataRaw.filter(r => {
                const info = parseYearMonth(r['Dates']);
                return info.year === String(year) && info.month === String(month).padStart(2, '0');
            });
            const dispatchRows = (typeof dispatchDataRaw !== 'undefined' ? dispatchDataRaw : []).filter(r => {
                const info = parseYearMonth(r['Dates']);
                return info.year === String(year) && info.month === String(month).padStart(2, '0');
            });

            const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
            const avgField = (rows, key) => {
                const vals = rows.map(r => r[key]).filter(v => v !== null && v !== undefined && !isNaN(v) && v > 0);
                return avg(vals);
            };

            const totalProd = mainRows.reduce((sum, r) => sum + (r['Prod. (Tons)'] || 0), 0);

            // Peak month of the year — same visuals as Plant Overview month cards
            const yearProdRows = mainDataRaw.filter(r => {
                const info = parseYearMonth(r['Dates']);
                return info.year === String(year) && r['Prod. (Tons)'] !== null;
            });
            let peakMonthPad = '';
            let peakProdVal = 0;
            yearProdRows.forEach(r => {
                const p = Number(r['Prod. (Tons)'] || 0);
                if (p > peakProdVal) {
                    peakProdVal = p;
                    peakMonthPad = parseYearMonth(r['Dates']).month;
                }
            });
            const isPeakMonth = peakProdVal > 0 && String(month).padStart(2, '0') === String(peakMonthPad).padStart(2, '0');
            const detailRoot = document.querySelector('#presentation-monthly-overlay .presentation-month-detail');
            if (detailRoot) detailRoot.classList.toggle('is-peak', isPeakMonth);
            const peakBadge = document.getElementById('pres-month-peak-badge');
            if (peakBadge) {
                peakBadge.hidden = !isPeakMonth;
                if (isPeakMonth) {
                    peakBadge.textContent = `★ Peak · ${Math.round(peakProdVal).toLocaleString()} t`;
                }
            }
            const avgWaste = typeof kpiDef !== 'undefined' && kpiDef.waste_pct
                ? kpiDef.waste_pct.calculate(mainRows)
                : avgField(mainRows, 'Waste %');
            const avgOee = typeof kpiDef !== 'undefined' && kpiDef.oee
                ? kpiDef.oee.calculate(mainRows)
                : avgField(mainRows, 'OEE %');
            const avgRsPlant = typeof kpiDef !== 'undefined' && kpiDef.rs_plant
                ? kpiDef.rs_plant.calculate(mainRows)
                : avgField(mainRows, 'Rs/Kg Plant');
            const dispatchTotal = dispatchRows.reduce((sum, r) => sum + (Number(r['Total']) || 0), 0);
            const dispatchExport = dispatchRows.reduce((sum, r) => sum + (Number(r['Export']) || 0), 0);
            const dispatchLocal = dispatchRows.reduce((sum, r) => sum + (Number(r['Local']) || 0), 0);
            const dispatchExportShare = dispatchTotal > 0 ? (dispatchExport / dispatchTotal) * 100 : 0;

            // Peak dispatch month of the year → golden Dispatch card
            const yearDispatchRows = (typeof dispatchDataRaw !== 'undefined' ? dispatchDataRaw : []).filter(r => {
                const info = parseYearMonth(r['Dates']);
                return info.year === String(year);
            });
            let peakDispatchVal = 0;
            let peakDispatchMonth = '';
            yearDispatchRows.forEach(r => {
                const t = Number(r['Total']) || 0;
                if (t > peakDispatchVal) {
                    peakDispatchVal = t;
                    peakDispatchMonth = parseYearMonth(r['Dates']).month;
                }
            });
            const isDispatchPeak = peakDispatchVal > 0
                && String(month).padStart(2, '0') === String(peakDispatchMonth).padStart(2, '0');

            const psProd = offRows.reduce((sum, r) => sum + (r['PS_Production'] || 0), 0);
            const ssProd = offRows.reduce((sum, r) => sum + (r['SS_Production'] || 0), 0);
            const metProd = offRows.reduce((sum, r) => sum + (r['Met_Production'] || 0), 0);
            const psWaste = offRows.reduce((sum, r) => sum + (r['PS_Waste'] || 0), 0);
            const ssWaste = offRows.reduce((sum, r) => sum + (r['SS_Waste'] || 0), 0);
            const metWaste = offRows.reduce((sum, r) => sum + (r['Met_Waste'] || 0), 0);

            let psWastePct = avgField(offRows, 'PS_Waste_Pct');
            if (!psWastePct && psProd > 0) psWastePct = (psWaste / psProd) * 100;
            let ssWastePct = avgField(offRows, 'SS_Waste_Pct');
            if (!ssWastePct && ssProd > 0) ssWastePct = (ssWaste / ssProd) * 100;
            let metWastePct = avgField(offRows, 'Met_Waste_Pct');
            if (!metWastePct && metProd > 0) metWastePct = (metWaste / metProd) * 100;

            const validPacking = offRows.filter(r => r['Offline_Packing_Cost'] !== null && r['Offline_Packing_Cost'] > 0);
            const avgPacking = validPacking.length
                ? validPacking.reduce((sum, r) => sum + r['Offline_Packing_Cost'], 0) / validPacking.length
                : 0;

            const formatMass = (kg) => {
                const n = Number(kg) || 0;
                if (Math.abs(n) >= 1000) return `${Math.round(n / 1000).toLocaleString()} t`;
                return `${Math.round(n).toLocaleString()} kg`;
            };

            setTxt('pres-val-prod', `${Math.round(totalProd).toLocaleString()} t`);
            setTxt('pres-val-waste', `${Number(avgWaste || 0).toFixed(1)}%`);
            setTxt('pres-label-oee', 'OEE');
            setTxt('pres-meta-oee', `${fullName} ${year}`);
            setTxt('pres-val-oee', `${Number(avgOee || 0).toFixed(1)}%`);
            setTxt('pres-val-dispatch', `${dispatchTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t`);
            setTxt('pres-meta-dispatch', `Local ${dispatchLocal.toLocaleString(undefined, { maximumFractionDigits: 1 })} t · Export ${dispatchExport.toLocaleString(undefined, { maximumFractionDigits: 1 })} t`);
            const presDispatchCard = document.getElementById('pres-card-dispatch');
            if (presDispatchCard) {
                presDispatchCard.classList.toggle('is-dispatch-peak', isDispatchPeak);
                if (isDispatchPeak) {
                    const metaBase = `Local ${dispatchLocal.toLocaleString(undefined, { maximumFractionDigits: 1 })} t · Export ${dispatchExport.toLocaleString(undefined, { maximumFractionDigits: 1 })} t`;
                    setTxt('pres-meta-dispatch', `★ Peak month · ${metaBase}`);
                }
            }
            const presDispatchBadge = document.getElementById('pres-badge-dispatch');
            if (presDispatchBadge) presDispatchBadge.textContent = isDispatchPeak ? 'PEAK' : 't';
            setTxt('pres-val-rs-plant', avgRsPlant ? Number(avgRsPlant).toFixed(2) : '0.00');
            setTxt('pres-val-ps-prod', formatMass(psProd));
            setTxt('pres-val-ps-waste', `${Number(psWastePct || 0).toFixed(2)}%`);
            setTxt('pres-val-ss-prod', formatMass(ssProd));
            setTxt('pres-val-ss-waste', `${Number(ssWastePct || 0).toFixed(2)}%`);
            setTxt('pres-val-met-prod', formatMass(metProd));
            setTxt('pres-val-met-waste', `${Number(metWastePct || 0).toFixed(2)}%`);
            // TOP only if this month is that machine's best month in the year
            markMachineYearPeakMonth('#presentation-monthly-overlay .presentation-month-detail', year, month);
            setTxt('pres-val-packing', `PKR ${Number(avgPacking || 0).toFixed(2)}`);
            const packTonePres = !avgPacking ? ''
                : Number(avgPacking) <= 12 ? 'pack-tone-good'
                : Number(avgPacking) <= 16 ? 'pack-tone-fair'
                : 'pack-tone-high';
            const packCardPres = document.querySelector('#presentation-monthly-overlay .exec-machine-card.machine-pack');
            if (packCardPres) {
                packCardPres.classList.remove('pack-tone-good', 'pack-tone-fair', 'pack-tone-high');
                if (packTonePres) packCardPres.classList.add(packTonePres);
            }
            const packChipPres = document.getElementById('pres-pack-chip');
            if (packChipPres) {
                packChipPres.classList.remove('pack-tone-good', 'pack-tone-fair', 'pack-tone-high');
                if (packTonePres) packChipPres.classList.add(packTonePres);
            }

            const setMeter = (id, pct) => {
                const el = document.getElementById(id);
                if (el) el.style.width = `${Math.max(0, Math.min(100, pct || 0))}%`;
            };
            const setRing = (id, pct) => {
                const el = document.getElementById(id);
                if (!el) return;
                const c = 2 * Math.PI * 14;
                const p = Math.max(0, Math.min(100, pct || 0)) / 100;
                el.style.strokeDasharray = `${(p * c).toFixed(2)} ${c.toFixed(2)}`;
            };

            // Year sparkline context for the selected month
            const yearRows = mainDataRaw.filter(r => {
                const info = parseYearMonth(r['Dates']);
                return info.year === String(year) && r['Prod. (Tons)'] !== null;
            }).slice().sort((a, b) => new Date(a['Dates']) - new Date(b['Dates']));
            updateSparkline('pres-spark-prod', yearRows, 'Prod. (Tons)', '#00e5ff');

            setTxt('pres-stat-waste', `${Number(avgWaste || 0).toFixed(1)}%`);
            setTxt('pres-stat-oee', `${Number(avgOee || 0).toFixed(1)}%`);
            setTxt('pres-stat-rs', avgRsPlant ? Number(avgRsPlant).toFixed(1) : '—');

            setRing('pres-ring-waste', Math.min(100, (Number(avgWaste || 0) / 10) * 100));
            setRing('pres-ring-oee', Number(avgOee || 0));
            setMeter('pres-meter-waste', Math.min(100, (Number(avgWaste || 0) / 10) * 100));
            setMeter('pres-meter-oee', Number(avgOee || 0));

            setMeter('pres-meter-dispatch', dispatchExportShare || (dispatchTotal > 0 ? 100 : 0));
            const rsMax = Math.max(Number(avgRsPlant || 0), 1) * 1.15;
            setMeter('pres-meter-rs-plant', (Number(avgRsPlant || 0) / rsMax) * 100);

            const setYield = (id, lbl, wastePct, ringId, numId) => {
                const yieldPct = Math.max(0, Math.min(100, 100 - (Number(wastePct) || 0)));
                setMeter(id, yieldPct);
                setTxt(lbl, `Yield ${yieldPct.toFixed(1)}%`);
                if (ringId) setRing(ringId, yieldPct);
                if (numId) setTxt(numId, `${yieldPct.toFixed(1)}%`);
            };
            setYield('pres-yield-ps', 'pres-yield-ps-lbl', psWastePct, 'pres-flow-ring-ps', 'pres-yield-ps-num');
            setYield('pres-yield-ss', 'pres-yield-ss-lbl', ssWastePct, 'pres-flow-ring-ss', 'pres-yield-ss-num');
            setYield('pres-yield-met', 'pres-yield-met-lbl', metWastePct, 'pres-flow-ring-met', 'pres-yield-met-num');
            const packBand = Math.min(100, Math.max(0, 100 - (Number(avgPacking || 0) / 20) * 100));
            setMeter('pres-yield-pack', packBand);
            // Full ring frame — factor is a value badge, not a sparse progress arc
            setRing('pres-flow-ring-pack', avgPacking ? 100 : 0);
            setTxt('pres-yield-pack-num', avgPacking ? Number(avgPacking).toFixed(1) : '—');
            setTxt('pres-yield-pack-lbl', 'Lower cost is better');
            const packStatus = !avgPacking ? '—'
                : Number(avgPacking) <= 12 ? 'Good'
                : Number(avgPacking) <= 16 ? 'Fair'
                : 'High';
            setTxt('pres-pack-status', packStatus);
        

            // ---- Month highlights: rising products + waste/downtime by dept ----
            const setHl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
            const monthPad = String(month).padStart(2, '0');
            let prevYear = Number(year);
            let prevMonthNum = monthNum - 1;
            if (prevMonthNum < 1) { prevMonthNum = 12; prevYear -= 1; }
            const prevPad = String(prevMonthNum).padStart(2, '0');

            const formatPresMass = (kg) => {
                const n = Number(kg) || 0;
                if (Math.abs(n) >= 1000) return `${Math.round(n / 1000).toLocaleString()} t`;
                return `${Math.round(n).toLocaleString()} kg`;
            };
            const formatPresDelta = (curr, prev) => {
                if (prev === null || prev === undefined || isNaN(prev)) return { text: 'new', cls: 'flat' };
                const d = (Number(curr) || 0) - (Number(prev) || 0);
                if (Math.abs(d) < 0.0001) return { text: 'flat', cls: 'flat' };
                const pct = prev ? (d / Math.abs(prev)) * 100 : 0;
                const arrow = d > 0 ? '▲' : '▼';
                return {
                    text: `${arrow} ${Math.abs(d) >= 1000 ? formatPresMass(Math.abs(d)) : Math.abs(d).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${Math.abs(pct).toFixed(0)}%)`,
                    cls: d > 0 ? 'up' : 'down'
                };
            };

            const currProdRows = (typeof productDataRaw !== 'undefined' ? productDataRaw : []).filter(r => {
                const info = parseYearMonth(r['Dates']);
                return info.year === String(year) && info.month === monthPad;
            });
            const prevProdRows = (typeof productDataRaw !== 'undefined' ? productDataRaw : []).filter(r => {
                const info = parseYearMonth(r['Dates']);
                return info.year === String(prevYear) && info.month === prevPad;
            });
            const agg = (rows) => {
                const map = {};
                rows.forEach(item => {
                    const code = item['Product'];
                    if (!code) return;
                    if (!map[code]) map[code] = { Product: code, 'Product Type': item['Product Type'] || 'Other', Production: 0 };
                    map[code].Production += (item['Production'] || 0);
                });
                return map;
            };
            const currMap = agg(currProdRows);
            const prevMap = agg(prevProdRows);
            const currList = Object.values(currMap).sort((a, b) => b.Production - a.Production);
            const risers = currList
                .map(item => ({ ...item, prev: prevMap[item.Product]?.Production, delta: (item.Production || 0) - (prevMap[item.Product]?.Production || 0) }))
                .filter(item => item.prev !== undefined && item.delta > 0)
                .sort((a, b) => b.delta - a.delta);

            const best = risers[0];
            const lead = currList[0];
            const bestDelta = best ? formatPresDelta(best.Production, best.prev) : { text: lead ? formatPresMass(lead.Production) : '—', cls: 'flat' };
            setHl('pres-hl-prod-sub', best
                ? `Top · ${best.Product} · ${bestDelta.text}`
                : (lead ? `Lead · ${lead.Product} · ${formatPresMass(lead.Production)}` : 'No product data'));

            const prodList = document.getElementById('pres-uni-product-list');
            if (prodList) {
                // Prefer risers; fill remaining slots with top producers so the card never looks empty
                const seen = new Set();
                const rows = [];
                risers.forEach(item => {
                    if (rows.length >= 3) return;
                    seen.add(item.Product);
                    rows.push({ ...item, showDelta: true });
                });
                currList.forEach(item => {
                    if (rows.length >= 3 || seen.has(item.Product)) return;
                    seen.add(item.Product);
                    rows.push({ ...item, prev: prevMap[item.Product]?.Production, showDelta: false });
                });
                if (!rows.length) {
                    prodList.innerHTML = '<div class="pres-empty-note">No product data.</div>';
                } else {
                    prodList.innerHTML = rows.map((item, i) => {
                        const d = formatPresDelta(item.Production, item.prev);
                        const type = (typeof getNormalizedProductType === 'function') ? getNormalizedProductType(item['Product Type']) : item['Product Type'];
                        const showDelta = !!item.showDelta;
                        return `<div class="pres-hl-item ${showDelta ? 'up' : (i === 0 ? 'top' : '')}">
                            <div class="pres-hl-item-idx">${i + 1}</div>
                            <div>
                                <div class="pres-hl-item-name">${item.Product}</div>
                                <div class="pres-hl-item-meta">${type} · ${formatPresMass(item.Production)}</div>
                            </div>
                            <div class="pres-hl-item-val"><span class="${showDelta ? d.cls : 'flat'}">${showDelta ? d.text : formatPresMass(item.Production)}</span></div>
                        </div>`;
                    }).join('');
                }
            }

            const mainRow = (mainDataRaw || []).find(r => {
                const info = parseYearMonth(r['Dates']);
                return info.year === String(year) && info.month === monthPad && r['Prod. (Tons)'] !== null;
            }) || {};
            const wasteTons = Number(mainRow['Waste ( Tons)'] || 0);
            const wastePct = Number(mainRow['Waste %'] || 0);
            const totalDt = Number(mainRow['Total Down Time ( hrs.)'] || 0);
            const wasteCats = [
                { key: 'Waste_Process', label: 'Process' },
                { key: 'Waste_Mechanical', label: 'Mechanical' },
                { key: 'Waste_Shortages', label: 'No. Job Order' },
                { key: 'Waste_Electrical', label: 'Electrical' },
                { key: 'Waste_PowerHouse', label: 'Power House' },
                { key: 'Waste_Planning', label: 'Planning' }
            ];
            const dtCats = [
                { key: 'Downtime_Process', label: 'Process' },
                { key: 'Downtime_Mechanical', label: 'Mechanical' },
                { key: 'Downtime_Shortages', label: 'No. Job Order' },
                { key: 'Downtime_Electrical', label: 'Electrical' },
                { key: 'Downtime_PowerHouse', label: 'Power House' },
                { key: 'Downtime_Planning', label: 'Planning' },
                { key: 'Downtime_Maintenance', label: 'Planned Maint.' },
                { key: 'Downtime_RentalPower', label: 'Rental Power' }
            ];
            // Exclude Process so Month Highlights focuses on other departments
            const wasteItems = wasteCats
                .filter(c => c.label !== 'Process')
                .map(c => ({ label: c.label, value: Number(mainRow[c.key] || 0) }))
                .sort((a, b) => b.value - a.value);
            const dtItems = dtCats
                .filter(c => c.label !== 'Process')
                .map(c => ({ label: c.label, value: Number(mainRow[c.key] || 0) }))
                .sort((a, b) => b.value - a.value);
            const topW = wasteItems.find(i => i.value > 0) || wasteItems[0];
            const topD = dtItems.find(i => i.value > 0) || dtItems[0];
            const otherWasteTotal = wasteItems.reduce((s, i) => s + (i.value || 0), 0);
            const otherDtTotal = dtItems.reduce((s, i) => s + (i.value || 0), 0);
            setHl('pres-uni-waste-total', topW && topW.value
                ? `Lead ${topW.label} ${topW.value.toFixed(1)} t · plant ${wastePct.toFixed(1)}%`
                : `Other depts ${otherWasteTotal.toFixed(1)} t · plant ${wastePct.toFixed(1)}%`);
            setHl('pres-uni-dt-total', topD && topD.value
                ? `Lead ${topD.label} ${topD.value.toFixed(1)} h · plant ${totalDt.toFixed(1)} h`
                : `Other depts ${otherDtTotal.toFixed(1)} h · plant ${totalDt.toFixed(1)} h`);

            const renderBars = (elId, items, unit) => {
                const el = document.getElementById(elId);
                if (!el) return;
                const positive = items.filter(i => i.value > 0);
                const shown = (positive.length ? positive : items).slice(0, 3);
                const max = Math.max(...shown.map(i => i.value), 0.0001);
                if (!shown.length || shown.every(i => !i.value)) {
                    el.innerHTML = '<div class="pres-empty-note">No other-department data.</div>';
                    return;
                }
                el.innerHTML = shown.map((item, i) => {
                    const pct = Math.max(0, Math.min(100, (item.value / max) * 100));
                    return `<div class="pres-hl-bar-item ${i === 0 && item.value ? 'top' : ''}">
                        <div class="pres-hl-bar-label">${item.label}</div>
                        <div class="pres-hl-bar-track"><div class="pres-hl-bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
                        <div class="pres-hl-bar-val">${item.value.toFixed(1)} ${unit}</div>
                    </div>`;
                }).join('');
            };
            renderBars('pres-uni-waste-bars', wasteItems, 't');
            renderBars('pres-uni-dt-bars', dtItems, 'h');

        }
        let presentationActive = false;
        let presentationIndex = 0;
        let presentationPaused = false;
        let presentationTimer = null;
        let presentationProgressRaf = null;
        let presentationSlideStart = 0;
        let presentationSidebarWasCollapsed = false;
        let presentationEnteredFullscreen = false;

        function activateTab(targetTab) {
            activeTab = targetTab;

            navItems.forEach(nav => {
                nav.classList.toggle('active', nav.getAttribute('data-tab') === targetTab);
            });

            tabPanels.forEach(panel => panel.classList.remove('active'));
            const panel = document.getElementById(`${targetTab}-tab`);
            if (panel) panel.classList.add('active');

            document.body.classList.toggle(
                'dashboard-fit-view',
                targetTab === 'executive' || targetTab === 'offline' || targetTab === 'losses' || targetTab === 'erema' || targetTab === 'dispatch' || targetTab === 'products' || targetTab === 'skutrends' || targetTab === 'forecast' || targetTab === 'comparison' || targetTab === 'overview' || targetTab === 'savings' || targetTab === 'advsim'
            );

            if (headerTitle && tabMeta[targetTab]) {
                headerTitle.textContent = tabMeta[targetTab].title;
                headerSubtitle.textContent = tabMeta[targetTab].subtitle;
            }

            updateDashboard();
        }

        function findPresentationIndexForCurrentView() {
            const idx = PRESENTATION_SLIDES.findIndex(slide => {
                if (slide.tab !== activeTab) return false;
                if (slide.overlay) return false;
                if (slide.tab === 'offline') {
                    return (slide.offlineSub || 'overview') === activeOfflineSubSection;
                }
                return true;
            });
            return idx >= 0 ? idx : 0;
        }

        function getCurrentPresentationInterval() {
            const slide = PRESENTATION_SLIDES[presentationIndex];
            return slide && slide.overlay === 'month-detail'
                ? PRESENTATION_MONTH_INTERVAL_MS
                : PRESENTATION_INTERVAL_MS;
        }

        function updatePresentationUI() {
            const slide = PRESENTATION_SLIDES[presentationIndex];
            if (!slide) return;
            const labelEl = document.getElementById('presentation-slide-label');
            const counterEl = document.getElementById('presentation-slide-counter');
            const pauseBtn = document.getElementById('presentation-pause');
            if (labelEl) labelEl.textContent = slide.label;
            if (counterEl) counterEl.textContent = `${presentationIndex + 1} / ${PRESENTATION_SLIDES.length}`;
            if (pauseBtn) {
                pauseBtn.textContent = presentationPaused ? '▶ Play' : '⏸ Pause';
                pauseBtn.title = presentationPaused ? 'Resume (Space)' : 'Pause (Space)';
            }
        }

        function updatePresentationProgress() {
            if (!presentationActive || presentationPaused) return;
            const progressEl = document.getElementById('presentation-progress');
            if (!progressEl) return;
            const interval = getCurrentPresentationInterval();
            const elapsed = Date.now() - presentationSlideStart;
            const pct = Math.min(100, (elapsed / interval) * 100);
            progressEl.style.width = `${pct}%`;
            if (pct < 100) {
                presentationProgressRaf = requestAnimationFrame(updatePresentationProgress);
            }
        }

        function clearPresentationTimers() {
            if (presentationTimer) {
                clearTimeout(presentationTimer);
                presentationTimer = null;
            }
            if (presentationProgressRaf) {
                cancelAnimationFrame(presentationProgressRaf);
                presentationProgressRaf = null;
            }
        }

        function resetPresentationTimer() {
            clearPresentationTimers();
            presentationSlideStart = Date.now();
            const progressEl = document.getElementById('presentation-progress');
            if (progressEl) progressEl.style.width = '0%';
            if (!presentationActive || presentationPaused) return;
            const interval = getCurrentPresentationInterval();
            presentationProgressRaf = requestAnimationFrame(updatePresentationProgress);
            presentationTimer = setTimeout(() => {
                nextPresentationSlide(true);
            }, interval);
        }

        function goToPresentationSlide(index) {
            const total = PRESENTATION_SLIDES.length;
            if (!total) return;
            presentationIndex = ((index % total) + total) % total;
            const slide = PRESENTATION_SLIDES[presentationIndex];

            activateTab(slide.tab);
            if (slide.tab === 'offline' && slide.offlineSub) {
                setOfflineSubSection(slide.offlineSub);
            }

            if (slide.overlay === 'intro') {
                setPresentationMonthlyOverlay(false);
                setPresentationIntroOverlay(true);
                fillPresentationIntro();
            } else if (slide.overlay === 'month-detail') {
                setPresentationIntroOverlay(false);
                setPresentationMonthlyOverlay(true);
                fillPresentationMonthDetail(slide.year, slide.month);
            } else {
                setPresentationIntroOverlay(false);
                setPresentationMonthlyOverlay(false);
            }

            updatePresentationUI();
            resetPresentationTimer();
            resizeDashboardCharts();
            if (slide.tab === 'executive' && !slide.overlay) {
                setTimeout(() => resizeDashboardCharts(), 120);
            }
        }

        window.nextPresentationSlide = function(fromAuto) {
            if (!presentationActive) return;
            goToPresentationSlide(presentationIndex + 1);
        };

        window.prevPresentationSlide = function() {
            if (!presentationActive) return;
            goToPresentationSlide(presentationIndex - 1);
        };

        window.togglePresentationPause = function() {
            if (!presentationActive) return;
            presentationPaused = !presentationPaused;
            document.body.classList.toggle('presentation-paused', presentationPaused);
            updatePresentationUI();
            if (presentationPaused) {
                clearPresentationTimers();
            } else {
                const elapsed = Date.now() - presentationSlideStart;
                const remaining = Math.max(500, getCurrentPresentationInterval() - elapsed);
                presentationProgressRaf = requestAnimationFrame(updatePresentationProgress);
                presentationTimer = setTimeout(() => nextPresentationSlide(true), remaining);
            }
        };

        window.startPresentationMode = function() {
            if (presentationActive) return;

            presentationActive = true;
            presentationPaused = false;
            presentationSidebarWasCollapsed = document.body.classList.contains('sidebar-collapsed');
            PRESENTATION_SLIDES = buildPresentationSlides();

            if (!presentationSidebarWasCollapsed) {
                document.body.classList.add('sidebar-collapsed');
                const btn = document.getElementById('sidebar-toggle');
                if (btn) btn.innerHTML = '▶';
            }

            document.body.classList.add('presentation-mode');
            document.body.classList.remove('presentation-paused');

            const bar = document.getElementById('presentation-bar');
            if (bar) bar.setAttribute('aria-hidden', 'false');

            goToPresentationSlide(0);

            const docEl = document.documentElement;
            if (docEl.requestFullscreen && !document.fullscreenElement) {
                docEl.requestFullscreen().then(() => {
                    presentationEnteredFullscreen = true;
                }).catch(() => {
                    presentationEnteredFullscreen = false;
                });
            }
        };

        window.stopPresentationMode = function() {
            if (!presentationActive) return;

            presentationActive = false;
            presentationPaused = false;
            clearPresentationTimers();
            setPresentationIntroOverlay(false);
            setPresentationMonthlyOverlay(false);

            document.body.classList.remove('presentation-mode', 'presentation-paused');

            const bar = document.getElementById('presentation-bar');
            if (bar) bar.setAttribute('aria-hidden', 'true');

            const progressEl = document.getElementById('presentation-progress');
            if (progressEl) progressEl.style.width = '0%';

            if (presentationEnteredFullscreen && document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
            presentationEnteredFullscreen = false;

            if (!presentationSidebarWasCollapsed) {
                document.body.classList.remove('sidebar-collapsed');
                const btn = document.getElementById('sidebar-toggle');
                if (btn) btn.innerHTML = '◀';
            }

            resizeDashboardCharts();
        };

        function initPresentationControls() {
            const prevBtn = document.getElementById('presentation-prev');
            const pauseBtn = document.getElementById('presentation-pause');
            const nextBtn = document.getElementById('presentation-next');
            const exitBtn = document.getElementById('presentation-exit');

            if (prevBtn) prevBtn.addEventListener('click', () => prevPresentationSlide());
            if (pauseBtn) pauseBtn.addEventListener('click', () => togglePresentationPause());
            if (nextBtn) nextBtn.addEventListener('click', () => nextPresentationSlide());
            if (exitBtn) exitBtn.addEventListener('click', () => stopPresentationMode());

            document.addEventListener('keydown', (e) => {
                if (!presentationActive) return;
                const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
                if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

                if (e.key === 'Escape') {
                    e.preventDefault();
                    stopPresentationMode();
                } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                    e.preventDefault();
                    nextPresentationSlide();
                } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                    e.preventDefault();
                    prevPresentationSlide();
                } else if (e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar') {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePresentationPause();
                }
            });

            document.addEventListener('fullscreenchange', () => {
                if (presentationActive && !document.fullscreenElement) {
                    presentationEnteredFullscreen = false;
                }
            });
        }

        // ==========================================
        // INIT & LISTENERS
        // ==========================================
        
        // Tab switching logic
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetTab = item.getAttribute('data-tab');
                activateTab(targetTab);
            });
        });

        // Filter drop listeners
        yearFilter.addEventListener('change', updateDashboard);
        monthFilter.addEventListener('change', updateDashboard);

        // Close modal when clicking on backdrop
        document.getElementById('kpiModal').addEventListener('click', closeKpiModal);

        function initializeYearFilter() {
            if (!yearFilter) return;
            const years = [];
            mainDataRaw.forEach(item => {
                const info = parseYearMonth(item['Dates']);
                if (info.year && !years.includes(info.year)) {
                    years.push(info.year);
                }
            });
            years.sort((a, b) => b.localeCompare(a));
            yearFilter.innerHTML = '';
            if (years.length > 0) {
                const latestYear = years[0];
                yearFilter.insertAdjacentHTML('beforeend', `<option value="${latestYear}" selected>${latestYear}</option>`);
                for (let i = 1; i < years.length; i++) {
                    yearFilter.insertAdjacentHTML('beforeend', `<option value="${years[i]}">${years[i]}</option>`);
                }
                yearFilter.insertAdjacentHTML('beforeend', `<option value="All">All Years</option>`);
            } else {
                yearFilter.insertAdjacentHTML('beforeend', `<option value="All" selected>All Years</option>`);
            }
        }

        // Initial Load — data already provided by data/dashboard-data.js
        async function loadDashboardData() {
            // Prefer embedded script data (works on file://). Optionally refresh from JSON on http(s).
            if (mainDataRaw.length > 0) return;
            const empty = [];
            try {
                const [main, products, erema, offline, dispatch] = await Promise.all([
                    fetch('data/main.json').then(r => r.ok ? r.json() : empty).catch(() => empty),
                    fetch('data/products.json').then(r => r.ok ? r.json() : empty).catch(() => empty),
                    fetch('data/erema.json').then(r => r.ok ? r.json() : empty).catch(() => empty),
                    fetch('data/offline.json').then(r => r.ok ? r.json() : empty).catch(() => empty),
                    fetch('data/dispatch.json').then(r => r.ok ? r.json() : empty).catch(() => empty)
                ]);
                if (Array.isArray(main) && main.length) mainDataRaw = main;
                if (Array.isArray(products) && products.length) productDataRaw = products;
                if (Array.isArray(erema) && erema.length) eremaDataRaw = erema;
                if (Array.isArray(offline) && offline.length) offlineDataRaw = offline;
                if (Array.isArray(dispatch) && dispatch.length) dispatchDataRaw = dispatch;
            } catch (e) {
                console.warn('Optional JSON refresh skipped.', e);
            }
        }

        async function bootPetpakDashboard() {
            await loadDashboardData();
            initializeYearFilter();

            document.getElementById('kpiBtnText').textContent = `${visibleKPIs.length} Active`;

            const themeFilter = document.getElementById('themeFilter');
            if (themeFilter) {
                themeFilter.value = currentTheme;
            }

            rebuildKPICards();
            window.isDashboardInitialized = true;
            document.body.classList.add('dashboard-fit-view');
            initPresentationControls();
            updateDashboard();

            function updateLiveClock() {
                const clockEl = document.getElementById('header-clock');
                if (!clockEl) return;
                const now = new Date();
                let hours = now.getHours();
                let minutes = now.getMinutes();
                let seconds = now.getSeconds();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;
                minutes = minutes < 10 ? '0' + minutes : minutes;
                seconds = seconds < 10 ? '0' + seconds : seconds;
                clockEl.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
            }
            setInterval(updateLiveClock, 1000);
            updateLiveClock();
        }

        bootPetpakDashboard();

    