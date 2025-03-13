// components/GeminiChat.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import {
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  content: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
};

export default function GeminiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    try {
      setError(null);
      const userMessage: Message = {
        content: input,
        isUser: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          content: "",
          isUser: false,
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      setInput("");
      setIsLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/gemini/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: input }),
        }
      );

      if (!response.ok) throw new Error("Error en la respuesta");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        aiResponse += decoder.decode(value);

        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];

          if (lastMessage.isStreaming) {
            lastMessage.content = aiResponse;
            lastMessage.timestamp = new Date();
          }

          return newMessages;
        });
      }
    } catch (err) {
      setError("Error al conectar con el servicio");
      setMessages((prev) => prev.filter((msg) => msg.isUser));
    } finally {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.isStreaming ? { ...msg, isStreaming: false } : msg
        )
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg mb-8">
      {/* Área de mensajes */}
      <div className="h-[60vh] overflow-y-auto p-4 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
          >
            <div
              className={`max-w-[85%] p-4 rounded-2xl ${
                message.isUser
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 shadow-sm'
              } transition-all duration-300`}
            >
             {message.isStreaming ? (
  <div className="flex space-x-2 items-center">
    <div className="flex space-x-1">
      <span className="h-2 w-2 bg-current rounded-full animate-dotTyping"></span>
      <span className="h-2 w-2 bg-current rounded-full animate-dotTyping animation-delay-200"></span>
      <span className="h-2 w-2 bg-current rounded-full animate-dotTyping animation-delay-400"></span>
    </div>
  </div>
) : (
                <div className="prose text-lg max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="mb-2 leading-relaxed text-gray-800" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc pl-6 space-y-2 marker:text-blue-500" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal pl-6 space-y-2 marker:text-blue-500" {...props} />
                      )
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
              <p className="text-xs mt-2 opacity-70">
                {message.timestamp.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Área de entrada */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta aquí..."
            className="flex-1 p-4 text-lg border border-gray-300 rounded-xl
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50 transition-all placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700
                     disabled:opacity-50 transition-colors"
          >
            <PaperAirplaneIcon className="h-6 w-6 transform rotate-45" />
          </button>
        </div>

        {error && (
          <div className="mt-2 flex items-center text-red-600 bg-red-50 p-3 rounded-lg">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </form>
    </div>
  );
}
