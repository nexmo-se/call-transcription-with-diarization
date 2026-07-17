'use strict'

//-------------

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser')
const app = express();

app.use(bodyParser.json());

// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ limit: '50mb', extended: true }));

const moment = require('moment');
const fsp = require('fs').promises;

//---- CORS policy - Update this section as needed ----

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization");
  next();
});

//---- read file asynchronously ---

async function readFile(file) {
  try {
    const data = await fsp.readFile(file);
    return(data);
  } catch (err) {
    console.error('Error reading file', file, err);
  }
}

//---- keep alive the VCR server ----

if (process.env.VCR_PORT) {   // is this application running on VCR?

  const vcrServer = process.env.NERU_SERVER_URL;

  ( async() => {

    setInterval( async() => {

      try {
        await axios.get(vcrServer + '/_/health', {});
        // console.log("> keep-alive sent");
      } 
      catch (err) {
        console.log("> keep-alive error", err);
      }

    }, 60000);

  })();

};  

//--- Vonage API - SDK instance ---

const { Auth } = require('@vonage/auth');

const credentials = new Auth({
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,
  applicationId: process.env.APP_ID,
  privateKey: './.private.key'    // private key file name with a leading dot 
});

const { Vonage } = require('@vonage/server-sdk');

const vonage = new Vonage(credentials);

const delayToFirstTts = process.env.DELAY_TO_FIRST_TTS; // in milliseconds

const fs = require('fs');
const axios = require('axios');

const appId = process.env.APP_ID; // used by tokenGenerate
const privateKey = fs.readFileSync('./.private.key'); // used by tokenGenerate

const { tokenGenerate } = require('@vonage/jwt');

//-- Deepgram API --

//- Deepgram SDK v 4.x
// const { createClient } = require("@deepgram/sdk");
// const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
// const dgApiKey = process.env.DEEPGRAM_API_KEY;

//- Deepgram SDK v 5.x
const { createReadStream } = require("fs");
const { DeepgramClient } = require("@deepgram/sdk");
// Initialize client (reads DEEPGRAM_API_KEY from environment variables)
const deepgram = new DeepgramClient();

const dgSessionLanguageCode = process.env.DEEPGRAM_STT_LANGUAGE;
const dgSessionModel = process.env.DEEPGRAM_STT_MODEL;

//---- Connector server or AI provider server ----
const processorServer = process.env.PROCESSOR_SERVER;

//----  Drop-off server host name and path for consent audio recording and conversation transcript ----
const dropOffServerPath = process.env.DROP_OFF_SERVER_PATH;

//---- SIP call info tracking ----

let pstnTracking = {}; // dictionary

function addInfoToPstnTracking(uuid) {
  pstnTracking[uuid] = {};
  pstnTracking[uuid]["convUuid"] = null;
  pstnTracking[uuid]["namedConfUuid"] = null;
  pstnTracking[uuid]["token"] = null;
  // pstnTracking[uuid]["startTime"] = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss:SSS'); // server local time
  pstnTracking[uuid]["startTime"] = moment.utc(Date.now()).format('YYYY-MM-DD HH:mm:ss:SSS'); // UTC time
  pstnTracking[uuid]["callerNumber"] = null;
  pstnTracking[uuid]["calledNumber"] = null;
  pstnTracking[uuid]["allInfo"] = null;
  pstnTracking[uuid]["callerExt"] = null;
}

function deleteFromPstnTracking(uuid) {
  delete pstnTracking[uuid];
}

//---- Per call metadata ----

let metadataIn = {}; // dictionary

function addInfoToMetadata(did, jsonPayload) { // jsonPayload is an object
  metadataIn[did] = jsonPayload;
} 

function deleteFromMetadata(did) {
  delete metadataIn[did];
}

//===========================================================

function findUuidByNamedConfUuid(namedConfUuid) {
  const entry = Object.entries(pstnTracking).find(
    ([uuid, data]) => data["namedConfUuid"] === namedConfUuid
  );
  return entry ? entry[0] : null;
}

//===========================================================

async function fileExists(path) {
  try {
    await fsp.access(path, fsp.constants.F_OK); // check for file existence
    // console.log(`File found: ${path}`);
    return true;
  } catch (error) {
    console.log(`File not found or inaccessible: ${path}`);
    return false;
  }
}

//===========================================================

async function transcribeFile(recordingFile) {

  const result = await deepgram.listen.v1.media.transcribeFile(
    createReadStream(recordingFile),
    {
      model: process.env.DEEPGRAM_STT_MODEL,
      language: process.env.DEEPGRAM_STT_LANGUAGE,
      smart_format: true,
      diarize_model: "latest" // see https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded
      // diarize: true  // deprecated paramater, you must NOT add this parameter
    }
  );

  return(result);

}

//===========================================================

const { unlink } = require('node:fs/promises');

async function deleteFile(path) {
  try {
    await unlink(path);
    console.log(`>>> Successfully deleted ${path}`);
  } catch (error) {
    console.error(`>>> Error deleting file: ${error.message}`);
  }
}

//===========================================================

console.log('\n>>> Service phone numbers:', process.env.SERVICE_PHONE_NUMBERS);

//---------------- Test validations ------------------------

// addInfoToPstnTracking('AAA');
// pstnTracking['AAA']["calledNumber"] = '12995550101_metadata1';
// pstnTracking['AAA']["callerExt"] = pstnTracking['AAA']["calledNumber"].split('_')[0]
// console.log('AAA Caller ext:', pstnTracking['AAA']["callerExt"] );

// addInfoToPstnTracking('BBB');
// pstnTracking['BBB']["calledNumber"] = '12995551212_metadata2';
// pstnTracking['BBB']["callerExt"] = pstnTracking['BBB']["calledNumber"].split('_')[0]
// console.log('BBB Caller ext:', pstnTracking['BBB']["callerExt"] );

// addInfoToPstnTracking('CCC');
// pstnTracking['CCC']["calledNumber"] = '12995551313_metadata3';
// pstnTracking['CCC']["callerExt"] = pstnTracking['CCC']["calledNumber"].split('_')[0]
// console.log('CCC Caller ext:', pstnTracking['CCC']["callerExt"] );

// const someNewCallee = '12995551212_metadata4';

// Object.keys(pstnTracking).forEach( key => {
//   // console.log(key, 'Caller ext', pstnTracking[key]["callerExt"]);
//   if (someNewCallee.split('_')[0] ==  pstnTracking[key]["callerExt"]) {
//     console.log("there is a match!")
//     // need to test also if call is still up (not "completed" state)
//   }
// });

//============= Processing inbound SIP calls ===============

//-- Incoming SIP call --

app.post('/answer', async(req, res) => {

  const hostName = req.hostname;

  console.log("hostName:", hostName);

  const uuid = req.body.uuid;
  const from = req.body.from;
  const to = req.body.to;
  const callerExtension = to.split('_')[0];
  let duplicateCall = false;

  console.log('\n>>> Incoming call\n' + JSON.stringify(req.body, null, 2));

  //--

  // check if there is alreeady a pending live 3-way call from same Caller extension
  for (const key of Object.keys(pstnTracking)) {  
    if ( callerExtension == pstnTracking[key]["callerExt"]) {

      addInfoToPstnTracking(uuid);
      
      console.log(">>> There is a live call already from same caller ext", callerExtension, 'this new call is rejected!');
    
      const otherCall = await vonage.voice.getCall(key);  // check if other call is still active or not

      if (otherCall.status != 'completed') {  // check if other call is still active or not

        await vonage.voice.hangupCall(uuid)
          .then(res => console.log(`>>> Terminated duplicate SIP leg ${uuid}`))
          .catch(err => console.error(`>>> Duplicate SIP leg ${uuid} tear down error`, err));

        duplicateCall = true;    
      }      

    }

  };  

  //--

  let nccoResponse;

  if(!duplicateCall) {

    addInfoToPstnTracking(uuid);
    pstnTracking[uuid]["convUuid"] = req.body.conversation_uuid; // will be used when "type" = "transfer" in event webhook
    pstnTracking[uuid]["namedConfUuid"] = null; // named conference conversation uuid
    pstnTracking[uuid]["callerNumber"] = from;
    pstnTracking[uuid]["calledNumber"] = to;
    pstnTracking[uuid]["allInfo"] = req.body;
    pstnTracking[uuid]["token"] = null;
    pstnTracking[uuid]["callerExt"] = to.split('_')[0];
    //--

    nccoResponse = [
      { 
        "action": "conversation",
        "startOnEnter": true,
        "endOnExit": true, // not really necessary because there is only one call leg
        "name": "conf_" + uuid,
        "record": true,
        "eventUrl": [ "https://" + hostName + "/recordings" ],
        "eventMethod": "POST"
      }
    ];

    res.status(200).json(nccoResponse);

  } else {

    nccoResponse = [
      { 
        "action": "wait",
        "timeout": 0.1
      }
    ];

    res.status(200).json(nccoResponse);

  }  

});

//-------------------

app.post('/event', async(req, res) => {

  res.status(200).send('Ok');
  
  //--

  const hostName = req.hostname;
  const uuid = req.body.uuid;
  const from = req.body.from;
  const to = req.body.to;

  if (req.body.type == 'transfer' && req.body.conversation_uuid_from == pstnTracking[uuid]["convUuid"]) {  // this is when the PSTN leg is effectively connected to the named conference

    pstnTracking[uuid]["namedConfUuid"] = req.body.conversation_uuid_to;

    // add delay for first TTS ("delayToFirstTts" parameter in milliseconds)
    setTimeout( async() => { 

      try {
        
        const call = await vonage.voice.getCall(uuid);  // check if call is still active

        if (call.status === 'answered') {

          //-- ask consent --
          vonage.voice.playTTS(uuid,  
          {
            text: 'This call is going to be transcribed for quality purposes.', // change this TTS text as needed for your use case
            language: 'en-US', 
            style: 11
          })
          .then(resp => console.log('>>> Play TTS on SIP leg', uuid))
          .catch(err => console.error('>>> Play TTS error on SIP leg', uuid, err));
        }  

      } catch (err) {
        console.error(">>> Error get call status of SIP call leg", uuid, err);
      }       

    }, delayToFirstTts);

  }

  // //-----------

  if (req.body.status == "completed") {

    // inserting delay to avoid possible race conditions, including for example the delay to receive recording file, transcribe file, and posting result
    setTimeout( async() => {

      // info related to this call is no longer needed
      // this is also done in /recordings route
      deleteFromPstnTracking(uuid);

    }, 30000)
    
    console.log('\n>>> SIP call', uuid, 'has terminated');

  }


});  

//--------------

app.post('/recordings', async(req, res) => {

  res.status(200).send('Ok');

  const uuid = findUuidByNamedConfUuid(req.body.conversation_uuid);

  console.log('\n>>> uuid:', uuid);
  // console.log('\n>>> pstnTracking[uuid]:', pstnTracking[uuid]);

  const startTime = pstnTracking[uuid]["startTime"];
  const callerNumber = pstnTracking[uuid]["callerNumber"];
  const calledNumber = pstnTracking[uuid]["calledNumber"];

  const audioRecordingFileBaseName = startTime + '_' + callerNumber + '_' + calledNumber;

  const callAudioRecordingFile = `./post-call-data/${audioRecordingFileBaseName}_call.mp3`;

  await vonage.voice.downloadRecording(req.body.recording_url, callAudioRecordingFile);

  if (await fileExists(callAudioRecordingFile)) {

    const transcript = await transcribeFile(callAudioRecordingFile);

    const transcriptContent = transcript.results.channels[0].alternatives[0].paragraphs.transcript;

    const transcriptBuffer = Buffer.from(transcriptContent, 'utf-8');
    const encodedTranscript = transcriptBuffer.toString('base64');

    const jsonPayload = {
      start_time: startTime,
      caller_number: callerNumber,
      called_number: calledNumber,
      all_info: pstnTracking[uuid]["allInfo"],
      transcript: encodedTranscript
    };

    const accessToken = tokenGenerate(appId, privateKey, {});
    pstnTracking[uuid]["token"] = accessToken;

    //-- merge with metadata from remote application making the incoming SIP call --

    // properties from remote application overwrite properties from jsonPayload in case of conflicts
    const jsonMergedPayload = { ...jsonPayload, ...metadataIn[callerNumber] };

    console.log(">>> Posting JSON payload to originator server, caller number", callerNumber, "called number", calledNumber);

    // post JSON payload to remote storage server 
    await axios.post('https://' + dropOffServerPath, 
      jsonMergedPayload,
      {
        headers: {
          "X-Vonage-Jwt": 'Bearer ' + pstnTracking[uuid]["token"],
            "Content-Type": 'application/json'
        }
      })
      .then(res => {
        console.log('\n>>> JSON payload posted for call leg:', uuid);
        deleteFromMetadata(callerNumber); // delete corresponding metadata tracking object
      })
      .catch(err => {
        console.log('\n>>> Failed to post JSON payload for call leg', uuid, 'caller number', callerNumber);
        console.log('>>> error code:', err.response.status, 'error reason:', err.response.statusText);
        console.dir(err.response.headers, {depth: 2, colors: true});
      })

    //-- info related to this call is no longer needed 
    deleteFromPstnTracking(uuid);

    //-- uncomment this next line if you want to keep the audio recording files for test purposes
    deleteFile(callAudioRecordingFile);

  };  

});

//------------

app.post('/dropoff', async(req, res) => {

  res.status(200).send('Ok');

});

//--- If this application is hosted on VCR (Vonage Cloud Runtime) serverless infrastructure --------

app.get('/_/health', async(req, res) => {

  res.status(200).send('Ok');

});

//=========================================

const port = process.env.VCR_PORT || process.env.PORT || 8000;

app.listen(port, () => console.log(`\nVoice API application listening on port ${port}`));

//------------
