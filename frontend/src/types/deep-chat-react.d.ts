// src/types/deep-chat-react.d.ts
declare module "deep-chat-react" {
  import React from "react";
  export const DeepChat: React.FC<DeepChatProps>;

  export interface DeepChatProps {
    // Propiedades existentes
    style?: React.CSSProperties;
    request?: {
      url: string;
      headers?: Record<string, string>;
      method?: "POST" | "GET";
    };
    textInput?: TextInput;
    messageStyles?: MessageStyles;
    initialMessages?: Message[];
    errorMessages?: ErrorMessages;

    // Nuevas propiedades
    streaming?: boolean;
    streamSpeed?: number;
    streamBubbleColor?: string;
    // ... otras props si son necesarias
  }

  export interface MessageStyles {
    user?: React.CSSProperties;
    ai?: React.CSSProperties;
    chatbox?: React.CSSProperties;
  }

  export interface TextInput {
    placeholder?: {
      text?: string;
      style?: React.CSSProperties;
    };
    disabled?: boolean;
    autoFocus?: boolean;
    styles?: {
      container?: React.CSSProperties;
      text?: React.CSSProperties;
    };
  }

  export interface ErrorMessages {
    userError?: (error: Error) => React.ReactNode;
    responseError?: (error: Error) => React.ReactNode;
    default?: React.ReactNode;
  }

  export interface MessageStyle {
    text?: React.CSSProperties;
    container?: React.CSSProperties;
  }

  export interface Message {
    text: string;
    role: "user" | "ai" | "system";
    timestamp?: number;
    styles?: MessageStyle;
  }

  export interface DeepChatProps {
    demo?: boolean;
    style?: React.CSSProperties;
    request?: {
      url: string;
      headers?: Record<string, string>;
      method?: "POST" | "GET";
    };
    textInput?: TextInput;
    messageStyles?: MessageStyles;
    initialMessages?: Message[];
    errorMessages?: ErrorMessages;
    onMessageSend?: (message: Message) => void;
    onError?: (error: Error) => void;
  }

  const DeepChat: React.FC<DeepChatProps>;
  export default DeepChat;
}
