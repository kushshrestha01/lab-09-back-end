CREATE TABLE location (
    id SERIAL,
    latitude DECIMAL,
    longitude DECIMAL,
    formatted_query VARCHAR(255),
    search_query VARCHAR(255)
);

CREATE TABLE weather (
    id SERIAL,
    latitude DECIMAL,
    longitude DECIMAL,
    forecast TEXT,
    time DATE
);

CREATE TABLE events (
    id SERIAL,
    link TEXT,
    name TEXT,
    event_date DATE,
    summary TEXT,
    latitude DECIMAL,
    longitude DECIMAL
);