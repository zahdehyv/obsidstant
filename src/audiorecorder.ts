export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private icon: HTMLSpanElement | null = null;

    constructor(private addAudio: (audioUrl: string) => void) { }

    render(container: HTMLDivElement) {
        this.icon = container.createEl('span', {
            attr: { style: 'cursor: pointer; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #444; transition: background 0.2s; margin: 10px auto;' }
        });
        this.icon.innerHTML = `
            <svg viewBox="0 0 82.05 122.88" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;">
                <path d="M59.89,20.83V52.3c0,27-37.73,27-37.73,0V20.83c0-27.77,37.73-27.77,37.73,0Zm-14.18,76V118.2a4.69,4.69,0,0,1-9.37,0V96.78a40.71,40.71,0,0,1-12.45-3.51A41.63,41.63,0,0,1,12.05,85L12,84.91A41.31,41.31,0,0,1,3.12,71.68,40.73,40.73,0,0,1,0,56a4.67,4.67,0,0,1,8-3.31l.1.1A4.68,4.68,0,0,1,9.37,56a31.27,31.27,0,0,0,2.4,12.06A32,32,0,0,0,29,85.28a31.41,31.41,0,0,0,24.13,0,31.89,31.89,0,0,0,10.29-6.9l.08-.07a32,32,0,0,0,6.82-10.22A31.27,31.27,0,0,0,72.68,56a4.69,4.69,0,0,1,9.37,0,40.65,40.65,0,0,1-3.12,15.65A41.45,41.45,0,0,1,70,85l-.09.08a41.34,41.34,0,0,1-11.75,8.18,40.86,40.86,0,0,1-12.46,3.51Z"/>
            </svg>
        `;

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