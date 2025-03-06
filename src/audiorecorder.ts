import { setIcon

 } from "obsidian";
export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private icon: HTMLSpanElement | null = null;

    constructor(private addAudio: (audioUrl: string) => void) { }

    render(container: HTMLDivElement) {
        this.icon = container.createEl('button', {
            attr: { style: 'cursor: pointer; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #444; transition: background 0.2s; margin: 10px auto;' }
        });
        setIcon(this.icon, 'mic');

        this.icon.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.startRecording();
        });
        this.icon.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.stopRecording();
        });
        this.icon.addEventListener('mouseleave', () => {
            if (this.mediaRecorder?.state === 'recording') this.stopRecording();
        });

        this.icon.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startRecording();
        });
        this.icon.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopRecording();
        });
        this.icon.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.stopRecording();
        });

        this.icon.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.mediaRecorder?.state === 'recording') this.stopRecording();
            else this.startRecording();
        });
    }

    private async startRecording() {
        if (this.mediaRecorder?.state === 'recording') return;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.recordedChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            this.recordedChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.recordedChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            this.addAudio(audioUrl);
            this.setRecordingIndicator(false);
        };

        this.mediaRecorder.start();
        this.setRecordingIndicator(true);
    }

    private stopRecording() {
        if (this.mediaRecorder?.state === 'recording') {
            this.mediaRecorder.stop();
        }
    }

    private setRecordingIndicator(isRecording: boolean) {
        if (this.icon) {
            this.icon.style.backgroundColor = isRecording ? '#ff0000' : '#444';
        }
    }
}