/**
 * Google Cloud Function that responds to messages sent from a
 * Hangouts Chat room.
 *
 * @param {Object} req Request sent from Hangouts Chat room
 * @param {Object} res Response to send back
 */


// Imports the Google Cloud client library
const language = require('@google-cloud/language');
const request = require('request');
// Instantiates a client
const client = new language.LanguageServiceClient();
// Imports the Google Cloud client library
const Logging = require('@google-cloud/logging');

// Creates a client
const logging = new Logging();
const logName = 'gifify-log';

const log = logging.log(logName);

const resource = {
  // This example targets the "global" resource for simplicity
  type:"cloud_function",
  labels: {
  	function_name:"HangoutsChatBot",
    region:"us-central1"
  },
};

exports.helloHangoutsChat = function helloHangoutsChat (req, response) {
  console.log('type: '+req.body.type);
  if(req.body.type === 'CARD_CLICKED'){
    console.log("update_massage")
  	var ent = req.body.action.parameters[0].value;
      	var url = req.body.action.parameters[1].value;
    var feedback = req.body.action.parameters[2].value;

      const feedbacklog = log.entry({resource: resource},
                                   {
    logtype: "gifiy-feedback",
    entity: ent,
    url: url,
        feedback: feedback
  });
log
  .write([feedbacklog])
  .then(() => {
    console.log(`Wrote to ${logName}`);
  })
  .catch(err => {
    console.error('ERROR:', err);
  });
    
    
  var feedback_response = {
  "actionResponse":{
    "type":"UPDATE_MESSAGE"
  },
   "cards": [
    {
      "sections": [
        {
          "widgets": [
            {
              "textParagraph": {
                "text":ent + "?"
              }
            },
            {
                          "image": {
                "imageUrl": url
                          }

            }
            
          ]
        }
      ]
    }
  ]
	};
    console.log(feedback_response);
    
    response.send(feedback_response);
    return;
  }else{
  var msg = req.body.message.text.replace('@gifify', '');
  var user = req.body.message.sender.displayName;

  console.log(`  message: ${msg}`);

  const msglog = log.entry({resource: resource}, 'message: '+msg);
log
  .write([msglog])
  .then(() => {
    console.log(`Wrote to ${logName}`);
  })
  .catch(err => {
    console.error('ERROR:', err);
  });
  
  var document = {
  content: msg,
  type: 'PLAIN_TEXT',
  };


  var entity;
  var entityname;
  var score;
  var magnitude;
  
  client
  .analyzeEntitySentiment({document: document})
  .then(results => {
    if(results[0].entities.length == 0){
      client
        .analyzeSentiment({document: document})
        .then(results => {
        score = results[0].documentSentiment.score;
        magnitude = results[0].documentSentiment.magnitude;
        
        entityname = msg;
        sendResponse(user, msg, score, magnitude, entityname, response);
        })
        .catch(err => {
          console.error('this:', err);
        });    
    }
    else{
      entity = results[0].entities[0];
      score= entity.sentiment.score;
      magnitude = entity.sentiment.magnitude;

      entityname = entity.name;
      sendResponse(user, msg, score, magnitude, entityname, response);
  }

  })
  .catch(err => {
    console.error('ERROR:', err);
  });
  }
};

function sendResponse(user, msg, score, magnitude, entityname, response){
        console.log("sending response for score: " + score + " magnitude: " + magnitude + " entity: " +entityname);
  const datalog = log.entry(
  {resource: resource},
  {
    logtype: "gifiy-analysis",
    user: user,
    msg: msg,
    score: score,
    magnitude: magnitude,
    entity: entityname,
  }
);
  log
  .write([datalog])
  .then(() => {
    console.log(`Wrote to ${logName}`);
  })
  .catch(err => {
    console.error('ERROR:', err);
  });

  		if(entityname == 'superhuman-ai'){
        	reactionUrl = 'http://replygif.net/i/1263.gif';
                   var data = createMessage(entityname, reactionUrl);
            response.send(data);
        }
  	else if(entityname == 'giphy'){
        	reactionUrl = 'http://replygif.net/i/487.gif';
               var data = createMessage(entityname, reactionUrl);
            response.send(data);
        }
  	else if(entityname == 'gifify'){
        	reactionUrl = 'http://replygif.net/i/675.gif';
               var data = createMessage(entityname, reactionUrl);
            response.send(data);
        }
else{          
        reaction(scoreToTag(score, magnitude)).then(function(result) {
          var reactionUrl = result;
          console.log(reactionUrl);
         var data = createMessage(entityname, reactionUrl);
            response.send(data);
        }, function(reject) {
          console.log(reject);
      })
}
}

function scoreToTag(score, magnitude){
          var tag;
          if(score <= -0.15){  
              tag = 'no';
            if(magnitude >= 1 || score  <= -0.4 ){
            	tag='nope, not funny'
            }
          }
          else if(score > -0.15 && score < 0.15){
              tag = 'okay';
           
          }
          else if(score >= 0.15){
              tag = 'yes, thumbs up';
             if(magnitude >= 1  || score  >= 0.4 ){
            	tag='excited, clapping'
            }
          }
  console.log('scoreToTag' + tag) ;
  return tag;
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function reaction(tag) {
    return new Promise(function(resolve, reject) {
      request('http://replygif.net/api/gifs?tag='+tag+'&api-key=39YAprx5Yi', { json: true }, (err, res, body) => {
          if (err) { 
            console.log("reactionerr" + err);
            reject(err); }
        	else {
                resolve(body[getRandomInt(body.length)].file);
            }
        })
    })
}

function createMessage(entity, imageURL){
  var HEADER = {
    "title": entity + "?"
  };

  var SENDER_IMAGE_WIDGET = {
    "imageUrl": imageURL
  };

  return {
  "cards": [
    {
      "sections": [
        {
          "widgets": [
            {
              "textParagraph": {
                "text": entity+"?" 
              }
            },
            {
              "image": SENDER_IMAGE_WIDGET
            },
            {
              "textParagraph": {
                "text": "<i>How did i do?</i>"
              }
            },
            {
              "buttons": [
                {
                  "textButton": {
                    "text": "GOOD BOT",
                    "onClick": {
                        "action": {
							"actionMethodName": "snooze",
                          "parameters": [
                              {
                                "key": "entity",
                                "value": entity
                              },
                              {
                                "key": "imageURL",
                                "value": imageURL
                              },
                             {
                                "key": "feedback",
                                "value": "good"
                              }
                            ]    
                      }
                    }
                  }
                },
                  {
                  "textButton": {
                    "text": "BAD BOT",
                    "onClick": {
                        "action": {
							"actionMethodName": "snooze",
                          "parameters": [
                              {
                                "key": "entity",
                                "value": entity
                              },
                              {
                                "key": "imageURL",
                                "value": imageURL
                              },
                             {
                                "key": "feedback",
                                "value": "bad"
                              }
                            ]    
                      }
                    }
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
}
