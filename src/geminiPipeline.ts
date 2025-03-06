
import { geminiTools } from "./geminiTools";
import { createModel } from "./geminiModel";
import { ChatSession, GenerativeModel } from "@google/generative-ai";
import { App } from "obsidian";

export class geminiPipeline {
    private tools: geminiTools;
    private model: GenerativeModel;
    private session: ChatSession;

    constructor(app: App, apiKey: string) {
        this.tools = new geminiTools(app);
        this.model = createModel(apiKey, this.tools.functionsSCHMS);
        this.session = this.model.startChat();
    }

    public async * pipe(file: any) {
        let messages:any = [
            {
              fileData: {
                mimeType: file.mimeType,
                fileUri: file.uri,
              },
            },
            {text: "El audio contiene instrucciones a seguir para realizar una tarea específica, el modelo debe seguir la linea de las acciones y usar herramientas o responder en lenguaje natural cuando sea necesario, teniendo en cuenta incluso instrucciones del contexto que queden atras sin solventar"},
          ];

          let currentResult: any = {};
    for (let index = 0; index < 7; index++) {
        // CODE HERE
        currentResult = await this.session.sendMessageStream(messages);
        let hasFCALL = false;
        for await (const chunk of currentResult.stream) {
            const chunkText = chunk.text();
            const chunkCall = chunk.functionCalls()
            if (chunkCall) {
            //   console.log("THERE ARE FUNC CALLS");
              console.log(chunkCall);
              hasFCALL = true;
              messages = await this.tools.handleFunctionCall(chunkCall)
            } else {
                yield chunkText;
            }
          }
        //   console.log(messages);
        // messages.push({text: "aqui estan las respuestas de los llamados a funciones"});
        if (!hasFCALL){break;}
         
        }
}

}