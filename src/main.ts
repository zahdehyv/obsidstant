import { App, Plugin, Notice, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
// import { ChatbotView } from './chatview';
import { InteractView } from './Views/InteractView';


interface MyPluginSettings {
    GOOGLE_API_KEY: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    GOOGLE_API_KEY: 'your-default-api-key',
};

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
            'base-bottom-bar-view',
            (leaf: WorkspaceLeaf) => new InteractView(leaf, this)//, this.settings.GOOGLE_API_KEY)
        );

        this.addRibbonIcon('bot-message-square', 'Open Chatbot', () => {
            this.activateView();
        });

        // this.addRibbonIcon('experiment', 'Test RIBBON', async () => {
        //     //DEFAULT ACTION
        //     const cust = new custLLM(this.settings.GOOGLE_API_KEY);
        //     const finalState = await cust.app.invoke(
        //         { messages: [{ role: "user", content: {parts: [{text:"what's the weather in sf?"}]} }],
        //     },
        //       );
              
        //       console.log(finalState.messages[finalState.messages.length - 1].content);
              
        // });

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
        const leaves = workspace.getLeavesOfType('base-bottom-bar-view');

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            if (!leaf) {
                leaf = workspace.getLeaf('tab');
            }
            await leaf.setViewState({ type: 'base-bottom-bar-view', active: true });
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