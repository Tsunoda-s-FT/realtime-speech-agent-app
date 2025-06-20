// OpenAI Realtime API types
export interface SessionConfig {
  model: string;
  voice: string;
}

export interface ClientSecret {
  client_secret: {
    value: string;
    expires_at: number;
  };
}

export interface SessionUpdateEvent {
  type: 'session.update';
  session: {
    modalities: string[];
    instructions: string;
    voice: string;
    input_audio_format: string;
    output_audio_format: string;
    input_audio_transcription: {
      model: string;
    };
    turn_detection: {
      type: string;
      threshold: number;
      prefix_padding_ms: number;
      silence_duration_ms: number;
    };
    tools: any[];
    tool_choice: string;
    temperature: number;
    max_response_output_tokens: number | 'inf';
  };
}

export interface ConversationItemCreateEvent {
  type: 'conversation.item.create';
  item: {
    type: 'message';
    role: 'user' | 'assistant';
    content: Array<{
      type: 'input_text' | 'text';
      text: string;
    }>;
  };
}

// 正しいイベント名のインターフェース
export interface ConversationItemInputAudioTranscriptionEvent {
  type: 'conversation.item.input_audio_transcription.completed';
  transcript: string;
}

// 互換性のため古いイベント名も保持
export interface InputAudioTranscriptionEvent {
  type: 'input_audio_transcription.completed';
  transcript: string;
}

export interface ResponseAudioTranscriptEvent {
  type: 'response.audio_transcript.done';
  transcript: string;
}

export interface ResponseCreateEvent {
  type: 'response.create';
}

export interface InputAudioBufferClearEvent {
  type: 'input_audio_buffer.clear';
}

// Session関連のイベント
export interface SessionUpdatedEvent {
  type: 'session.updated';
  session: any;
}

export type RealtimeEvent = 
  | SessionUpdateEvent
  | SessionUpdatedEvent
  | ConversationItemCreateEvent
  | ConversationItemInputAudioTranscriptionEvent
  | InputAudioTranscriptionEvent
  | ResponseAudioTranscriptEvent
  | ResponseCreateEvent
  | InputAudioBufferClearEvent
  | RealtimeError;

export interface RealtimeError {
  type: 'error';
  error: {
    type: string;
    code?: string;
    message: string;
    param?: string;
    event_id?: string;
  };
}