/* TELECHAT MESSAGE SEND ANIMATION V35 */
(() => {
  if (typeof appendMessage !== 'function') return;

  const previousAppendMessageV35 = appendMessage;
  let sendButtonTimerV35 = 0;

  function replayClassV35(element, className) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function animateSendButtonV35() {
    const button = document.querySelector('.send-btn');
    if (!button) return;
    replayClassV35(button, 'send-success-v35');
    clearTimeout(sendButtonTimerV35);
    sendButtonTimerV35 = setTimeout(() => {
      button.classList.remove('send-success-v35');
    }, 520);
  }

  appendMessage = async function(message, doScroll = true) {
    const box = document.getElementById('messages');
    const previousLastMessage = box?.lastElementChild;
    const result = await previousAppendMessageV35(message, doScroll);

    if (!doScroll || !message || message.from_nick !== me?.nick || !box) {
      return result;
    }

    const addedMessage = box.lastElementChild;
    if (!addedMessage || addedMessage === previousLastMessage || !addedMessage.classList?.contains('msg')) {
      return result;
    }

    replayClassV35(addedMessage, 'send-pop-v35');
    addedMessage.addEventListener('animationend', event => {
      if (event.animationName === 'message-send-pop-v35') {
        addedMessage.classList.remove('send-pop-v35');
      }
    }, { once: true });
    animateSendButtonV35();
    return result;
  };
})();
