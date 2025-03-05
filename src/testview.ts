import { ItemView, WorkspaceLeaf, setIcon, Notice } from 'obsidian';
import WaveSurfer from 'wavesurfer.js';
import { EnhancedDiffModal } from './EnhancedDiffModal';

export const VIEW_TYPE_BASE_BOTTOM_BAR = "base-bottom-bar-view"; // Unique view type

export class BaseBottomBarView extends ItemView {
    private chatDisplayContainer: HTMLDivElement; // Just for visual display
    private waveformContainer: HTMLDivElement; // Container for the waveform display
    private wavesurfer: WaveSurfer | null = null;
    private playButton: HTMLButtonElement | null = null;
    private sendButton: HTMLButtonElement;
    private uploadButton: HTMLButtonElement; // Add upload button
    private testButton: HTMLButtonElement; // Add test button

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_BASE_BOTTOM_BAR;
    }

    getDisplayText(): string {
        return "Base Bottom Bar View"; // Title of the view
    }

    getIcon(): string {
        return "audio-file"; // Example icon, choose a relevant one
    }

    async onOpen() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.style.display = 'flex';
        containerEl.style.flexDirection = 'column';
        containerEl.style.height = '100%';
        containerEl.style.backgroundColor = '#1e1e1e'; // Or your desired background
        containerEl.style.color = '#ffffff'; // Or your desired text color

        // Main content container
        const mainContentContainer = containerEl.createDiv({
            cls: 'base-bottom-bar-content-container', // Add a class for styling
            attr: {
                style: 'display: flex; flex-direction: column; height: 100%;'
            }
        });

        // Chat Display Container (Visual Only)
        this.chatDisplayContainer = mainContentContainer.createEl('div', {
            cls: 'chat-display-container', // Add a class for styling
            attr: {
                style: 'flex: 1; overflow-y: auto; padding: 10px; background: #2d2d2d; display: flex; flex-direction: column; gap: 30px; margin-bottom: 10px; border: 10px dashed #555; /* Dashed border to indicate its just a display area */'
            }
        });
        this.chatDisplayContainer.textContent = "Chat Display Area (Visual Only)"; // Placeholder text

        // --- Rounded Bottom Bar Container ---
        const bottomBarContainer = mainContentContainer.createDiv({
            cls: 'rounded-bottom-bar-container' // Add a class for styling
        });

        // --- Row 1: Audio Visualizer and Record Button ---
        const row1 = bottomBarContainer.createDiv({
            cls: 'bottom-bar-row', // Add a class for styling
            attr: {
                style: 'display: flex; align-items: center; justify-content: space-between; padding: 10px;'
            }
        });

        // Waveform Container (Visualizer)
        this.waveformContainer = row1.createDiv({
            cls: 'waveform-container', // Add a class for styling
            attr: { style: 'flex: 1; height: 40px; margin-right: 10px; background: #333; border-radius: 4px; overflow: hidden;' } // Basic styling, adjust as needed
        });

        // Initialize WaveSurfer (but don't load audio yet)
        this.wavesurfer = WaveSurfer.create({
            container: this.waveformContainer,
            waveColor: '#555',
            progressColor: '#1e90ff',
            barWidth: 2,
            barHeight: 1,
            barGap: 2,
            height: 40, // Match container height
            cursorWidth: 0,
            interact: false, // Disable interaction for visualizer only
            // responsive: true,
        });

        // Record Button Container (Placeholder - no functionality here in base view)
        const recordButtonContainer = row1.createEl('div', {
            cls: 'record-button-container', // Add a class for styling
            attr: { style: 'flex: 0 0 auto;' } // Adjust flex as needed
        });
        const recordButton = recordButtonContainer.createEl('button', { cls: 'record-button bottom-bar-button' }); // Just a placeholder button
        setIcon(recordButton, 'mic'); // Example icon for record


        // --- Row 2: Grouped Buttons ---
        const row2 = bottomBarContainer.createDiv({
            cls: 'bottom-bar-row', // Add a class for styling
            attr: {
                style: 'display: flex; align-items: center; justify-content: space-between; padding: 10px;'
            }
        });

        // --- Group 1 Container (Left, Play, Right) ---
        const group1Container = row2.createDiv({
            cls: 'button-group-container group1-container', // Add classes for styling
            attr: { style: 'display: flex; flex: 1; margin-right: 5px;' } // Take available space, add right margin
        });

        // Left Button
        const leftButton = group1Container.createEl('button', {
            cls: ['obsidian-button', 'grouped-button', 'bottom-bar-button'] // Add classes for styling
        });
        setIcon(leftButton, 'chevron-left'); // Example icon - choose as desired

        // Play Button
        this.playButton = group1Container.createEl('button', {
            cls: ['obsidian-button', 'grouped-button', 'bottom-bar-button'] // Add classes for styling
        });
        setIcon(this.playButton, 'play'); // Example icon - choose as desired

        // Right Button
        const rightButton = group1Container.createEl('button', {
            cls: ['obsidian-button', 'grouped-button', 'bottom-bar-button'] // Add classes for styling
        });
        setIcon(rightButton, 'chevron-right'); // Example icon - choose as desired


        // --- Group 2 Container (Upload, Send) ---
        const group2Container = row2.createDiv({
            cls: 'button-group-container group2-container', // Add classes for styling
            attr: { style: 'display: flex; flex: 1; margin-left: 5px;' } // Take available space, add left margin
        });

        // Test Button
        this.testButton = group2Container.createEl('button', {
            cls: ['obsidian-button', 'grouped-button', 'bottom-bar-button', 'test-button'] // Add classes
        });
        setIcon(this.testButton, 'experiment'); // Upload icon

        // Upload Button
        this.uploadButton = group2Container.createEl('button', {
            cls: ['obsidian-button', 'grouped-button', 'bottom-bar-button', 'upload-button'] // Add classes
        });
        setIcon(this.uploadButton, 'upload'); // Upload icon

        // Send Button
        this.sendButton = group2Container.createEl('button', {
            cls: ['obsidian-button', 'grouped-button', 'bottom-bar-button', 'send-button'] // Add classes
        });
        setIcon(this.sendButton, "corner-down-left"); // Send icon

        // TEST BUTTON ACTION - Modified to use ReactDOM.render
        this.testButton.addEventListener('click', async () => {
            // --- Example: Open EnhancedDiffModal on button click ---

            // 1. Define example oldVersion and newVersion content (replace with your dynamic content)
            const exampleOldVersion = `export async function createDiffDivElement(): Promise<HTMLDivElement> { // Renamed and return type specified
// Example content - replace with dynamic content later
const oldVersion = "This is the old version of the content.\nLine 2 of old.\nLine 3.";
const newVersion = "This is the new version of the content.\nLine 2 is modified.\nLine 3, plus a new line 4.";
const filepath = "example-file.txt";
const action = 'change';

// 1. Generate diff using jsdiff (line diff)
const diff = Diff.diffLines(oldVersion, newVersion);

// 2. Convert jsdiff output to unified diff format
let unifiedDiff = '';
if (action === 'create') {
    unifiedDiff = Diff.createTwoFilesPatch('dev/null', filepath, '', newVersion, 'dev/null', filepath);
} else if (action === 'delete') {
    unifiedDiff = Diff.createTwoFilesPatch(filepath, 'dev/null', oldVersion, '', filepath, 'dev/null');
}
else { // 'change' action
    unifiedDiff = Diff.createTwoFilesPatch(filepath, filepath, oldVersion, newVersion);
}

// 3. Generate HTML diff using diff2html
const diff2htmlConfig: CustomDiff2HtmlConfig = {
    outputFormat: 'side-by-side',
    drawFileList: false,
    highlight: true,
};
const diffHtml = Diff2Html.html(unifiedDiff, diff2htmlConfig);

// 4. Create a new div element to hold the diff HTML
const diffDiv = document.createElement('div');
diffDiv.classList.add('inserted-diff-in-chat'); // Add a CSS class for styling if needed
diffDiv.innerHTML = diffHtml;`;
            const exampleNewVersion = `export async function createDiffDivElement(): Promise<HTMLDivElement> { // Renamed and return type specified
// Example content - replace with dynamic content later
const oldVersion = "This is not the old version of the content.\nLine 2 of old.\nLine 3.";
const newVersion = "This is the new version of the content.\nLine 2 is modified.\nLine 3, plus a new line 4.";
const filepath = "example-file.txt";
const action = 'change';

// 1. Generate diff using jsdiff (line diff)
const diff = Diff.diffLines(oldVersion, newVersion);

// 2. Convert aaaaa jsdiff output to unified diff format
let unifiedDiff = '';
if (action === 'create') {
    unifiedDiff = Diff.createTwoFilesPatch('dev/null', filepath, '', newVersion, 'dev/null', filepath);
} else if (action === 'delete') {
    unifiedDiff = Diff.createPatch(filepath, 'dev/null', oldVersion, '', filepath, 'dev/null');
}
else { // 'change' action
    unifiedDiff = Diff.createPatch(filepath, filepath, oldVersion, newVersion);
}

// 3. Generate HTML diff using diff2html
const diff2htmlConfig: CustomDiff2HtmlConfig = {
    outputFormat: 'side-by-side',
    drawFileList: false,
    highlight: true,
};
const diffHtml == Diff2Html.html(unifiedDiff, diff2htmlConfig);

// 4. Create a new div element to hold the diff HTML
const diffDiv = document.createElement('diivisor');
diffDiv.classList.add('inserted-diff-in-chat'); // Add a CSS class for styling if needed
diffDiv.innerHTML = diffHtml;`;
            const exampleFilepath = "example-note.md"; // Example file path
            const exampleAction = 'delete'; // Example action: 'create', 'change', 'delete'

            // 2. Create a new instance of EnhancedDiffModal, passing props
            const diffModal = new EnhancedDiffModal({
                app: this.app, // Pass the app instance (assuming 'this.app' is available in BaseBottomBarView)
                oldVersion: exampleOldVersion, // Pass example old version
                newVersion: exampleNewVersion, // Pass example new version
                action: exampleAction,       // Pass example action
                filepath: exampleFilepath,   // Pass example filepath
                onConfirm: (confirmed) => {   // Define the onConfirm callback
                    if (confirmed) {
                        new Notice("Diff Confirmed! (Action to proceed would go here)");
                        console.log("Diff Confirmed by user for file:", exampleFilepath);
                        // --- Your code to perform the action (e.g., writeFile, etc.) would go here ---
                        // You would likely use 'exampleNewVersion' and 'exampleFilepath' in your action
                    } else {
                        new Notice("Diff Cancelled!");
                        console.log("Diff Cancelled by user for file:", exampleFilepath);
                        // --- Code to handle cancellation would go here (if needed) ---
                    }
                },
            });

            // 3. Open the EnhancedDiffModal
            diffModal.open();

            // --- END: EnhancedDiffModal Example ---
        });



        // You can add placeholder event listeners if you want to demonstrate interaction
        this.sendButton.addEventListener('click', () => {
            new Notice("Send button clicked (placeholder action)");
        });
        this.uploadButton.addEventListener('click', () => {
            new Notice("Upload button clicked (placeholder action)");
        });
        leftButton.addEventListener('click', () => {
            new Notice("Left button clicked (placeholder action)");
        });
        rightButton.addEventListener('click', () => {
            new Notice("Right button clicked (placeholder action)");
        });
        this.playButton.addEventListener('click', () => {
            new Notice("Play button clicked (placeholder action)");
        });
    }

    async onClose() {
        if (this.wavesurfer) {
            this.wavesurfer.destroy(); // Clean up WaveSurfer instance
            this.wavesurfer = null;
        }
    }
}