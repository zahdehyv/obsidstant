import { Modal, App, ButtonComponent } from 'obsidian';

export class StringInputModal extends Modal {
	initialString: string;
	resultString: string | null = null; // To store the result
	resolvePromise: (value: string | null) => void; // Promise resolve function
	rejectPromise: (reason?: any) => void; // Promise reject function
	inputEl: HTMLTextAreaElement; // Reference to the input element

	constructor(app: App, initialString: string) {
		super(app);
		this.initialString = initialString;
	}

	onOpen() {
		let { contentEl } = this;

		contentEl.createEl('h2', { text: 'Enter/Edit String' });

		// Text Area 1 (Multiline)
		this.inputEl = contentEl.createEl('textarea'); // Changed to 'textarea'
		this.inputEl.style.width = '100%';
		this.inputEl.style.height = '160px'; // Set a reasonable initial height
		this.inputEl.value = this.initialString; // Set initial value
		contentEl.appendChild(document.createElement('br'));

		// Text Input
		// this.inputEl = contentEl.createEl('input', { type: 'text' });
		// this.inputEl.value = this.initialString; // Set initial value
		// this.inputEl.style.width = '100%';
		// contentEl.appendChild(document.createElement('br'));
		// contentEl.appendChild(document.createElement('br'));

		// Button Container
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		buttonContainer.style.display = 'flex';
		buttonContainer.style.justifyContent = 'flex-end'; // Align buttons to the right
		buttonContainer.style.gap = '10px';

		// Confirm Button
		new ButtonComponent(buttonContainer)
			.setButtonText("Confirm")
			.setCta() // Make it visually prominent (optional)
			.onClick(() => {
				this.resultString = this.inputEl.value;
				this.close(); // Close the modal, which triggers onClose
			});

		// Cancel Button
		new ButtonComponent(buttonContainer)
			.setButtonText("Cancel")
			.onClick(() => {
				this.resultString = null; // Set result to null for cancel
				this.close(); // Close the modal, which triggers onClose
			});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();

		if (this.resultString !== null) {
			this.resolvePromise(this.resultString); // Resolve with the string if confirmed
		} else {
			this.resolvePromise(null); // Resolve with null if canceled
		}
	}

	// Method to open the modal and return a Promise
	openAndGetValue(): Promise<string | null> {
		return new Promise((resolve, reject) => {
			this.resolvePromise = resolve; // Store resolve function
			this.rejectPromise = reject;   // Store reject function
			super.open(); // Call the base Modal's open method to display the modal
		});
	}
}