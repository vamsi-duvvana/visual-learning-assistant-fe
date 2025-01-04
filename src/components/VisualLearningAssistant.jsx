import { useState, useRef } from 'react';
import { Camera, Mic, Send, StopCircle, Play, Pause } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const VisualLearningAssistant = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [context, setContext] = useState('');
  const [solution, setSolution] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [videoStream, setVideoStream] = useState(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setVideoStream(stream);
      setIsCameraOn(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const captureImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const image = canvas.toDataURL('image/jpeg');
    setCapturedImage(image);

    // Stop camera stream
    const stream = videoRef.current.srcObject;
    stream.getTracks().forEach(track => track.stop());
  };

  const closeCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

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
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const submitDoubt = async () => {
    if (isRecording) {
      stopRecording();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsLoading(true);
    setCurrentStep(0);

    const formData = new FormData();
    formData.append('image', capturedImage);

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

      // Split solution into steps
      const steps = data.text_solution.split('\n\n').filter(step => step.trim());
      setSolution({
        steps,
        audioUrls: data.voice_solution_steps // Array of audio URLs for each step
      });

    } catch (err) {
      console.error('Error submitting doubt:', err);
    } finally {
      setIsLoading(false);
      setAudioChunks([]);
    }
  };

  const playCurrentStep = () => {
    if (!solution?.audioUrls?.[currentStep]) return;

    if (audioRef.current) {
      audioRef.current.src = `http://localhost:8000/audio/${solution.audioUrls[currentStep]}`;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
    if (currentStep < solution.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setTimeout(playCurrentStep, 500); // Add delay between steps
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
                  className="w-full h-full object-cover"
                  style={{ display: isCameraOn ? 'block' : 'none' }}
                />
                {isCameraOn ? (
                  <button
                    onClick={captureImage}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-500 text-white rounded z-10"
                  >
                    Capture
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="absolute inset-0 flex items-center justify-center z-10"
                  >
                    <div className="flex flex-col items-center">
                      <Camera className="w-12 h-12 text-gray-500" />
                      <p>Please click to turn on camera 📷</p>
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
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-500 text-white rounded z-10"
                >
                  Retake Photo
                </button>
              </div>
            )}
          </div>
          {!capturedImage && isCameraOn && (
            <button
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
              onClick={closeCamera}
            >
              Close Camera
            </button>
          )}
        </div>

        {/* Voice/Text Input Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="p-2 rounded-full bg-red-500 text-white"
              >
                <Mic className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="p-2 rounded-full bg-gray-500 text-white"
              >
                <StopCircle className="w-6 h-6" />
              </button>
            )}
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Type your context here..."
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={submitDoubt}
              disabled={isLoading}
              className="p-2 rounded-full bg-blue-500 text-white"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Solution Display with Step Navigation */}
        {solution && solution.steps && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Solution Step {currentStep + 1}/{solution.steps.length}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  className="px-3 py-1 bg-gray-200 rounded"
                  disabled={currentStep === 0}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentStep(prev => Math.min(solution.steps.length - 1, prev + 1))}
                  className="px-3 py-1 bg-gray-200 rounded"
                  disabled={currentStep === solution.steps.length - 1}
                >
                  Next
                </button>
              </div>
            </div>

            {/* <div className="prose max-w-none p-4 bg-gray-50 rounded-lg">
              <ReactMarkdown>{solution.steps[currentStep]}</ReactMarkdown>
            </div> */}

            {solution?.steps.map((step, index) => (
              <div
                key={index}
                className={`p-4 ${currentStep === index ? 'bg-blue-50' : ''}`}
              >
                <ReactMarkdown>{step}</ReactMarkdown>
              </div>
            ))}

            <div className="flex justify-center gap-4">
              <button
                onClick={isPlaying ? pauseAudio : playCurrentStep}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play Step'}
              </button>
            </div>

            <audio
              ref={audioRef}
              onEnded={handleAudioEnd}
              // onPause={() => setIsPlaying(false)}
              // className="hidden"
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualLearningAssistant;