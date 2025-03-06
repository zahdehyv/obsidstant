import { SchemaType, FunctionDeclaration, FunctionCall, FunctionResponse} from '@google/generative-ai';
import { App } from 'obsidian';
import { EnhancedDiffModal } from './EnhancedDiffModal';

export class geminiTools {
    private app: App;
    public functionsSCHMS: [FunctionDeclaration];
    private functions: { [name: string]: Function } = {};

    constructor(app: App) {
        this.app = app;
        
        const writeFileDec = {
            name: "writeFile",
            description: "Crea un archivo .md en una ruta específica con un contenido determinado y el formato MD apropiado. \nEn caso de existir sobreescribe el archivo.",
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
        };
        this.functionsSCHMS = [
            // WRITE FILE
            writeFileDec,
        ];

        this.functions = {
            writeFile: this.writeFile.bind(this),
        };

    }

    private async writeFile(args: { path: string; content: string }): Promise<any> {
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
                let actionc: "change" | "create" | "delete" = 'create';
                const fileExists = await this.app.vault.adapter.exists(filePath);
                if (fileExists) {
                    existingContent = await this.app.vault.adapter.read(filePath);
                    actionc = 'change';
                }

                const diffModal = new EnhancedDiffModal({
                                app: this.app, // Pass the app instance (assuming 'this.app' is available in BaseBottomBarView)
                                oldVersion: existingContent, // Pass example old version
                                newVersion: contentWithNewlines, // Pass example new version
                                action: actionc,       // Pass example action
                                filepath: filePath,   // Pass example filepath
                                onConfirm: async (confirmed) => {
                                                    if (confirmed) {
                                                        try {
                                                            await this.app.vault.adapter.write(filePath, contentWithNewlines);
                                    
                                                            resolve(`El llamado a funcion se completo correctamente, creandose el archivo ${filePath}, ahora puedes continuar con las instrucciones proveidas originalmente. Puede decidir llamar a la funcion nuevamente si lo desea, en caso de que deba modificar el poema por alguna razon.`);
                                    
                                                        } catch (writeError) {
                                                            reject(new Error(`Error al escribir archivo: ${writeError}`));
                                                        }
                                                    } else {
                                                        
                                                        resolve(`El usuario ha cancelado la operacion de crear archivo ${filePath}` );
                                                    }
                                                },
                            });
                
                            // 3. Open the EnhancedDiffModal
                            diffModal.open();
    
            } catch (error) {
                console.log(error);
            }
        });
    }

    public async handleFunctionCall(functioncalls:[FunctionCall]): Promise<[{[text: string]: string}]> {
        const responses:any = [];
        for (const call of functioncalls) {
            const {name, args} = call;
            const functionRef = this.functions[name];
            if (!functionRef) {
                throw new Error(`Unknown function "${name}"`);
            }

            // Execute the function
            const functionResponse = await functionRef(args);

            // Add the response to the list of responses
            const formattedResponse: {[text: string]: string} =  {text: functionResponse};

            responses.push(formattedResponse);
        }
        const finalResponse: [{[text: string]: string}] = responses;
        return finalResponse;
    }

    // public async handleFunctionCall(functioncalls:[FunctionCall]): Promise<[{[functionResponse: string]: FunctionResponse}]> {
    //     const responses:any = [];
    //     for (const call of functioncalls) {
    //         const {name, args} = call;
    //         const functionRef = this.functions[name];
    //         if (!functionRef) {
    //             throw new Error(`Unknown function "${name}"`);
    //         }

    //         // Execute the function
    //         const functionResponse = await functionRef(args);

    //         // Add the response to the list of responses
    //         const formattedResponse: {[functionResponse: string]: FunctionResponse} =  {functionResponse: {
    //             name: name,
    //             response: functionResponse
    //           }};

    //         responses.push(formattedResponse);
    //     }
    //     const finalResponse: [{[functionResponse: string]: FunctionResponse}] = responses;
    //     return finalResponse;
    // }
}