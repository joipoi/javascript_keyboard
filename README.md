# 🎶 Javascript Keyboard
This is a piano you can play using your keys. You can also record your playing as midi and then as audio.
This uses the Web Audio API.

#  Features
Play an instrument using your keyboard keys

Visual feedback when notes are playing (highlighted keys)

Record your playing as MIDI

Have several Midi tracks that can be played together and can be muted.

Save your song as a Audio file

Current instruments: sine, square, triangle, sawtooth, kick, snare


#  How It Works
Tracks are stored as an array of "midi events" (midiList) where each track is an array of note objects:

```
{
  "freq": 130,
  "timestamp": 0.35,
  "length": 0.07
}
```
These tracks can then be played back at the same time

#  Example Instruments
```
bass: {
  holdable: true,
  play: (freq, startAt, length = null) => {
    const osc = audioContext.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startAt);
    osc.connect(mainGainNode);
    osc.start(startAt);
    if (length) {
      osc.stop(startAt + length);
    }
    return osc;
  }
}
```
You can easily add new instruments by adding them to the instruments variable

# Future Improvements
- Make a full GUI like a traditional DAW would have
- Add click and bpm
- Add more instruments
- Improve Design
- Display Start time and end time of each track
- Save audio without having to play the song
- Import audio
- Import midi
- Save midi to file or local storage
- Put different instruments on different keys(c -> kick, c# -> snare, d -> hihat)
- Volume control
- Let user make their own instruments
- Track Looping
- instruments stored as json


# Sources / Learning
Here are some links that helped me

- [Audio API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth)
- [Piano Design I stole](https://codepen.io/gabrielcarol/pen/rGeEbY)
