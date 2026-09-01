/**
 * Audio Capture, Live Speech Recognition & Natural Voice Controller.
 * 
 * Features live Web Speech API recognition (RU/EN), 16kHz PCM streaming,
 * dynamic waveform rendering, and natural human vocalization.
 */

class AudioController {
  constructor(wsClient) {
    this.wsClient = wsClient;
    this.isRecording = false;
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.scriptProcessor = null;
    
    this.canvas = document.getElementById('waveform_canvas');
    this.canvasCtx = this.canvas ? this.canvas.getContext('2d') : null;
    this.animationFrameId = null;

    this.audioPlayer = document.getElementById('tts_audio_player');
    this.targetSampleRate = 16000;

    // Speech Recognition
    this.recognition = null;
    this.recognizedText = '';
    this._initSpeechRecognition();
  }

  _initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = navigator.language || 'ru-RU';

      this.recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            this.recognizedText += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        const full = (this.recognizedText + ' ' + interim).trim();
        if (full) {
          const el = document.getElementById('stt_transcript_text');
          if (el) el.textContent = `"${full}"`;
        }
      };

      this.recognition.onerror = (e) => {
        console.debug('[AudioController] SpeechRecognition note:', e.error);
      };
    }
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      this.isRecording = true;
      this.recognizedText = '';
      this.updateMicUI(true);

      // Start native speech recognition
      if (this.recognition) {
        try {
          this.recognition.start();
        } catch (e) {}
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          this.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true
            }
          });

          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const nativeRate = this.audioContext.sampleRate;

          const source = this.audioContext.createMediaStreamSource(this.mediaStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 256;
          source.connect(this.analyser);

          this.scriptProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);
          source.connect(this.scriptProcessor);
          this.scriptProcessor.connect(this.audioContext.destination);

          this.scriptProcessor.onaudioprocess = (e) => {
            if (!this.isRecording) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const downsampled = this.downsampleBuffer(inputData, nativeRate, this.targetSampleRate);
            const pcm16 = this.floatTo16BitPCM(downsampled);
            this.wsClient.sendBinary(pcm16.buffer);
          };

          this.startWaveformVisualizer();
          return;
        } catch (mediaErr) {
          console.warn('[AudioController] Microphone note:', mediaErr);
        }
      }

      this.startSimulatedVisualizer();
    } catch (err) {
      console.error('[AudioController] Error starting audio:', err);
      this.stopRecording();
    }
  }

  stopRecording(simulatedCommandText = null) {
    this.isRecording = false;
    this.updateMicUI(false);

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.drawIdleWaveform();

    const finalText = (simulatedCommandText || this.recognizedText).trim();

    if (finalText) {
      const el = document.getElementById('stt_transcript_text');
      if (el) el.textContent = `"${finalText}"`;

      this.wsClient.send({
        type: 'TEXT_PROMPT',
        text: finalText
      });
      return;
    }

    this.wsClient.send({ type: 'AUDIO_END' });
  }

  simulateVoiceCommand(commandText) {
    console.log(`[AudioController] Simulating voice command: "${commandText}"`);
    this.isRecording = true;
    this.updateMicUI(true);
    this.startSimulatedVisualizer();

    setTimeout(() => {
      this.stopRecording(commandText);
    }, 600);
  }

  updateMicUI(recording) {
    const micBtn = document.getElementById('mic_btn');
    const label = document.getElementById('voice_status_label');
    const subLabel = document.getElementById('voice_sub_label');

    if (recording) {
      micBtn?.classList.add('recording');
      if (label) label.textContent = 'Слушаю ваш голос...';
      if (subLabel) subLabel.textContent = 'Нажмите еще раз для отправки';
    } else {
      micBtn?.classList.remove('recording');
      if (label) label.textContent = 'Нажмите микрофон для разговора';
      if (subLabel) subLabel.textContent = 'Или кликните быстрый чип ниже';
    }
  }

  downsampleBuffer(buffer, sampleRate, outSampleRate) {
    if (outSampleRate >= sampleRate) {
      return buffer;
    }
    const ratio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
      const position = i * ratio;
      const index = Math.floor(position);
      const weight = position - index;
      const current = buffer[index] || 0;
      const next = buffer[index + 1] !== undefined ? buffer[index + 1] : current;
      result[i] = current + weight * (next - current);
    }
    return result;
  }

  floatTo16BitPCM(floatArray) {
    const pcm = new Int16Array(floatArray.length);
    for (let i = 0; i < floatArray.length; i++) {
      const s = Math.max(-1.0, Math.min(1.0, floatArray[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm;
  }

  startWaveformVisualizer() {
    if (!this.canvas || !this.analyser) return;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.isRecording) return;
      this.animationFrameId = requestAnimationFrame(draw);

      this.analyser.getByteTimeDomainData(dataArray);

      this.canvasCtx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.canvasCtx.lineWidth = 2.5;
      this.canvasCtx.strokeStyle = '#6366f1';
      this.canvasCtx.beginPath();

      const sliceWidth = this.canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * (this.canvas.height / 2);
        if (i === 0) this.canvasCtx.moveTo(x, y);
        else this.canvasCtx.lineTo(x, y);
        x += sliceWidth;
      }

      this.canvasCtx.stroke();
    };

    draw();
  }

  startSimulatedVisualizer() {
    if (!this.canvasCtx) return;
    let phase = 0;

    const drawSim = () => {
      if (!this.isRecording) return;
      this.animationFrameId = requestAnimationFrame(drawSim);

      this.canvasCtx.fillStyle = 'rgba(17, 22, 34, 0.3)';
      this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.canvasCtx.lineWidth = 2.5;
      this.canvasCtx.strokeStyle = '#06b6d4';
      this.canvasCtx.beginPath();

      const width = this.canvas.width;
      const height = this.canvas.height;
      const mid = height / 2;

      for (let x = 0; x < width; x++) {
        const angle = (x / width) * Math.PI * 4 + phase;
        const amp = Math.sin(phase * 2) * 16 + 12;
        const y = mid + Math.sin(angle) * amp;
        if (x === 0) this.canvasCtx.moveTo(x, y);
        else this.canvasCtx.lineTo(x, y);
      }

      this.canvasCtx.stroke();
      phase += 0.15;
    };

    drawSim();
  }

  drawIdleWaveform() {
    if (!this.canvasCtx || !this.canvas) return;
    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvasCtx.lineWidth = 1.5;
    this.canvasCtx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    this.canvasCtx.beginPath();
    this.canvasCtx.moveTo(0, this.canvas.height / 2);
    this.canvasCtx.lineTo(this.canvas.width, this.canvas.height / 2);
    this.canvasCtx.stroke();
  }

  speakNaturalVoice(text) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const isRussian = /[а-яёА-ЯЁ]/.test(text);
      utterance.lang = isRussian ? 'ru-RU' : 'en-US';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const targetLang = isRussian ? 'ru' : 'en';
      const bestVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetLang));
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[AudioController] Speech synthesis note:', e);
    }
  }

  playAudioResponse(base64Wav) {
    try {
      const binary = atob(base64Wav);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes.buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      if (this.audioPlayer) {
        this.audioPlayer.src = url;
        this.audioPlayer.volume = 0.35;
        this.audioPlayer.play().catch(e => {
          console.debug('[AudioController] Play note:', e);
        });
      }
    } catch (e) {
      console.error('[AudioController] Playback error:', e);
    }
  }
}

// Global export
window.AudioController = AudioController;
