export type MessageType =
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; settings: Record<string, unknown> }
  | { type: 'TOGGLE_INSPEKT' }
  | { type: 'INJECT_STANDALONE' }
  | { type: 'GET_STATUS' }
  | { type: 'STATUS_RESPONSE'; enabled: boolean; standalone: boolean; hasPlugin: boolean };

export function sendToBackground(message: MessageType): Promise<MessageType> {
  return chrome.runtime.sendMessage(message);
}

export function sendToTab(tabId: number, message: MessageType): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, message);
}
