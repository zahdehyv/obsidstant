import { Modal, App, Notice } from 'obsidian'; // Import necessary classes
import { EnhancedDiffModal

 } from './EnhancedDiffModal';
export class testModal extends Modal { // Make the class exportable
	textInput1: HTMLInputElement;
	textInput2: HTMLInputElement;

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let { contentEl } = this;

		contentEl.createEl('h2', { text: 'Test Modal' });

		// Text Input 1
		contentEl.createEl('label', { text: 'Text Entry 1:' });
		this.textInput1 = contentEl.createEl('input', { type: 'text' });
		this.textInput1.style.width = '100%';
		contentEl.appendChild(document.createElement('br'));

		// Text Input 2
		contentEl.createEl('label', { text: 'Text Entry 2:' });
		this.textInput2 = contentEl.createEl('input', { type: 'text' });
		this.textInput2.style.width = '100%';
		contentEl.appendChild(document.createElement('br'));
		contentEl.appendChild(document.createElement('br'));

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const button1 = buttonContainer.createEl('button', { text: 'change' });
		button1.addEventListener('click', () => {
			const diffModal = new EnhancedDiffModal({
                app: this.app, // Pass the app instance (assuming 'this.app' is available in BaseBottomBarView)
                oldVersion: this.textInput1.value, // Pass example old version
                newVersion: this.textInput2.value, // Pass example new version
                action: "change",       // Pass example action
                filepath: 'exampleFilepath',   // Pass example filepath
                onConfirm: (confirmed) => {   // Define the onConfirm callback
                    if (confirmed) {
                        new Notice("Diff Confirmed! (Action to proceed would go here)");
                        console.log("Diff Confirmed by user for file:", 'exampleFilepath');
                        // --- Your code to perform the action (e.g., writeFile, etc.) would go here ---
                        // You would likely use 'exampleNewVersion' and ''exampleFilepath'' in your action
                    } else {
                        new Notice("Diff Cancelled!");
                        console.log("Diff Cancelled by user for file:", 'exampleFilepath');
                        // --- Code to handle cancellation would go here (if needed) ---
                    }
                },
            });

            // 3. Open the EnhancedDiffModal
            diffModal.open();

            // --- END: EnhancedDiffModal Example ---
		});

		const button2 = buttonContainer.createEl('button', { text: 'create' });
		button2.addEventListener('click', () => {
			const diffModal = new EnhancedDiffModal({
                app: this.app, // Pass the app instance (assuming 'this.app' is available in BaseBottomBarView)
                oldVersion: this.textInput1.value, // Pass example old version
                newVersion: this.textInput2.value, // Pass example new version
                action: "create",       // Pass example action
                filepath: 'exampleFilepath',   // Pass example filepath
                onConfirm: (confirmed) => {   // Define the onConfirm callback
                    if (confirmed) {
                        new Notice("Diff Confirmed! (Action to proceed would go here)");
                        console.log("Diff Confirmed by user for file:", 'exampleFilepath');
                        // --- Your code to perform the action (e.g., writeFile, etc.) would go here ---
                        // You would likely use 'exampleNewVersion' and ''exampleFilepath'' in your action
                    } else {
                        new Notice("Diff Cancelled!");
                        console.log("Diff Cancelled by user for file:", 'exampleFilepath');
                        // --- Code to handle cancellation would go here (if needed) ---
                    }
                },
            });

            // 3. Open the EnhancedDiffModal
            diffModal.open();

            // --- END: EnhancedDiffModal Example ---
		});

		const button3 = buttonContainer.createEl('button', { text: 'delete' });
		button3.addEventListener('click', () => {
			const diffModal = new EnhancedDiffModal({
                app: this.app, // Pass the app instance (assuming 'this.app' is available in BaseBottomBarView)
                oldVersion: this.textInput1.value, // Pass example old version
                newVersion: this.textInput2.value, // Pass example new version
                action: "delete",       // Pass example action
                filepath: 'exampleFilepath',   // Pass example filepath
                onConfirm: (confirmed) => {   // Define the onConfirm callback
                    if (confirmed) {
                        new Notice("Diff Confirmed! (Action to proceed would go here)");
                        console.log("Diff Confirmed by user for file:", 'exampleFilepath');
                        // --- Your code to perform the action (e.g., writeFile, etc.) would go here ---
                        // You would likely use 'exampleNewVersion' and ''exampleFilepath'' in your action
                    } else {
                        new Notice("Diff Cancelled!");
                        console.log("Diff Cancelled by user for file:", 'exampleFilepath');
                        // --- Code to handle cancellation would go here (if needed) ---
                    }
                },
            });

            // 3. Open the EnhancedDiffModal
            diffModal.open();

            // --- END: EnhancedDiffModal Example ---
		});

		// Basic button styling
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';
		button1.style.marginRight = '10px';
		button2.style.marginRight = '10px';
		button3.style.marginRight = '10px';
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}