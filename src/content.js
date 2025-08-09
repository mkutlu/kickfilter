
// Kick Channel Filter - content script (MV3) v1.4.3
// Stronger random-looking username detection.
// Targets patterns like: "jaj7xju4cri44", "oiofwtvbks9ta", "gm8eeh8cq8stn", "dfudpd6zg7fg8"

(function(){
  const STORAGE_KEY = 'blockedChannels';
  const AUTO_KEY = 'autoBlockRandom'; // boolean

  let blocked = new Set();
  let autoBlockRandom = true;

  const LOWER_ALNUM = /^[a-z0-9]+$/;

  function norm(u) { return (u || '').trim().toLowerCase(); }

  function firstPathSegment(pathname) {
    if (!pathname || pathname === '/') return '';
    const seg = pathname.split('/').filter(Boolean)[0] || '';
    const skip = new Set(['category','categories','video','videos','clip','clips','settings','signup','login','search','subscriptions','partner','terms','policies','about','careers','sitemap','blog','community']);
    if (skip.has(seg.toLowerCase())) return '';
    return seg;
  }

  
  function extractUsernameFromHref(href){
    try {
      const u = new URL(href, location.origin);
      let seg = firstPathSegment(u.pathname);
      if (seg) return seg;
      // Fallback: regex scan on pathname for /[a-z0-9]{3,}(/|$)
      const m = u.pathname.match(/\/([a-z0-9]{3,})(?:$|\/)/);
      if (m && m[1]) {
        const s = m[1].toLowerCase();
        const skip = new Set(['category','categories','video','videos','clip','clips','settings','signup','login','search','subscriptions','partner','terms','policies','about','careers','sitemap','blog','community']);
        if (!skip.has(s)) return s;
      }
    } catch(e){}
    return '';
  }

  function classifyName(name){
    const s = norm(name);
    const random = isRandomLooking(s);
    let reason = '';
    if (window.__KICK_FILTER_DEBUG__) {
      try {
        // Recompute signals for logging
        const L = s.length;
        const vowelsCount = (s.match(/[aeiou]/g)||[]).length;
        const vowelRatio  = vowelsCount / (L||1);
        const uniqRatio   = new Set(s).size / (L||1);
        const digitsCount = (s.match(/\d/g)||[]).length;
        reason = `len=${L} vowels=${vowelRatio.toFixed(2)} uniq=${uniqRatio.toFixed(2)} digits=${digitsCount}`;
      } catch(e){}
    }
    return {random, reason};
  }


  function findCardContainer(el) {
    if (!el) return null;
    const candidates = [
      '[data-testid*="card"]',
      '[class*="card"]',
      'article',
      'li',
      '.grid > div',
      '.items-start > div',
      '.channel-card',
      '.relative',
    ];
    for (const sel of candidates) {
      const c = el.closest(sel);
      if (c) return c;
    }
    const fallback = el.closest('a, div');
    if (fallback && !document.body.isSameNode(fallback)) return fallback;
    return null;
  }

  // === Heuristic helpers ===
  function shannonEntropy(s){
    if (!s || !s.length) return 0;
    const map = new Map();
    for (const ch of s) map.set(ch, (map.get(ch)||0)+1);
    let H = 0;
    for (const [,count] of map) {
      const p = count / s.length;
      H -= p * Math.log2(p);
    }
    return H;
  }

  function ngramDiversity(s, n){
    if (!s || s.length < n) return 0;
    const set = new Set();
    for (let i=0;i<=s.length-n;i++) set.add(s.slice(i,i+n));
    const denom = s.length - n + 1;
    return denom <= 0 ? 0 : set.size / denom; // 0..1
  }

  function maxConsonantRun(s){
    let maxRun = 0, cur = 0;
    for (const ch of s) {
      if (/[bcdfghjklmnpqrstvwxyz]/.test(ch)) { cur++; if (cur > maxRun) maxRun = cur; }
      else { cur = 0; }
    }
    return maxRun;
  }

  function containsDictChunk(s){
    const words = ['game','play','live','tv','music','news','sport','crypto','tech','desk','shop','store','stream','radio','girls','boys','cat','dog','fun','best','pro','king','queen','boss','john','smith','gaming','official','club','team','studio','media','tv','radio'];
    s = s.toLowerCase();
    return words.some(w => s.includes(w));
  }

  function digitStats(s){
    const m = s.match(/\d/g) || [];
    const count = m.length;
    // Count separated groups of digits
    let groups = 0, inGroup = false;
    for (const ch of s) {
      if (/\d/.test(ch)) { if (!inGroup) { groups++; inGroup = true; } }
      else { inGroup = false; }
    }
    // Alternation score: how mixed letters/digits are
    let transitions = 0;
    for (let i=1;i<s.length;i++){
      const a = /\d/.test(s[i-1]);
      const b = /\d/.test(s[i]);
      if (a !== b) transitions++;
    }
    const alternation = transitions / (s.length - 1);
    return {count, groups, alternation};
  }

  function isAlphaNumLower(s){ return LOWER_ALNUM.test(s); }

  // Core: decide whether a username looks random/spammy
  function isRandomLooking(name){
    const s = norm(name);
    const L = s.length;
    if (L < 12) return false;
    if (!/^[a-z0-9]+$/.test(s)) return false;
    if (containsDictChunk(s)) return false;

    const letters = (s.match(/[a-z]/g)||[]).length;
    const digitsCount = (s.match(/\d/g)||[]).length;
    const hasDigits = digitsCount > 0;

    const vowelsCount = (s.match(/[aeiou]/g)||[]).length;
    const vowelRatio  = vowelsCount / L;
    const uniqRatio   = new Set(s).size / L;

    const entropy = shannonEntropy(s);
    const biDiv   = ngramDiversity(s, 2);
    const triDiv  = ngramDiversity(s, 3);

    let maxConsRun = 0, cur = 0;
    for (const ch of s){
      if (/[bcdfghjklmnpqrstvwxyz]/.test(ch)){ cur++; if (cur>maxConsRun) maxConsRun = cur; }
      else { cur = 0; }
    }

    if (/^[a-z]{5,}\d{1,4}$/.test(s)) return false;

    // Branch A: letter-only random strings
    if (!hasDigits){
      const baselineLetters = (entropy >= 3.2) && (uniqRatio >= 0.60) && (biDiv >= 0.70) && (triDiv >= 0.52);
      const consonantHeavy  = (maxConsRun >= 4) && (vowelRatio <= 0.30);
      return baselineLetters && consonantHeavy;
    }

    // Branch B: mixed letters+digits
    const letterRatio = letters / L;

    let digitGroups = 0, inGroup = false, transitions = 0;
    for (let i=0;i<L;i++){
      const isD = /\d/.test(s[i]);
      if (isD && !inGroup){ digitGroups++; inGroup = true; }
      if (!isD && inGroup){ inGroup = false; }
      if (i>0){
        const prevD = /\d/.test(s[i-1]);
        if (prevD !== isD) transitions++;
      }
    }
    const alternation = transitions / Math.max(1, L-1);

    const baselineMixed = (entropy >= 2.9) && (uniqRatio >= 0.56) && (biDiv >= 0.58) && (triDiv >= 0.48);
    const balancedMix   = (letterRatio >= 0.30 && letterRatio <= 0.95);

    const multiGroups = digitGroups >= 2;
    const tailDigits  = /\d{2,}$/.test(s);
    const strongAlt   = alternation >= 0.22;
    const consonantHeavyMixed = (maxConsRun >= 5 && vowelRatio <= 0.30);

    // NEW: letter-dominant with a single digit but consonant-heavy and high entropy
    const oneDigitConsonant = (digitsCount === 1 && maxConsRun >= 5 && vowelRatio <= 0.35 && entropy >= 3.0 && uniqRatio >= 0.65);

    return baselineMixed && (balancedMix || oneDigitConsonant) && (multiGroups || tailDigits || strongAlt || consonantHeavyMixed || oneDigitConsonant);
  }

  function shouldHideCandidate(candidate){
    if (!candidate) return false;
    if (blocked.has(candidate)) return true;
    if (autoBlockRandom && isRandomLooking(candidate)) return true;
    return false;
  }

  function hideIfBlocked(anchor) {
    try {
      const candidate = norm(extractUsernameFromHref(anchor.href));
      if (!candidate) return;
      if (shouldHideCandidate(candidate)) {
        const container = findCardContainer(anchor);
        if (container && container.style.display !== 'none') {
          container.style.display = 'none';
          container.setAttribute('data-kick-filter-hidden', '1');
          container.setAttribute('data-kick-filter-reason', blocked.has(candidate) ? 'manual' : 'auto');
        }
      }
    } catch (e) {}
  }

  function sweep() {
    document.querySelectorAll('a[href]').forEach(hideIfBlocked);
  }

  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (!(n instanceof Element)) continue;
        const as = n.querySelectorAll ? n.querySelectorAll('a[href]') : [];
        as.forEach(hideIfBlocked);
        if (n.matches && n.matches('a[href]')) hideIfBlocked(n);
      }
    }
  });

  function startObserver(){
    mo.observe(document.documentElement || document.body, {childList:true, subtree:true});
  }

  function hookHistory() {
    const wrap = (fn) => function() {
      const ret = fn.apply(this, arguments);
      setTimeout(sweep, 50);
      return ret;
    };
    try {
      history.pushState = wrap(history.pushState);
      history.replaceState = wrap(history.replaceState);
      window.addEventListener('popstate', () => setTimeout(sweep, 50));
    } catch (e) {}
  }

  function loadState(cb){
    // Ensure default true if not set
    chrome.storage.sync.get({[AUTO_KEY]: true}, (res0) => {
      if (typeof res0[AUTO_KEY] === 'undefined') {
        chrome.storage.sync.set({[AUTO_KEY]: true});
      }
    });
    chrome.storage.sync.get({[STORAGE_KEY]: [], [AUTO_KEY]: true}, (res)=>{
      blocked = new Set((res[STORAGE_KEY] || []).map(norm).filter(Boolean));
      autoBlockRandom = !!res[AUTO_KEY];
      cb && cb();
    });
  }

  chrome.storage.onChanged.addListener((changes, area)=>{
    if (area !== 'sync') return;
    if (changes[STORAGE_KEY] || changes[AUTO_KEY]) {
      if (changes[STORAGE_KEY]) {
        const list = changes[STORAGE_KEY].newValue || [];
        blocked = new Set(list.map(norm).filter(Boolean));
      }
      if (changes[AUTO_KEY]) {
        autoBlockRandom = !!changes[AUTO_KEY].newValue;
      }
      document.querySelectorAll('[data-kick-filter-hidden="1"]').forEach(el=>{
        el.style.display = '';
        el.removeAttribute('data-kick-filter-hidden');
        el.removeAttribute('data-kick-filter-reason');
      });
      sweep();
    }
  });

  hookHistory();
  loadState(() => {
    sweep();
    startObserver();
  });
})();


try { chrome.runtime.onMessage.addListener((msg)=>{ if(msg && msg.type==='kick-filter-sweep'){ try{ sweep(); }catch(e){} } }); } catch(e){}
