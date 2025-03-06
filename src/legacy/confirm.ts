import { App, Modal, ButtonComponent } from 'obsidian'; // Make sure Modal and ButtonComponent are here


export class ConfirmModal extends Modal {
    diffHtml: string;
    filePath: string;
    fileContent: string;
    onSubmit: (confirmed: boolean) => void;

    constructor(app: App, diffHtml: string, filePath: string, fileContent: string, onSubmit: (confirmed: boolean) => void) {
        super(app);
        this.diffHtml = diffHtml;
        this.filePath = filePath;
        this.fileContent = fileContent;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: `Confirm File Creation/Modification: ${this.filePath}` });

        const diffContainer = contentEl.createEl('div', { cls: 'diff-container' });
        diffContainer.innerHTML = this.diffHtml; // Set the HTML diff content
        contentEl.appendChild(diffContainer);

        // Style the diff container
        diffContainer.style.overflow = 'auto';
        diffContainer.style.maxHeight = '500px';
        diffContainer.style.border = '1px solid #ccc';
        diffContainer.style.padding = '10px';
        diffContainer.style.fontFamily = 'monospace'; // Use a monospace font

        // Buttons for confirmation
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        new ButtonComponent(buttonContainer)
            .setButtonText('Confirm')
            .setCta()
            .onClick(() => {
                this.close();
                this.onSubmit(true);
            });

        new ButtonComponent(buttonContainer)
            .setButtonText('Cancel')
            .onClick(() => {
                this.close();
                this.onSubmit(false);
            });

        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginTop = '10px';
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
