const audioContext = new AudioContext();
const oscList = [];   //oscList is currently playing oscillators so we know which ones to stop later
let mainGainNode = null;

const instrumentSelect = document.querySelector("select[name='instrument']");

let dest = null;
let recorder = null;

let recordingMidi = false;
let midiEvents = [];
let midiList = [];
let noteStartTimes = {};  
let recordingStartTime = null;
let mutedTracks = [];


const tracksDiv = document.getElementById("tracksDiv");
const recordingText = document.getElementById("recordingText");

const synthKeys = document.querySelectorAll(".key");

//Edit this to change keybinds
const keyCodes = [
  "KeyA", "KeyW", "KeyS", "KeyE", "KeyD", "KeyF", "KeyT",
  "KeyG", "KeyY", "KeyH", "KeyU", "KeyJ", "KeyK", "KeyO",
  "KeyL", "KeyP", "Semicolon"
];

//Collection of instruments, can add more
const instruments = {
  kick: {
    duration: 0.5,
    holdable: false,
    play: (freq, startAt) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);
      osc.frequency.exponentialRampToValueAtTime(0.001, startAt + 0.5);

      gain.gain.setValueAtTime(2, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.5);

      osc.connect(gain);
      gain.connect(mainGainNode);

      osc.start(startAt);
      osc.stop(startAt + 0.5);
    }
  },

  snare: {
    duration: 0.2,
    holdable: false,
    play: (freq, startAt) => {
      // White noise
      const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.2, audioContext.sampleRate);
      const outputData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        outputData[i] = Math.random() * 2 - 1;
      }

      const noise = audioContext.createBufferSource();
      noise.buffer = noiseBuffer;

      const noiseFilter = audioContext.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(freq, startAt);

      const noiseGain = audioContext.createGain();
      noiseGain.gain.setValueAtTime(1, startAt);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, startAt + 0.2);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(mainGainNode);

      noise.start(startAt);
      noise.stop(startAt + 0.2);

      // Oscillator body
      const osc = audioContext.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startAt);

      const oscGain = audioContext.createGain();
      oscGain.gain.setValueAtTime(0.7, startAt);
      oscGain.gain.exponentialRampToValueAtTime(0.01, startAt + 0.1);

      osc.connect(oscGain);
      oscGain.connect(mainGainNode);

      osc.start(startAt);
      osc.stop(startAt + 0.2);
    }
  },
  sawtooth: {
    holdable: true,
    play: (freq, startAt, length = null) => {
      const osc = audioContext.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startAt);
      osc.connect(mainGainNode);
      osc.start(startAt);
      if(length){
        osc.stop(startAt + length);
      }
      return osc; 
    }
  },
  sine: {
    holdable: true,
    play: (freq, startAt, length = null) => {
      const osc = audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);
      osc.connect(mainGainNode);
      osc.start(startAt);
      if (length) {
        osc.stop(startAt + length);
      }
      return osc;
    }
  },
  
  triangle: {
    holdable: true,
    play: (freq, startAt, length = null) => {
      const osc = audioContext.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startAt);
      osc.connect(mainGainNode);
      osc.start(startAt);
      if (length) {
        osc.stop(startAt + length);
      }
      return osc;
    }
  },
  
  square: {
    holdable: true,
    play: (freq, startAt, length = null) => {
      const osc = audioContext.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startAt);
      osc.connect(mainGainNode);
      osc.start(startAt);
      if (length) {
        osc.stop(startAt + length);
      }
      return osc;
    }
  },

  
};

document.getElementById("recordBtn").addEventListener("click", () => {
  if (midiList.length > 0) {
    recordAudio();
   
  }
});

document.getElementById("recordMidiBtn").addEventListener("click", () => {
  recordMidi();
});

document.getElementById("stopMidiBtn").addEventListener("click", () => {
  recordingMidi = false;
  midiList.push(midiEvents);
  midiEvents = [];
  createNewTrack();
  recordingText.style.display = "none";
});

document.getElementById("playTracksBtn").addEventListener("click", () => {
  playAllTracks();
});

setup();

function setup() {
  mainGainNode = audioContext.createGain();
  mainGainNode.connect(audioContext.destination);
  mainGainNode.gain.value = 0.15; //change this to change main volume

  //This code is for saving audio data

  dest = audioContext.createMediaStreamDestination();
  recorder = new MediaRecorder(dest.stream);
  mainGainNode.connect(dest);

  recorder.ondataavailable = (event) => {
    const blob = new Blob([event.data], { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);

    const audioDiv = document.getElementById("audioDiv");
    audioDiv.style.display = "block";

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = url;
    audioDiv.appendChild(audio); 

    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.webm';
    a.textContent = 'Download Recording';
    audioDiv.appendChild(a);
  };

}


function playAllTracks(){
  const trackElems = document.querySelectorAll(".track");
  for(let i = 0; i < midiList.length; i++){
    let trackSelect = trackElems[i].querySelector("select");
    if(!mutedTracks[i]){
      playMidi(midiList[i], trackSelect.value);
     
    }
    
  }
}

//holdable instruments are ones that can hold a note as opposed to drums
function playInstrument(name, freq, startAt, length) {
  const instrument = instruments[name];
  if (!instrument) {
    console.warn(`Instrument "${name}" not found`);
    return;
  }
  //if instrument is holdable we need to return so we can add it to oscList and later stop it
  if(instrument.holdable){
    return instrument.play(freq, startAt, length);
  }else{
    instrument.play(freq, startAt);
  }
}

function playMidiTone(freq, instrument, length = null, startAt = audioContext.currentTime, ) {
  let osc = playInstrument(instrument, freq, startAt, length); 

  const ele = document.querySelector("[data-frequency='" + freq + "']");
  if (ele) {
    //code to show piano playing visually

    const now = audioContext.currentTime;
    const delay = (startAt - now) * 1000;
    const duration = length * 1000;
    if(delay > 0){
    setTimeout(() => {
      ele.classList.add("playing");

      setTimeout(() => {
        ele.classList.remove("playing");
      }, duration);
    }, delay);
  }
  }
  return osc;
}


// EVENT LISTENER FUNCTIONS

function notePressed(target) {
  const dataset = target.dataset;
  const type = instrumentSelect.options[instrumentSelect.selectedIndex].value;
  const frequency = dataset["frequency"];
  target.classList.add("playing");

  if (!dataset["pressed"]) {
      const osc = playMidiTone(frequency, type);
      if(osc && osc != undefined){
        oscList[frequency] = osc;
      }
      dataset["pressed"] = "yes";
    if (recordingMidi) {
      //need this so we know when the note started for the midi data
      noteStartTimes[frequency] = audioContext.currentTime - recordingStartTime;
    }
  }
}

function noteReleased(target) {
  const dataset = target.dataset;
  const frequency = dataset["frequency"];
  target.classList.remove("playing");
  if (dataset && dataset["pressed"]) {
    if (oscList[frequency]) {
      oscList[frequency].stop();
      delete oscList[frequency];
      
    }
    delete dataset["pressed"];
  }

  //If recording, creates a new midi event and adds it to midiEvents
  if (recordingMidi && noteStartTimes[frequency] !== undefined) {
    const start = noteStartTimes[frequency];
    const end = audioContext.currentTime - recordingStartTime;
    const length = end - start;
    midiEvents.push({
      freq: frequency, 
      timestamp: start,
      length: length
    });

    delete noteStartTimes[frequency]; 
  }

}


function keyNote(event) {
  const elKey = synthKeys[keyCodes.indexOf(event.code)];
  if (elKey) {
    if (event.type === "keydown") {
      notePressed(elKey);
    } else {
      noteReleased(elKey);
    }
  }
}
addEventListener("keydown", keyNote);
addEventListener("keyup", keyNote);

// MIDI FUNCTIONS
function playMidi(midi, instrument, startTime = audioContext.currentTime) {
  midi.forEach(note => {
    const noteStart = startTime + note.timestamp;
    playMidiTone(note.freq, instrument, note.length, noteStart);
  });
}

function recordMidi() {
  //there is a countdown for 3 seconds until recording starts

  const countInDisplay = document.getElementById("count-in");
  const countdownSeconds = 3;

  let counter = countdownSeconds;
  countInDisplay.textContent = counter;

  const interval = setInterval(() => {
    counter--;
    if (counter > 0) {
      countInDisplay.textContent = counter;
    } else {
      clearInterval(interval);
      playAllTracks();
      countInDisplay.textContent = "Go!";
        countInDisplay.textContent = "";
        recordingStartTime = audioContext.currentTime;
        recordingMidi = true;
        recordingText.style.display = "block";
      
    }
  }, 1000);
}

//We record audio by playing the midi tracks while recording
function recordAudio(){
  recorder.start();
  recordingText.style.display = "block";

  playAllTracks();
  let latestNoteEndTime = getSongEnd(); //so we know when the recording stops

  const timeUntilStop = (latestNoteEndTime) * 1000; //1000 ms buffer
  setTimeout(() => {
    recorder.stop();
    recordingText.style.display = "none";
  }, timeUntilStop);
}

function createNewTrack() {
  const trackElem = document.createElement("div");
  const count = tracksDiv.children.length
  trackElem.classList.add("track");

  // Track name, starts off as untitled+count
  const nameSpan = document.createElement("p");
  nameSpan.classList.add("name");
  nameSpan.contentEditable = true;
  nameSpan.textContent = `Untitled${count}`;
  trackElem.appendChild(nameSpan);

  // Instrument selector
  const select = instrumentSelect.cloneNode(true);
  select.value = instrumentSelect.value;
  trackElem.appendChild(select);

  // Playbutton
  const playButton = document.createElement("button");
  playButton.textContent = "Play";
  playButton.addEventListener("click", () => {
    playMidi(midiList[count], select.value);
  });
  trackElem.appendChild(playButton);

  // Mute button
  const muteButton = document.createElement("button");
  muteButton.textContent = "Mute";
  muteButton.addEventListener("click", () => {
    mutedTracks[count] = !mutedTracks[count];
    mutedTracks[count] ? muteButton.style.backgroundColor = "red" :  muteButton.style.backgroundColor = "#4CAF50"; 
  });
  trackElem.appendChild(muteButton);

  tracksDiv.appendChild(trackElem);
  mutedTracks.push(false);
}

function getSongEnd(){
    // Determine the longest duration from all MIDI tracks
  let latestNoteEndTime = 0;
  for (let track of midiList) {
    for (let note of track) {
      const noteEnd = note.timestamp + note.length;
      if (noteEnd > latestNoteEndTime) {
        latestNoteEndTime = noteEnd;
      }
    }
  } 
  return latestNoteEndTime;
}