import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ToolNode } from '@langchain/langgraph/prebuilt';
import {
    StateGraph,
    MessagesAnnotation,
    END,
    START
} from "@langchain/langgraph/web";
import MyPlugin from "../main";
import { StringInputModal } from "../Modals/clarifyingModal";
import { EnhancedDiffModal } from "../Modals/diffModal";

export class reActAgentLLM {
    public app: any;
    private plugin: MyPlugin;

    constructor(plugin: MyPlugin) {
      this.plugin = plugin;
      // CLARIFY FUNCTION
    const clarifyingQuestions = tool(async ({ questions_answers: _questions_answers }: { questions_answers: string }) => {
      console.log("ENTERED CLARI");
    // This is a placeholder for the actual implementation
    console.log(_questions_answers);
    const modal = new StringInputModal(this.plugin.app, _questions_answers);
		const result = await modal.openAndGetValue(); // Await the Promise
    console.log(result);
    return result;
      }, {
        name: "clarifyingQuestions",
        description:
          `Usada para preguntar preguntas esclarecedoras.
Ejemplo:
1. ¿A quién está dirigida la poesía? 
r/ A un amor no correspondido.
2. ¿Cuál es el tono general que deseas para la poesía? 
r/ Nostalgico.
3. ¿Hay algún tema o imagen específica que quieras que se incluya en la poesía?
r/ La luna.
4. ¿Hay alguna palabra o frase clave que te gustaría que se repita o destaque en la poesía?
r/ Nuestro amor.
5. ¿Qué extensión te gustaría que tuviera la poesía?
r/ Media
`,
        schema: z.object({
          questions_answers: z.string().describe("Questions to be answered in a long string, each one must include a default answer."),
        }),
      });

      // WRITEFILE FUNCTION
    const writeFile = tool(async (input) => {
    //Implement here
    return new Promise(async (resolve, reject) => {
                try {
                    const contentWithNewlines = input.content.replace(/\\n/g, '\n');
                    const folderPath = input.path.split('/').slice(0, -1).join('/');
                    const filePath = input.path;
        
                    if (folderPath) {
                        const folderExists = await this.plugin.app.vault.adapter.exists(folderPath);
                        if (!folderExists) {
                            await this.plugin.app.vault.createFolder(folderPath);
                        }
                    }
        
                    let existingContent = '';
                    let actionc: "change" | "create" | "delete" = 'create';
                    const fileExists = await this.plugin.app.vault.adapter.exists(filePath);
                    if (fileExists) {
                        existingContent = await this.plugin.app.vault.adapter.read(filePath);
                        actionc = 'change';
                    }
    
                    const diffModal = new EnhancedDiffModal({
                                    app: this.plugin.app, // Pass the app instance (assuming 'this.plugin.app' is available in BaseBottomBarView)
                                    oldVersion: existingContent, // Pass example old version
                                    newVersion: contentWithNewlines, // Pass example new version
                                    action: actionc,       // Pass example action
                                    filepath: filePath,   // Pass example filepath
                                    onConfirm: async (confirmed) => {
                                                        if (confirmed) {
                                                            try {
                                                                await this.plugin.app.vault.adapter.write(filePath, contentWithNewlines);
                                        
                                                                resolve(`El llamado a funcion se completo correctamente, creandose el archivo ${filePath}.`);
                                        
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

    }, {
        name: "writeFile",
        description:
          "Use to create markdown (.md) files.",
        schema: z.object({
          path: z.string().describe("Direccion para crear o modificar el archivo."),
          content: z.string().describe("Contenido a ser escrito en el archivo."),
        }),
      });
    
     const obs_tools = [clarifyingQuestions, writeFile];

      
      const llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash-lite",
        temperature: 0.2,
        maxRetries: 2,
        apiKey: plugin.settings.GOOGLE_API_KEY,
        // other params...
      }).bindTools(obs_tools);
      

const toolNodeForGraph = new ToolNode(obs_tools)
  
  const shouldContinue = (state: typeof MessagesAnnotation.State) => {
    const { messages } = state;
    const lastMessage: any = messages[messages.length - 1];
    if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
        return "tools";
    }
    return END;
  }
  
  const callModel = async (state: typeof MessagesAnnotation.State) => {
    console.log("ENTERED CALLMODEL");
    const { messages } = state;
    const response = await llm.invoke(messages);
    return { messages: response };
  }
  
  
  const workflow = new StateGraph(MessagesAnnotation)
    // Define the two nodes we will cycle between
    .addNode("agent", callModel)
    .addNode("tools", toolNodeForGraph)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, ["tools", END])
    .addEdge("tools", "agent");
  
  this.app = workflow.compile()

    }
    
 }
  
      


  
  
  