import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';

// Import refactored components
import { EnhancedIdeaChatProps } from './types';
import { useChatState, useWrinkleData, useScrollToBottom } from './hooks';
import { 
  validateIdeaSubmission, 
  sendChatMessage, 
  evaluateWrinklePoints, 
  generateSuggestions,
  enhanceSaltyResponse,
  generateConversationSummary
} from './api-services';
import ChatMessageItem from './ChatMessageItem';
import ChatInput from './ChatInput';
import BrainComponent from './BrainComponent';
import QuickActions from './QuickActions';

// Import utilities
import { 
  isIdeaDescription, 
  createIdeaPreview, 
  getRandomSuggestions, 
  generateSuggestionExplanation, 
  generateFallbackSuggestions,
  detectTrickery,
  generateBrainExplanation
} from '../chat/utils';
import { Message } from '../chat/types';

const EnhancedIdeaChat: React.FC<EnhancedIdeaChatProps> = ({ 
  onAnalysisReady, 
  resetTrigger,
  onReset,
  onAnalyze,
  sessionName = 'New Chat Session'
}) => {
  // Use custom hooks for state management
  const chatState = useChatState(sessionName);
  const wrinkleData = useWrinkleData(chatState.wrinklePoints);
  const scrollToBottom = useScrollToBottom(chatState.messagesEndRef);

  // Handle reset trigger
  useEffect(() => {
    if (resetTrigger) {
      resetChatHandler();
    }
  }, [resetTrigger]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, scrollToBottom]);

  // Auto-focus input
  useEffect(() => {
    const timer = setTimeout(() => {
      chatState.inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const resetChatHandler = useCallback(() => {
    chatState.setMessages([]);
    chatState.setCurrentIdea('');
    chatState.setInput('');
    chatState.setConversationStarted(false);
    chatState.setHasValidIdea(false);
    chatState.setWrinklePoints(0);
    chatState.setPersistenceLevel(0);
    onReset?.();
    setTimeout(() => chatState.inputRef.current?.focus(), 100);
  }, [chatState, onReset]);

  const handleSuggestionClick = useCallback((suggestionText: string) => {
    chatState.setInput(suggestionText);
    setTimeout(() => sendMessage(suggestionText), 100);
  }, [chatState]);

  const sendMessage = useCallback(async (textToSend?: string) => {
    const messageText = textToSend || chatState.input;
    if (!messageText.trim() || chatState.isTyping) return;

    // Clear input and add user message
    chatState.setInput('');
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };

    chatState.setMessages(prev => [...prev, userMessage]);
    chatState.setIsTyping(true);
    chatState.setConversationStarted(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: `typing-${Date.now()}`,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    chatState.setMessages(prev => [...prev, typingMessage]);

    try {
      // First message - validate if it's an idea
      if (chatState.messages.length === 0) {
        const validation = await validateIdeaSubmission(messageText);
        
        if (!validation.isValid) {
          // Handle invalid idea
          const saltyResponse = await enhanceSaltyResponse(
            "That doesn't seem like a startup idea. Could you describe a specific business concept you'd like to explore?",
            true
          );
          
          const responseMessage: Message = {
            id: `bot-${Date.now()}`,
            type: 'bot',
            content: saltyResponse,
            timestamp: new Date()
          };

          chatState.setMessages(prev => prev.filter(m => !m.isTyping).concat([responseMessage]));
          chatState.setIsTyping(false);
          return;
        }

        chatState.setCurrentIdea(messageText);
        chatState.setHasValidIdea(true);
      }

      // Send to chat API
      const conversationHistory = chatState.messages
        .filter(m => !m.isTyping)
        .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }));

      const response = await sendChatMessage(messageText, conversationHistory, chatState.responseMode);

      // Evaluate wrinkle points after each exchange
      if (response) {
        const wrinkleEvaluation = await evaluateWrinklePoints(
          [...conversationHistory, { role: 'assistant', content: response.response }],
          chatState.wrinklePoints
        );
        
        if (wrinkleEvaluation.points > chatState.wrinklePoints) {
          chatState.setWrinklePoints(wrinkleEvaluation.points);
        }
      }

      // Create bot response
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: response?.response || 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };

      // Generate suggestions for the response
      try {
        const suggestionResponse = await generateSuggestions(
          conversationHistory,
          chatState.currentIdea,
          chatState.responseMode
        );
        botMessage.suggestions = suggestionResponse.suggestions;
      } catch (err) {
        console.warn('Could not generate suggestions:', err);
        botMessage.suggestions = getRandomSuggestions();
      }

      chatState.setMessages(prev => prev.filter(m => !m.isTyping).concat([botMessage]));

      // Call analysis callback if provided
      if (onAnalysisReady && response?.metadata) {
        onAnalysisReady(messageText, response.metadata);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'bot',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      
      chatState.setMessages(prev => prev.filter(m => !m.isTyping).concat([errorMessage]));
      chatState.toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      chatState.setIsTyping(false);
    }
  }, [chatState, onAnalysisReady]);

  return (
    <TooltipProvider>
      <Card className="flex flex-col h-full max-h-[calc(100vh-2rem)] shadow-2xl border-2 border-border/50 bg-card/95 backdrop-blur-sm overflow-hidden">
        {/* Brain Header */}
        <BrainComponent
          wrinkleData={wrinkleData}
          wrinklePoints={chatState.wrinklePoints}
          hoveringBrain={chatState.hoveringBrain}
          setHoveringBrain={chatState.setHoveringBrain}
          displaySessionName={chatState.displaySessionName}
          isDefaultSessionName={chatState.isDefaultSessionName}
        />

        {/* Messages Area */}
        <div className="flex-1 relative overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-full">
              {chatState.messages.length === 0 && (
                <motion.div 
                  className="text-center py-8 sm:py-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-muted-foreground space-y-2">
                    <p className="text-lg sm:text-xl font-medium">Ready to refine your startup idea?</p>
                    <p className="text-sm opacity-80">Share your concept and let's grow some wrinkles together!</p>
                  </div>
                </motion.div>
              )}
              
              <AnimatePresence mode="popLayout">
                {chatState.messages.map((message) => (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    responseMode={chatState.responseMode}
                    onSendMessage={sendMessage}
                    onSuggestionClick={handleSuggestionClick}
                  />
                ))}
              </AnimatePresence>
              
              <div ref={chatState.messagesEndRef} className="h-1" />
            </div>
          </ScrollArea>
        </div>

        {/* Chat Input */}
        <ChatInput
          input={chatState.input}
          setInput={chatState.setInput}
          isTyping={chatState.isTyping}
          conversationStarted={chatState.conversationStarted}
          inputRef={chatState.inputRef}
          onSendMessage={sendMessage}
        />

        {/* Quick Actions */}
        <QuickActions
          hasValidIdea={chatState.hasValidIdea}
          conversationStarted={chatState.conversationStarted}
          onSendMessage={sendMessage}
          onResetChat={resetChatHandler}
        />
      </Card>
    </TooltipProvider>
  );
};

export default EnhancedIdeaChat;