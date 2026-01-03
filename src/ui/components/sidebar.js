class Sidebar {
    constructor() {
        this.links = document.querySelectorAll('.nav-link');
        this.init();
    }

    init() {
        this.links.forEach(link => {
            link.addEventListener('click', (e) => {
                // Prevent real navigation for now as we are a SPA shell
                e.preventDefault();
                this.setActive(link);
            });
        });
    }

    setActive(activeLink) {
        this.links.forEach(link => link.classList.remove('active'));
        activeLink.classList.add('active');

        // Dispatch navigation event based on link text
        const viewName = activeLink.textContent.trim();
        if (viewName === 'My Library') {
            document.dispatchEvent(new CustomEvent('navigate-library'));
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Sidebar();
});
