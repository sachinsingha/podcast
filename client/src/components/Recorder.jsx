import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("https://shravan-backend.onrender.com");


export default function Recorder() {
  const { roomId } = useParams(); // ✅ Get room from URL
  const videoRef = useRef(null);
  const peerConnections = useRef({});

  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recording, setRecording] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [timer, setTimer] = useState(0);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const timerRef = useRef(null);

  // 1. Setup media + socket
  useEffect(() => {
    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoRef.current.srcObject = stream;

        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          setPlaybackUrl(URL.createObjectURL(blob));
          setRecordedChunks(chunks);
        };

        setMediaRecorder(recorder);

        socket.emit("join-room", roomId || "shravan-room"); // ✅ Dynamic room

        socket.on("guest-joined", ({ id }) => {
          const pc = createPeerConnection(id, stream);
          makeOffer(pc, id);
        });

        socket.on("offer", async ({ from, offer }) => {
          const pc = createPeerConnection(from, stream);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { to: from, answer });
        });

        socket.on("answer", async ({ from, answer }) => {
          const pc = peerConnections.current[from];
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on("ice-candidate", ({ from, candidate }) => {
          const pc = peerConnections.current[from];
          if (pc && candidate) pc.addIceCandidate(new RTCIceCandidate(candidate));
        });

      } catch (err) {
        console.error("Media setup error:", err);
      }

      return () => socket.disconnect();
    }

    initMedia();
  }, [roomId]);

  // 2. Create peer connection
  function createPeerConnection(peerId, localStream) {
    const pc = new RTCPeerConnection();
    peerConnections.current[peerId] = pc;

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", { to: peerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStreams((prev) => {
        if (prev.some((s) => s.id === peerId)) return prev;
        return [...prev, { id: peerId, stream: e.streams[0] }];
      });
    };

    return pc;
  }

  async function makeOffer(pc, peerId) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { to: peerId, offer });
  }

  // 3. Recording Controls
  const startRecording = () => {
    mediaRecorder?.start();
    setRecording(true);
    setUploadedUrl("");
    setPlaybackUrl("");
    setRecordedChunks([]);
    setTimer(0);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const uploadRecording = async () => {
    if (!recordedChunks.length) return;

    const file = new File(recordedChunks, "recording.webm", { type: "video/webm" });
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await axios.post("http://localhost:5000/upload", formData);
      setUploadedUrl(res.data.url);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console.");
    } finally {
      setUploading(false);
    }
  };

  const downloadRecording = () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recording.webm";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetRecording = () => {
    setPlaybackUrl("");
    setRecordedChunks([]);
    setUploadedUrl("");
    setTimer(0);
  };

  // 4. UI
  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-center">🎙️ Shravan Recorder</h2>

      {roomId && (
        <div className="text-center text-sm text-gray-400">
          🔗 Room: <span className="font-mono">{roomId}</span> |{" "}
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="underline text-blue-400"
          >
            Copy Invite Link
          </button>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* You */}
        <div className="bg-gray-800 text-white rounded-lg p-2 text-center shadow">
          <h4 className="text-sm font-semibold mb-2">You</h4>
          <video ref={videoRef} autoPlay muted className="w-full rounded" />
        </div>

        {/* Guests */}
        {remoteStreams.map(({ id, stream }, index) => (
          <div key={id} className="bg-gray-700 text-white rounded-lg p-2 text-center shadow">
            <h4 className="text-sm font-semibold mb-2">Guest {index + 1}</h4>
            <video
              autoPlay
              playsInline
              ref={(el) => {
                if (el) el.srcObject = stream;
              }}
              className="w-full rounded"
            />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 justify-center items-center mt-2">
        {!recording ? (
          <button onClick={startRecording} className="px-4 py-2 bg-green-500 text-white rounded">
            Start
          </button>
        ) : (
          <button onClick={stopRecording} className="px-4 py-2 bg-red-500 text-white rounded">
            Stop
          </button>
        )}
        {recording && <span className="text-sm text-gray-700">⏱️ {timer}s</span>}
      </div>

      {/* Preview & Actions */}
      {playbackUrl && (
        <div className="mt-6 space-y-4">
          <h3 className="font-medium">🎬 Recorded Preview:</h3>
          <video src={playbackUrl} controls className="w-full rounded shadow" />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={uploadRecording}
              className="px-4 py-2 bg-blue-600 text-white rounded"
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload to Cloud"}
            </button>
            <button onClick={downloadRecording} className="px-4 py-2 bg-yellow-500 text-white rounded">
              Download
            </button>
            <button onClick={resetRecording} className="px-4 py-2 bg-gray-600 text-white rounded">
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Upload Link */}
      {uploadedUrl && (
        <div className="mt-4 text-green-500 text-center">
          ✅ Uploaded! View:{" "}
          <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {uploadedUrl}
          </a>
        </div>
      )}
    </div>
  );
}
