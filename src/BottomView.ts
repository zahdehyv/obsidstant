import { ItemView, WorkspaceLeaf, setIcon, Notice } from 'obsidian';
import WaveSurfer from 'wavesurfer.js';
import { testModal } from './testModal';
import { AudioRecorder } from './audiorecorder';
import { AudioItem } from './fileUploader';
import { StringInputModal } from './clarifyingModal';
import { Pipeline } from './Pipeline';
import MyPlugin from './main';

export const VIEW_TYPE_BASE_BOTTOM_BAR = "base-bottom-bar-view"; // Unique view type

export class BaseBottomBarView extends ItemView {
    private chatDisplayContainer: HTMLDivElement; // Just for visual display
    private waveformContainer: HTMLDivElement; // Container for the waveform display
    private wavesurfer: WaveSurfer | null = null;
    private playButton: HTMLButtonElement | null = null;
    private sendButton: HTMLButtonElement;
    private uploadButton: HTMLButtonElement; // Add upload button
    private testButton: HTMLButtonElement; // Add test button
    private leftButton: HTMLButtonElement;
    private rightButton: HTMLButtonElement;
    private audioRecorder: AudioRecorder;
    private audioList: AudioItem[] = [];
    private currentAudioIndex: number = -1;
    private audioIndexDisplay: HTMLSpanElement; // Element to display audio index
    private pipeline: Pipeline;


    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.audioRecorder = new AudioRecorder((audioUrl) => this.addAudio(audioUrl));
        this.pipeline = new Pipeline(plugin);
    }

    getViewType(): string {
        return VIEW_TYPE_BASE_BOTTOM_BAR;
    }

    getDisplayText(): string {
        return "Base Bottom Bar View"; // Title of the view
    }

    getIcon(): string {
        return "bot-message-square"; // Example icon, choose a relevant one
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
            attr: { style: 'flex: 1; height: 40px; margin-right: 10px; background: #333; border-radius: 30px; overflow: hidden;' } // Basic styling, adjust as needed
        });
        

        // Initialize WaveSurfer (but don't load audio yet)
        this.wavesurfer = WaveSurfer.create({
            container: this.waveformContainer,
            waveColor: '#555',
            progressColor: '#9600ec',
            barWidth: 2,
            barHeight: 1,
            barGap: 2,
            height: 40, // Match container height
            cursorWidth: 0,
            interact: false, // Disable interaction for visualizer only initially
            // responsive: true,
        });

        const counterContainer = row1.createDiv({
            cls: 'count-container', // Add a class for styling
            attr: { style: 'flex: 0.3; height: 40px; margin-right: 10px; background: #333; border-radius: 3px; overflow: hidden;' } // Basic styling, adjust as needed
        });

        // Audio Index Display
        this.audioIndexDisplay = counterContainer.createEl('span', {
            cls: 'audio-index-display',
            attr: { style: 'color: #fff; font-size: 1.8em;' } // Style as needed
        });
        this.updateAudioIndexDisplay(); // Initial update

        // Record Button Container
        const recordButtonContainer = row1.createEl('div', {
            cls: 'record-button-container', // Add a class for styling
            attr: { style: 'flex: 0 0 auto;' } // Adjust flex as needed
        });
        this.audioRecorder.render(recordButtonContainer);
        // this.recordButton = recordButtonContainer.createEl('button', { cls: 'record-button bottom-bar-button' }); // Just a placeholder button
        // setIcon(this.recordButton, 'mic'); // Example icon for record

        // this.recordButton.addEventListener('click', () => {
        //     if (this.audioRecorder.isRecording) {
        //         this.audioRecorder.stopRecording();
        //         setIcon(this.recordButton, 'mic'); // Change icon back to mic
        //     } else {
        //         this.audioRecorder.startRecording();
        //         setIcon(this.recordButton, 'stop-recording'); // Change icon to stop
        //     }
        // });


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
        this.leftButton = group1Container.createEl('button', {
            cls: ['obsidian-button', 'grouped-button', 'bottom-bar-button'] // Add classes for styling
        });
        setIcon(this.leftButton, 'chevron-left'); // Example icon - choose as desired

        // Play Button
        this.playButton = group1Container.createEl('button', {
            cls: ['obsidian-button', 'grouped-button', 'bottom-bar-button'] // Add classes for styling
        });
        setIcon(this.playButton, 'play'); // Example icon - choose as desired

        // Right Button
        this.rightButton = group1Container.createEl('button', {
            cls: ['obsidian-button', 'grouped-button', 'bottom-bar-button'] // Add classes for styling
        });
        setIcon(this.rightButton, 'chevron-right'); // Example icon - choose as desired


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
            const modal = new StringInputModal(this.app, "SSSSASASFASFASFASFASFSAFASFASFAF");
			const result = await modal.openAndGetValue(); // Await the Promise
        });

        this.playButton.addEventListener('click', () => {
            if (this.currentAudioIndex !== -1 && this.wavesurfer) {
                this.wavesurfer.playPause();
            } else {
                new Notice("No audio loaded.");
            }
        });

        this.wavesurfer.on('play', () => {
            if (this.playButton) {
                setIcon(this.playButton, 'pause');
            }
        });

        this.wavesurfer.on('pause', () => {
            if (this.playButton) {
                setIcon(this.playButton, 'play');
            }
        });


        this.leftButton.addEventListener('click', () => {
            if (this.audioList.length > 0) {
                this.currentAudioIndex--;
                if (this.currentAudioIndex < 0) {
                    this.currentAudioIndex = this.audioList.length - 1; // Loop to the last audio
                }
                this.loadAudioToWaveform(this.audioList[this.currentAudioIndex].url);
                this.updateAudioIndexDisplay(); 
            } else {
                new Notice("No audio recorded yet.");
            }
        });

        this.rightButton.addEventListener('click', () => {
            if (this.audioList.length > 0) {
                this.currentAudioIndex++;
                if (this.currentAudioIndex >= this.audioList.length) {
                    this.currentAudioIndex = 0; // Loop to the first audio
                }
                this.loadAudioToWaveform(this.audioList[this.currentAudioIndex].url);
                this.updateAudioIndexDisplay(); 
            } else {
                new Notice("No audio recorded yet.");
            }
        });


        // You can add placeholder event listeners if you want to demonstrate interaction
        this.sendButton.addEventListener('click', async () => {
            new Notice("Send button clicked");
            // const result = await this.pipeline.pipe(this.audioList[this.currentAudioIndex].uploadData.file);
            const result = await this.pipeline.pipe(this.audioList[this.currentAudioIndex])
                
            this.chatDisplayContainer.textContent = result;
                     
            // let full = '';
            // for await (const chunkText of result) {
            //   full = full + chunkText;
            //   this.chatDisplayContainer.textContent = full
            // }
        });

    }
    private updateAudioIndexDisplay() {
        if (this.audioIndexDisplay) {
            if (this.audioList.length > 0 && this.currentAudioIndex !== -1) {
                this.audioIndexDisplay.textContent = `${this.currentAudioIndex + 1}/${this.audioList.length}`;
            } else {
                this.audioIndexDisplay.textContent = "0/0"; // Or any default text when no audio
            }
        }
    }
        


    private addAudio(audioUrl: string) {
        const newAudioItem: AudioItem = {
            url: audioUrl,
            uploaded: false,
            uploadData: null
        };
        this.audioList.push(newAudioItem);
        this.currentAudioIndex = this.audioList.length - 1; // Set current index to the newly added audio
        this.loadAudioToWaveform(audioUrl);
        new Notice(`Audio recorded and added.`);
        this.updateAudioIndexDisplay(); 
    }


    private loadAudioToWaveform(audioUrl: string) {
        if (this.wavesurfer) {
            this.wavesurfer.load(audioUrl);
            this.wavesurfer.on('ready', () => {
                if (this.playButton) {
                    setIcon(this.playButton, 'play'); // Ensure play icon is shown after loading new audio
                }
            });
        }
    }


    async onClose() {
        if (this.wavesurfer) {
            this.wavesurfer.destroy(); // Clean up WaveSurfer instance
            this.wavesurfer = null;
        }
    }
}