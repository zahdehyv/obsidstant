// Define interfaces for different message types
export interface LogMessage {
    timestamp: Date;
    content: string;
    type: 'user' | 'model' | 'function' | 'error'; // Add the type property
}

export interface UserMessage extends LogMessage {
    type: 'user'; // No need to redefine 'type' here
}

export interface ModelMessage extends LogMessage {
    type: 'model'; // No need to redefine 'type' here
}

export interface FunctionMessage extends LogMessage {
    type: 'function'; // No need to redefine 'type' here
    functionName: string;
    result: string;
}

export interface ErrorMessage extends LogMessage {
    type: 'error'; // No need to redefine 'type' here
    error: Error;
}