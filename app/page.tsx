'use client';

import { useState, useEffect } from 'react';
import { useWebRTCSession } from '@/hooks/useWebRTCSession';
import { scenarios, type Scenario } from '@/lib/scenarios';
import { Mic, MicOff, Phone, PhoneOff, AlertCircle, Volume2 } from 'lucide-react';

export default function Home() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [transcripts, setTranscripts] = useState<Array<{ text: string; isUser: boolean; timestamp: Date }>>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const {
    isConnected,
    isMuted,
    connect,
    disconnect,
    toggleMute
  } = useWebRTCSession({
    onTranscript: (transcript, isUser) => {
      setTranscripts(prev => [...prev, {
        text: transcript,
        isUser,
        timestamp: new Date()
      }]);
    },
    onConnectionStateChange: (state) => {
      setConnectionStatus(state);
    },
    onError: (error) => {
      setError(error.message);
      console.error('Session error:', error);
    }
  });

  // Auto-scroll to bottom of transcripts
  useEffect(() => {
    const transcriptContainer = document.getElementById('transcript-container');
    if (transcriptContainer) {
      transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
    }
  }, [transcripts]);

  const handleConnect = async () => {
    if (!selectedScenario) return;
    
    setError(null);
    setTranscripts([]);
    
    try {
      await connect(selectedScenario);
    } catch {
      setError('接続に失敗しました。もう一度お試しください。');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setTranscripts([]);
    setConnectionStatus('disconnected');
  };

  const handleScenarioSelect = (scenario: Scenario) => {
    if (isConnected) {
      disconnect();
    }
    setSelectedScenario(scenario);
    setTranscripts([]);
    setError(null);
  };

  const levelColors = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800'
  };

  const levelLabels = {
    beginner: '初級',
    intermediate: '中級',
    advanced: '上級'
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          日本語ロールプレイ練習
        </h1>

        {/* Scenario Selection */}
        {!isConnected && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">シナリオを選択</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => handleScenarioSelect(scenario)}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                    selectedScenario?.id === scenario.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">{scenario.icon}</div>
                  <h3 className="font-semibold text-lg mb-1">{scenario.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${levelColors[scenario.level]}`}>
                    {levelLabels[scenario.level]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Connection Controls */}
        {selectedScenario && (
          <div className="mb-8 text-center">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedScenario}
              >
                <Phone className="w-5 h-5 mr-2" />
                練習を開始
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center gap-4">
                  <button
                    onClick={toggleMute}
                    className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                      isMuted
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
                    {isMuted ? 'ミュート中' : 'マイクON'}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <PhoneOff className="w-5 h-5 mr-2" />
                    終了
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  接続状態: <span className="font-medium">{connectionStatus}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Conversation Display */}
        {(isConnected || transcripts.length > 0) && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Volume2 className="w-5 h-5 mr-2" />
              会話履歴
            </h2>
            <div
              id="transcript-container"
              className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-3"
            >
              {transcripts.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  会話を始めてください...
                </div>
              ) : (
                transcripts.map((transcript, index) => (
                  <div
                    key={index}
                    className={`flex ${transcript.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                        transcript.isUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="text-sm">{transcript.text}</div>
                      <div className={`text-xs mt-1 ${
                        transcript.isUser ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {transcript.timestamp.toLocaleTimeString('ja-JP')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isConnected && !selectedScenario && (
          <div className="mt-12 text-center text-gray-600">
            <p className="text-lg mb-2">使い方:</p>
            <ol className="text-left max-w-2xl mx-auto space-y-2">
              <li>1. 練習したいシナリオを選択します</li>
              <li>2. 「練習を開始」ボタンをクリックします</li>
              <li>3. マイクの使用を許可します</li>
              <li>4. AIと日本語で会話練習を行います</li>
              <li>5. 終了したい時は「終了」ボタンをクリックします</li>
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}