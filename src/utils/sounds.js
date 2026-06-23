// frontend/src/utils/sounds.js

// Sound effects for the app
export const playSound = (type) => {
  try {
    let audioContext;
    
    // Create audio context
    if (!window.audioContext) {
      window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    audioContext = window.audioContext;
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'ride-request') {
      // Three ascending beeps for new ride request
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } else if (type === 'ride-accepted') {
      // Two quick beeps for ride accepted
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else if (type === 'arrived') {
      // Single long beep for arrival
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    } else if (type === 'message') {
      // Short soft beep for message
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }
  } catch (error) {
    // Silently fail if audio is not supported
    console.log('Sound not supported');
  }
};

// Predefined sound functions
export const playRideRequestSound = () => playSound('ride-request');
export const playRideAcceptedSound = () => playSound('ride-accepted');
export const playArrivedSound = () => playSound('arrived');
export const playMessageSound = () => playSound('message');