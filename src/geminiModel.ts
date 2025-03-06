import { GoogleGenerativeAI, FunctionCallingMode, GenerativeModel, ChatSession, FunctionDeclaration } from '@google/generative-ai';
import { GenerateContentStreamResult} from '@google/generative-ai';

export function createModel(apiKey:string, functionScheme: [FunctionDeclaration]): GenerativeModel {
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash-exp",
                tools: [{functionDeclarations: functionScheme,},],
                toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
            });
        return model
          }

         