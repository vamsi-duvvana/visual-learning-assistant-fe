import { useState, useRef, useEffect } from 'react';
import { Camera, Mic, Send, StopCircle, PlayCircle, PauseCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const VisualLearningAssistant = () => {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [context, setContext] = useState('');
  const [solution, setSolution] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const audioRef = useRef(null);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoStreamRef = useRef(null);

  // Cleanup effect for audio and video streams
  useEffect(() => {
    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Camera handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg'));
    closeCamera();
  };

  const closeCamera = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  // Audio recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        setAudioChunks(prev => [...prev, event.data]);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Solution submission handler
  const submitDoubt = async () => {
    if (isRecording) {
      stopRecording();
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for chunks to be collected
    }

    setIsLoading(true);
    const formData = new FormData();

    if (capturedImage) {
      formData.append('image', capturedImage);
    }

    if (audioChunks.length > 0) {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      formData.append('audio', audioBlob);
    }

    formData.append('text_context', context);

    try {
      const response = await fetch('http://localhost:8000/solve_doubt', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setSolution(data);

      // Set up audio URL
      if (data.voice_solution) {
        const fileName = data.voice_solution.split('/')[1];
        console.log("🚀 ~ submitDoubt ~ fileName:", fileName)
        setAudioUrl(`http://localhost:8000/audio/${fileName}`);
      }
    } catch (err) {
      console.error('Error submitting doubt:', err);
    } finally {
      setIsLoading(false);
      setAudioChunks([]);
    }
  };

  // Audio playback handlers
  const toggleAudio = async () => {
    if (!solution?.voice_solution) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => {
          setAudioError('Failed to load audio');
          setIsPlaying(false);
        };
      }

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      setAudioError('Failed to play audio');
      console.error('Audio playback error:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Visual Learning Assistant</h1>

        {/* Camera Section */}
        <div className="mb-6">
          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden min-h-[300px]">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ display: isCameraOn ? 'block' : 'none' }}
                />
                {isCameraOn ? (
                  <button
                    onClick={captureImage}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Capture
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="absolute inset-0 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Camera className="w-12 h-12 text-gray-500" />
                      <p className="text-gray-600">Click to turn on camera 📷</p>
                    </div>
                  </button>
                )}
              </>
            ) : (
              <div className="relative h-full">
                <img
                  src={capturedImage}
                  alt="Captured doubt"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    startCamera();
                  }}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Retake Photo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Input Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-full ${isRecording ? 'bg-gray-500' : 'bg-red-500'
                } text-white hover:opacity-90 transition-opacity`}
            >
              {isRecording ? (
                <StopCircle className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Type your question here..."
              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={submitDoubt}
              disabled={isLoading}
              className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Solution Display */}
        {solution && (
          <div className="mt-6 space-y-4">
            <h2 className="text-xl font-semibold">Solution</h2>
            <div className="prose max-w-none">
              <ReactMarkdown>{solution.text_solution}</ReactMarkdown>
            </div>

            {/* Audio Controls */}
            {solution && (
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={toggleAudio}
                  className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  {isPlaying ? (
                    <PauseCircle className="w-6 h-6" />
                  ) : (
                    <PlayCircle className="w-6 h-6" />
                  )}
                </button>
                {audioError && (
                  <span className="text-red-500 text-sm">{audioError}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualLearningAssistant;
