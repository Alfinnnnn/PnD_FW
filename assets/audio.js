// --- AUDIO SYSTEM ---
let audioCtx = null;
let timerID = null;
let nextNoteTime = 0;
let currentNote = 0;
let audioInitialized = false;

// Check localStorage for global mute state, default to false (ON)
let savedState = localStorage.getItem('quest_mute_state');
let isMuted = savedState ? savedState === 'true' : false; 

// Determine which page we are on
const path = window.location.pathname.toLowerCase();
const isTitleScreen = path.endsWith('index.html') || path.endsWith('/') || !path.includes('.html');
const isLogScreen = path.endsWith('rei.html') || path.endsWith('qony.html') || path.endsWith('ica.html');

// Main Adventure Theme
const melodyMain = [
    [261.63, 0.2], [392.00, 0.2], [329.63, 0.2], [523.25, 0.4], [392.00, 0.2], [0, 0.2],
    [349.23, 0.2], [329.63, 0.2], [293.66, 0.2], [392.00, 0.4], [261.63, 0.2], [0, 0.2],
    [261.63, 0.2], [392.00, 0.2], [329.63, 0.2], [523.25, 0.4], [659.25, 0.2], [0, 0.2],
    [698.46, 0.2], [587.33, 0.2], [523.25, 0.2], [493.88, 0.4], [523.25, 0.4] 
];

// Epic Title Theme (A minor arpeggios)
const melodyTitle = [
    [220.00, 0.3], [261.63, 0.3], [329.63, 0.3], [440.00, 0.6], [329.63, 0.3], [0, 0.3],
    [196.00, 0.3], [246.94, 0.3], [293.66, 0.3], [392.00, 0.6], [293.66, 0.3], [0, 0.3],
    [174.61, 0.3], [220.00, 0.3], [261.63, 0.3], [349.23, 0.6], [261.63, 0.3], [0, 0.3],
    [164.81, 0.3], [207.65, 0.3], [246.94, 0.3], [329.63, 0.6], [246.94, 0.3], [0, 0.3]
];

// Sad Farewell Theme (D minor descending, slower)
const melodyFarewell = [
    [440.00, 0.4], [392.00, 0.4], [349.23, 0.4], [329.63, 0.4],
    [293.66, 0.8], [0, 0.2],
    [349.23, 0.4], [329.63, 0.4], [293.66, 0.4], [261.63, 0.4],
    [220.00, 0.8], [0, 0.2],
    [293.66, 0.4], [349.23, 0.4], [440.00, 0.4], [392.00, 0.4],
    [349.23, 0.6], [329.63, 0.2], [293.66, 0.8], [0, 0.4]
];

const melody = isTitleScreen ? melodyTitle : (isLogScreen ? melodyFarewell : melodyMain);
const tempo = isTitleScreen ? 1.5 : (isLogScreen ? 0.9 : 1.3);

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function scheduler() {
    if (isMuted || !audioInitialized) return;
    
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        playNote(melody[currentNote][0], melody[currentNote][1] / tempo, nextNoteTime);
        nextNoteTime += melody[currentNote][1] / tempo;
        currentNote = (currentNote + 1) % melody.length;
    }
    timerID = requestAnimationFrame(scheduler);
}

function playNote(freq, duration, time) {
    if (freq === 0) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.02);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(time);
    osc.stop(time + duration);
}

function playSelectSFX() {
    if (isMuted) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'square';
    
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(440, now); 
    osc.frequency.setValueAtTime(554.37, now + 0.05); 
    osc.frequency.setValueAtTime(659.25, now + 0.1); 
    osc.frequency.setValueAtTime(880, now + 0.15); 
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.setValueAtTime(0.05, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 0.3);
}

function updateVolumeIcon() {
    const volIcon = document.getElementById('volume-icon');
    if (!volIcon) return;
    
    if (isMuted) {
        volIcon.innerText = 'volume_off';
        volIcon.classList.remove('text-neon-cyan');
        volIcon.classList.add('text-text-secondary');
    } else {
        volIcon.innerText = 'volume_up';
        volIcon.classList.add('text-neon-cyan');
        volIcon.classList.remove('text-text-secondary');
    }
}

function toggleMute(e) {
    if (e) e.stopPropagation();
    isMuted = !isMuted;
    localStorage.setItem('quest_mute_state', isMuted);
    updateVolumeIcon();
    
    if (isMuted) {
        cancelAnimationFrame(timerID);
        if (audioCtx) audioCtx.suspend();
    } else {
        initAudio();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                startScheduler();
            });
        } else {
            startScheduler();
        }
    }
}

function startScheduler() {
    if (!audioInitialized) {
        audioInitialized = true;
        nextNoteTime = audioCtx.currentTime + 0.1;
        currentNote = 0;
    }
    cancelAnimationFrame(timerID);
    scheduler();
}

// Auto-play on first interaction to bypass strict autoplay policies
const unlockAudio = async (e) => {
    if (!isMuted && !audioInitialized) {
        initAudio();
        try {
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            // Check if resume was successful (some browsers ignore it on mousemove)
            if (audioCtx.state === 'running') {
                audioInitialized = true;
                nextNoteTime = audioCtx.currentTime + 0.1;
                currentNote = 0;
                scheduler();
                
                // Remove listeners once successfully started
                const events = ['click', 'mousemove', 'mouseover', 'scroll', 'keydown', 'touchstart'];
                events.forEach(evt => {
                    window.removeEventListener(evt, unlockAudio, true);
                });
            }
        } catch (err) {
            // Silently fail if browser blocks resume on this specific event
        }
    }
};

// Bind to multiple events to catch the earliest possible interaction
const events = ['click', 'mousemove', 'mouseover', 'scroll', 'keydown', 'touchstart'];
events.forEach(evt => {
    window.addEventListener(evt, unlockAudio, true);
});

// Attempt to start immediately (works if domain is whitelisted/cached)
function attemptAutoPlay() {
    if (!isMuted) {
        initAudio();
        if (audioCtx.state === 'running') {
            startScheduler();
        }
    }
    updateVolumeIcon();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    updateVolumeIcon();
    setTimeout(attemptAutoPlay, 100);
});
