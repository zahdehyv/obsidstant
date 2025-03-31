import { Modal, App, ButtonComponent, WorkspaceLeaf } from 'obsidian'; // Removed MarkdownView import
import React, { StrictMode } from 'react'; // Import StrictMode from React
import ReactDOM from 'react-dom/client'; // Import createRoot and Root from react-dom/client
import { ReactView } from '../Views/ReactView'; // Import the ReactView component

interface EnhancedDiffModalProps {
    app: App;
    oldVersion: string;
    newVersion: string;
    action: 'create' | 'change' | 'delete';
    filepath: string;
    onConfirm: (confirmed: boolean) => void;
}

export class EnhancedDiffModal extends Modal {
    oldVersion: string;
    newVersion: string;
    action: 'create' | 'change' | 'delete';
    filepath: string;
    onConfirm: (confirmed: boolean) => void;
    reactContainer: HTMLElement;
    root: ReactDOM.Root | null = null; // Add root property for React 18+

    constructor(props: EnhancedDiffModalProps) {
        super(props.app);
        this.oldVersion = props.oldVersion;
        this.newVersion = props.newVersion;
        this.action = props.action;
        this.filepath = props.filepath;
        this.onConfirm = props.onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        this.titleEl.setText(`Review ${this.action.toUpperCase()} for: ${this.filepath}`);

        this.reactContainer = contentEl.createDiv(); // Create container for React

        this.renderReactView(); // Call renderReactView (using React component)

        // Buttons below the diff viewer
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        new ButtonComponent(buttonContainer)
            .setButtonText("Confirm & Proceed")
            .setCta()
            .onClick(() => {
                this.onConfirm(true);
                this.close();
            });

        new ButtonComponent(buttonContainer)
            .setButtonText("Cancel")
            .onClick(() => {
                this.onConfirm(false);
                this.close();
            });
    }

    onClose() {
        this.root?.unmount(); // Unmount React root
        this.contentEl.empty();
    }

    renderReactView() { // Modified to render ReactView component
        this.root = ReactDOM.createRoot(this.reactContainer); // Create React root

        this.root.render( // Use root.render for React 18+
            React.createElement(StrictMode, {}, // Use StrictMode
                React.createElement(ReactView, { // Render ReactView component, passing props
                    oldVersion: this.oldVersion,
                    newVersion: this.newVersion,
                    action: this.action,
                    filepath: this.filepath,
                })
            )
        );
    }
}