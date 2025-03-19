"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";
import { ExternalLinkIcon } from 'lucide-react';

interface Citation {
  index: number;
  filename: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        citations: data.citations
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      toast("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Format filename for display and generate URL if needed
  const formatCitation = (filename: string) => {
    // Special handling for markdown files that look like URL references with underscores
    if (filename.endsWith('.md') && filename.includes('_com_')) {
      // Extract the domain and path parts
      const parts = filename.split('_com_');
      if (parts.length > 1) {
        const domain = parts[0].replace(/_/g, '') + '.com';
        // Convert remaining underscores to hyphens for the path part
        const path = parts[1].replace(/_/g, '-').replace(/\.md$/, '');
        
        return {
          displayName: filename,
          url: `https://${domain}/${path}`
        };
      }
    }
    
    // More comprehensive URL detection - look for file extensions, domains, or URL structures
    const isUrl = (str: string) => {
      // Match common TLDs or URL structures
      return /\.(com|org|net|io|gov|edu|md|pdf|html?|php|aspx?)$/i.test(str) || 
             str.includes('://') || 
             str.includes('www.') ||
             /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i.test(str);
    };
    
    // Check if the filename looks like a URL
    if (isUrl(filename)) {
      // If it doesn't start with http(s), add https://
      const url = filename.startsWith('http') ? filename : `https://${filename}`;
      return {
        displayName: filename,
        url
      };
    }
    
    // Otherwise just return the filename
    return {
      displayName: filename,
      url: null
    };
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-2xl">Chat Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4" ref={scrollAreaRef}>
            {messages.map((message, index) => (
              <div key={index} className="mb-4">
                <div
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  } items-start gap-3`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="w-8 h-8">
                      <div className="bg-primary text-white w-full h-full flex items-center justify-center">
                        NB
                      </div>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg p-4 max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.content}
                    
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 text-xs border-t pt-2 border-gray-200">
                        <p className="font-semibold mb-1">Sources:</p>
                        <ul className="list-disc pl-4">
                          {message.citations.map((citation, idx) => {
                            const { displayName, url } = formatCitation(citation.filename);
                            return (
                              <li key={idx} className="break-all mb-1">
                                {url ? (
                                  <a 
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:underline inline-flex items-center cursor-pointer"
                                    onClick={(e) => {
                                      // Prevent default and manually open window to ensure it works
                                      e.preventDefault();
                                      window.open(url, '_blank', 'noopener,noreferrer');
                                    }}
                                  >
                                    <span>{displayName}</span>
                                    <ExternalLinkIcon className="ml-1" size={12} />
                                  </a>
                                ) : (
                                  <span>{displayName}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="w-8 h-8">
                      <div className="bg-secondary text-secondary-foreground w-full h-full flex items-center justify-center">
                        U
                      </div>
                    </Avatar>
                  )}
                </div>
                {index < messages.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-pulse text-muted-foreground">
                  Assistant is thinking...
                </div>
              </div>
            )}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </ScrollArea>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a legal question..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send"}
        </Button>
      </form>
    </div>
  );
} 