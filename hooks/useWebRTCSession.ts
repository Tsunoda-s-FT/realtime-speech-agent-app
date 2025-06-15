import { useCallback, useEffect, useRef, useState } from 'react';
import type { 
  ClientSecret, 
  RealtimeEvent, 
  SessionUpdateEvent,
  ConversationItemCreateEvent
} from '@/types/realtime';
import type { Scenario } from '@/lib/scenarios';

interface UseWebRTCSessionProps {
  onTranscript?: (transcript: string, isUser: boolean) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: Error) => void;
}

export function useWebRTCSession({
  onTranscript,
  onConnectionStateChange,
  onError
}: UseWebRTCSessionProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const sendEvent = useCallback((event: RealtimeEvent) => {
    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify(event));
      console.log('Sent event:', event.type);
    } else {
      console.warn('Data channel not open, cannot send event:', event.type);
    }
  }, []);

  const setupSessionConfig = useCallback((instructions: string) => {
    const sessionUpdate: SessionUpdateEvent = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions,
        voice: 'shimmer',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200
        },
        tools: [],
        tool_choice: 'auto',
        temperature: 0.8,
        max_response_output_tokens: 'inf'
      }
    };
    sendEvent(sessionUpdate);
  }, [sendEvent]);

  const connect = useCallback(async (scenario: Scenario) => {
    try {
      // Cleanup existing connection
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      setIsConnected(false);
      setIsMuted(false);
      document.querySelectorAll('audio').forEach(el => el.remove());

      // Get ephemeral key
      const sessionResponse = await fetch('/api/session', { method: 'POST' });
      if (!sessionResponse.ok) {
        throw new Error('Failed to get session');
      }
      const sessionData: ClientSecret = await sessionResponse.json();
      
      // Check if ephemeral key is valid
      const expiresAt = sessionData.client_secret.expires_at * 1000;
      if (Date.now() >= expiresAt) {
        throw new Error('Ephemeral key expired');
      }

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        } 
      });
      localStreamRef.current = stream;

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = pc;

      // Add audio track
      const audioTrack = stream.getAudioTracks()[0];
      pc.addTrack(audioTrack, stream);

      // Create data channel
      const dataChannel = pc.createDataChannel('oai-events', { ordered: true });
      dataChannelRef.current = dataChannel;

      // Handle data channel events
      dataChannel.onopen = () => {
        console.log('Data channel opened');
        setupSessionConfig(scenario.instructions);
        
        // AIから会話を開始するため、response.createイベントを送信
        setTimeout(() => {
          sendEvent({ type: 'response.create' });
          console.log('Sent initial response.create to start conversation');
        }, 500); // セッション設定が完了するまで少し待つ
      };

      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received event:', data.type);

          switch (data.type) {
            // 正しいイベント名に修正
            case 'conversation.item.input_audio_transcription.completed':
              console.log('User transcript:', data.transcript);
              onTranscript?.(data.transcript, true);
              break;
            // 古いイベント名もサポート（互換性のため）
            case 'input_audio_transcription.completed':
              console.log('User transcript (legacy):', data.transcript);
              onTranscript?.(data.transcript, true);
              break;
            case 'response.audio_transcript.done':
              console.log('Assistant transcript:', data.transcript);
              onTranscript?.(data.transcript, false);
              break;
            case 'error':
              console.error('Realtime API error:', data.error);
              onError?.(new Error(data.error.message));
              break;
            // デバッグ用：session.updatedイベントを確認
            case 'session.updated':
              console.log('Session updated:', data.session);
              break;
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
        onError?.(new Error('Data channel error'));
      };

      // Handle remote audio
      pc.ontrack = (event) => {
        console.log('Received remote track');
        const remoteAudio = document.createElement('audio');
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.autoplay = true;
        
        // autoplay policyへの対処
        remoteAudio.play().catch(err => {
          console.warn('Autoplay failed:', err);
          // ユーザーインタラクション後に再生を試みる
        });
        
        document.body.appendChild(remoteAudio);
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        onConnectionStateChange?.(pc.connectionState);
        setIsConnected(pc.connectionState === 'connected');
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering (max 3 seconds)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          const timeout = setTimeout(() => resolve(), 3000);
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
              clearTimeout(timeout);
              resolve();
            }
          };
        }
      });

      // Send offer to OpenAI
      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2025-06-03`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.client_secret.value}`,
            'Content-Type': 'application/sdp'
          },
          body: pc.localDescription!.sdp
        }
      );

      if (!sdpResponse.ok) {
        throw new Error(`WebRTC connection failed: ${sdpResponse.status}`);
      }

      const answer = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answer
      });

      console.log('WebRTC connection established');
    } catch (error) {
      console.error('Connection error:', error);
      onError?.(error as Error);
      // Cleanup on error
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      setIsConnected(false);
      setIsMuted(false);
      document.querySelectorAll('audio').forEach(el => el.remove());
    }
  }, [setupSessionConfig, onTranscript, onConnectionStateChange, onError, sendEvent]);

  const disconnect = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setIsConnected(false);
    setIsMuted(false);

    // Remove audio elements
    document.querySelectorAll('audio').forEach(el => el.remove());
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        // Clear audio buffer when muting
        if (!audioTrack.enabled) {
          sendEvent({ type: 'input_audio_buffer.clear' });
        }
      }
    }
  }, [sendEvent]);

  const sendMessage = useCallback((text: string) => {
    const event: ConversationItemCreateEvent = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text
        }]
      }
    };
    sendEvent(event);
    sendEvent({ type: 'response.create' });
  }, [sendEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isMuted,
    connect,
    disconnect,
    toggleMute,
    sendMessage
  };
}