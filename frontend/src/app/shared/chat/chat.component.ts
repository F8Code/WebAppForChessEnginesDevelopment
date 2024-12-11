import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent {
  @Input() isGame: boolean = false;
  @Input() myUsername: string | null = null;
  @Output() messageSent = new EventEmitter<string>();

  chatMessages: { sender: string; content: string }[] = [];

  private parseMessage(rawMessage: string): { sender: string; content: string } | null {
    const [sender, content] = rawMessage.split(': ', 2);
    if (sender?.trim() && content?.trim()) {
      return { sender: sender.trim(), content: content.trim() };
    }
    console.log('Invalid message format:', rawMessage);
    return null;
  }  

  decodeChatMessages(chatData: string): void {
    if(!chatData)
      return;
    try {
      this.chatMessages = chatData.split('~').map(rawMessage => this.parseMessage(rawMessage))
                          .filter(parsedMessage => parsedMessage !== null) as { sender: string; content: string }[];
    } catch (fallbackError) {
      console.log("Failed to parse chat data:", fallbackError);
    }
  }
  
  async sendMessage(content: string): Promise<void> {
    if (!content.trim()) return;
    const sender = this.myUsername;
    content.replace(/[|~]/g, '');
    this.chatMessages.push({ sender, content });

    this.messageSent.emit(`${sender}| ${content}`);
  }
}
