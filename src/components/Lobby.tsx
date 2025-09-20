import { useState, useEffect, type SetStateAction } from "react";
import type { LobbyState } from "../types";
import {
	subscribeToLobby,
	startGame,
	updatePlayerName,
} from "../firebaseService";
import { getGameUrl } from "../utils/urlUtils";
import { savePlayerName } from "../utils/storageUtils";

interface LobbyProps {
	gameId: string;
	playerId: string;
	isHost: boolean;
	playerName: string;
	onGameStart: () => void;
	onPlayerNameChange: (newName: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
	gameId,
	playerId,
	isHost,
	playerName,
	onGameStart,
	onPlayerNameChange,
}) => {
	const [lobby, setLobby] = useState<LobbyState | null>(null);
	const [isStarting, setIsStarting] = useState(false);
	const [isEditingName, setIsEditingName] = useState(false);
	const [tempPlayerName, setTempPlayerName] = useState(playerName);
	const [copySuccess, setCopySuccess] = useState(false);

	useEffect(() => {
		const unsubscribe = subscribeToLobby(
			gameId,
			(lobbyData: SetStateAction<LobbyState | null>) => {
				setLobby(lobbyData);
				if (
					lobbyData &&
					typeof lobbyData !== "function" &&
					"players" in lobbyData &&
					Array.isArray(lobbyData.players)
				) {
					// The players array may be typed as Omit<Player, ...>, so we can't use (p: Player)
					const player = lobbyData.players.find(
						(p: { id: string; name: string }) => p.id === playerId,
					);
					if (player && player.name !== playerName) {
						onPlayerNameChange(player.name);
					}
				}
			},
		);
		return unsubscribe;
	}, [gameId, playerId, playerName, onPlayerNameChange]);

	useEffect(() => {
		setTempPlayerName(playerName);
	}, [playerName]);

	const handleStartGame = async () => {
		if (!isHost || !lobby || lobby.players.length < 2) return;

		setIsStarting(true);
		const success = await startGame(gameId);
		if (success) {
			onGameStart();
		} else {
			setIsStarting(false);
			alert("Failed to start game. Please try again.");
		}
	};

	const handleNameEdit = () => {
		setIsEditingName(true);
	};

	const handleNameSave = async () => {
		if (tempPlayerName.trim()) {
			const newName = tempPlayerName.trim();
			const success = await updatePlayerName(gameId, playerId, newName);
			if (success) {
				savePlayerName(newName);
				onPlayerNameChange(newName);
				setIsEditingName(false);
			} else {
				alert("Failed to update name. Please try again.");
			}
		}
	};

	const handleNameCancel = () => {
		setTempPlayerName(playerName);
		setIsEditingName(false);
	};

	const handleCopyUrl = async () => {
		const url = getGameUrl(gameId);
		try {
			await navigator.clipboard.writeText(url);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		} catch {
			// Fallback for older browsers
			const textArea = document.createElement("textarea");
			textArea.value = url;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand("copy");
			document.body.removeChild(textArea);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		}
	};

	if (!lobby) {
		return (
			<div className="lobby-container">
				<div className="loading">Loading lobby...</div>
			</div>
		);
	}

	return (
		<div className="lobby-container">
			<div className="lobby-header">
				<h2>Game Lobby</h2>
				<div className="game-id">
					Game ID: <strong>{gameId}</strong>
				</div>
				<button type="button" onClick={handleCopyUrl} className="copy-url-btn">
					{copySuccess ? "✓ Copied!" : "📋 Copy Game Link"}
				</button>
			</div>

			<div className="player-name-section">
				<h3>Your Name:</h3>
				{isEditingName ? (
					<div className="name-edit">
						<input
							type="text"
							value={tempPlayerName}
							onChange={(e) => setTempPlayerName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleNameSave();
								if (e.key === "Escape") handleNameCancel();
							}}
							maxLength={20}
						/>
						<button type="button" onClick={handleNameSave} className="save-btn">
							Save
						</button>
						<button
							type="button"
							onClick={handleNameCancel}
							className="cancel-btn"
						>
							Cancel
						</button>
					</div>
				) : (
					<div className="name-display">
						<span className="current-name">{playerName}</span>
						<button type="button" onClick={handleNameEdit} className="edit-btn">
							✏️
						</button>
					</div>
				)}
			</div>

			<div className="players-list">
				<h3>Players ({lobby.players.length})</h3>
				<div className="players">
					{lobby.players.map((player) => (
						<div
							key={player.id}
							className={`player ${player.isHost ? "host" : ""} ${player.id === playerId ? "current" : ""}`}
						>
							<span className="player-name">{player.name}</span>
							{player.isHost && <span className="host-badge">Host</span>}
							{player.id === playerId && <span className="you-badge">You</span>}
						</div>
					))}
				</div>
			</div>

			{isHost && (
				<div className="lobby-actions">
					<button
						type="button"
						onClick={handleStartGame}
						disabled={lobby.players.length < 2 || isStarting}
						className="start-game-btn"
					>
						{isStarting ? "Starting Game..." : "Start Game"}
					</button>
					<p className="start-hint">
						{lobby.players.length < 2
							? "Waiting for at least one more player..."
							: "Ready to start!"}
					</p>
				</div>
			)}

			{!isHost && (
				<div className="waiting-message">
					<p>Waiting for the host to start the game...</p>
				</div>
			)}
		</div>
	);
};
