// App.jsx
import { Routes, Route, useNavigate } from "react-router-dom";
import { useState } from "react";
import Recorder from "./components/Recorder";

function Home() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");

  const handleJoin = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  const generateRoom = () => {
    const id = Math.random().toString(36).substring(2, 8);
    navigate(`/room/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-6 bg-gray-100">
      <h1 className="text-3xl font-bold text-center">🎙️ Shravan — AI Podcast Recorder</h1>

      <div className="flex gap-2">
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter room ID"
          className="border border-gray-300 rounded px-3 py-2 w-64"
        />
        <button
          onClick={handleJoin}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Join Room
        </button>
      </div>

      <button
        onClick={generateRoom}
        className="text-sm text-blue-500 hover:underline"
      >
        Or generate a random room
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<Recorder />} />
    </Routes>
  );
}
