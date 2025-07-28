import { useEffect, useState } from "react";
import "./App.css";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  transports: ["websocket"],
  autoConnect: true,
});

function App() {
  const [roomId, setRoomId] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [inputRoom, setInputRoom] = useState("");
  const [players, setPlayers] = useState([]);
  const [role, setRole] = useState("");
  const [phase, setPhase] = useState("lobby");
  const [isAlive, setIsAlive] = useState(true);
  const [nickname, setNickname] = useState("");

  const handleCreateRoom = () => {
    socket.emit("createRoom", { nickname });
  };

  const handleJoinRoom = () => {
    socket.emit("joinRoom", {
      roomId: inputRoom.trim(),
      nickname,
    });
  };

  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Connected to server:", socket.id);
    });
    socket.on("roomCreated", (id) => {
      setRoomId(id);
      setIsHost(true);
      console.log("🎉 Room created with ID:", id);
    });
    socket.on("playerList", (list) => {
      setPlayers(list);
    });
    socket.on("joinedRoom", (id) => {
      setRoomId(id);
      setIsHost(false);
    });
    socket.on("rolesAssigned", (data) => {
      setRole(data.role);
      setPhase("night");
      setIsAlive(true);
      console.log(`🧩 You are assigned role: ${data.role}`);
    });
    socket.on("nightResults", ({ killed }) => {
      console.log(players);
      console.log("Night result received:", killed);
      if (killed) {
        if (socket.id === killed) {
          setIsAlive(false);
          alert(`☠️ You were killed tonight`);
          return;
        }
        alert(`☠️ Player ${killed} was killed tonight`);
      } else {
        alert("💊 No one died tonight. The doctor saved a life!");
      }
      setPhase("day");
    });
    socket.on("votingResults", ({ eliminated }) => {
      if (eliminated === socket.id) {
        setIsAlive(false);
      }

      if (eliminated) {
        alert(`☠️ Player ${eliminated} was voted out.`);
      } else {
        alert("🤷 No one was eliminated. Tie or no majority.");
      }

      setPhase("night");
    });
    socket.on("gameOver", ({ winner }) => {
      alert(`🎉 Game Over! ${winner.toUpperCase()} win the game!`);
      setPhase("ended");
    });

    socket.on("roomError", (msg) => {
      alert(msg);
    });
  }, [socket]);

  return (
    <div className="App">
      <div
        style={{
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <h1 className="header_text">
          True <span>Mafia</span>
        </h1>
        {phase === "night" && (
          <div>
            <h2>🌙 Night Phase</h2>
            <p>
              Your role: <strong>{role}</strong>
            </p>
            <p>
              {isAlive
                ? "Choose your action:"
                : "You are dead. Watching silently 👻"}
            </p>
            {role === "mafia" && (
              <>
                <p>Select someone to eliminate:</p>
                <ul>
                  {players
                    .filter((p) => p.id !== socket.id && p.alive)
                    .map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() =>
                            socket.emit("nightAction", {
                              roomId,
                              targetId: p.id,
                            })
                          }
                        >
                          ☠️ Kill <strong>{p.nickname}</strong>{" "}
                          {p.alive === false && "☠️"}
                        </button>
                      </li>
                    ))}
                </ul>
              </>
            )}

            {role === "doctor" && (
              <>
                <p>Select someone to heal:</p>
                <ul>
                  {players
                    .filter((p) => p.alive)
                    .map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() =>
                            socket.emit("nightAction", { roomId, healId: p.id })
                          }
                        >
                          💊 Heal <strong>{p.nickname}</strong>{" "}
                          {p.alive === false && "☠️"}
                        </button>
                      </li>
                    ))}
                </ul>
              </>
            )}

            {role === "civilian" && (
              <p>You're a civilian. Stay quiet and survive the night.</p>
            )}
          </div>
        )}
        {phase === "day" && (
          <div>
            <h2>🌞 Day Phase - Voting</h2>
            <p>
              {isAlive
                ? "Vote to eliminate someone:"
                : "You are dead. Spectating... 👀"}
            </p>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {players
                .filter((p) => p.alive && p.id !== socket.id)
                .map((p) => (
                  <li key={p.id}>
                    <strong>{p.nickname}</strong> {p.alive === false && "☠️"}
                    {isAlive && (
                      <button
                        onClick={() =>
                          socket.emit("vote", { roomId, targetId: p.id })
                        }
                        style={{ marginLeft: 10 }}
                      >
                        Vote
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        )}

        {!roomId ? (
          <section className="beginning_wrapper">
            <div className="nickname_input">
              <input
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <button>Save</button>
            </div>

            <button className="btn create_room" onClick={handleCreateRoom}>Create Room</button>
            <p className="recomment_text">Or join an existing room via room id 👇</p>
            <div className="join_input">
              <input
                type="text"
                placeholder="Enter room id"
                value={inputRoom}
                onChange={(e) => setInputRoom(e.target.value)}
              />
              <button onClick={handleJoinRoom}>Join room</button>
            </div>
          </section>
        ) : phase === "lobby" ? (
          <div className="room_created">
            <h3>
              Room Created Succesfully <br />
              <strong>Share this id with friends: <span>{roomId}</span></strong>
            </h3>
            <h4>Players joined: </h4>
            <ol style={{ padding: 0 }}>
              {players.map((p) => (
                <li key={p.id}>
                  {" "}
                  <strong>{p.nickname}</strong> {p.alive === false && "☠️"}
                </li>
              ))}
            </ol>
            {isHost && players.length >= 3 && phase === "lobby" && (
              <button
                onClick={() => socket.emit("startGame", roomId)}
                style={{ marginTop: "10px" }}
              >
                🔍 Start Game
              </button>
            )}
          </div>
        ) : (
          ""
        )}
      </div>
    </div>
  );
}

export default App;
