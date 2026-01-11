/**
 * Data Management Component
 * Handles Export/Import/Verify Backup buttons for BotWaffle
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
            versionElement.textContent = '1.1.0';
        }
    }

    setupButtons() {
        const exportBtn = document.getElementById('exportDataBtn');
        const importBtn = document.getElementById('importDataBtn');
        const verifyBtn = document.getElementById('verifyBackupBtn');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.handleExport());
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => this.handleImport());
        }

        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => this.handleVerify());
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
                    `Data imported successfully!\n\nA backup of your previous data was saved to:\n${result.backupLocation}\n\nPlease restart the application to load imported data.`
                );
                // Optionally reload
                if (confirm('Restart application now to load imported data?')) {
                    window.location.reload();
                }
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

    async handleVerify() {
        try {
            if (!window.api || !window.api.data) {
                alert('Verification functionality not available');
                return;
            }

            // Show file picker
            const result = await window.api.data.openBackupDialog();

            if (result.cancelled || !result.filePath) {
                return;
            }

            // Verify the backup
            const verifyResult = await window.api.data.verifyBackup(result.filePath);

            if (verifyResult.valid) {
                const summary = verifyResult.summary || {};
                alert(
                    `Backup Verification Passed!\n\nSummary:\n- Chatbots: ${summary.chatbots || 0}\n- Conversations: ${summary.conversations || 0}\n- Templates: ${summary.templates || 0}\n- Assets: ${summary.assets || 0}`
                );
            } else {
                const issuesText = verifyResult.issues.join('\n');
                const warningsText =
                    verifyResult.warnings && verifyResult.warnings.length > 0
                        ? '\n\nWarnings:\n' + verifyResult.warnings.join('\n')
                        : '';
                alert(`Backup Verification Failed!\n\nIssues:\n${issuesText}${warningsText}`);
            }
        } catch (error) {
            console.error('Error verifying backup:', error);
            alert(`Verification error: ${error.message || 'Failed to verify backup'}`);
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
