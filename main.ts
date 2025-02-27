
import { GoogleGenerativeAI, SchemaType, FunctionCallingMode, ChatSession, Part, GenerativeModel, Content } from '@google/generative-ai';
import WaveSurfer from 'wavesurfer.js';
import Sortable from 'sortablejs';

import DiffMatchPatch from 'diff-match-patch'; // Default import

import { App, Plugin, Notice, PluginSettingTab, Setting, ItemView, WorkspaceLeaf, MarkdownRenderer, Modal, ButtonComponent } from 'obsidian'; // Make sure Modal and ButtonComponent are here

class ConfirmModal extends Modal {
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


interface MyPluginSettings {
    GOOGLE_API_KEY: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    GOOGLE_API_KEY: 'your-default-api-key',
};

// Define interfaces for different message types
interface LogMessage {
    timestamp: Date;
    content: string;
    type: 'user' | 'model' | 'function' | 'error'; // Add the type property
}

interface UserMessage extends LogMessage {
    type: 'user'; // No need to redefine 'type' here
}

interface ModelMessage extends LogMessage {
    type: 'model'; // No need to redefine 'type' here
}

interface FunctionMessage extends LogMessage {
    type: 'function'; // No need to redefine 'type' here
    functionName: string;
    result: string;
}

interface ErrorMessage extends LogMessage {
    type: 'error'; // No need to redefine 'type' here
    error: Error;
}


class ChatbotView extends ItemView {
    private chatContainer: HTMLDivElement;
    private answerContainer: HTMLDivElement;
    private audioRecorder: AudioRecorder;
    private currentAudioUrl: string | null = null;
    private wavesurfer: WaveSurfer | null = null;
    private playButton: HTMLButtonElement | null = null;
    private genAI: GoogleGenerativeAI | null = null;
    private chatSession: ChatSession | null = null;
    private textInput: HTMLTextAreaElement;
    private pictureButton: HTMLButtonElement;
    private sendButton: HTMLButtonElement;
    private processButton: HTMLButtonElement;
    private model: GenerativeModel;

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

        containerEl.style.display = 'flex';
        containerEl.style.flexDirection = 'column';
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
                style: 'flex: 0 0 auto; overflow-y: auto; padding: 10px; background: #2d2d2d; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;'
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
        const buttonContainer = containerEl.createEl('div', {
            attr: {
                style: 'display: flex; gap: 10px; width: 100%; height: 10%; margin-top: 10px;'
            }
        });

        // Add the PROCESS button
this.processButton = buttonContainer.createEl('button', {
    attr: {
        style: 'flex: 1; height: 100%; background: #6200ee; color: white; border: none; border-radius: 4px; padding: 15px; font-size: 24px; cursor: pointer; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); transition: background 0.3s, box-shadow 0.3s; display: flex; align-items: center; justify-content: center;'
    }
});
this.processButton.innerHTML = '✓'; // Checkmark symbol

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
    this.disableButtons();
    const loadingIndicator = this.addLoadingIndicator();
    await this.processRequest();
    this.enableButtons();
    loadingIndicator.remove()
});

        // Add the RESET HISTORY button
const resetButton = buttonContainer.createEl('button', {
    attr: {
        style: 'flex: 0 0 auto; height: 100%; background: #6200ee; color: white; border: none; border-radius: 4px; padding: 15px; font-size: 24px; cursor: pointer; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); transition: background 0.3s, box-shadow 0.3s; display: flex; align-items: center; justify-content: center;'
    }
});
resetButton.innerHTML = '🔄'; // Refresh icon

// Add hover and active effects for the reset button
resetButton.addEventListener('mouseenter', () => {
    resetButton.style.backgroundColor = '#3700b3';
    resetButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
});
resetButton.addEventListener('mouseleave', () => {
    resetButton.style.backgroundColor = '#6200ee';
    resetButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
});
resetButton.addEventListener('mousedown', () => {
    resetButton.style.backgroundColor = '#000000';
    resetButton.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
});
resetButton.addEventListener('mouseup', () => {
    resetButton.style.backgroundColor = '#3700b3';
    resetButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
});

// Handle reset button click
resetButton.addEventListener('click', () => {
    this.resetChatHistory();
});

        // Initialize the model and start the ChatSession
        if (this.genAI) {
            const vaultContext = await this.loadVaultContext();

            this.model = this.genAI.getGenerativeModel({
                model: "gemini-2.0-flash-exp",
                systemInstruction: `
Eres un asistente inteligente diseñado para gestionar y organizar información dentro de un sistema de archivos, con especial enfoque en la creación y modificación de archivos Markdown (.md). Tienes acceso a diversas herramientas para realizar tus tareas de manera efectiva y eficiente.

**Funcionalidades Principales:**

1. **Creación y Modificación de Archivos Markdown:**
    *   Utiliza la función \`writeFile\` para generar nuevos archivos .md en la ruta especificada.
    *   Si un archivo ya existe en la ruta dada, la función \`writeFile\` lo modificará, **conservando el contenido original**. Debes tener en cuenta el contenido previo al realizar cualquier modificación.
    *   Aprovecha las funcionalidades de Markdown para estructurar el contenido: encabezados (#, ##, ###), listas (-, *), negritas (**texto**), cursivas (*texto*), enlaces ([texto](ruta_del_archivo.md)), etc.
    *   Los nombres de archivo deben ser intuitivos y descriptivos, utilizando mayúsculas al inicio de cada palabra como si fueran títulos (ej: "Introduccion A La Fisica Cuantica.md").
    *   Los links internos deben estar integrados de manera fluida en el texto, usando la sintaxis [texto_del_link](ruta_del_archivo.md). Utiliza nombres de link que tengan sentido en el contexto, aunque no sean exactamente iguales al nombre del archivo (ej: [gatos](Animales/Gatos.md), si el archivo se llama "Gatos Domesticos").

2. **Organización de Archivos en Carpetas:**
    *   Puedes crear carpetas para estructurar la información de forma lógica y jerárquica. Ejemplo: \`animales/gatos.md\`, \`historia/roma_antigua.md\`.
    *   Decide de manera autónoma la estructura de carpetas más adecuada según el contenido y la información proporcionada.

3. **Uso de Modelo de Razonamiento:**
    *   Puedes llamar a un modelo de razonamiento cuando lo consideres necesario para tareas complejas o que requieran mayor análisis.

4. **Incorporación de Contexto:**
    *   Puedes agregar información adicional al contexto durante el proceso para mejorar la calidad de tus respuestas.

5. **Formatos de Escritura Específicos:**
    *   Adapta el formato de escritura al contexto de la información:
        *   **Listas:** Para enumerar información, tareas, o puntos clave. Ejemplo:
            \`\`\`markdown
            - Item 1
            - Item 2
            - Item 3
            \`\`\`
        *   **Wikipedia:** Para artículos enciclopédicos, utilizando encabezados y secciones. Ejemplo:
            \`\`\`markdown
            # Título del Artículo
            ## Introducción
            Texto introductorio...
            ## Historia
            Texto sobre la historia...
            \`\`\`
        *   **Paper (Artículo Académico):** Para documentos con un formato formal, con secciones como introducción, método, resultados, discusión y conclusiones. Ejemplo:
            \`\`\`markdown
            # Título del Paper
            ## Introducción
            Texto introductorio y objetivos...
            ## Metodología
            Texto sobre la metodología...
            \`\`\`
        *   **Blog:** Para entradas de blog más informales, con un estilo conversacional. Ejemplo:
            \`\`\`markdown
            # Título del Blog Post
            ## Introducción
            Texto de introducción...
            ## Cuerpo del Post
            Más texto...
            \`\`\`

6. **Comunicación con el Usuario:**
    *   Realiza aclaraciones si has tomado alguna acción o necesitas responder alguna pregunta.

**Prioridades:**

*   La prioridad es mantener la información organizada y accesible.
*   Asegúrate que los archivos creados y modificados sean útiles para el usuario.
*   Cuando determines que el usuario ha solicitado algo ambiguo o que podria ser mas de una accion, pregunta para aclarar.

**Ejemplo:**

Si el usuario te dice: "Necesito información sobre los gatos", podrías:
1. Buscar en la bóveda si ya existe un archivo sobre gatos.
2. Si no existe, crear un archivo llamado \`Animales/Gatos Domesticos.md\` con información básica.
3. Aclarar: "He creado el archivo \`Animales/Gatos Domesticos.md\` con información básica sobre los gatos".
`,
                tools: [
                    {
                        functionDeclarations: [
                            {
                                name: "writeFile",
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
                            // {
                            //     name: "tellUser",
                            //     description: "Envía un mensaje al usuario.",
                            //     parameters: {
                            //         type: SchemaType.OBJECT,
                            //         properties: {
                            //             message: {
                            //                 type: SchemaType.STRING,
                            //                 description: "El mensaje a enviar al usuario."
                            //             },
                            //         },
                            //         required: ["message"],
                            //     },
                            // },
                        ],
                    },
                ],
                toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
            });

            // Start the ChatSession
            this.chatSession = this.model.startChat({
                history: [vaultContext,
                    {
                        role: 'model', // The role is 'user' because the user is providing the context
                        parts: [{text:"Info recibida. En que puedo ayudarte?"}],
                    }
                ], // Pass the vault context as initial messages
            });
        }
    }

    private async resetChatHistory() {
        // Clear the chat and answer containers
        this.chatContainer.empty();
        this.answerContainer.empty();
    
        // Reinitialize the ChatSession with the updated vault context
        if (this.genAI) {
            const vaultContext = await this.loadVaultContext(); // Reload the vault context
    
            this.chatSession = this.model.startChat({
                history: [
                    vaultContext, // Add the reloaded vault context
                    {
                        role: 'model', // The role is 'user' because the user is providing the context
                        parts: [{ text: "Info recibida. En que puedo ayudarte?" }],
                    },
                ], // Pass the vault context as initial messages
            });
        }
    
        // Adjust the chat container height
        this.adjustChatContainerHeight();
    
        // Notify the user that the chat history has been reset
        new Notice('Chat history reset successfully.');
    }

    private async handleTextInput() {
        const text = this.textInput.value.trim();
        if (text && this.chatSession) {
            const userMessage: UserMessage = {
                type: 'user',
                timestamp: new Date(),
                content: text,
            };
            this.addLogMessage(userMessage);
            this.textInput.value = '';
        }
    }

    private addLogMessage(message: LogMessage, targetContainer: HTMLElement = this.chatContainer) {
        const card = targetContainer.createEl('div', {
            attr: {
                style: `background: ${this.getMessageColor(message)}; padding: 10px; border-radius: 8px; color: #fff; margin-bottom: 10px; position: relative; word-wrap: break-word; white-space: pre-wrap; overflow-wrap: break-word;`
            }
        });
    
        const timestamp = card.createEl('div', {
            attr: {
                style: 'font-size: 0.8em; color: #ccc; margin-bottom: 5px;'
            }
        });
        timestamp.innerText = message.timestamp.toLocaleString();
    
        const content = card.createEl('div', {
            attr: {
                style: 'word-wrap: break-word; white-space: pre-wrap; overflow-wrap: break-word; width: 100%;' // Ensure the content wraps
            }
        });
    
        if (message.type === 'function') {
            const functionMessage = message as FunctionMessage;
            content.innerText = `[Function] ${functionMessage.functionName}: ${functionMessage.result}`;
        } else if (message.type === 'error') {
            const errorMessage = message as ErrorMessage;
            content.innerText = `[Error] ${errorMessage.error.message}`;
        } else {
            // Render Markdown for user and model messages
            const prefix = message.type === 'user' ? 'You: ' : 'Model: ';
            MarkdownRenderer.renderMarkdown(
                `${prefix}${message.content}`, // The Markdown content to render
                content, // The container to render the Markdown into
                '', // The file path (optional, can be an empty string)
                this // The component context (usually `this`)
            );
        }
    
        const removeButton = card.createEl('button', {
            attr: {
                style: 'position: absolute; top: 5px; right: 5px; background: transparent; border: none; color: #fff; cursor: pointer; font-size: 16px; width: 17px; height: 17px;'
            }
        });
        removeButton.innerText = '×';
    
        removeButton.addEventListener('click', () => {
            card.remove();
            this.adjustChatContainerHeight();
        });
    
        this.adjustChatContainerHeight();
    }

    private getMessageColor(message: LogMessage): string {
        switch (message.type) {
            case 'user':
                return '#007bff'; // Blue for user messages
            case 'model':
                return '#28a745'; // Green for model messages
            case 'function':
                return '#ffc107'; // Yellow for function executions
            case 'error':
                return '#dc3545'; // Red for errors
            default:
                return '#444'; // Default color
        }
    }

    private async loadVaultContext(): Promise<Content> {
        const parts: Part[] = [];
    
        // Add an introductory message
        parts.push({ text: 'Datos del usuario:' });
    
        // Get all markdown files in the vault
        const files = this.app.vault.getMarkdownFiles();
    
        // Iterate over each file
        for (const file of files) {
            // Read the file content
            const content = await this.app.vault.read(file);
    
            // Add the file content to the parts
            parts.push({ text: `[${file.name}]\n\`\`\`\n${content}\n\`\`\`` });
        }
    
        // Add a closing message
        parts.push({ text: 'FIN DE LOS DATOS' });
    
        // Return a single Content object with all parts
        return {
            role: 'user', // The role is 'user' because the user is providing the context
            parts: parts,
        };
    }

    private async processRequest() {


        if (!this.genAI || !this.chatSession) {
            const errorMessage: ErrorMessage = {
                type: 'error',
                timestamp: new Date(),
                content: 'Google API key is not set or ChatSession is not initialized.',
                error: new Error('Google API key is not set or ChatSession is not initialized.'),
            };
            this.addLogMessage(errorMessage, this.answerContainer);
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
                        contentToSend.push({ text: element.textContent });
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

                            // Add the audio data as inlineData
                            contentToSend.push({
                                inlineData: {
                                    data: base64Audio,
                                    mimeType: blob.type || 'audio/wav', // Use the blob type or fallback to 'audio/wav'
                                },
                            });
                        } catch (error) {
                            const errorMessage: ErrorMessage = {
                                type: 'error',
                                timestamp: new Date(),
                                content: `Failed to process audio. Error: ${error}`, // Include the error details
                                error: error as Error,
                            };
                            this.addLogMessage(errorMessage, this.answerContainer); // Explicitly specify the chatContainer
                            console.error('Error processing audio:', error); // Log the error to the console

                        }
                    }
                }
            }

            // If no content is found, show a LOG and return
            if (contentToSend.length === 0) {
                const errorMessage: ErrorMessage = {
                    type: 'error',
                    timestamp: new Date(),
                    content: 'No content to process.',
                    error: new Error('No content to process.'),
                };
                this.addLogMessage(errorMessage, this.answerContainer);
                return;
            }

            contentToSend.push({ text: "INSERT_INPUT_HERE" });
            const result = await this.chatSession.sendMessage(contentToSend);
            console.log("result");
            console.log(result);
            const modelText: ModelMessage = {
                type: 'model',
                timestamp: new Date(),
                content: result.response.text(),
            };
            this.addLogMessage(modelText);


            // Define the functions that the model can call
            const functions: { [name: string]: Function } = {
                writeFile: this.writeFile.bind(this),
                // tellUser: this.tellUser.bind(this),
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
                            
                            
                            // const functionMessage: FunctionMessage = {
                            //     type: 'function',
                            //     timestamp: new Date(),
                            //     functionName: name,
                            //     result: functionResponse,
                            //     content: `Function "${name}" executed: ${functionResponse}`,
                            // };
                            // this.addLogMessage(functionMessage);
                        }
                    }
                }
            }

            
            this.moveItemsToAnswerContainer(); // Move items to answer container after processing

        } catch (error) {
            const errorMessage: ErrorMessage = {
                type: 'error',
                timestamp: new Date(),
                content: `Failed to process content with Gemini. Error: ${error}`, // Include the error details
                error: error as Error,
            };
            this.addLogMessage(errorMessage, this.answerContainer); // Explicitly specify the chatContainer
            console.error('Error processing content:', error); // Log the error to the console
        }
    }

    private adjustChatContainerHeight() {
        if (this.chatContainer.children.length === 0) {
            this.chatContainer.style.flex = '0 0 auto';
            this.chatContainer.style.height = '0';
        } else {
            this.chatContainer.style.flex = '1';
            this.chatContainer.style.height = 'auto';
        }
    }

    private moveItemsToAnswerContainer() {
        while (this.chatContainer.firstChild) {
            this.answerContainer.appendChild(this.chatContainer.firstChild);
        }
        this.adjustChatContainerHeight();
    }

    private async writeFile(args: { path: string; content: string }): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                const contentWithNewlines = args.content.replace(/\\n/g, '\n');
                const folderPath = args.path.split('/').slice(0, -1).join('/');
                const filePath = args.path;
    
                if (folderPath) {
                    const folderExists = await this.app.vault.adapter.exists(folderPath);
                    if (!folderExists) {
                        await this.app.vault.createFolder(folderPath);
                    }
                }
    
                let existingContent = '';
                const fileExists = await this.app.vault.adapter.exists(filePath);
                if (fileExists) {
                    existingContent = await this.app.vault.adapter.read(filePath);
                }
    
                // Use diff-match-patch to generate the diff
                const dmp = new DiffMatchPatch();
                const diff = dmp.diff_main(existingContent, contentWithNewlines);
                dmp.diff_cleanupSemantic(diff);
    
                // Function to convert the diff array to styled HTML
                const diffToHTML = (diffArray: [number, string][]): string => {
                    let html = '';
                    for (const [op, text] of diffArray) {
                        switch (op) {
                            case DiffMatchPatch.DIFF_INSERT:
                                html += `<ins style="background-color:#d0e8d4; color:#1e6d2b;">${text}</ins>`;
                                break;
                            case DiffMatchPatch.DIFF_DELETE:
                                html += `<del style="background-color:#f9d0c4; color:#9a050f;">${text}</del>`;
                                break;
                            case DiffMatchPatch.DIFF_EQUAL:
                                html += `<span>${text}</span>`;
                                break;
                        }
                    }
                    return html;
                };
    
                const diffHtml = diffToHTML(diff);
    
                new ConfirmModal(this.app, diffHtml, filePath, contentWithNewlines, async (confirmed) => {
                    if (confirmed) {
                        try {
                            await this.app.vault.adapter.write(filePath, contentWithNewlines);
    
                            const functionMessage: FunctionMessage = {
                                type: 'function',
                                timestamp: new Date(),
                                functionName: 'writeFile',
                                result: `File created/modified successfully at ${filePath}`,
                                content: `File created/modified successfully at ${filePath}`,
                            };
                            this.addLogMessage(functionMessage);
                            resolve(`File created/modified successfully at ${filePath}`);
    
                        } catch (writeError) {
                            const errorMessage: ErrorMessage = {
                                type: 'error',
                                timestamp: new Date(),
                                content: `Failed to write file: ${writeError}`,
                                error: writeError as Error,
                            };
                            this.addLogMessage(errorMessage, this.answerContainer);
                            reject(new Error(`Failed to write file: ${writeError}`));
                        }
                    } else {
                        const functionMessage: FunctionMessage = {
                            type: 'function',
                            timestamp: new Date(),
                            functionName: 'writeFile',
                            result: `File creation/modification cancelled by user for ${filePath}`,
                            content: `File creation/modification cancelled by user for ${filePath}`,
                        };
                        this.addLogMessage(functionMessage);
                        resolve(`File creation/modification cancelled by user for ${filePath}`);
                    }
                }).open();
    
    
            } catch (error) {
                const errorMessage: ErrorMessage = {
                    type: 'error',
                    timestamp: new Date(),
                    content: `Failed to process file operation: ${error}`,
                    error: error as Error,
                };
                this.addLogMessage(errorMessage, this.answerContainer);
                reject(new Error(`Failed to process file operation: ${error}`));
            }
        });
    }
    

    private tellUser(args: { message: string }): string {
        const modelMessage: ModelMessage = {
            type: 'model',
            timestamp: new Date(),
            content: args.message,
        };
        this.addLogMessage(modelMessage);
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
                style: 'max-width: 40%; background: #444; padding: 10px; border-radius: 8px; margin-bottom: 10px; position: relative;'
            }
        });

        // Add remove button
        const removeButton = card.createEl('button', {
            attr: {
                style: 'position: absolute; top: 5px; right: 5px; background: none; border: none; color: #fff; cursor: pointer; font-size: 16px; width: 17px; height: 17px;'
            }
        });
        removeButton.innerText = '×';

        // Remove the card when the button is clicked
        removeButton.addEventListener('click', () => {
            card.remove();
            this.adjustChatContainerHeight();
        });

        const imageContainer = card.createEl('div', {
            attr: {
                style: 'display: flex; flex-direction: column; align-items: center; gap: 10px;'
            }
        });

        const img = imageContainer.createEl('img', {
            attr: {
                src: base64Image,
                style: 'max-width: 70%; border-radius: 4px; cursor: pointer;'
            }
        });

        this.adjustChatContainerHeight();
    }

    private addAudio(audioUrl: string) {
        const card = this.chatContainer.createEl('div', {
            attr: {
                style: 'background: #444; padding: 10px; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; position: relative;'
            }
        });
    
        // Add remove button
        const removeButton = card.createEl('button', {
            attr: {
                style: 'position: absolute; top: 5px; right: 5px; background: transparent; border: none; color: #fff; cursor: pointer; font-size: 16px; height:17px; width:17px;'
            }
        });
        removeButton.innerText = '×';
    
        // Remove the card when the button is clicked
        removeButton.addEventListener('click', () => {
            card.remove();
            this.adjustChatContainerHeight();
        });
    
        // Create an audio element (hidden)
        const audioElement = card.createEl('audio', {
            attr: {
                src: audioUrl,
                controls: 'true',
                style: 'display: none;'
            }
        });
    
        // Create a waveform container
        const waveformContainer = card.createEl('div', {
            attr: { style: 'flex: 1; height: 56px; margin-bottom: 10px;' }
        });
    
        // Create a new WaveSurfer instance for this audio card
        const wavesurfer = WaveSurfer.create({
            container: waveformContainer,
            waveColor: '#555',
            progressColor: '#1e90ff',
            barWidth: 2,
            barHeight: 1,
            barGap: 2,
            height: 50,
            cursorWidth: 0,
            interact: true,
            url: audioUrl,
        });
    
        // Create a play button for this audio card
        const playButton = card.createEl('button', {
            attr: { style: 'background: none; border: none; cursor: pointer; margin-left: 10px;' }
        });
        playButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;">
                <path d="M8 5v14l11-7z"/>
            </svg>
        `;
    
        // Add click event listener to the play button
        playButton.addEventListener('click', () => {
            wavesurfer.playPause();
        });
    
        // Update the play button icon based on WaveSurfer's play/pause state
        wavesurfer.on('play', () => {
            playButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
            `;
        });
        wavesurfer.on('pause', () => {
            playButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px;">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
        });
    
        // Store the wavesurfer instance on the card for later reference
        (card as any).wavesurfer = wavesurfer;
    
        this.adjustChatContainerHeight();
    }

    private disableButtons() {
        const buttons = this.containerEl.querySelectorAll('button');
        buttons.forEach((button) => {
            button.setAttribute('disabled', 'true');
            button.style.opacity = '0.5'; // Visually indicate that the button is disabled
            button.style.cursor = 'not-allowed';
        });
    }
    
    private enableButtons() {
        const buttons = this.containerEl.querySelectorAll('button');
        buttons.forEach((button) => {
            button.removeAttribute('disabled');
            button.style.opacity = '1'; // Restore button appearance
            button.style.cursor = 'pointer';
        });
    }

    private addLoadingIndicator() {
        const loadingIndicator = this.answerContainer.createEl('div', {
            attr: {
                style: 'display: flex; justify-content: center; align-items: center; margin-top: 10px;'
            }
        });
    
        // Create a spinning circle using CSS
        loadingIndicator.innerHTML = `
            <div style="border: 4px solid #f3f3f3; border-top: 4px solid #6200ee; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite;"></div>
        `;
    
        // Add CSS for the spinning animation
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        this.containerEl.appendChild(style);
    
        return loadingIndicator;
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
            .setDesc('Enter your Google API key here.')
            .addText(text => {
                text
                    .setPlaceholder('Enter your API key')
                    .setValue(this.plugin.settings.GOOGLE_API_KEY)
                    // Remove the password attribute to make the input visible
                    // .inputEl.setAttribute('type', 'password'); // Comment out or remove this line
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