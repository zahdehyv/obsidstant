import { App, Plugin, Notice, PluginSettingTab, Setting, ItemView, WorkspaceLeaf } from 'obsidian';
import { GoogleGenerativeAI, SchemaType, FunctionCallingMode, ChatSession, Part } from '@google/generative-ai';
import WaveSurfer from 'wavesurfer.js';
import Sortable from 'sortablejs';

interface MyPluginSettings {
    GOOGLE_API_KEY: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    GOOGLE_API_KEY: 'your-default-api-key',
};

class ChatbotView extends ItemView {
    private chatContainer: HTMLDivElement;
    private answerContainer: HTMLDivElement; // New container for answers
    private audioRecorder: AudioRecorder;
    private currentAudioUrl: string | null = null;
    private wavesurfer: WaveSurfer | null = null;
    private playButton: HTMLButtonElement | null = null;
    private genAI: GoogleGenerativeAI | null = null;
    private chatSession: ChatSession | null = null; // ChatSession for multi-turn conversations
    private textInput: HTMLTextAreaElement;
    private pictureButton: HTMLButtonElement;
    private sendButton: HTMLButtonElement;
    private processButton: HTMLButtonElement;

    constructor(leaf: WorkspaceLeaf, private googleApiKey: string) {
        super(leaf);
        this.audioRecorder = new AudioRecorder((audioUrl) => this.addAudio(audioUrl));
        if (googleApiKey) {
            this.genAI = new GoogleGenerativeAI(googleApiKey);
        }
    }

    getViewType(): string {
        return 'chatbot-view';
    }

    getDisplayText(): string {
        return 'Chatbot';
    }

    getIcon(): string {
        return 'message-circle';
    }

    async onOpen() {
        const { containerEl } = this;
        containerEl.empty();

        // Set up the container for the view
        containerEl.style.display = 'flex';
        containerEl.style.flexDirection = 'column';
        containerEl.style.justifyContent = 'flex-end';
        containerEl.style.height = '100%';
        containerEl.style.backgroundColor = '#1e1e1e';
        containerEl.style.color = '#ffffff';

        // Answer container (for displaying answers)
        this.answerContainer = containerEl.createEl('div', {
            attr: {
                style: 'flex: 1; overflow-y: auto; padding: 10px; background: #2d2d2d; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;'
            }
        });

        // Chat container (sortable cards container for editing)
        this.chatContainer = containerEl.createEl('div', {
            attr: {
                style: 'flex: 1; overflow-y: auto; padding: 10px; background: #2d2d2d; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;'
            }
        });

        // Make the chat container sortable
        Sortable.create(this.chatContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
        });

        // Add the input and buttons container at the bottom
        const inputContainer = containerEl.createEl('div', {
            attr: {
                style: 'width: 100%; display: flex; align-items: center; gap: 10px; margin-bottom: 0px; padding: 0 10px;'
            }
        });

        // Text input (changed to <textarea>)
        this.textInput = inputContainer.createEl('textarea', {
            attr: {
                placeholder: 'Type your message...',
                style: 'flex: 1; padding: 10px; border: 1px solid #444; border-radius: 4px; background: #2d2d2d; color: #ffffff; height: 60px; resize: none;'
            }
        });

        // Send button
        this.sendButton = inputContainer.createEl('button', {
            attr: {
                style: 'background:rgb(53, 53, 53); color: white; border: none; border-radius: 4px; padding: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;'
            }
        });
        this.sendButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
        `;

        // Picture button
        this.pictureButton = inputContainer.createEl('button', {
            attr: {
                style: 'background:rgb(53, 53, 53); color: white; border: none; border-radius: 4px; padding: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;'
            }
        });
        this.pictureButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;">
                <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
            </svg>
        `;

        const recordButtonContainer = inputContainer.createEl('div');
        this.audioRecorder.render(recordButtonContainer);

        // Handle picture button click
        this.pictureButton.addEventListener('click', () => {
            this.handlePictureUpload();
        });

        // Handle send button click
        this.sendButton.addEventListener('click', () => {
            this.handleTextInput();
        });

        // Handle text input submission (e.g., pressing Enter without Shift)
        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleTextInput();
            }
        });

        // Add the big process button below the input container
        this.processButton = containerEl.createEl('button', {
            attr: {
                style: 'height:10%; width: 100%; background: #6200ee; color: white; border: none; border-radius: 4px; padding: 15px; font-size: 24px; cursor: pointer; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); transition: background 0.3s, box-shadow 0.3s; margin-top: 0px; margin-bottom: 0px;'
            }
        });
        this.processButton.innerText = 'PROCESS';

        // Add hover and active effects for Material Design
        this.processButton.addEventListener('mouseenter', () => {
            this.processButton.style.backgroundColor = '#3700b3';
            this.processButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        });
        this.processButton.addEventListener('mouseleave', () => {
            this.processButton.style.backgroundColor = '#6200ee';
            this.processButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        });
        this.processButton.addEventListener('mousedown', () => {
            this.processButton.style.backgroundColor = '#000000';
            this.processButton.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
        });
        this.processButton.addEventListener('mouseup', () => {
            this.processButton.style.backgroundColor = '#3700b3';
            this.processButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        });

        // Handle process button click
        this.processButton.addEventListener('click', async () => {
            new Notice('SENDING REQUEST');
            await this.processAudio();
            this.moveItemsToAnswerContainer(); // Move items to answer container after processing
        });

        // Initialize the model and start the ChatSession
        if (this.genAI) {
            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.0-flash-exp",
                systemInstruction: `
Eres un asistente inteligente con acceso a herramientas específicas para gestionar y manipular archivos, así como para comunicarte con el usuario. Entre tus capacidades, puedes:

1. **Crear archivos**: Puedes generar archivos en una ruta específica con un contenido determinado utilizando la función \`createFile\`. Los archivos deben ser en formato Markdown (.md) y utilizar sus facilidades, como encabezados (#), listas (-), negritas (**texto**), enlaces ([[filename]]), etc.
2. **Enviar mensajes al usuario**: Puedes comunicarte con el usuario de manera clara y directa utilizando la función \`tellUser\`. Los mensajes deben ser cortos, claros y concisos, evitando información innecesaria o extensa.
3. **Organizar archivos en carpetas**: Puedes crear carpetas para organizar los archivos si es necesario. Por ejemplo, si el archivo contiene información sobre un perro, puedes guardarlo en \`animales/perro.md\`.
4. **Documentar acciones**: Puedes crear un archivo que documente las acciones llevadas a cabo, como un registro de las tareas realizadas.
5. **Tomar decisiones autónomas**: En algunas ocasiones, debes decidir por tu cuenta si es necesario crear archivos o carpetas para cumplir con la solicitud del usuario de manera óptima.

Recuerda que toda comunicación o información que debas proporcionar al usuario final debe realizarse exclusivamente a través de la función \`tellUser\`. Los mensajes enviados a través de \`tellUser\` deben ser cortos y claros.

Cuando crees archivos, asegúrate de usar nombres que reflejen claramente el contenido del archivo. Por ejemplo, si el archivo contiene información sobre un informe financiero, un nombre adecuado podría ser \`informe_financiero_2023.md\`. Esto ayudará al usuario a identificar fácilmente el propósito del archivo.

Además, cuando generes contenido para archivos, utiliza formato Markdown para mejorar la legibilidad y estructura del texto. Por ejemplo, usa encabezados (#, ##), listas (-, *), negritas (**texto**) y otros elementos de Markdown para organizar la información de manera clara y profesional.

Como gestor de archivos, evalúa cuidadosamente si es necesario crear nuevos archivos o realizar cambios en los existentes. Solo procede con estas acciones si son esenciales para cumplir con la solicitud del usuario o si el usuario lo solicita explícitamente. Prioriza la claridad y la eficiencia en tu gestión, asegurándote de que todas las acciones estén justificadas y sean útiles para el usuario.
`,
                tools: [
                    {
                        functionDeclarations: [
                            {
                                name: "createFile",
                                description: "Crea un archivo en una ruta específica con un contenido determinado.",
                                parameters: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        path: {
                                            type: SchemaType.STRING,
                                            description: "La ruta del archivo a crear."
                                        },
                                        content: {
                                            type: SchemaType.STRING,
                                            description: "El contenido del archivo."
                                        },
                                    },
                                    required: ["path", "content"],
                                },
                            },
                            {
                                name: "tellUser",
                                description: "Envía un mensaje al usuario.",
                                parameters: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        message: {
                                            type: SchemaType.STRING,
                                            description: "El mensaje a enviar al usuario."
                                        },
                                    },
                                    required: ["message"],
                                },
                            },
                        ],
                    },
                ],
                toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
            });

            // Start the ChatSession
            this.chatSession = model.startChat();
        }
    }

    private async handleTextInput() {
        const text = this.textInput.value.trim();
        if (text && this.chatSession) {
            this.addTextCard(text, 'user'); // Add user message to the chat container
            this.textInput.value = '';

            // Send the message to the ChatSession
            // const result = await this.chatSession.sendMessage(text);
            // const responseText = result.response.text();
            // console.log("generated")
            // console.log(responseText)

            // Add the model's response to the chat container
            // this.addTextCard(responseText, 'model');
        }
    }

    private addAudio(audioUrl: string) {
        const card = this.chatContainer.createEl('div', {
            attr: {
                style: 'background: #444; padding: 10px; border-radius: 8px; margin-bottom: 10px;'
            }
        });
    
        // Add the standard <audio> element for playback (hidden)
        const audioElement = card.createEl('audio', {
            attr: {
                src: audioUrl,
                controls: 'true', // Enable playback controls
                style: 'display: none;' // Hide the <audio> element
            }
        });
    
        // Add a container for the WaveSurfer waveform
        const waveformContainer = card.createEl('div', {
            attr: { style: 'width: 100%; height: 100px; margin-bottom: 10px;' }
        });
    
        // Initialize WaveSurfer
        this.wavesurfer = WaveSurfer.create({
            container: waveformContainer,
            waveColor: '#555',
            progressColor: '#1e90ff',
            barWidth: 2,
            barHeight: 1,
            barGap: 2,
            height: 100,
            cursorWidth: 0,
            interact: true,
            url: audioUrl,
        });
    
        // Add a play/pause button for WaveSurfer
        const playButton = card.createEl('button', {
            attr: { style: 'background: none; border: none; cursor: pointer; margin-right: 10px;' }
        });
        playButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;">
                <path d="M8 5v14l11-7z"/>
            </svg>
        `;
    
        playButton.addEventListener('click', () => {
            if (this.wavesurfer) {
                this.wavesurfer.playPause();
            }
        });
    
        // Update the play button icon based on playback state
        if (this.wavesurfer) {
            this.wavesurfer.on('play', () => {
                playButton.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                `;
            });
            this.wavesurfer.on('pause', () => {
                playButton.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                `;
            });
        }
    
        this.currentAudioUrl = audioUrl;
    }
    
    private updatePlayButton(isPlaying: boolean) {
        if (this.playButton) {
            this.playButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;">
                    <path d="${isPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'}"/>
                </svg>
            `;
        }
    }
    private handlePictureUpload() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
    
        fileInput.addEventListener('change', async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const base64Image = await this.fileToBase64(file);
                this.addImageCard(base64Image);
            }
        });
    
        fileInput.click();
    }
    
    private async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to read file as base64.'));
                }
            };
            reader.onerror = () => {
                reject(new Error('Failed to read file.'));
            };
            reader.readAsDataURL(file);
        });
    }
    
    private addImageCard(base64Image: string) {
        const card = this.chatContainer.createEl('div', {
            attr: {
                style: 'background: #444; padding: 10px; border-radius: 8px;'
            }
        });
        const img = card.createEl('img', {
            attr: {
                src: base64Image,
                style: 'max-width: 100%; border-radius: 4px;'
            }
        });
    }
    
    private async processAudio() {
        if (!this.genAI || !this.chatSession) {
            new Notice('Google API key is not set or ChatSession is not initialized.');
            return;
        }
    
        try {
            // Collect all elements from the chat container and convert HTMLCollection to an array
            const elements = Array.from(this.chatContainer.children);
    
            // Prepare an array to hold the content to be sent to the ChatSession
            const contentToSend: (string | Part)[] = [];
    
            // Iterate through each element in the chat container
            for (const element of elements) {
                if (element instanceof HTMLElement && element.tagName === 'DIV') {
                    // Handle text messages
                    if (element.textContent && !element.querySelector('img') && !element.querySelector('audio')) {
                        contentToSend.push({text: element.textContent}); // Add text content only if no image or audio is present
                    }
    
                    // Handle images
                    const imgElement = element.querySelector('img');
                    if (imgElement && imgElement instanceof HTMLImageElement && imgElement.src) {
                        const base64Image = imgElement.src.split(',')[1]; // Extract base64 data
                        contentToSend.push({
                            inlineData: {
                                data: base64Image,
                                mimeType: 'image/png', // Adjust MIME type if necessary
                            },
                        });
                    }
    
                    // Handle audio
                    const audioElement = element.querySelector('audio');
                    if (audioElement && audioElement instanceof HTMLAudioElement && audioElement.src) {
                        try {
                            const response = await fetch(audioElement.src);
                            if (!response.ok) {
                                throw new Error(`Failed to fetch audio: ${response.statusText}`);
                            }
    
                            const blob = await response.blob();
                            const arrayBuffer = await blob.arrayBuffer();
                            const base64Audio = this.arrayBufferToBase64(arrayBuffer);
    
                            // Log the audio data for debugging
                            // console.log('Audio data:', {
                            //     src: audioElement.src,
                            //     size: blob.size,
                            //     type: blob.type,
                            //     base64Length: base64Audio.length,
                            // });
    
                            // Add the audio data as inlineData
                            contentToSend.push({
                                inlineData: {
                                    data: base64Audio,
                                    mimeType: blob.type || 'audio/wav', // Use the blob type or fallback to 'audio/wav'
                                },
                            });
                        } catch (error) {
                            console.error('Error processing audio:', error);
                            new Notice('Failed to process audio. Check the console for details.');
                        }
                    }
                }
            }
    
            // If no content is found, show a notice and return
            if (contentToSend.length === 0) {
                new Notice('No content to process.');
                return;
            }
    
            // Send all content to the ChatSession
            // console.log("contentToSend");
            // console.log(contentToSend);
            contentToSend.push({text: "INSERT_INPUT_HERE"});
            const result = await this.chatSession.sendMessage(contentToSend);
            // console.log("result.response");
            // console.log(result.response);
            
            // Define the functions that the model can call
        const functions: { [name: string]: Function } = {
            createFile: this.createFile.bind(this),
            tellUser: this.tellUser.bind(this),
        };

        // Handle function calls in the response
        if (result.response.candidates) {
            for (const candidate of result.response.candidates) {
                for (const part of candidate.content.parts) {
                    if (part.functionCall) {
                        const { name, args } = part.functionCall;
                        const functionRef = functions[name];
                        if (!functionRef) {
                            throw new Error(`Unknown function "${name}"`);
                        }

                        // Execute the function
                        const functionResponse = await functionRef(args);
                        // new Notice(`Function "${name}" executed: ${functionResponse}`);
                    }
                }
            }
        }
            // Display the model's response
            // const responseText = result.response.text();
            // if (responseText != "")
            // {this.addTextCard(responseText, 'model');} // Add the model's response to the chat container
            new Notice('Processing complete.');
        } catch (error) {
            new Notice('Failed to process content with Gemini.');
            console.error('Error processing content:', error);
        }
    }

    private addTextCard(text: string, role: 'user' | 'model') {
        const card = this.chatContainer.createEl('div', {
            attr: {
                style: `background: ${role === 'user' ? '#444' : '#333'}; padding: 10px; border-radius: 8px; color: #fff; margin-bottom: 10px;`
            }
        });
        card.innerText = `${role === 'user' ? 'You: ' : 'Model: '}${text}`;
    }

    private moveItemsToAnswerContainer() {
        while (this.chatContainer.firstChild) {
            this.answerContainer.appendChild(this.chatContainer.firstChild);
        }
    }

    private async createFile(args: { path: string; content: string }): Promise<string> {
        try {
            const contentWithNewlines = args.content.replace(/\\n/g, '\n');
            const folderPath = args.path.split('/').slice(0, -1).join('/');

            if (folderPath) {
                const folderExists = await this.app.vault.adapter.exists(folderPath);
                if (!folderExists) {
                    await this.app.vault.createFolder(folderPath);
                    // new Notice(`Created folder: ${folderPath}`);
                }
            }

            await this.app.vault.adapter.write(args.path, contentWithNewlines);
            new Notice(`File created successfully at ${args.path}`);
            return `File created successfully at ${args.path}`;
        } catch (error) {
            throw new Error(`Failed to create file: ${error}`);
        }
    }

    private tellUser(args: { message: string }): string {
        this.addTextCard(args.message, 'model'); // Add the message to the chat container in the "model" role
        return `User notified with message: ${args.message}`;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}

class AudioRecorder {
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

class SampleSettingTab extends PluginSettingTab {
    constructor(app: App, private plugin: MyPlugin) {
        super(app, plugin);
    }

    async display() {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Google API key')
            .setDesc('It\'s a secret API key')
            .addText(text => {
                text
                    .setPlaceholder('Enter your API key')
                    .setValue(this.plugin.settings.GOOGLE_API_KEY)
                    .inputEl.setAttribute('type', 'password');
                text.onChange(async (value) => {
                    this.plugin.settings.GOOGLE_API_KEY = value;
                    await this.plugin.saveSettings();
                });
            });
    }
}

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(
            'chatbot-view',
            (leaf: WorkspaceLeaf) => new ChatbotView(leaf, this.settings.GOOGLE_API_KEY)
        );

        this.addRibbonIcon('message-circle', 'Open Chatbot', () => {
            this.activateView();
        });

        this.addCommand({
            id: 'open-chatbot',
            name: 'Open Chatbot',
            callback: () => {
                this.activateView();
            }
        });

        this.addSettingTab(new SampleSettingTab(this.app, this));
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType('chatbot-view');

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            if (!leaf) {
                leaf = workspace.getLeaf('tab');
            }
            await leaf.setViewState({ type: 'chatbot-view', active: true });
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        } else {
            new Notice('Failed to open Chatbot view. Please try again.');
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}