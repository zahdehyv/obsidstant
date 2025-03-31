import MyPlugin from "../main";
import { ttsBase, ttsGeminiFL } from "./ttsServiss";
import { AudioItem } from "../Utilities/fileUploader";
import { reActAgentLLM } from "./reActAgent";

export class Pipeline {
    private tts: ttsBase;
    private reActAgent: reActAgentLLM;
    constructor(plugin: MyPlugin) {
        this.tts = new ttsGeminiFL(plugin.settings.GOOGLE_API_KEY);
        this.reActAgent = new reActAgentLLM(plugin);
    }

    public async pipe(audio: AudioItem) {
       const inst = await this.tts.transcribe(audio);

       const prompt = inst + "\n\nHaz preguntas esclarecedoras si lo consideras necesario (usando la funcion)."

      const finalState = await this.reActAgent.app.invoke({
        messages: [{ role: "user", content: prompt }],
      });
      
      const answer = finalState.messages[finalState.messages.length - 1].content;
      console.log(answer);
      
      return answer;
    }

}