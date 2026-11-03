/* BridgePoint card search + voice input · V1
 * Additive UI only. Reuses the existing BridgePoint Guide form and public-safe answer service.
 * Does not call map APIs, enable layers, or submit executable actions.
 */
(() => {
  'use strict';
  const VERSION = 1;
  const BAR_ID = 'bpv-ai-commandbar-v1';
  const STYLE_ID = 'bpv-ai-commandbar-style-v1';
  if (window.__BP_AI_COMMAND_BAR_V1__) return;

  let observer = null;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = \`
      #\${BAR_ID}{display:flex;align-items:center;gap:7px;width:100%;min-width:0;margin:0 0 8px;padding:0;box-sizing:border-box}
      #\${BAR_ID} input{appearance:none;box-sizing:border-box;flex:1 1 auto;min-width:0;width:0;height:41px;padding:0 13px;border:1px solid rgba(117,234,255,.32);border-radius:11px;background:rgba(1,9,15,.82);color:#effcff;font:12px/1.2 system-ui,sans-serif;outline:none;box-shadow:inset 0 1px rgba(255,255,255,.035)}
      #\${BAR_ID} input::placeholder{color:#86aab8;opacity:1}
      #\${BAR_ID} input:focus{border-color:rgba(117,234,255,.78);box-shadow:0 0 0 3px rgba(117,234,255,.09)}
      #\${BAR_ID} button{display:grid;place-items:center;flex:0 0 42px;width:42px;height:41px;padding:0;border:1px solid rgba(117,234,255,.45);border-radius:11px;background:linear-gradient(135deg,rgba(23,109,155,.95),rgba(40,71,165,.95));color:#fff;font:700 19px/1 system-ui,sans-serif;cursor:pointer;touch-action:manipulation}
      #\${BAR_ID} button[aria-pressed="true"]{border-color:rgba(255,126,126,.8);background:linear-gradient(135deg,#a43b43,#6d273d);box-shadow:0 0 0 3px rgba(255,90,105,.12)}
      #\${BAR_ID} button:focus-visible{outline:2px solid #8defff;outline-offset:2px}
      #\${BAR_ID} .bpv-ai-command-status{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
      @media(max-width:520px){#\${BAR_ID}{gap:6px}#\${BAR_ID} input{height:40px;padding:0 10px;font-size:11px}#\${BAR_ID} button{flex-basis:42px;width:42px;height:40px}}
    \`;
    document.head.appendChild(style);
  }

  let bar = null;
  let questionInput = null;
  let micButton = null;
  let statusNode = null;
  let recognition = null;

  function setStatus(message) {
    if (statusNode) statusNode.textContent = String(message || '');
  }

  function submitQuestion(value) {
    const question = String(value || '').trim().slice(0, 500);
    if (question.length < 2) {
      setStatus('Enter a BridgePoint question, or tap the microphone to speak.');
      questionInput?.focus({ preventScroll: true });
      return false;
    }

    const sidecar = document.getElementById('bpv-sidecar');
    const aiTab = sidecar?.querySelector('[data-bpv-panel="ai"]');
    const aiField = document.getElementById('bpv-ai-question');
    const aiForm = document.getElementById('bpv-ai-form');
    if (!aiTab || !aiField || !aiForm) {
      setStatus('BridgePoint Guide is still initializing. Try again in a moment.');
      return false;
    }

    // Opens the existing, source-aware BridgePoint AI panel. No globe or layer API is called.
    aiTab.click();
    aiField.value = question;
    aiField.dispatchEvent(new Event('input', { bubbles: true }));
    aiForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    setStatus('Question sent to BridgePoint Guide. Answers use public-safe company facts, capability status and package data.');
    return true;
  }

  function setListening(on) {
    if (!micButton) return;
    micButton.setAttribute('aria-pressed', on ? 'true' : 'false');
    micButton.setAttribute('aria-label', on ? 'Stop voice input' : 'Start voice input');
    micButton.title = on ? 'Stop listening' : 'Ask BridgePoint by voice';
    micButton.textContent = on ? '■' : '🎙';
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Voice input is not supported by this browser. Type your question instead.');
      questionInput?.focus({ preventScroll: true });
      return;
    }
    if (recognition) {
      try { recognition.stop(); } catch (_) {}
      setStatus('Stopping microphone…');
      return;
    }

    let delivered = false;
    try {
      const active = new SpeechRecognition();
      recognition = active;
      active.lang = navigator.language || 'en-US';
      active.continuous = false;
      active.interimResults = false;
      active.maxAlternatives = 1;
      active.onstart = () => {
        setListening(true);
        setStatus('Listening. Speak your BridgePoint question.');
      };
      active.onresult = event => {
        const transcript = Array.from(event.results || [])
          .slice(event.resultIndex || 0)
          .filter(result => result && result.isFinal)
          .map(result => result[0]?.transcript || '')
          .join(' ')
          .trim();
        if (!transcript) return;
        delivered = true;
        if (questionInput) questionInput.value = transcript.slice(0, 500);
        submitQuestion(transcript);
        try { active.stop(); } catch (_) {}
      };
      active.onerror = event => {
        const reason = event?.error === 'not-allowed'
          ? 'Microphone permission was denied. Allow microphone access or type your question.'
          : event?.error === 'no-speech'
            ? 'No speech was detected. Tap the microphone and try again.'
            : 'Voice input stopped. You can type your question or try the microphone again.';
        setStatus(reason);
      };
      active.onend = () => {
        if (recognition === active) recognition = null;
        setListening(false);
        if (!delivered && !statusNode?.textContent) {
          setStatus('Listening ended. Try again or type your question.');
        }
      };
      active.start();
    } catch (error) {
      recognition = null;
      setListening(false);
      setStatus('The microphone could not start. Check browser permissions or type your question.');
    }
  }

  function mount() {
    const dock = document.getElementById('bpv-dock');
    if (!dock) return false;
    if (document.getElementById(BAR_ID)) return true;

    const label = dock.querySelector('.bpv-dock-label');
    if (!label) return false;

    addStyles();
    bar = document.createElement('form');
    bar.id = BAR_ID;
    bar.setAttribute('role', 'search');
    bar.setAttribute('aria-label', 'Ask BridgePoint about its public knowledge and capabilities');

    questionInput = document.createElement('input');
    questionInput.type = 'search';
    questionInput.name = 'question';
    questionInput.maxLength = 500;
    questionInput.autocomplete = 'off';
    questionInput.spellcheck = true;
    questionInput.placeholder = 'Ask BridgePoint anything about its data, capabilities, coverage or tools…';
    questionInput.setAttribute('aria-label', 'Ask BridgePoint a question');

    micButton = document.createElement('button');
    micButton.type = 'button';
    micButton.textContent = '🎙';
    micButton.setAttribute('aria-label', 'Start voice input');
    micButton.setAttribute('aria-pressed', 'false');
    micButton.title = 'Ask BridgePoint by voice';

    statusNode = document.createElement('span');
    statusNode.className = 'bpv-ai-command-status';
    statusNode.setAttribute('role', 'status');
    statusNode.setAttribute('aria-live', 'polite');

    bar.append(questionInput, micButton, statusNode);
    label.insertAdjacentElement('afterend', bar);

    bar.addEventListener('submit', event => {
      event.preventDefault();
      if (recognition) {
        try { recognition.stop(); } catch (_) {}
      }
      submitQuestion(questionInput.value);
    });
    micButton.addEventListener('click', startListening);

    window.__BP_AI_COMMAND_BAR_V1__ = {
      version: VERSION,
      ready: true,
      submit: submitQuestion,
      element: bar
    };
    return true;
  }

  function watchForDock() {
    if (mount()) return;
    if (!document.documentElement) return;
    observer = new MutationObserver(() => {
      if (mount()) {
        observer?.disconnect();
        observer = null;
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchForDock, { once: true });
  } else {
    watchForDock();
  }
})();
