/* Theme switching.

   Two halves, deliberately split:

   1. applyStoredTheme() runs inline in <head>, before the browser has painted
      anything. If it ran later — deferred, or on DOMContentLoaded — a visitor
      whose OS is light but who chose dark would get a white flash first. That
      is the whole reason this cannot be an external deferred script.

   2. The rest wires up the buttons and runs after the DOM exists.

   No stored preference means no data-theme attribute at all, which is what lets
   the CSS fall through to prefers-color-scheme. "Follow the OS" is the absence
   of a choice rather than a third stored value, so a visitor who never touches
   the switch keeps tracking their system for as long as they use the site. */

(function () {
  var KEY = 'theme';

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'dark' || v === 'light' ? v : null;
    } catch (e) {
      /* Safari in private mode throws on localStorage rather than returning
         null, and a themed site is not worth a broken page. */
      return null;
    }
  }

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function active() {
    return stored() || (systemPrefersDark() ? 'dark' : 'light');
  }

  window.__applyStoredTheme = function () {
    var v = stored();
    if (v) document.documentElement.setAttribute('data-theme', v);
  };

  function label(next) {
    return 'Switch to ' + next + ' theme';
  }

  function sync() {
    var next = active() === 'dark' ? 'light' : 'dark';
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-label', label(next));
      buttons[i].setAttribute('title', label(next));
    }
  }

  window.__initThemeToggle = function () {
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].hidden = false; /* rendered hidden: only reveal it if it works */
      buttons[i].addEventListener('click', function () {
        var next = active() === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try {
          localStorage.setItem(KEY, next);
        } catch (e) {}
        sync();
      });
    }
    sync();

    /* Someone who never chose keeps following the OS, including when it flips
       at sunset mid-visit. Anyone who did choose is left alone. */
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () {
        if (!stored()) sync();
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  };
})();
