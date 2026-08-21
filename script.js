(() => {
  'use strict';

  const textarea = document.getElementById('feedbackInput');
  const charCount = document.getElementById('charCount');
  const sendBtn = document.getElementById('sendBtn');
  const sendClearBtn = document.getElementById('ClearBtn');
  const statusMessage = document.getElementById('statusMessage');
  const glassCard = document.getElementById('feedbackForm');
  const moonCharacter = document.getElementById('moonCharacter');
  const moonStage = document.getElementById('moonStage');
  const successBurst = document.getElementById('successBurst');
  const glowDrift = document.querySelector('.glow-drift');
  const ambientOrb = document.querySelector('.ambient-orb');

  /* ----------------------------------------------------------
     Character counter (informational only — no limit ever)
     ---------------------------------------------------------- */
  function updateCharCount() {
    const len = textarea.value.length;
    charCount.textContent = `${len.toLocaleString()} character${len === 1 ? '' : 's'}`;
  }

  function autoGrow() {
    textarea.style.height = 'auto';
    const next = Math.min(textarea.scrollHeight, window.innerHeight * 0.6);
    textarea.style.height = `${next}px`;
  }

  textarea.addEventListener('input', () => {
    updateCharCount();
    autoGrow();
  });

  updateCharCount();

  /* ----------------------------------------------------------
     Subtle cursor-follow ambience (desktop only, very small)
     ---------------------------------------------------------- */
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  if (isFinePointer) {
    window.addEventListener('mousemove', (e) => {
      const xPct = (e.clientX / window.innerWidth) * 100;
      const yPct = (e.clientY / window.innerHeight) * 100;

      if (glowDrift) {
        glowDrift.style.setProperty('--mx', `${xPct}%`);
        glowDrift.style.setProperty('--my', `${yPct}%`);
      }

      if (ambientOrb) {
        ambientOrb.style.setProperty('--ax', `${40 + (xPct - 50) * 0.06}%`);
        ambientOrb.style.setProperty('--ay', `${40 + (yPct - 50) * 0.06}%`);
      }

      if (moonStage) {
        const shiftX = (xPct - 50) * 0.04;
        const shiftY = (yPct - 50) * 0.03;
        moonStage.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
      }
    });
  }

  /* ----------------------------------------------------------
     Status message helper
     ---------------------------------------------------------- */
  let statusTimer = null;

  function showStatus(text, type) {
    statusMessage.textContent = text;
    statusMessage.classList.remove('is-error', 'is-success');
    if (type) statusMessage.classList.add(type === 'error' ? 'is-error' : 'is-success');
    statusMessage.classList.add('is-visible');

    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      statusMessage.classList.remove('is-visible');
    }, 4500);
  }

  /* ----------------------------------------------------------
     Success animation — used ONLY by the SEND button
     ---------------------------------------------------------- */
  function playSendSuccessAnimation() {
    moonCharacter.classList.remove('is-bouncing');
    // Force reflow so the animation can retrigger.
    void moonCharacter.offsetWidth;
    moonCharacter.classList.add('is-bouncing');
    moonCharacter.addEventListener(
      'animationend',
      () => moonCharacter.classList.remove('is-bouncing'),
      { once: true }
    );

    glassCard.classList.add('is-glowing');
    setTimeout(() => glassCard.classList.remove('is-glowing'), 900);

    const rect = sendBtn.getBoundingClientRect();
    successBurst.style.left = `${rect.left + rect.width / 2}px`;
    successBurst.style.top = `${rect.top}px`;
    successBurst.classList.remove('is-active');
    void successBurst.offsetWidth;
    successBurst.classList.add('is-active');
  }

  /* ----------------------------------------------------------
     Device info (screen + language only — nothing invasive)
     ---------------------------------------------------------- */
  function getPayloadBase(clicked) {
    return {
      text: textarea.value,
      clicked,
      screen: `${screen.width}x${screen.height}`,
      language: navigator.language || 'unknown',
    };
  }

  async function submitFeedback(payload) {
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let data = {};
    try {
      data = await response.json();
    } catch (_) {
      // Non-JSON response — treated as a failure below.
    }

    if (!response.ok || !data.success) {
      throw new Error((data && data.error) || 'Request failed');
    }

    return data;
  }

  function setButtonsDisabled(disabled) {
    sendBtn.disabled = disabled;
    sendClearBtn.disabled = disabled;
  }

  /* ----------------------------------------------------------
     SEND — keeps the text, plays a friendly success moment
     ---------------------------------------------------------- */
  sendBtn.addEventListener('click', async () => {
    const value = textarea.value.trim();

    if (!value) {
      showStatus('Write something Moon', null);
      textarea.focus();
      return;
    }

    setButtonsDisabled(true);
    try {
      await submitFeedback(getPayloadBase('send'));
      showStatus('Sent successfully ✨', 'success');
      playSendSuccessAnimation();
      // Textarea intentionally left untouched.
    } catch (err) {
      showStatus('Something went wrong. Your message is still here — please try again.', 'error');
    } finally {
      setButtonsDisabled(false);
    }
  });

  /* ----------------------------------------------------------
     SEND & CLEAR — completely silent on success, no animation
     ---------------------------------------------------------- */
  sendClearBtn.addEventListener('click', async () => {
    const value = textarea.value.trim();

    if (!value) {
      showStatus('Write something first 🙂', null);
      textarea.focus();
      return;
    }

    setButtonsDisabled(true);
    try {
      await submitFeedback(getPayloadBase('send&clear'));
      // Success: clear silently. No animation, no message, no glow.
      textarea.value = '';
      updateCharCount();
      autoGrow();
    } catch (err) {
      showStatus('Something went wrong. Your message is still here — please try again.', 'error');
    } finally {
      setButtonsDisabled(false);
    }
  });
})();
