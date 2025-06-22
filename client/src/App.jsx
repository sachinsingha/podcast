// App.jsx
import { Routes, Route, useNavigate } from "react-router-dom";
import Recorder from "./components/Recorder"; // ✅ Correct path
import { useState } from "react";

function Home() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");

  const handleJoin = () => {
    if (roomId.trim()) navigate(`/room/${roomId.trim()}`);
  };

  const generateRoom = () => {
    const id = Math.random().toString(36).substring(2, 8);
    navigate(`/room/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-6 bg-gray-50">
      <h1 className="text-3xl font-bold">🎙️ Shravan — AI Podcast Recorder</h1>
      <div className="space-x-2">
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter room ID"
          className="border p-2 rounded w-64"
        />
        <button
          onClick={handleJoin}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Join Room
        </button>
      </div>
      <button
        onClick={generateRoom}
        className="text-sm text-gray-600 hover:text-black underline"
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
