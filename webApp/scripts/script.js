//GLOBAL VARIABLES
app = {};
//  $
//  _


//PAGE BUILDING FUNCTIONS
app.genres = {
    "Pop": 14,
    "Hip Hop/Rap": 18,
    "Alternative": 20,
    "Country": 6
    // "Dance": 17,
    // "Heavy Metal": 1153,
    // "R&B/Soul": 15,
    // "Rock": 21
  }
  //RESULTS OF SORTING TOP 100 BY GENRE
  // Length of Pop is 18
  // Length of Hip Hop/Rap is 10
  // Length of Alternative is 8
  // Length of Country is 20
  //NOT ENOUGH OF THESE
  // Length of Dance is 3
  // Length of Heavy Metal is 1
  // Length of R&B/Soul is 3
  // Length of Rock is 1


app.addGenreOptions = function () {
    for (genre in app.genres) {
        const genreId = app.genres[genre];
        const $option = $('<option>')
            .attr('value', genre)
            .attr('data-genre-id', genreId)
            .text(genre);
        $('#genre').append($option);
    }
}

//Make background image change with change event in select element for different genres


// 	--Also ask how long they want to play for, and how many players
// --If there is more than one player, they can put in the player names

// API Requests


app.musixMethods = {
    //Use this to get top chart hits
    chart: 'chart.tracks.get',

    //Use this for genre and artist searchs
    track: 'track.search',

    //Use this to get related artists from the artist id.
    related: 'artist.related.get',

    //Use this to get the lyrics after searching for the track IDs
    lyrics: 'track.lyrics.get'
}


//Test config objects
const chartConfig = {
    method: app.musixMethods.chart,
};

const lyricConfig = {
    method: app.musixMethods.lyrics,
    trackId: 149804156,
    f_has_lyrics: true //Test to see if this messes up the search
};

const trackConfig =  {
    method: app.musixMethods.track,
    genreId: 14 //pop
};

//Musix API Info
app.musixUrl = "https://api.musixmatch.com/ws/1.1/";

app.musixApiKey = "0a6e3214ba4afecba8f9ee47cbca8d33";

//Giphy API info
app.giphyUrl = "http://api.giphy.com/v1/gifs/search";
app.giphyApiKey = "gUH1fFCntMG4MW94vqf6UCSWIqCusok1";


//Chart Request
app.musixRequest = function() { //Options is an object with the config for the request.
    const musixResults = $.ajax({
        type: 'GET',
        url: app.musixUrl + app.musixMethods.chart,
        dataType: "jsonp",
        jsonpCallback: 'jsonp_callback',
        contentType: 'application/json',
        data: {
            apikey: app.musixApiKey,
            format: 'jsonp',
            callback: 'jsonp_callback',

            //Chart search
            f_has_lyrics: 1,
            page_size: 100,
            //174 results
        }
    })
    .then(function(result){
        console.log(`Musix API Result:
        ` , result);

        //Use .map() to create a promise called tracksInfo which contains a new array of just the data we need.

        const tracksInfo = result.message.body.track_list.map(track => {

            //Destructure the track data
            const { track_id, artist_name, album_name, track_name } =  track.track;

            const genreList = track.track.primary_genres.music_genre_list;
            let genre_name = "";
            if (genreList.length > 0) {
                genre_name = genreList[0].music_genre.music_genre_name;
            }
            //Add genre name
            return {track_id, artist_name, album_name, track_name, genre_name};
        })

        //Create an object to store the genres and add the top 100 chart hits info
        const genreSortedTracks = {
          "Top 100": tracksInfo
         };

        //Loop through genres to create genre properties with filtered array
        for (genre in app.genres) {
          genreSortedTracks[genre] =  app.filterByGenre(tracksInfo, genre) ;
        }

        //Add R&B tracks to hip hop
        genreSortedTracks["Hip Hop/Rap"] =  genreSortedTracks["Hip Hop/Rap"].concat(app.filterByGenre(tracksInfo, 'R&B/Soul'));
        console.log(genreSortedTracks);
        return genreSortedTracks;

        // console.log("dataRetreived", result.message.body.lyrics.lyrics_body);
    });

    return musixResults;
}

// Sort Genre Name
app.filterByGenre = function(tracksInfo, genreName) {
    const filteredTracks = tracksInfo.filter(track => {
        return genreName === track.genre_name;
    });
    return filteredTracks;
}

//LYRICS SEARCH
app.lyricsRequest = function(track){

    const trackWithLyrics = $.ajax({
        type: 'GET',
        url: app.musixUrl + app.musixMethods.lyrics, // OPTIONS MUST INCLUDE METHOD
        dataType: "jsonp",
        // jsonpCallback: 'jsonp_callback',
        contentType: 'application/json',
        data: {
            apikey: app.musixApiKey,
            format: 'jsonp',
            // callback: 'jsonp_callback',

            track_id: track.track_id,

        }
    })
        .then(function (lyrics) {
        //     console.log(`Musix API lyrics:
        // ` , lyrics.message.body.lyrics.lyrics_body);

            lyrics = lyrics.message.body.lyrics.lyrics_body;

            //Trim the dislaimer text from the lyrics
            lyrics = app.trimLyrics(lyrics);

            const selectedLyrics = app.selectLyrics(lyrics);

            track.selected_lyrics = selectedLyrics;
            return track;


        });

        return trackWithLyrics;

}

app.trimLyrics = function (rawLyrics) {
  let lyricsEdited =  rawLyrics.split('...')[0];


  return lyricsEdited;
}

//Giphy
app.giphyRequest = function(artistSearch){  //parameter is relative to the function
    $.ajax ({
        type: 'GET',
        url: app.giphyUrl,
        dataType: 'json',
        data: {
            api_key: app.giphyApiKey,
            q: artistSearch,
            limit: 30,
            rating: 'pg'
        }

    })
    .then(function(result){
       return result;
    })
}

app.getLyrics = function (tracksPromise, genre) {
  return tracksPromise.then( (genreSortedTracks) => {

    //Select the list of tracks for just the chosen genre
    let tracksList = genreSortedTracks[genre];

    //Randomize tracks list
    tracksList = app.randomizeArray(tracksList);

    //Slice the tracks list to no more than 10 tracks
    //5 for now to not waste api requests
    tracksList = tracksList.slice(0,5);
    console.log(`SLICED TRACKSLIST: `,tracksList )

    trackWithLyricsPromises = tracksList.map(track => {
        return app.lyricsRequest(track);
    });

     const tracksUpdatedPromise = Promise.all(trackWithLyricsPromises);



    tracksUpdatedPromise.then((res) => console.log(res) );

    return tracksUpdatedPromise;

  });//End of then method for tracksPromise
}


app.makeQuestions = function (numberOfQuestions, genre) {
    app.getLyrics(app.tracksPromise, genre)
        .then(info => {
             //Remove tracks without selected lyrics
            info =  info.filter(track => track.selected_lyrics );
            console.log(`INFO FILTERED TO HAVE SELECTED LYRICS`, info);

            //GET UNIQUE ARTIST LIST
            let artistList = info.map((track) => track.artist_name  );
            artistList = (new Set(artistList));
            artistList = Array.from(artistList);


            const questions = [];
            infoIndex = 0;
            lyricIndex = 0;
            for (let i = 0; i < numberOfQuestions; i++) {
                let question = {};
                let track = info[infoIndex];
                {artist_name, album_name, track_name, selected_lyrics  } = track;

                if (track.selected_lyrics.length > lyricIndex ) {
                    question.lyrics = selected_lyrics[lyricIndex];


                    question.answer = {
                        artist_name, album_name, track_name
                    };
                    console.log(question);

                } else {

                    //incremetn info id, stanza id


                }


                //Add other artists to questions




            }

        });




    // music =  getlyrics
	// for i < numofquestions
	// 	//check if lyrics match is false
	// 	possibleAnswers {artist1, artist2, etc}

	// 	answer = {aristName
	// 	songName
		// selectedLyrics}
}

//Data Manipulate Functions

app.selectLyrics = function (lyric) {

    let stanzas = lyric.split('\n\n');

    //Remove the first stanza
    stanzas.shift();
    // console.log(`stanzas array before filtering: `, stanzas);

    //filter stanzas with less than 4 lines
    stanzas = stanzas.filter(stanza => stanza.split('\n').length >= 4)
    // console.log(`stanzas array after filtering: `, stanzas);
    //randomize stanzas

    if (stanzas.length > 0) {

        stanzas = app.randomizeArray(stanzas);

        stanzas = stanzas.map (stanza => {
            //select first 4 lines from the stanza
            // console.log(`stanza before split/slice`,  stanza)
            stanza = stanza.split('\n', 4);

            // console.log(`stanza after split slice: `,  stanza)
            //Rejoin into a multi-line string
            return stanza.join('\n');
        });
        // console.log(`Return value fo selectLyrics`,  stanzas);
        return stanzas;
    } else {
        console.log("THERE ARE NO STANZAS!!  ");
        return null;
    }

}//End of selectLyrics function


//This function was taken from: https://gist.github.com/ourmaninamsterdam/1be9a5590c9cf4a0ab42#user-content-randomise-an-array
app.randomizeArray = function (arr) {
  var buffer = [], start;

  for(var i = arr.length; i >= arr.length && i > 0;i--) {
      start = Math.floor(Math.random() * arr.length);
      buffer.push(arr.splice(start, 1)[0])
  };

  return buffer;
}

//function borrowed from
//https://stackoverflow.com/questions/4959975/generate-random-number-between-two-numbers-in-javascript
app.randomRange = function (min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}

//A utility function used with the getGenre's function
app.makeObjectFromArrays = function (keys, values) {
    const newObject = {};
    for (let i = 0; i < keys.length; i++) {
        newObject[keys[i]] =  values[i];
    }
    return newObject;
}

//Note this function is not used at run time, but we needed to write it to extract the genre-name and genre-id pairings from the track data so that we could use these for the genre-search API request
app.getGenres = function (tracksData) {
    const trackList = tracksData.message.body.track_list;
    const genreArray = [];
    let genreId = [];
    let genreName = [];
    trackList.forEach( (elTrack) => {
        const genreList = elTrack.track.primary_genres.music_genre_list;
        if (genreList.length > 0) {
            genreId.push( genreList[0].music_genre.music_genre_id );
            genreName.push( genreList[0].music_genre.music_genre_name );
        }
    }); //End of forEach
    let genreIdUnique = (new Set(genreId));
    genreIdUnique = Array.from(genreIdUnique);

    let genreNameUnique = (new Set(genreName));
    genreNameUnique = Array.from(genreNameUnique);

    const genreMap = app.makeObjectFromArrays(genreNameUnique, genreIdUnique);
    // console.log(`ids and names`, genreMap);
}



//     - For each API build a get function that takes a parameter object as an argument
//         - Use the parameter object to set the values of the $.ajax parameters
//             - Use a then() method to do something with the returned data(see data processing).

//                 Processing
// --Lyrics getter function to get the lyrics from the object and manipulate the text as needed
// --Process other info like, track name, album, etc for display after the player answers the challenge


// Game Functionality
// --Create a function to randomly generate a lyric challenge
// --Create a function to post the challenge to the page
// --Let them know what player is up
// --Accept user feedback through click or touch
// --Display feedback based on whether they were correct
// --Adjust the score for that player
// 	--Track players with an array of player object.Properties includes score and player name(Stretch goal: have player avatars).

//Document Ready Function
$(function(){
   app.addGenreOptions();

    app.tracksPromise = app.musixRequest()
        .then( function (sortedTrackInfo){
          console.log(sortedTrackInfo);
          return sortedTrackInfo;
        });



    //Form event handler
    $('.game-options').on("submit", function (event) {
        event.preventDefault();
        const genreSelected = $('#genre').val();

        let lyricsPromise;
        if (genreSelected) {

          /* lyricsPromise = */ app.makeQuestions(1, genreSelected);
        //   lyricsPromise.then( (lyrics) => {
        //     // console.log(`lyrics: `, lyrics);

        //   });
        }// end of if
        else {
          console.log("Please select a genre");
        }



    });


});

