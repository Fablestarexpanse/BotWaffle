class SectionPersonality extends customElements.get('section-base') {
    constructor() {
        super();
        this._title = 'Personality Engine';
    }

    renderContent() {
        const personality = this._data.personality || {};

        const body = this.querySelector('.section-body');
        body.innerHTML = `
            <personality-builder id="inner-builder"></personality-builder>
        `;

        const builder = body.querySelector('personality-builder');
        if (builder) {
            builder.data = { characterData: personality };
        }
    }

    getData() {
        const builder = this.querySelector('personality-builder');
        return builder ? builder.data : {};
    }
}

customElements.define('section-personality', SectionPersonality);
