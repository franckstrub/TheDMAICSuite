import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, Minimize2, Maximize2, Trash2, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
// Import the AI coach avatar image
const aiCoachAvatar = "/attached_assets/AI-MBB-Coach_1750526353279.jpg";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIMBBCoachProps {
  className?: string;
}

export default function AIMBBCoach({ className }: AIMBBCoachProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI Master Black Belt Coach. I\'m here to help you with any Lean Six Sigma questions, methodology guidance, or project support. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when component opens
  useEffect(() => {
    if (isOpen && !isLoadingHistory) {
      loadChatHistory();
    }
  }, [isOpen]);

  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/ai-coach/history');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.history.length > 0) {
          const historyMessages: Message[] = [];
          
          data.history.forEach((item: any) => {
            historyMessages.push({
              id: `q-${item.id}`,
              type: 'user',
              content: item.question,
              timestamp: new Date(item.createdAt)
            });
            historyMessages.push({
              id: `a-${item.id}`,
              type: 'assistant',
              content: item.answer,
              timestamp: new Date(item.createdAt)
            });
          });

          // Keep the welcome message and add history after it
          setMessages(prev => [
            prev[0], // Keep welcome message
            ...historyMessages
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const clearChatHistory = async () => {
    try {
      const response = await fetch('/api/ai-coach/history', {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Reset to just the welcome message
        setMessages([{
          id: '1',
          type: 'assistant',
          content: 'Hello! I\'m your AI Master Black Belt Coach. I\'m here to help you with any Lean Six Sigma questions, methodology guidance, or project support. What would you like to know?',
          timestamp: new Date()
        }]);
        
        toast({
          title: "Success",
          description: "Chat history cleared successfully.",
        });
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
      toast({
        title: "Error",
        description: "Failed to clear chat history.",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      console.log('Sending message to AI Coach:', userMessage.content);
      
      const response = await fetch('/api/ai-coach/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMessage.content })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('AI Coach response data:', data);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.message || 'Sorry, I couldn\'t process your request.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I apologize, but I'm having trouble processing your question right now. Error: ${error.message}. Please try again in a moment.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: `Failed to get response from AI Coach: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-50 rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 shadow-lg ${className}`}
        size="icon"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 z-50 w-96 shadow-xl border-2 border-blue-200 ${
      isMinimized ? 'h-14' : 'h-[500px]'
    } transition-all duration-300 ${className}`}>
      <CardHeader className="pb-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src={aiCoachAvatar} 
                alt="AI MBB Coach" 
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">AI Master Black Belt Coach</CardTitle>
              <p className="text-xs text-blue-100">Lean Six Sigma Expert</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChatHistory}
              className="text-white hover:bg-blue-500 p-1 h-8 w-8"
              title="Clear chat history"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-blue-500 p-1 h-8 w-8"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-500 p-1 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-[450px]">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white ml-4' 
                      : 'bg-gray-100 text-gray-800 mr-4'
                  }`}>
                    {message.type === 'assistant' && (
                      <div className="flex items-center space-x-2 mb-2">
                        <img 
                          src={aiCoachAvatar} 
                          alt="AI Coach" 
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs font-semibold text-blue-600">AI MBB Coach</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className={`text-xs mt-1 block ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 rounded-lg p-3 mr-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <img 
                        src={aiCoachAvatar} 
                        alt="AI Coach" 
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-xs font-semibold text-blue-600">AI MBB Coach</span>
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about Lean Six Sigma..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}