/* 
File: index.js
Project: Scrabble Web App
Assignment: GUI Homework 5

This file includes JavaScript functions that manage the interactive features of a Scrabble web application. The key functionalities include:
- Game Initialization: Sets up the Scrabble board and player tile rack, displaying special scoring tiles such as double-letter and double-word scores.
- Drag-and-Drop Mechanism: Enables tiles to be dragged and dropped onto the board, with real-time scoring and word validation.
- Word Validation: Checks if a formed word exists in the dictionary and updates the score accordingly.
- Score Management: Calculates scores for words, considering bonus tiles, and tracks the total and highest scores.
- Game Controls: Provides options to reset the game or move to the next word.
- Tile Generation: Randomly selects a set of tiles for the player's rack, based on the game's letter distribution.
- Dynamic Updates: Displays remaining tiles, scores, and dictionary validation in real-time.

This code utilizes jQuery for enhanced interactivity and asynchronous operations for data fetching and word validation.

Author: Sunveer Dhillon  
Email: sunveer_dhillon@student.uml.edu  
Copyright (c) 2024 by Sunveer Dhillon. All rights reserved.  
This code is free to use by anyone for business or educational purposes with credit to the author.  
Last updated: December 2024.
*/

// Config
let doubleWordScore = [3, 13];
let doubleLetterScore = [7, 9];
let bc = 15;
let rc = 7;
let rt = 95;
let hs = 0;
let total_score = 0;

// Game setup
async function setup() {
    // Board setup 
    $('#placeholder').empty();    

    for (let i = 0; i < bc; i++) {
        $('#placeholder').append('<div class="slot"></div>');
    }

    doubleWordScore.forEach(i => {
        $(`#placeholder .slot:nth-child(${i})`).addClass('slot double-word-score');
    });

    doubleLetterScore.forEach(i => {
        $(`#placeholder .slot:nth-child(${i})`).addClass('slot double-letter-score');
    });

    $('.board').css({
        'width': `${5 * bc}vw`,
        'grid-template-columns': `repeat(${bc}, 1fr)`,
    })

    // Rack setup
    $('#box1').empty();

    for (let i = 0; i < rc; i++) {
        $('#box1').append('<div class="slot rack-slot"></div>');
    }

    var rd = await generateDeck();
    var ls = [];
    
    for (let i = 0; i < rc; i++) {
        ls[i] = await getLetterScore(rd[i]);
    }

    console.log('RD >> ' + rd);
    for (let i = 0; i < rc; i++) {
        $('#box1 .slot').eq(i).append(`<div class="small-box" id="box${rd[i]}"><span class="letter">${rd[i]}</span> <span class="score">${ls[i]}</span></div>`);
    }

    $('.rack').css({
        'width': `${5 * rc}vw`,
        'grid-template-columns': `repeat(${rc}, 1fr)`,
    })

    // Drag and Drop setup

    $(".small-box").draggable({
        revert: "invalid", // Revert to og position if not valid
        containment: "body", // Restricted dragging to body
        stack: ".small-box" // Dragged boxes stack properly
    });

    // Slots are droppable
    $(".slot").droppable({
        accept: ".small-box", // Only small boxes taken
        tolerance: "intersect", // Drag must fully be in box to proceed
        drop: async function (event, ui) {

            if ($(this).children(".small-box").length > 0) {
                ui.draggable.draggable("option", "revert", true); // Force box to go back to og position
                return;
            }


            $(this).append(ui.draggable);

            ui.draggable.css({
                top: 0,
                left: 0
            });

            let slotIndex = $(this).index() + 1;

            if ((doubleLetterScore.includes(slotIndex) || doubleWordScore.includes(slotIndex)) 
                && (!$(this).hasClass('rack-slot'))) {

                ui.draggable.addClass('box-hover');
            } else {
                    ui.draggable.removeClass('box-hover');
                    ui.draggable.removeClass('box-hover');
            }

            if (await lookup(getWord().toLowerCase())) {
                $('#score').html('SCORE: ' + await extractWordScore());      
            } else {
                $('#score').html('SCORE: ');      
            }


            $('#isword').html('VALIDITY: ' + getWord());

            if (await lookup(getWord().toLowerCase())) {
                $('#lookup').html('DICTIONARY:  ' + "✅");
            } else {
                $('#lookup').html('DICTIONARY:  ' + "❌");
            }

            if (await lookup(getWord().toLowerCase())) {
                $('#placeholder').children().each(function() { $(this).children().eq(0).addClass('small-box-green')});
            } else {
                $('#placeholder').children().each(function() { $(this).children().eq(0).removeClass('small-box-green')});
            }

            $('#box1').children().each(function() { $(this).children().eq(0).removeClass('small-box-green')});

            $('#warning-message').empty();


        }
    });

    }
// Game board setup 
$(async function () {
    setup();
    $('#remaining').html('TILES LEFT: ' + (rt));        
    $('#highest').html('HIGHEST: ' + (hs));   

    // Game Buttons
    $("#startOverBtn").click(async function() {
        rt = 95;
        hs = 0;
        total_score = 0;
        $('#remaining').html('TILES LEFT: ' + (rt));        
        $('#highest').html('HIGHEST: ' + (hs));
        $('#total').html('TOTAL: ' + (total_score));
        $('#score').html('SCORE: ' + 0);
        $('#lookup').html('DICTIONARY: ');     

        await setup();
        $('#warning-message').empty();
    });
    // Next word button
    $("#nextWordBtn").click(async function() {

        if (await lookup(getWord().toLowerCase())) {
            rt -= getWord().length;
            $('#remaining').html('TILES LEFT: ' + (rt));        

            if (await extractWordScore() >= hs) {
                hs = await extractWordScore();
            }
            $('#highest').html('HIGHEST: ' + (hs));
            total_score += await extractWordScore();
            $('#total').html('TOTAL: ' + (total_score));
            $('#score').html('SCORE: ' + 0);
            $('#isword').html('VALIDITY: ');
            $('#lookup').html('DICTIONARY: ');  
               
            await setup();
            $('#warning-message').empty();
        } else {
            $('#warning-message').empty();
            $('#warning-message').append('Drag and drop tiles until a word shows up as green.');
        }
    });
});

// Generating the deck
async function generateDeck() {
    try {
        const response = await fetch('../graphics_data/pieces.json');
        const jsonData = await response.json(); // Parse JSON from the response
        const randomHand = generateHand(jsonData);
        console.log(randomHand);
        return randomHand; // Return random hand to use outside the function
    } catch (error) {
        console.error('Error fetching JSON:', error);
        return null; // Return null in case of an error
    }

}

// Generating hand function
async function generateHand(data, handSize = 15) {
  const pool = [];

  data.pieces.forEach(tile => {
    for (let i = 0; i < tile.amount; i++) {
      pool.push(tile.letter);
    }
  });

  shuffle(pool);

  return pool.slice(0, handSize);
}

// Shuffle function
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
}

// Getting letter score
async function getLetterScore(letter) {
    if (letter.length === 1) {
        try {
            const response = await fetch('../graphics_data/pieces.json');
            const jsonData = await response.json();
    
            let score = 0;
    
            const tile = jsonData.pieces.find(piece => piece.letter === letter);
    
            if (tile) {
                score += tile.value;
            } else {
                // console.log(`Letter ${letter} not found in the tile set.`);
            }
            
            return score;

        } catch (error) {
            console.error('Error loading or parsing the JSON data:', error);
        }
    } else {
        return -1;
    }
}

// Lookup function
async function lookup(word) {
    try {

        if (word.length <= 1) { return false; }
        // Fetch the JSON file
        const response = await fetch('../graphics_data/dictionary.json');
        if (!response.ok) {
            throw new Error(`Failed to load file: ${response.status}`);
        }
        
        // Parse the JSON data
        const jsonData = await response.json();
        
        // Check if the string exists in the array
        const exists = jsonData.includes(word);
        
        // Log the result
        if (exists) {
            console.log(`${word} exists in the JSON data.`);
        } else {
            console.log(`${word} does not exist in the JSON data.`);
        }
        
        return exists; // Return true or false
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

// Extracting word score
async function extractWordScore() {
    let score = 0;
    const promises = [];
    let wordMultiplier = 1; 

    $("#placeholder").children().each(async function(index) {
        var letterMultiplier = 1;
        var letter = "";

        letterMultiplier = doubleLetterScore.includes(index + 1) ? 2 : letterMultiplier;

        if ($(this).children().length == 0) {
            letter = " ";
        } else {
            letter = $(this).children().first().children().first().text();
            if (doubleWordScore.includes(index + 1)) { wordMultiplier *= 2; }
        }

        promises.push(getLetterScore(letter).then((letterScore) => {
            score += letterScore * letterMultiplier;
        }));
    });
    
    await Promise.all(promises);

    return score * wordMultiplier;
}

// Words are valid setup
function getWord() {
    let w = "";
    $("#placeholder").each(function() {
        $(this).children().each(function() {
            if ($(this).children().length == 0) {
                w += " ";
            } else {
                w += $(this).children().first().children().first().text();
            }
        });
    });

    if (w.trim() === "") { return 'getWord() : empty'; }

    if (!w.trim().includes(" ") && !!w.trim().length) {
        console.log(`getWord() : ${w.trim()} is contiguous`)
        return w.trim();
    } else {
        console.log(`getWord() : ${w} is NOT contiguous`)
        return `getWord() : is NOT contiguous`;
    }
}
