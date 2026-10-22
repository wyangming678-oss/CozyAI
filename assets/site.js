(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- mobile nav ---------- */
  var menuBtn = $('#menuBtn');
  var mobileNav = $('#mobileNav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      var open = mobileNav.hidden;
      mobileNav.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    $$('a', mobileNav).forEach(function (a) {
      a.addEventListener('click', function () {
        mobileNav.hidden = true;
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- topbar: shrink + progress + active link ---------- */
  var topbar = $('#topbar');
  var scrollBar = $('#scrollBar');
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (topbar) topbar.classList.toggle('is-stuck', y > 12);
    if (scrollBar) scrollBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var navMap = {};
  $$('#navLinks a').forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    var el = document.getElementById(id);
    if (el) navMap[el.id] = a;
  });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var link = navMap[e.target.id];
        if (!link) return;
        if (e.isIntersecting) {
          $$('#navLinks a').forEach(function (a) { a.classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(navMap).forEach(function (id) { spy.observe(document.getElementById(id)); });
  }

  /* ---------- scroll reveal ---------- */
  var revealables = $$('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, i) {
        if (!e.isIntersecting) return;
        e.target.style.transitionDelay = (i % 3) * 90 + 'ms';
        e.target.classList.add('is-in');
        ro.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    revealables.forEach(function (el) { ro.observe(el); });
  }

  /* ---------- count up ---------- */
  var nums = $$('[data-count]');
  function runCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (reduceMotion || target === 0) { el.textContent = String(target); return; }
    var start = performance.now();
    (function step(now) {
      var t = Math.min((now - start) / 900, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }
  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        runCount(e.target);
        co.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { co.observe(el); });
  } else {
    nums.forEach(runCount);
  }

  /* ---------- product shots: one swipeable slide at a time ---------- */
  var shotSwiped = false;
  (function () {
    var box = $('.shots');
    var track = $('.shots-track', box);
    var ctl = $('.shots-ctl', box);
    var figs = track ? $$('.shot', track) : [];
    if (!box || !track || !ctl || figs.length < 2) {
      if (ctl) ctl.hidden = true;
      return;
    }
    box.classList.add('is-carousel');
    ctl.hidden = false;
    figs.forEach(function (f) {
      f.classList.add('is-in');
      var im = $('img', f);
      if (im) im.loading = 'eager';
    });
    var dotsBox = $('.shots-dots', ctl);
    var prev = $('.shot-nav.is-prev', ctl);
    var next = $('.shot-nav.is-next', ctl);
    var shot = 0;
    var resizeTimer = 0;
    var dots = figs.map(function (f, i) {
      var cap = $('figcaption', f);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'shot-dot';
      b.setAttribute('aria-label', '看第 ' + (i + 1) + ' 张' + (cap ? '：' + cap.textContent : ''));
      b.addEventListener('click', function () { goTo(i); });
      dotsBox.appendChild(b);
      return b;
    });
    function page() { return track.clientWidth || 1; }
    function at() {
      return Math.max(0, Math.min(figs.length - 1, Math.round(track.scrollLeft / page())));
    }
    function paint(idx) {
      var shown = idx === undefined ? at() : idx;
      dots.forEach(function (d, i) {
        d.classList.toggle('is-on', i === shown);
        d.setAttribute('aria-current', i === shown ? 'true' : 'false');
      });
      prev.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= track.scrollWidth - page() - 1;
    }
    function goTo(i) {
      shot = Math.max(0, Math.min(figs.length - 1, i));
      if (track.scrollTo) track.scrollTo({ left: shot * page(), behavior: reduceMotion ? 'auto' : 'smooth' });
      else track.scrollLeft = shot * page();
      paint(shot);
    }
    prev.addEventListener('click', function () { goTo(shot - 1); });
    next.addEventListener('click', function () { goTo(shot + 1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(shot - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(shot + 1); }
    });
    track.addEventListener('scroll', function () {
      shot = at();
      paint(shot);
    }, { passive: true });
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (!dragging) track.scrollLeft = shot * page();
        paint(shot);
      }, 200);
    });

    var dragging = false;
    var dragX = 0;
    var dragLeft = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      shotSwiped = false;
      dragX = e.clientX;
      dragLeft = track.scrollLeft;
      track.classList.add('is-drag');
    });
    track.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - dragX;
      if (!shotSwiped && Math.abs(dx) < 6) return;
      shotSwiped = true;
      track.scrollLeft = dragLeft - dx;
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-drag');
      goTo(at());
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    paint();
  })();

  /* ---------- product shots: use file when present ---------- */
  $$('.shot-slot').forEach(function (slot) {
    var img = $('img', slot);
    var src = slot.getAttribute('data-shot');
    if (!img || !src) return;
    img.addEventListener('load', function () {
      slot.classList.add('has-img');
      slot.setAttribute('tabindex', '0');
      slot.setAttribute('role', 'button');
      slot.setAttribute('aria-label', '放大查看：' + (slot.parentNode.querySelector('figcaption') || {}).textContent);
    });
    img.addEventListener('error', function () {
      slot.classList.remove('has-img');
      slot.removeAttribute('tabindex');
      slot.removeAttribute('role');
      img.removeAttribute('src');
    });
    img.src = src;
  });

  /* ---------- marquee: fill the row, then duplicate it for a seamless loop ---------- */
  var mqTracks = $$('.mq-track');
  function buildMarquee() {
    mqTracks.forEach(function (track) {
      var half = $('.mq-half', track);
      if (!half) return;
      if (track.getAttribute('data-built') === '1') {
        track.removeChild(track.lastElementChild);
      }
      var items = $$('.mq-item', half);
      half.innerHTML = items.slice(0, 4).map(function (n) { return n.outerHTML; }).join('');
      var guard = 0;
      while (half.getBoundingClientRect().width < window.innerWidth * 1.15 && guard < 20 && items.length) {
        half.insertAdjacentHTML('beforeend', items[guard % 4].outerHTML);
        guard++;
      }
      track.setAttribute('data-built', '1');
      var clone = half.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  }
  if (mqTracks.length) {
    buildMarquee();
    var mqTimer = 0, mqWidth = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === mqWidth) return;
      mqWidth = window.innerWidth;
      clearTimeout(mqTimer);
      mqTimer = setTimeout(buildMarquee, 260);
    });
  }

  /* ---------- hero canvas: two depth layers + pointer parallax ---------- */
  var canvas = $('#heroFx');
  var hero = $('.hero');
  var winEl = $('.hero .window');
  if (canvas && hero && !reduceMotion) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, far = [], near = [], pointer = null, raf = 0, visible = true;
    var sx = 0, sy = 0, scrollLift = 0;

    function makeNode(speed, minR, maxR) {
      return {
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed,
        r: Math.random() * (maxR - minR) + minR,
        p: Math.random() * Math.PI * 2
      };
    }

    function resize() {
      var r = hero.getBoundingClientRect();
      w = Math.max(r.width, 1);
      h = Math.max(r.height, 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var total = w < 620 ? 24 : w < 1000 ? 42 : 62;
      var nf = Math.round(total * 0.45);
      far = []; near = [];
      for (var i = 0; i < nf; i++) far.push(makeNode(0.1, 0.5, 1.3));
      for (var j = nf; j < total; j++) near.push(makeNode(0.24, 1.1, 2.7));
    }

    function drift(list, linkDist, k, t) {
      var ox = sx * 26 * k, oy = sy * 18 * k;
      var lp = pointer ? { x: pointer.x - ox, y: pointer.y - oy } : null;
      ctx.save();
      ctx.translate(ox, oy);
      for (var i = 0; i < list.length; i++) {
        var n = list[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        if (linkDist) {
          for (var j = i + 1; j < list.length; j++) {
            var m = list[j];
            var dx = n.x - m.x, dy = n.y - m.y;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < linkDist) {
              ctx.strokeStyle = 'rgba(46,204,113,' + (0.17 * (1 - d / linkDist)).toFixed(3) + ')';
              ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
            }
          }
        }
        if (lp && linkDist) {
          var pdx = n.x - lp.x, pdy = n.y - lp.y;
          var pd = Math.sqrt(pdx * pdx + pdy * pdy);
          if (pd < 190) {
            ctx.strokeStyle = 'rgba(22,140,72,' + (0.4 * (1 - pd / 190)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(lp.x, lp.y); ctx.stroke();
            n.x -= pdx / pd * 0.3;
            n.y -= pdy / pd * 0.3;
          }
        }
        ctx.fillStyle = 'rgba(46,204,113,' + (linkDist ? 0.5 : 0.2 + 0.16 * Math.sin(t * 0.0012 + n.p)).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      var tx = pointer ? pointer.x / w - 0.5 : 0;
      var ty = pointer ? pointer.y / h - 0.5 : 0;
      sx += (tx - sx) * 0.05;
      sy += (ty - sy) * 0.05;
      drift(far, 0, 0.35, t);
      drift(near, w < 620 ? 96 : 128, 1, t);
      if (winEl) {
        winEl.style.transform = 'translate3d(' + (-sx * 16).toFixed(2) + 'px,' +
          (-sy * 12 - scrollLift).toFixed(2) + 'px,0)';
      }
      raf = requestAnimationFrame(frame);
    }

    function play() { if (!raf && visible) raf = requestAnimationFrame(frame); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    resize();
    play();
    window.addEventListener('resize', function () { stop(); resize(); play(); });
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    hero.addEventListener('pointerleave', function () { pointer = null; });
    window.addEventListener('scroll', function () {
      scrollLift = Math.min(window.pageYOffset || 0, h) / h * 22;
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) play(); else stop();
      }, { threshold: 0.02 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else play();
    });
  }

  /* ---------- hero scripted conversation ---------- */
  var heroThread = $('.hero .thread');
  var script = [
    ['Do you have the 220V version? Shipping to Brazil takes how long?',
     '有 220V 的版本吗？发到巴西要多久？',
     'Yes, 220V is available. Shipping to Brazil takes 8-12 days.',
     '有 220V 的版本。发巴西 8 到 12 天。'],
    ['The last batch had a label issue. Please check before dispatch.',
     '上一批标签有问题，发货前请帮我检查一下。',
     'Noted. I will check every label before dispatch.',
     '收到，发货前我逐个核对标签。'],
    ['Can you send me the tracking number today?',
     '今天能把单号发我吗？',
     'Sure. The tracking number will be sent this afternoon.',
     '可以，单号今天下午发你。']
  ];
  if (heroThread) {
    var scene = 0;
    function paint(i) {
      var s = script[i % script.length];
      heroThread.innerHTML =
        '<div class="bubble in" data-anim><p class="orig">' + s[0] + '</p><p class="trans">' + s[1] + '</p></div>' +
        '<div class="bubble out" data-anim><p class="trans">' + s[2] + '</p><p class="orig">' + s[3] + '</p></div>';
      var kids = $$('.bubble', heroThread);
      kids.forEach(function (b, k) {
        if (reduceMotion) { b.classList.add('is-in'); return; }
        setTimeout(function () { b.classList.add('is-in'); }, 160 + k * 620);
      });
    }
    paint(scene);
    if (!reduceMotion) {
      setInterval(function () { scene++; paint(scene); }, 6600);
    }
  }

  /* ---------- demo stage: a fixed script that plays itself, no network ---------- */
  var PLATS = {
    whatsapp: {
      label: 'WhatsApp',
      land: '译文写进 WhatsApp 自己的输入框',
      list: ['WhatsApp 网页版托管在 Cozy AI 的窗口里', '每个账号一个独立登录分区', '译文进它自己的输入框，可改可核对']
    },
    telegram: {
      label: 'Telegram',
      land: '译文写进 Telegram 自己的输入框',
      list: ['Telegram 网页版，同一个窗口同一个位置', '扫码登录后会话留在本机分区', '译文进它自己的输入框，可改可核对']
    },
    teams: {
      label: 'Teams',
      land: '译文写进 Teams 自己的输入框',
      list: ['官方网页版，企业账号照常登录', '富文本输入框按它自己的方式写入', '还能接着编辑，发送由你按']
    },
    signal: {
      label: 'Signal',
      clip: true,
      land: 'Signal 不给注入：译文进剪贴板',
      list: ['Signal 是独立桌面实例，不在我们的窗口里', '封闭程序注入不进去，译文只能进剪贴板', '粘贴和发送都是你自己手动——这点我们不藏']
    }
  };

  var SCENES = [
    {
      in: ['Is the black one still in stock? I need 3 pcs before Friday.',
           '黑色的还有现货吗？我周五前要 3 件。'],
      out: ['有，现货 12 件，明天上午发货。',
            'Yes, 12 in stock. I will ship tomorrow morning.'],
      cut: ['好的亲，明天一定给您发～']
    },
    {
      in: ['O lote anterior veio com a etiqueta errada. Confira antes do envio, por favor.',
           '上一批标签错了，发货前请核对。'],
      out: ['收到，发货前我逐个核对标签再拍照给你。',
            'Certo. Vou conferir cada etiqueta antes do envio e te mandar fotos.'],
      cut: ['这个我们要另外收 3 美元贴标费哦。']
    },
    {
      in: ['Can you send me the tracking number today?',
           '今天能把单号发我吗？'],
      out: ['可以，单号今天下午发你，专线 8 到 12 天到。',
            'Sure. I will send the tracking number this afternoon. It takes 8-12 days.'],
      cut: ['亲稍等一下哈，我查查看。']
    }
  ];

  var stage = $('#stage');
  if (stage) {
    var threadEl = $('#demoThread');
    var composerEl = $('#composer');
    var composerText = $('#composerText');
    var caretEl = $('#caret');
    var noteEl = $('#composerNote');
    var switchEl = $('#demoSwitch');
    var platName = $('#platName');
    var landTitle = $('#landTitle');
    var landList = $('#landList');
    var tabs = $$('#stageTabs .tab');
    var plat = 'whatsapp';
    var sceneIndex = 0;
    var queue = [];
    var clock = 0;
    var paused = false;
    var offscreen = false;

    function schedule(at, fn) {
      var i = 0;
      while (i < queue.length && queue[i].at <= at) i++;
      queue.splice(i, 0, { at: at, fn: fn });
    }

    function setNote(text, kind) {
      noteEl.textContent = text;
      noteEl.className = 'composer-note' + (kind ? ' is-' + kind : '');
    }

    function clearThread() {
      threadEl.innerHTML = '';
    }

    function trim() {
      while (threadEl.children.length > 5) threadEl.removeChild(threadEl.firstChild);
      threadEl.scrollTop = threadEl.scrollHeight;
    }

    function addBubble(kind) {
      var b = document.createElement('div');
      b.className = 'bubble ' + kind;
      b.setAttribute('data-anim', '');
      threadEl.appendChild(b);
      schedule(clock + 40, function () { b.classList.add('is-in'); });
      trim();
      return b;
    }

    function typeInto(el, text, perStep, stepMs, done) {
      var i = 0;
      (function step() {
        i += perStep;
        el.textContent = text.slice(0, i);
        threadEl.scrollTop = threadEl.scrollHeight;
        if (i < text.length) schedule(clock + stepMs, step);
        else if (done) done();
      })();
    }

    function composeClasses(extra) {
      composerEl.className = 'composer' + (extra ? ' ' + extra : '');
    }

    function halt() {
      composeClasses('');
      composerText.textContent = '';
      caretEl.className = 'caret is-off';
      switchEl.className = 'switch';
    }

    function defaultNote(p) {
      return p.clip ? 'Signal：这句译文进剪贴板，不碰它的输入框' : '演示台词写死：外语进来变中文，中文出去变外语';
    }

    function beatIncoming(s) {
      halt();
      var dots = document.createElement('div');
      dots.className = 'typing';
      dots.innerHTML = '<i></i><i></i><i></i>';
      threadEl.appendChild(dots);
      schedule(clock + 700, function () {
        if (dots.parentNode) dots.parentNode.removeChild(dots);
        var b = addBubble('in');
        b.innerHTML = '<p class="orig"></p><p class="trans"></p>';
        $('p.orig', b).textContent = s.in[0];
        $('p.trans', b).textContent = s.in[1];
      });
      schedule(clock + 1500, function () {
        var b2 = addBubble('out');
        b2.innerHTML = '<p class="trans is-pending"></p><p class="orig"></p>';
        $('p.orig', b2).textContent = s.out[0];
        schedule(clock + 420, function () { replyInto(b2, s); });
      });
    }

    function replyInto(bubbleEl, s) {
      var p = PLATS[plat];
      if (p.clip) {
        composeClasses('is-clip');
        composerText.textContent = s.out[1];
        var tr = $('p.trans', bubbleEl);
        tr.classList.remove('is-pending');
        tr.textContent = s.out[1];
        setNote('已复制到剪贴板 · 在 Signal 窗口里自己 Ctrl+V', 'ok');
        schedule(clock + 1600, beatGuard);
        return;
      }
      composeClasses('is-active');
      caretEl.className = 'caret';
      typeInto(composerText, s.out[1], 2, 26, function () {
        caretEl.className = 'caret is-off';
        var tr = $('p.trans', bubbleEl);
        tr.classList.remove('is-pending');
        tr.textContent = s.out[1];
        setNote('译文已在 ' + p.label + ' 的输入框里 · 可改可核对，发送由你按', 'ok');
        schedule(clock + 1200, beatGuard);
      });
    }

    function beatGuard() {
      var s = SCENES[sceneIndex % SCENES.length];
      var p = PLATS[plat];
      composeClasses('');
      composerText.textContent = '';
      caretEl.className = 'caret is-off';
      if (p.clip) {
        setNote('它的发送键在我们够不到的地方 · 粘贴前自己看一眼', 'warn');
        schedule(clock + 1800, beatReset);
        return;
      }
      switchEl.className = 'switch is-on';
      setNote('开关已打开：输入框里还有中文字，就不许发出', '');
      schedule(clock + 700, function () {
        composeClasses('is-active');
        caretEl.className = 'caret';
        typeInto(composerText, s.cut[0], 1, 92, function () {
          caretEl.className = 'caret is-off';
          composeClasses('is-cut');
          setNote('已拦下 · 这句里有中文，没有发出去', 'warn');
          schedule(clock + 1700, beatReset);
        });
      });
    }

    function beatReset() {
      halt();
      setNote(defaultNote(PLATS[plat]), '');
      schedule(clock + 700, function () {
        sceneIndex++;
        clearThread();
        beatIncoming(SCENES[sceneIndex % SCENES.length]);
      });
    }

    function reset() {
      queue = [];
      clock = 0;
    }

    function setSide() {
      var p = PLATS[plat];
      platName.textContent = p.label;
      landTitle.textContent = p.land;
      landList.innerHTML = p.list.map(function (t) { return '<li>' + t + '</li>'; }).join('');
      setNote(defaultNote(p), '');
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var next = tab.getAttribute('data-plat');
        if (next === plat) return;
        tabs.forEach(function (t) { t.classList.toggle('is-on', t === tab); });
        plat = next;
        setSide();
        reset();
        clearThread();
        beatIncoming(SCENES[sceneIndex % SCENES.length]);
      });
    });

    stage.addEventListener('mouseenter', function () { paused = true; });
    stage.addEventListener('mouseleave', function () { paused = false; });

    if ('IntersectionObserver' in window) {
      var so = new IntersectionObserver(function (entries) {
        offscreen = !entries[0].isIntersecting;
      }, { threshold: 0.05 });
      so.observe(stage);
    }

    if (reduceMotion) {
      var staticScene = SCENES[0];
      threadEl.innerHTML =
        '<div class="bubble in is-in"><p class="orig">' + staticScene.in[0] + '</p><p class="trans">' + staticScene.in[1] + '</p></div>' +
        '<div class="bubble out is-in"><p class="trans">' + staticScene.out[1] + '</p><p class="orig">' + staticScene.out[0] + '</p></div>';
      composerText.textContent = staticScene.out[1];
      caretEl.className = 'caret is-off';
    } else {
      setInterval(function () {
        if (paused || offscreen || document.hidden) return;
        clock += 40;
        while (queue.length && queue[0].at <= clock) {
          queue.shift().fn();
        }
      }, 40);
      setSide();
      clearThread();
      beatIncoming(SCENES[0]);
    }
    setSide();
  }

  /* ---------- intro curtain ---------- */
  var intro = $('#intro');
  if (intro) {
    if (reduceMotion) {
      intro.parentNode.removeChild(intro);
    } else {
      var killIntro = function () {
        if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
      };
      setTimeout(killIntro, 1900);
      ['pointerdown', 'keydown', 'wheel'].forEach(function (type) {
        window.addEventListener(type, killIntro, { passive: true, once: true });
      });
    }
  }

  /* ---------- hero rail cycling ---------- */
  var rails = $$('.rail .rail-item');
  if (rails.length > 1 && !reduceMotion) {
    var railIndex = 0;
    setInterval(function () {
      rails[railIndex].classList.remove('is-on');
      railIndex = (railIndex + 1) % rails.length;
      rails[railIndex].classList.add('is-on');
    }, 2200);
  }

  /* ---------- lightbox: expand a shot to full screen ---------- */
  var lb = $('#lightbox');
  var lbImg = $('#lbImg');
  var lbClose = $('#lbClose');
  var lbFrom = null;

  function sourceTransform(from) {
    var t = lbImg.getBoundingClientRect();
    var sx2 = t.width ? from.width / t.width : 1;
    var sy2 = t.height ? from.height / t.height : 1;
    return 'translate(' + (from.left - t.left) + 'px,' + (from.top - t.top) + 'px) scale(' + sx2 + ',' + sy2 + ')';
  }

  function openLb(slot) {
    var srcImg = $('img', slot);
    lbFrom = { slot: slot, rect: srcImg.getBoundingClientRect() };
    lbImg.setAttribute('alt', srcImg.getAttribute('alt'));
    lbImg.src = srcImg.getAttribute('src');
    lb.hidden = false;
    lb.classList.remove('is-out');
    document.documentElement.classList.add('lb-on');
    var run = function () {
      lbImg.style.transition = 'none';
      lbImg.style.transform = sourceTransform(lbFrom.rect);
      void lbImg.offsetWidth;
      lbImg.style.transition = '';
      lbImg.style.transform = 'none';
    };
    if (lbImg.complete) run(); else lbImg.onload = run;
    lbClose.focus();
  }

  function detach() {
    lb.hidden = true;
    lb.classList.remove('is-out');
    document.documentElement.classList.remove('lb-on');
    lbImg.removeAttribute('src');
    lbImg.style.transform = '';
    if (lbFrom && lbFrom.slot) lbFrom.slot.focus();
    lbFrom = null;
  }

  function closeLb() {
    if (lb.hidden || !lbFrom) return;
    if (reduceMotion) { detach(); return; }
    lbImg.style.transition = '';
    lbImg.style.transform = sourceTransform(lbFrom.rect);
    lb.classList.add('is-out');
    setTimeout(detach, 420);
  }

  $$('.shot-slot').forEach(function (slot) {
    slot.addEventListener('click', function () {
      if (shotSwiped) { shotSwiped = false; return; }
      if (slot.classList.contains('has-img')) openLb(slot);
    });
    slot.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && slot.classList.contains('has-img')) {
        e.preventDefault();
        openLb(slot);
      }
    });
  });
  if (lb) {
    lb.addEventListener('click', closeLb);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lb.hidden) closeLb();
    });
    window.addEventListener('resize', function () {
      if (!lb.hidden) detach();
    });
  }
})();
