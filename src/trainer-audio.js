import {heightAt} from './trainer-world.js';
// Original synthesised engine, rolling noise and two-tone emergency signal.
// Created only from an input gesture; no remote audio files or autoplay bypass.
export class TrainerAudio{
  async preload(){
    const base=new URL('../assets/trainer/radio/',import.meta.url);
    const resource=name=>{const url=new URL(name,base);url.search=new URL(import.meta.url).search;return url;};
    const program=await fetch(resource('program.json'),{cache:'no-cache',signal:AbortSignal.timeout(120000)});if(!program.ok)throw new Error('Radio program unavailable');
    this.program=await program.json();
    const read=async name=>{const response=await fetch(resource(name),{signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error('Radio audio unavailable: '+name);return response.arrayBuffer();};
    this.musicBytes=await read(this.program.music);
    this.announcements=await Promise.all(this.program.announcements.map(async entry=>({...entry,bytes:await read(entry.src)})));
  }
  async prepareRadio(){
    if(this.radioPreparing)return this.radioPreparing;
    this.radioPreparing=(async()=>{const c=this.context;this.musicGain=c.createGain();this.musicGain.gain.value=0;this.musicGain.connect(this.master);
      const source=this.musicSource=c.createBufferSource();source.buffer=await c.decodeAudioData(this.musicBytes.slice(0));source.loop=true;source.connect(this.musicGain);source.start();
      for(const entry of this.announcements)entry.buffer=await c.decodeAudioData(entry.bytes.slice(0));
    })();return this.radioPreparing;
  }
  playAnnouncement(entry){
    if(!entry?.buffer||this.voice)return false;
    const voice=this.voice=this.context.createBufferSource();voice.buffer=entry.buffer;voice.connect(this.master);voice.onended=()=>{this.voice=null;};voice.start();return true;
  }
  unlock(){
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
    if(!this.context){
      const c=this.context=new Audio(),master=this.master=c.createGain();master.gain.value=.65;master.connect(c.destination);
      const engine=this.engine=c.createGain();engine.gain.value=0;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;engine.connect(filter);filter.connect(master);this.engineFilter=filter;
      this.motor=[['sawtooth',1],['triangle',.5]].map(([type,multiplier])=>{const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type=type;oscillator.frequency.value=35*multiplier;gain.gain.value=multiplier===1?.35:.55;oscillator.connect(gain);gain.connect(engine);oscillator.start();return {oscillator,multiplier};});
      const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);let seed=112;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*.5;}
      const noise=c.createBufferSource();noise.buffer=buffer;noise.loop=true;const roadFilter=c.createBiquadFilter();roadFilter.type='bandpass';roadFilter.frequency.value=800;roadFilter.Q.value=.5;this.road=c.createGain();this.road.gain.value=0;noise.connect(roadFilter);roadFilter.connect(this.road);this.road.connect(master);noise.start();
      const rotorNoise=c.createBufferSource();rotorNoise.buffer=buffer;rotorNoise.loop=true;const rotorFilter=c.createBiquadFilter();rotorFilter.type='lowpass';rotorFilter.frequency.value=400;this.rotorGain=c.createGain();this.rotorGain.gain.value=0;rotorNoise.connect(rotorFilter);rotorFilter.connect(this.rotorGain);
      const pulse=c.createGain();pulse.gain.value=.55;this.rotorGain.connect(pulse);pulse.connect(master);this.rotorPulse=c.createOscillator();this.rotorPulse.type='sine';this.rotorPulse.frequency.value=18;const modulation=c.createGain();modulation.gain.value=.4;this.rotorPulse.connect(modulation);modulation.connect(pulse.gain);this.rotorPulse.start();rotorNoise.start();
      this.rotorTone=c.createOscillator();this.rotorTone.type='triangle';this.rotorTone.frequency.value=170;const turbine=c.createGain();turbine.gain.value=.15;this.rotorTone.connect(turbine);turbine.connect(this.rotorGain);this.rotorTone.start();
      this.horns=[[440,554],[587,740]].map(frequencies=>{const gain=c.createGain();gain.gain.value=0;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1800;gain.connect(filter);filter.connect(master);for(const frequency of frequencies){const oscillator=c.createOscillator();oscillator.type='square';oscillator.frequency.value=frequency;const level=c.createGain();level.gain.value=.18;oscillator.connect(level);level.connect(gain);oscillator.start();}return gain;});
    }
    this.context.resume().catch(()=>{});
    if(this.musicBytes)this.prepareRadio().catch(error=>console.error("Radio:",error));
  }
  update(s,keys){
    if(!this.context)return;const c=this.context,t=c.currentTime,v=s.vehicle,active=s.started&&!s.paused&&s.soundEnabled,speed=Math.abs(v.speed),driving=active&&v.occupied;
    const heli=s.helicopter,heliDistance=heli.occupied?0:Math.hypot(heli.e-s.player.e,heli.n-s.player.n,heli.altitude-heightAt(s.player.e,s.player.n)),heliLevel=active&&heli.spawned?heli.rotor/(1+(heliDistance/45)**2):0;this.rotorGain.gain.setTargetAtTime(heliLevel*.45,t,.15);this.rotorPulse.frequency.setTargetAtTime(4+heli.rotor*15,t,.1);this.rotorTone.frequency.setTargetAtTime(120+heli.rotor*280,t,.2);
    const gear=Math.min(4,1+Math.floor(speed/9)),rpm=850+speed/gear*200+(keys.has('KeyW')?300:0);
    for(const {oscillator,multiplier}of this.motor)oscillator.frequency.setTargetAtTime(rpm/60*2*multiplier,t,.12);
    this.engine.gain.setTargetAtTime(driving?.15+(keys.has('KeyW')?.04:0):0,t,.12);this.engineFilter.frequency.setTargetAtTime(350+rpm*.18,t,.15);this.road.gain.setTargetAtTime(driving?Math.min(1,speed/33.3)*.08:0,t,.12);
    const distance=v.occupied?0:Math.hypot(v.e-s.player.e,v.n-s.player.n),attenuation=1/(1+(distance/22)**2),phase=Math.floor(t/.55)%2;
    const radioActive=active&&v.radioOn;
    this.musicGain?.gain.setTargetAtTime(radioActive?(this.voice ? .045 : .55)*attenuation:0,t,.18);
    if(this.voice&&!radioActive){this.voice.stop();this.voice=null;}
    // Announcement times count audible radio time, rather than time spent in menus.
    const delta=Math.min(.1,Math.max(0,t-(this.lastRadioTime??t)));this.lastRadioTime=t;
    if(radioActive){this.radioSeconds=(this.radioSeconds||0)+delta;for(const entry of this.announcements||[])if(!entry.played&&this.radioSeconds>=(entry.atSeconds??60)&&!this.voice){entry.played=this.playAnnouncement(entry);}}
    this.horns.forEach((gain,i)=>gain.gain.setTargetAtTime(active&&v.siren&&phase===i?.28*attenuation:0,t,.025));
  }
  dispose(){this.context?.close().catch(()=>{});this.context=null;}
}
