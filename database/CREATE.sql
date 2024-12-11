CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    username_id VARCHAR(20) NOT NULL UNIQUE,
    is_online BOOLEAN DEFAULT TRUE NOT NULL,
    name VARCHAR(20),
    surname VARCHAR(20),
    nationality VARCHAR(30),
    elo INT DEFAULT 1000 NOT NULL,
    description VARCHAR(2500),
    CONSTRAINT fk_username FOREIGN KEY (username_id) REFERENCES auth_user(username) ON DELETE CASCADE
);

CREATE TABLE ChessEngines (
    engine_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP NOT NULL,
    url VARCHAR(1000) NOT NULL UNIQUE,
    name VARCHAR(20) NOT NULL,
    description VARCHAR(2500),
    elo INT DEFAULT 1000 NOT NULL
);

CREATE TABLE Games (
    game_id SERIAL PRIMARY KEY,
    player_white_id INT REFERENCES Users(user_id),
    player_black_id INT REFERENCES Users(user_id),
    player_white_substitute_id INT REFERENCES ChessEngines(engine_id),
    player_black_substitute_id INT REFERENCES ChessEngines(engine_id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    is_ranked BOOLEAN DEFAULT TRUE NOT NULL,
    format_data JSONB DEFAULT '{"player_mode": "Human-Human", "chess_variant": "Standard", "time_format": "10+15"}',
    restrictions_data JSONB,
    description VARCHAR(500),
    chat VARCHAR(10000)
    result VARCHAR(50)
);

CREATE TABLE Moves(
    game_id INT REFERENCES Games(game_id) ON DELETE CASCADE NOT NULL,
    move_number INT NOT NULL,
    move_time TIMESTAMP NOT NULL,
    coordinate_move VARCHAR(5) NOT NULL,
    san_move VARCHAR(20) NOT NULL,
    fen_position VARCHAR(100) NOT NULL,
    PRIMARY KEY (game_id, move_number)
);

CREATE TABLE Tournaments (
    tournament_id SERIAL PRIMARY KEY,
    created_by_id INT REFERENCES Users(user_id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    player_count INT DEFAULT 8 NOT NULL,
    is_ranked BOOLEAN DEFAULT TRUE NOT NULL,
    name VARCHAR(30) NOT NULL,
    format_data JSONB DEFAULT '{"player_mode": "Human-Human", "chess_variant": "Standard", "time_format": "10+15"}',
    restrictions_data JSONB,
    description varchar(2500),
    chat VARCHAR(10000),
    result VARCHAR(250)
);

CREATE TABLE TournamentGames (
    tournament_id INT REFERENCES Tournaments(tournament_id) ON DELETE CASCADE NOT NULL,
    game_id INT REFERENCES Games(game_id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (tournament_id, game_id)
);

CREATE TABLE TournamentParticipants (
    tournament_id INT REFERENCES Tournaments(tournament_id) ON DELETE CASCADE NOT NULL,
    player_id INT REFERENCES Users(user_id) ON DELETE CASCADE NOT NULL,
    player_substitute_id INT REFERENCES ChessEngines(engine_id),
    score VARCHAR(255) DEFAULT '0',
    PRIMARY KEY (tournament_id, player_id)
);