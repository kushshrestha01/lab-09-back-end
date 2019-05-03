DROP TABLE IF EXISTS location, weather, events, movies, restaurants
CREATE TABLE location (
    id SERIAL,
    latitude DECIMAL,
    longitude DECIMAL,
    formatted_query VARCHAR(255),
    search_query VARCHAR(255),
    created_at BIGINT
);

CREATE TABLE weather (
    id SERIAL,
    latitude DECIMAL,
    longitude DECIMAL,
    forecast TEXT,
    time DATE,
    created_at BIGINT
);

CREATE TABLE events (
    id SERIAL,
    link TEXT,
    name TEXT,
    event_date DATE,
    summary TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    created_at BIGINT
);

CREATE TABLE movies (
    title TEXT,
    overview TEXT,
    average_votes DECIMAL,
    image_url TEXT,
    popularity DECIMAL,
    released_on DATE,
    created_at BIGINT
);

CREATE TABLE restaurants (
    name
    image_url
    price
    rating
    url
);
