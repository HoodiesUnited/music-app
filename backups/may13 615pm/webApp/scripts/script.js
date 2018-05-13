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
  }

app.score = 0;



app.questionIndex = 0;

  // Other global vars that are dynamically generated:
    //app.tracksPromise
    // app.questionsPromise

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
            let { track_id, artist_name, album_name, track_name } =  track.track;

            //Get just the primary artist's name removing featured artists
            artist_name = artist_name.split(' feat.')[0];

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
   return  $.ajax ({
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
        console.log(`Giphy Result: `, result);
        let gifs = [];

        for (let i = 0; i < 10; i++) {
           gifs.push ( result.data[i].images.original.url );
        }
        console.log(`10 gifs: `, gifs);

       return gifs;
    })
}

app.getLyrics = function (tracksPromise, genre) {
  const updatedTracksPromise  =  tracksPromise.then( (genreSortedTracks) => {

    //Select the list of tracks for just the chosen genre
    let tracksList = genreSortedTracks[genre];

    //Randomize tracks list
    tracksList = app.randomizeArray(tracksList);

    //Slice the tracks list to no more than 10 tracks
    //5 for now to not waste api requests
    tracksList = tracksList.slice(0,5);
    console.log(`SLICED TRACKSLIST: `,tracksList )

    //Create a new array of track promises that has selected lyrics added to each result
    trackWithLyricsPromises = tracksList.map(track => {
        return app.lyricsRequest(track);
    });

    //Wait for all the track promises to complete and store the results to an updated tracks promise
     const tracksUpdatedPromise = Promise.all(trackWithLyricsPromises);



    tracksUpdatedPromise.then((res) => console.log(`UPDATED TRACKS: `,   res) );

    return tracksUpdatedPromise;

    });//End of then method for tracksPromise

    return updatedTracksPromise;
}



app.makeQuestions = function (numberOfQuestions, genre) {
    app.numberOfQuestions = numberOfQuestions;
    return app.getLyrics(app.tracksPromise, genre)
        .then(info => {
             //Remove tracks without selected lyrics
            info =  info.filter(track => track.selected_lyrics );
            // console.log(`INFO FILTERED TO HAVE SELECTED LYRICS`, info);

            //GET UNIQUE ARTIST LIST
            let artistList = info.map((track) => track.artist_name  );
            artistList = (new Set(artistList));
            artistList = Array.from(artistList);

            let artistLists = {
               "all": artistList
            }

            //Make a list at the key value of each artist_name, with the value of the other artist names
            artistList.forEach((name, index, arr) => {
                //copy the artist name array
                let thisList =  arr.slice();

                //Remove this artist's name from the array
                thisList.splice(index,1);
                artistLists[name] = thisList;
            } );

            // console.log(`artist lists: `, artistLists  );
            const questions = [];
            // infoIndex = 0;
            // lyricIndex = 0;
            let i = 0;
            while (i < numberOfQuestions) {
                let question = {};

                //Select a random track index
                let infoIndex = app.randomRange(0, info.length - 1);

                let track = info[infoIndex];
                // console.log("track: ", track);

                //Destructure the properties inside track to variables
                const {artist_name, album_name, track_name, selected_lyrics  } = track;

                //Check to see if there are still selected lyrics at the indicated track
                if (track.selected_lyrics.length > 0 ) {

                    //Remove first selected lyrics from the list and set it equal to question lyrics
                    question.lyrics = selected_lyrics.shift();


                    question.answer = {
                        artist_name, album_name, track_name
                    };

                    question.answer.gifs_promise = app.giphyRequest(artist_name);

                    // question.answer.gifs_promise.then(res => console.log(`gifs in make question: `, res )  );

                    //Randomize the arist list for this artist
                    let otherArtists  = app.randomizeArray( artistLists[artist_name] );

                    question.choices =  app.randomizeArray ([artist_name, otherArtists[0], otherArtists[1], otherArtists[2]  ] );
                    // console.log(`question: `,  question);

                    //Add question to the question array
                    questions.push(question);

                    //Increment i since a question has been created
                    i++;

                } else {
                    //Remove track that has no more selected lyrics, do not increment i, since no question was created.
                    info.splice(infoIndex, 1);
                }
            }
            // console.log(`questions: `,  questions )
            return questions;
        });//END OF THEN METHOD ON GETLYRICS

        // Psedo Code

	// 	possibleAnswers {artist1, artist2, etc}

	// 	answer = {aristName
	// 	songName
	// 	selectedLyrics}
}//END OF MAKE QUESTIONS FUNCTION



app.selectLyrics = function (lyric) {

    let stanzas = lyric.split('\n\n');

    //Remove the first stanza
    stanzas.shift();

    //filter stanzas with less than 4 lines
    stanzas = stanzas.filter(stanza => stanza.split('\n').length >= 4)

    if (stanzas.length > 0) {

        //randomize stanzas
        stanzas = app.randomizeArray(stanzas);

        stanzas = stanzas.map (stanza => {
            //select first 4 lines from the stanza
            stanza = stanza.split('\n', 4);

            //Rejoin into a multi-line string
            return stanza.join('\n');
        });
        // console.log(`Return value fo selectLyrics`,  stanzas);
        return stanzas;
    } else {
        return null;
    }

}//End of selectLyrics function


//UTILITY FUNCTIONS

//This function was borrowed from: https://gist.github.com/ourmaninamsterdam/1be9a5590c9cf4a0ab42#user-content-randomise-an-array
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


/// PAGE LOADING FUNCTIONS

app.loadQuestion = function () {

    app.questionsPromise.then( questions => {
        const question = questions[app.questionIndex];
        console.log(`question in load question function: `,  question);
        const lines = question.lyrics.split('\n');

        lines.forEach( line => $('.lyrics').append(`<p>${line}</p>`) ) ;

        question.choices.forEach(artistChoice =>  $('.selection').append(`<button class="answers">${artistChoice}</button>`)   );

        app.questionIndex++;

    });
}

app.handleAnswer = function(e) {
    e.preventDefault();
    console.log(e.target);
    app.questionsPromise.then(questions => {
        const question = questions[app.questionIndex - 1];
        const correctArtist = question.answer.artist_name;
        console.log(correctArtist);
        if ($(e.target).text() === correctArtist) {
            console.log('correct');
            app.score = app.score + 1;
            $('.feedback h2').text("CORRECT");
            $('.score').text(app.score);
        } else {
            console.log(`incorrect`);
            $('.feedback h2').text("WRONG");
        }
        $('.feedback .artistName').text(correctArtist);
        $('.feedback .trackName').text(question.answer.track_name);
        const rand = app.randomRange(0,9);
        question.answer.gifs_promise.then(gifs => { 
            console.log(`rand inside handle answer: `, rand);
            
            console.log(`GIFS INSIDE HANDLE ANSWER: `, gifs );
            
            const gifUrl = gifs[rand];
            $('.giphy').attr('src', gifUrl );
        });
    });
}







//Document Ready Function
$(function(){
    app.addGenreOptions();



    app.tracksPromise = app.musixRequest()
        .then( function (sortedTrackInfo){
          console.log(`sorted track info from musixRequest`,  sortedTrackInfo);
          let rand =  app.randomRange(0,  sortedTrackInfo['Top 100'].length -1);
          let randomArtist =  sortedTrackInfo['Top 100'][rand].artist_name;
          console.log('Random Artist: ', randomArtist);
          let gifsPromise =  app.giphyRequest(randomArtist) ;
          gifsPromise.then(res => console.log(`gifs promise: `,  res)  );

          return sortedTrackInfo;
    });
            // console.log('Get LYRICS: ',   app.getLyrics(app.tracksPromise, "Hip Hop/Rap" )) ;


    //Form event handler
    $('.game-options').on("submit", function (event) {
        event.preventDefault();
        const genreSelected = $('#genre').val();


        if (genreSelected) {

           app.questionsPromise = app.makeQuestions(5, genreSelected);
           console.log(`questions promise: `, app.questionsPromise);
           app.loadQuestion(app.questionIndex);
        }// end of if
        else {
          console.log("Please select a genre");
        }
    });
    $('.selection').on('click', 'button', app.handleAnswer);
    
    $('.resetButton').on('click', function (e) {
        e.preventDefault();
        // console.log('reset');
        window.location.reload(true);
    });
});



