const audioContext = new AudioContext();
const oscList = [];
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
const keyCodes = [
  "KeyA", "KeyW", "KeyS", "KeyE", "KeyD", "KeyF", "KeyT",
  "KeyG", "KeyY", "KeyH", "KeyU", "KeyJ", "KeyK", "KeyO",
  "KeyL", "KeyP", "Semicolon"
];

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
  bass: {
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

function playInstrument(name, freq, startAt, length) {
  const instrument = instruments[name];
  if (!instrument) {
    console.warn(`Instrument "${name}" not found`);
    return;
  }
  if(instrument.holdable){
    return instrument.play(freq, startAt, length);
  }else{
    instrument.play(freq, startAt);
  }

  
}

document.getElementById("recordBtn").addEventListener("click", () => {
  recorder.start();
  recordingText.style.display = "block";
});

document.getElementById("stopBtn").addEventListener("click", () => {
  recorder.stop();
  recordingText.style.display = "none";
});

document.getElementById("recordMidiBtn").addEventListener("click", () => {
  RecordMidi();
  recordingText.style.display = "block";
});

document.getElementById("stopMidiBtn").addEventListener("click", () => {
  recordingMidi = false;
  midiList.push(midiEvents);
  midiEvents = [];
  createNewTrack();
  recordingText.style.display = "none";
});

document.getElementById("playTracksBtn").addEventListener("click", () => {
  const trackElems = document.querySelectorAll(".track");
  for(let i = 0; i < midiList.length; i++){
    let trackSelect = trackElems[i].querySelector("select");
    if(!mutedTracks[i]){
      playMidi(midiList[i], trackSelect.value);
     
    }
    
  }

});

setup();

function setup() {

  mainGainNode = audioContext.createGain();
  mainGainNode.connect(audioContext.destination);
  mainGainNode.gain.value = 0.15;

  for (let i = 0; i < 9; i++) {
    oscList[i] = {};
  }

  dest = audioContext.createMediaStreamDestination();
  recorder = new MediaRecorder(dest.stream);
  mainGainNode.connect(dest);

  recorder.ondataavailable = (event) => {
    const blob = new Blob([event.data], { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);

    // Create an audio element to play the recording
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = url;
    document.body.appendChild(audio); // Add it to the page

    // Optional: still provide a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.webm';
    a.textContent = 'Download Recording';
    document.body.appendChild(a);
  };

}



function playMidiTone(freq, instrument, length = null, startAt = audioContext.currentTime, ) {
  let osc = playInstrument(instrument, freq, startAt, length); 

  // Visual feedback
  const ele = document.querySelector("[data-frequency='" + freq + "']");
  if (ele) {
    const now = audioContext.currentTime;
    const delay = (startAt - now) * 1000; // convert to ms
    const duration = length * 1000;

    // Add "playing" class at the right time
    setTimeout(() => {
      ele.classList.add("playing");

      // Remove it after the note finishes
      setTimeout(() => {
        ele.classList.remove("playing");
      }, duration);
    }, delay);
  }
  return osc;
}


// EVENT LISTENER FUNCTIONS
function notePressed(target) {
  const dataset = target.dataset;
  const type = instrumentSelect.options[instrumentSelect.selectedIndex].value;
  const frequency = dataset["frequency"];

  if (!dataset["pressed"]) {
    if (type === "kick" || type === "snare") {
      playMidiTone(frequency, type);
    } else {
      oscList[frequency] = playMidiTone(frequency, type);;
      dataset["pressed"] = "yes";
    }

    if (recordingMidi) {
      noteStartTimes[frequency] = audioContext.currentTime - recordingStartTime;
    }
  }
}


function noteReleased(target) {
  const dataset = target.dataset;
  const frequency = dataset["frequency"];
  if (dataset && dataset["pressed"]) {
    if (oscList[frequency]) {
      oscList[frequency].stop();
      delete oscList[frequency];
      delete dataset["pressed"];
    }
    
  }

  if (recordingMidi && noteStartTimes[frequency] !== undefined) {
    const start = noteStartTimes[frequency];
    const end = audioContext.currentTime - recordingStartTime;
    const length = end - start;
    midiEvents.push({
      freq: frequency, 
      timestamp: start,
      length: length
    });

    delete noteStartTimes[frequency]; // Clean up
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

function RecordMidi() {
  recordingStartTime = audioContext.currentTime;
  recordingMidi = true;
}

function createNewTrack() {
  const trackElem = document.createElement("div");
  const count = tracksDiv.children.length
  trackElem.classList.add("track");

  // Track name
  const nameSpan = document.createElement("span");
  nameSpan.classList.add("name");
  nameSpan.textContent = `Untitled${count}`;
  trackElem.appendChild(nameSpan);

  trackElem.appendChild(document.createElement("br"));

  // Instrument selector
  const select = instrumentSelect.cloneNode(true);
  select.value = instrumentSelect.value;

  trackElem.appendChild(select);
  trackElem.appendChild(document.createElement("br"));

  // Playbutton
  const playPauseButton = document.createElement("button");
  playPauseButton.textContent = "Play";
  playPauseButton.addEventListener("click", () => {
    playMidi(midiList[count], select.value);
   
  });
  trackElem.appendChild(playPauseButton);

  // Mute button
  const muteButton = document.createElement("button");
  muteButton.textContent = "Mute";

  muteButton.addEventListener("click", () => {
    mutedTracks[count] = !mutedTracks[count];
    mutedTracks[count] ? muteButton.style.backgroundColor = "red" :  muteButton.style.backgroundColor = "white"; 
  });

  trackElem.appendChild(muteButton);

  // Append to main container
  tracksDiv.appendChild(trackElem);
  mutedTracks.push(false);
}