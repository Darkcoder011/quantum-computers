import { useState, useRef, useEffect } from 'react';
import { FiSend } from 'react-icons/fi';
// Configuration
const GEMINI_API_KEY = 'AIzaSyC5cTUAAH95qf5W4wsLqwJqgIXzvMgFgzk';
const GEMINI_MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const QUANTUM_TOPICS = [
  { id: 1, name: 'Qubits', prompt: 'Explain what qubits are in simple terms.' },
  { id: 2, name: 'Superposition', prompt: 'What is quantum superposition?' },
  { id: 3, name: 'Entanglement', prompt: 'Explain quantum entanglement with an example.' },
  { id: 4, name: 'Algorithms', prompt: 'What are some common quantum algorithms?' },
  { id: 5, name: 'Computers', prompt: 'How do quantum computers differ from classical computers?' },
];

const WELCOME_MESSAGE = {
  id: 1,
  sender: 'ai',
  content: 'Hello! I\'m your Quantum Learning Assistant. Ask me anything about quantum computing, or click on a topic below to get started!',
  timestamp: new Date().toISOString()
};

const SUGGESTED_QUESTIONS = [
  'What is quantum computing?',
  'How does quantum superposition work?',
  'What are the practical applications of quantum computing?',
  'Can you explain quantum teleportation?'
];

// Format response text for better readability
const formatResponse = (text) => {
  if (!text) return text;
  
  // Replace markdown headers with newlines for better spacing
  text = text.replace(/^###\s+(.*$)/gm, '\n### $1\n');
  text = text.replace(/^##\s+(.*$)/gm, '\n## $1\n');
  text = text.replace(/^#\s+(.*$)/gm, '\n# $1\n');
  
  // Ensure there's a newline before lists
  text = text.replace(/([^\n])\n\*/g, '$1\n\n*');
  
  // Add newlines between paragraphs
  text = text.replace(/\n\s*\n/g, '\n\n');
  
  // Trim any extra whitespace
  return text.trim();
};

// Truncate long text with ellipsis
const truncateText = (text, maxLength = 1500) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  // Find the last space before maxLength to avoid cutting words
  const lastSpace = text.lastIndexOf(' ', maxLength);
  const truncated = text.substring(0, lastSpace > 0 ? lastSpace : maxLength);
  return truncated + '...';
};

// Fallback responses in case of API issues
const FALLBACK_RESPONSES = {
  'hello': 'Hello! I\'m your quantum computing assistant. How can I help you today?',
  'hi': 'Hi there! Ready to explore the quantum realm?',
  'what is quantum computing': 'Quantum computing is a type of computation that harnesses quantum phenomena like superposition and entanglement to perform calculations. Unlike classical computers that use bits (0s and 1s), quantum computers use quantum bits or qubits that can exist in multiple states simultaneously.',
  'default': 'I\'m having trouble connecting to the AI service. Please check your internet connection and try again later.'
};

// Test function to verify API key and model compatibility
const testGeminiAPI = async () => {
  try {
    console.log('Testing Gemini API with direct fetch...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Hello, are you working?"
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    console.log('API Test Successful:', data);
    return data;
  } catch (error) {
    console.error('API Test Failed:', error);
    throw error;
  }
};

// AI Response function using direct fetch to Gemini API with streaming support
const getAIResponse = async (message, onChunk) => {
  try {
    const prompt = `You are a helpful quantum computing teaching assistant. 
    Answer the following question in a clear and educational way. 
    If the response is long, use markdown formatting with headers, lists, and paragraphs for better readability.
    Keep the response under 2000 words.
    
    Question: ${message}`;

    console.log('Sending request to Gemini API...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to fetch response from Gemini API');
    }

    const data = await response.json();
    console.log('API Response received');

    // Extract the response text from the API response
    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                      data.text || 
                      "I'm not sure how to respond to that. Could you rephrase your question?";
    
    // Format the response for better readability
    responseText = formatResponse(responseText);
    
    return responseText;
    
  } catch (error) {
    console.error('Error calling Gemini API:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Provide more detailed error information
    let errorMessage = `I encountered an error: ${error.message || 'Unknown error'}. `;
    
    if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
      errorMessage += "The API key appears to be invalid or doesn't have the correct permissions. " +
        "Please check your API key in the Google Cloud Console.";
    } else if (error.message.includes('quota')) {
      errorMessage += "The API quota might be exceeded. Please check your Google Cloud Console quota settings.";
    } else if (error.message.includes('network')) {
      errorMessage += "There seems to be a network issue. Please check your internet connection.";
    } else {
      errorMessage += "Please try again later or contact support if the issue persists.";
    }
    
    // Fallback to mock response
    const mockResponses = [
      errorMessage,
      "I'm having trouble connecting to the AI service. Here's a quick answer: " + 
        "Quantum computing uses qubits to process information in ways classical computers can't.",
      "I'm currently unable to reach the AI service. Did you know? " +
        "Quantum superposition allows qubits to be in multiple states at once.",
      "Connection issue detected. Fun fact: " +
        "Quantum entanglement creates a special connection between particles."
    ];
    
    return FALLBACK_RESPONSES[message.toLowerCase()] || mockResponses[0];
  }
};

const App = () => {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState({});
  const messagesEndRef = useRef(null);
  
  // Toggle expansion for a specific message
  const toggleExpandMessage = (messageId) => {
    setExpandedMessages(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };
  
  // Check if a message should be truncated
  const shouldTruncate = (content) => {
    return content.length > 1000; // Only truncate very long messages
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Test API on component mount
    const testAPI = async () => {
      console.log('Testing Gemini API...');
      try {
        const result = await testGeminiAPI();
        console.log('API Test Result:', result);
      } catch (error) {
        console.error('API Test Failed:', error);
      }
    };
    
    testAPI();
    
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    // Add temporary AI message that will be updated with streaming
    const tempAiMessage = {
      id: Date.now() + 1,
      sender: 'ai',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    };

    // Add both messages to the chat
    setMessages(prev => [...prev, userMessage, tempAiMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get AI response with streaming support
      const response = await getAIResponse(message);
      
      // Update the AI message with the complete response
      setMessages(prev => prev.map(msg => 
        msg.id === tempAiMessage.id 
          ? { ...msg, content: response, isStreaming: false }
          : msg
      ));
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Update the AI message with the error
      setMessages(prev => prev.map(msg => 
        msg.id === tempAiMessage.id 
          ? { 
              ...msg, 
              content: 'Oops! Something went wrong. Please try again later.\n\nError: ' + (error.message || 'Unknown error'),
              isStreaming: false 
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const handleTopicClick = (prompt) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Quantum Topics</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {QUANTUM_TOPICS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => handleTopicClick(topic.prompt)}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
            >
              {topic.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4">
          <h1 className="text-2xl font-bold text-center text-blue-600">
            Q-Talk – Your Quantum Learning Assistant
          </h1>
        </header>

        {/* Mobile Topic Buttons */}
        <div className="md:hidden bg-white p-2 border-b border-gray-200 overflow-x-auto">
          <div className="flex space-x-2">
            {QUANTUM_TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleTopicClick(topic.prompt)}
                className="whitespace-nowrap px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm hover:bg-blue-100 transition-colors"
              >
                {topic.name}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div
                className={`max-w-3/4 rounded-lg px-4 py-2 ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
                }`}
              >
                {message.sender === 'ai' && message.isStreaming ? (
                  <div className="flex items-center space-x-1 py-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                ) : (
                  <div className="prose max-w-none">
                    {(() => {
                      // For AI messages, check if we should show the full content or truncated version
                      if (message.sender === 'ai' && shouldTruncate(message.content) && !expandedMessages[message.id]) {
                        const truncated = truncateText(message.content, 1000);
                        return (
                          <div>
                            <p>{truncated}</p>
                            <button
                              onClick={() => toggleExpandMessage(message.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm mt-2 focus:outline-none"
                            >
                              Show more
                            </button>
                          </div>
                        );
                      }
                      
                      // Show full content for expanded messages or user messages
                      return (
                        <div>
                          {message.content.split('\n').map((paragraph, i) => (
                            <p key={i} className="mb-4 last:mb-0">
                              {paragraph}
                            </p>
                          ))}
                          {message.sender === 'ai' && shouldTruncate(message.content) && (
                            <button
                              onClick={() => toggleExpandMessage(message.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm mt-2 focus:outline-none"
                            >
                              Show less
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                <p className="text-xs opacity-50 mt-1 text-right">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 rounded-lg rounded-bl-none p-3 max-w-3/4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Welcome message for new chats */}
        {messages.length === 1 && (
          <div className="px-4 pb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Try asking:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(question)}
                  className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 text-sm"
                >
                  "{question}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about quantum computing..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSend className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;
