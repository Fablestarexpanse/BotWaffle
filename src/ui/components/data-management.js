/**
 * Data Management Component
 * Handles Export/Import buttons for BotWaffle
 */

class DataManagement {
    constructor() {
        this.init();
    }

    init() {
        // Wire up buttons when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupButtons();
                this.setupKoFiLink();
                this.setVersion();
            });
        } else {
            this.setupButtons();
            this.setupKoFiLink();
            this.setVersion();
        }
    }

    setupKoFiLink() {
        const kofiLink = document.getElementById('kofiLink');
        if (kofiLink) {
            kofiLink.addEventListener('click', (e) => {
                e.preventDefault();
                // Open Ko-fi link (update with actual BotWaffle Ko-fi if available)
                if (window.api && window.api.openExternal) {
                    window.api.openExternal('https://ko-fi.com');
                } else {
                    window.open('https://ko-fi.com', '_blank');
                }
            });
        }
    }

    setVersion() {
        const versionElement = document.getElementById('currentVersion');
        if (versionElement) {
            // Get version from package.json or use default
            versionElement.textContent = '1.3.0';
        }
    }

    setupButtons() {
        const exportBtn = document.getElementById('exportDataBtn');
        const importBtn = document.getElementById('importDataBtn');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => this.handleImport());
        }
    }

    async handleExport() {
        try {
            if (!window.api || !window.api.data) {
                alert('Export functionality not available');
                return;
            }

            const result = await window.api.data.export();

            if (result.success) {
                alert(`Data exported successfully to:\n${result.filename}`);
            } else if (result.cancelled) {
                // User cancelled, do nothing
            } else {
                alert(`Export failed: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            alert(`Export error: ${error.message || 'Failed to export'}`);
        }
    }

    async handleImport() {
        try {
            if (!window.api || !window.api.data) {
                alert('Import functionality not available');
                return;
            }

            const confirmed = confirm(
                'Importing data will replace your current data. A backup will be created automatically. Continue?'
            );

            if (!confirmed) {
                return;
            }

            const result = await window.api.data.import();

            if (result.success) {
                alert(
                    `Data imported successfully!\n\nA backup of your previous data was saved to:\n${result.backupLocation}\n\nThe application will now reload to show imported data.`
                );
                // Reload to show imported data
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else if (result.cancelled) {
                // User cancelled, do nothing
            } else {
                alert(`Import failed: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error importing data:', error);
            alert(`Import error: ${error.message || 'Failed to import'}`);
        }
    }

}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new DataManagement();
    });
} else {
    new DataManagement();
}
