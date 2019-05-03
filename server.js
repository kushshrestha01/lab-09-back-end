'use strict';

require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

// Variable for holding current location
// use environment variable, or, if it's undefined, use 3000 by default
const PORT = process.env.PORT || 3000;

//static files
app.use(cors());

// Constructor for the Location response from API
const Location = function(query, res){
  this.search_query = query;
  this.formatted_query = res.results[0].formatted_address;
  this.latitude = res.results[0].geometry.location.lat;
  this.longitude = res.results[0].geometry.location.lng;
};

// Constructor for a DaysWeather.
const DaysWeather = function(forecast, time, latitude, longitude){
  this.forecast = forecast;
  this.latitude = latitude;
  this.longitude = longitude;
  this.time = new Date(time * 1000).toDateString();
};

//Constructor for eventInstance
const Event = function(res) {
  this.link = res.url;
  this.name = res.name.text;
  this.event_date = new Date(res.start.utc).toDateString();
  this.summary = res.summary;
};

// Database Setup
//            postgres protocol
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

//routes
app.get('/location', (request, response) => {
  try {
    // queryData is what the user typed into the box in the FE and hit "explore"
    const queryData = request.query.data;
    getLatLng(queryData)
      .then(location => response.send(location))
      .catch(error => errorHandling(error, response));

  } catch( error ) {
    console.error(error);
    errorHandling(error, response);
  }
});

//route for weather daily data
app.get('/weather', (request, response) => {
  try {
    getWeather(request.query.data)
      .then(weather => response.send(weather))
      .catch(error => errorHandling(error, response));

  } catch( error ) {
    errorHandling(error, response);
  }
});

//route for eventbrite
app.get('/events', (request, response) => {
  try {
    getEvents(request.query.data)
      .then(events => response.send(events))
      .catch(error => errorHandling(error, response));
  } catch( error ) {
    errorHandling(error, response);
  }
});

// Function for getting all the daily weather
function getDailyWeather(weatherData){
  console.log('in getDailyWeather');
  let weatherArr = weatherData.daily.data;
  return weatherArr.map(day => {
    return new DaysWeather(day.summary, day.time, weatherData.latitude, weatherData.longitude);
  });
}

// Function for handling errors
function errorHandling(error, response){
  console.log('ERROR HANDLER HIT', error);
  response.status(500).send('Sorry, something went wrong');
}

// helper to process events
function processEvents(eventsData) {
  return eventsData.map( event => {
    return new Event(event);
  });
}

//
function getLatLng(query) {
  let sqlStatement = 'SELECT * FROM location WHERE search_query = $1;';
  let values = [query];
  return client.query(sqlStatement, values)
    .then ((data)=>{
      if (data.rowCount > 0) {
        return data.rows[0];
      } else {
        console.log('we have no data in DB!!!');
        let geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        return superagent.get(geocodeURL)
          .then(googleMapsApiResponse => {
            let location = new Location(query, googleMapsApiResponse.body);
            let insertStatement = 'INSERT INTO location (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)';
            let insertValues = [location.search_query, location.formatted_query, location.latitude, location.longitude];
            client.query(insertStatement, insertValues);
            console.log(location);
            return location;
          })
          .catch(error => errorHandling(error));
      }
    });
}

// weather endpoint handler
function getWeather(query){
  let sqlStatement = 'SELECT * FROM weather WHERE latitude = $1 AND longitude = $2;';
  let values = [query.latitude, query.longitude];
  return client.query(sqlStatement, values)
    .then((data) => {
      if (data.rowCount > 0) {
        console.log('we hit this');
        return data.rows.map(day => {
          day.time = new Date(day.time).toDateString();
          return day;
        });
      } else {
        let darkskyURL = `https://api.darksky.net/forecast/${process.env.DARK_SKY_API_KEY}/${query.latitude},${query.longitude}`;
        return superagent.get(darkskyURL)
          .then(weatherApiResponse => {
            let dailyWeather = getDailyWeather(weatherApiResponse.body);
            dailyWeather.forEach(day => {
              let insertStatement = 'INSERT INTO weather (forecast, time, latitude, longitude) VALUES ($1, $2, $3, $4)';
              let insertValues = [day.forecast, day.time, day.latitude, day.longitude];
              client.query(insertStatement, insertValues);
            });
            return dailyWeather;
          });
      }
    });

}

// events endpoint handler
function getEvents(query) {
  let sqlStatement = 'SELECT * FROM events WHERE latitude = $1 AND longitude = $2;';
  let values = [query.latitude, query.longitude];
  return client.query(sqlStatement, values)
    .then((data) => {
      if (data.rowCount > 0) {
        return data.rows.map(event => {
          event.event_date = new Date(event.event_date).toDateString();
          return event;
        });
      } else {
        let eventsURL = `https://www.eventbriteapi.com/v3/events/search?location.longitude=${query.longitude}&location.latitude=${query.latitude}&expand=venue&token=${process.env.EVENTBRITE_API_KEY}`;
        return superagent.get(eventsURL)
          .then(eventsApiResponse => {
            let events = processEvents(eventsApiResponse.body.events.slice(0, 21));
            events.forEach(event => {
              let insertStatement = 'INSERT INTO events (link, name, event_date, summary, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6)';
              let insertValues = [event.link, event.name, event.event_date, event.summary, query.latitude, query.longitude];
              client.query(insertStatement, insertValues);
            });
            return events;
          });
      }
    });

}


app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
