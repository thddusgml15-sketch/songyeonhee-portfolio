// '움직임 줄이기'를 켰는지, 애니메이션 도구(GSAP)가 잘 불러와졌는지 확인
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasGsap = typeof window.gsap !== "undefined";
const canAnimate = !reduceMotion && hasGsap;

if (!canAnimate) {
  document.documentElement.classList.remove("will-animate");
}

// ===== 휴대폰 메뉴 열기/닫기 =====
const toggle = document.querySelector(".nav__toggle");
const menu = document.querySelector(".nav__menu");
const links = document.querySelectorAll(".nav__menu a");
const nav = document.querySelector(".nav");

function closeMenu() {
  menu.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "메뉴";
}

toggle.addEventListener("click", () => {
  const open = menu.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", open);
  toggle.textContent = open ? "닫기" : "메뉴";
});

// ===== Lenis 부드러운 스크롤 =====
let lenis = null;

if (!reduceMotion && typeof window.Lenis !== "undefined") {
  lenis = new Lenis({ duration: 1.1 });

  if (hasGsap) {
    if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
}

// 메뉴·버튼을 누르면 해당 섹션으로 부드럽게 이동 (위에 붙은 메뉴 높이만큼 비켜서)
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;

    closeMenu();

    if (lenis) {
      event.preventDefault();
      // 떠 있는 메뉴바(위 여백 + 높이) 아래로 살짝 여유를 두고 멈춤 (CSS scroll-margin-top과 같은 위치)
      const navTop = parseFloat(getComputedStyle(nav).top) || 0;
      lenis.scrollTo(target, { offset: -(navTop + nav.offsetHeight + 16) });
    }
    // Lenis가 없으면 CSS의 scroll-behavior와 scroll-margin-top이 처리
  });
});

// ===== 지금 보고 있는 섹션의 메뉴 표시 =====
const sections = document.querySelectorAll("main section[id]");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: "-40% 0px -55% 0px" }
);

sections.forEach((section) => observer.observe(section));

// ===== 관심 분야 카드: 마우스가 없는 기기(휴대폰)에서는 눌러서 뒤집기 =====
const canHover = window.matchMedia("(hover: hover)").matches;

document.querySelectorAll(".field").forEach((card) => {
  card.addEventListener("click", () => {
    if (!canHover) card.classList.toggle("is-flipped");
  });
});

// ===== 묻고 답하기: 한 번에 하나만 열기 =====
const faqButtons = document.querySelectorAll(".faq__q button");

faqButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const willOpen = button.getAttribute("aria-expanded") !== "true";

    faqButtons.forEach((other) => {
      const open = other === button && willOpen;
      other.setAttribute("aria-expanded", open);
      document.getElementById(other.getAttribute("aria-controls")).classList.toggle("is-open", open);
    });
  });
});

// ===== TMI 뽑기 기계 =====
if (document.querySelector("#tmi")) initTmi();

function initTmi() {
  const facts = Array.from(document.querySelectorAll(".tmi__facts li")).map((li, i) => ({
    no: i + 1,
    text: li.textContent.trim(),
  }));

  const handle = document.querySelector("#tmi-handle");
  const balls = document.querySelectorAll(".tmi-ball");
  const capsule = document.querySelector("#tmi-capsule");
  const capsuleTop = capsule.querySelector(".tmi-capsule__top");
  const capsuleBottom = capsule.querySelector(".tmi-capsule__bottom");
  const capsuleColor = capsule.querySelector(".tmi-capsule__color");
  const note = document.querySelector(".tmi-note");
  const noteNo = note.querySelector(".tmi-note__no");
  const noteText = note.querySelector(".tmi-note__text");
  const countNum = document.querySelector(".tmi__num");
  const barFill = document.querySelector(".tmi__bar-fill");
  const done = document.querySelector(".tmi__done");

  document.querySelector(".tmi__total").textContent = facts.length;

  const CAPSULE_COLORS = ["#ffe7a6", "#b9d4ff", "#ffc2b3"];
  const seen = new Set();
  let bag = [];
  let last = null;
  let busy = false;

  // 주머니 방식: 모두 한 번씩 나온 뒤 다시 섞고, 같은 TMI가 연달아 나오지 않게
  function nextFact() {
    if (bag.length === 0) {
      bag = facts.slice();
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      // 다음에 꺼낼 것(맨 끝)이 방금 본 것이면 맨 앞과 바꾸기
      if (bag.length > 1 && bag[bag.length - 1] === last) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
    }
    last = bag.pop();
    return last;
  }

  function showNote(fact) {
    note.classList.remove("is-empty");
    noteNo.textContent = `TMI #${fact.no}`;
    noteText.textContent = fact.text;

    const wasComplete = seen.size === facts.length;
    seen.add(fact.no);
    countNum.textContent = seen.size;
    barFill.style.width = `${(seen.size / facts.length) * 100}%`;

    if (!wasComplete && seen.size === facts.length) celebrate();
  }

  function celebrate() {
    done.hidden = false;
    if (!canAnimate) return;

    gsap.from(done, { scale: 0, rotation: -20, duration: 0.7, ease: "back.out(2.5)" });

    if (typeof window.confetti === "function") {
      const colors = ["#7ea6ff", "#ff9f85", "#6fd3b0", "#b9d4ff", "#ffd3c2", "#c8f1e1"];
      confetti({ particleCount: 140, spread: 100, startVelocity: 48, origin: { x: 0.5, y: 0.55 }, colors });
      setTimeout(() => {
        confetti({ particleCount: 70, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
        confetti({ particleCount: 70, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
      }, 250);
    }
  }

  function pull() {
    if (busy) return;
    const fact = nextFact();

    // 움직임 줄이기: 바로 쪽지만 보여 주기
    if (!canAnimate) {
      showNote(fact);
      return;
    }

    busy = true;
    capsuleColor.setAttribute("fill", gsap.utils.random(CAPSULE_COLORS));
    const random = gsap.utils.random;

    const tl = gsap.timeline({ onComplete: () => (busy = false) });

    // 지난 쪽지·캡슐 치우기
    tl.to(note, { autoAlpha: 0, duration: 0.2 }, 0)
      .to(capsule, { opacity: 0, duration: 0.2 }, 0)
      .set(capsuleTop, { x: 0, y: 0, rotation: 0, transformOrigin: "50% 100%" })
      .set(capsuleBottom, { x: 0, y: 0, rotation: 0, transformOrigin: "50% 0%" });

    // 1) 손잡이가 한 바퀴
    tl.to(handle, { rotation: "+=360", svgOrigin: "150 286", duration: 0.8, ease: "back.inOut(1.4)" }, 0);

    // 2) 돔 안 캡슐들이 달그락달그락
    tl.to(
      balls,
      {
        x: () => `+=${random(-7, 7)}`,
        y: () => `+=${random(-9, 3)}`,
        rotation: () => `+=${random(-30, 30)}`,
        duration: 0.08,
        repeat: 5,
        yoyo: true,
        ease: "sine.inOut",
        stagger: { amount: 0.12 },
      },
      0.35
    );

    // 3) 캡슐 하나가 구멍에서 통통 튀어 나오기
    tl.set(capsule, { x: 150, y: 350, scale: 0.4, rotation: 0, opacity: 1, transformOrigin: "50% 50%" }, ">")
      .to(capsule, { y: 396, scale: 1, duration: 0.9, ease: "bounce.out" })
      .to(capsule, { x: 150 + random(-24, 24), rotation: random(-30, 30), duration: 0.9, ease: "power2.out" }, "<");

    // 4) 반으로 열리기
    tl.to(capsuleTop, { y: -26, x: -8, rotation: -42, duration: 0.4, ease: "back.out(2.2)" }, "+=0.1")
      .to(capsuleBottom, { y: 4, rotation: 10, duration: 0.3, ease: "power2.out" }, "<");

    // 5) 쪽지가 위에서부터 펼쳐지기
    tl.add(() => showNote(fact)).fromTo(
      note,
      { autoAlpha: 0, rotationX: -90, scaleY: 0.3, transformPerspective: 700, transformOrigin: "50% 0%" },
      { autoAlpha: 1, rotationX: 0, scaleY: 1, duration: 0.7, ease: "back.out(1.7)" }
    );
  }

  handle.addEventListener("click", pull);
  handle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pull();
    }
  });
}

// ===== 연락 =====
if (document.querySelector("#contact")) initContact();

function initContact() {
  const section = document.querySelector("#contact");

  // --- "제가 합류하면 가장 먼저…" 뒤의 말이 2초마다 위로 넘어가며 바뀜 ---
  const rotator = section.querySelector(".contact__rotator");
  const word = rotator.querySelector(".contact__word");
  const words = rotator.dataset.words.split("|");
  let index = 0;
  let timer = null;

  function nextWord() {
    index = (index + 1) % words.length;
    if (!canAnimate) {
      word.textContent = words[index];
      return;
    }
    gsap
      .timeline()
      .to(word, { yPercent: -110, autoAlpha: 0, duration: 0.3, ease: "power2.in" })
      .add(() => (word.textContent = words[index]))
      .fromTo(word, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: "back.out(2)" });
  }

  // 섹션이 보일 때만 바꾸기
  new IntersectionObserver(([entry]) => {
    clearInterval(timer);
    if (entry.isIntersecting) timer = setInterval(nextWord, 2000);
  }).observe(section);

  // --- 이메일 복사 ---
  const copyButton = section.querySelector(".contact__copy");
  let resetTimer = null;

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 클립보드 API를 못 쓰는 환경(파일로 열었을 때 등)을 위한 예전 방식
      const box = document.createElement("textarea");
      box.value = text;
      box.setAttribute("readonly", "");
      box.style.position = "fixed";
      box.style.opacity = "0";
      document.body.appendChild(box);
      box.select();
      document.execCommand("copy");
      box.remove();
    }
  }

  copyButton.addEventListener("click", async () => {
    await copyText(copyButton.dataset.copy);
    copyButton.textContent = "복사했어요!";
    copyButton.classList.add("is-copied");
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      copyButton.textContent = "복사";
      copyButton.classList.remove("is-copied");
    }, 1600);
  });

  if (!canAnimate) return;

  // --- 스크롤해서 보이면 제목이 통통 튀며 등장 ---
  if (window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.from([".contact .section__title", ".contact__lead", ".contact__rotator"], {
      y: -70,
      autoAlpha: 0,
      duration: 1,
      ease: "bounce.out",
      stagger: 0.15,
      clearProps: "transform",
      scrollTrigger: { trigger: section, start: "top 75%", once: true },
    });
  }
}

// ===== 여기부터는 움직임을 허용한 경우에만 =====
if (canAnimate) {
  // --- 첫 화면 등장: 제목 글자가 한 글자씩 차례로 ---
  const title = document.querySelector(".hero__title");
  title.setAttribute("aria-label", "기술을 읽고, 가치를 만들고, 권리를 지키는 사람");

  // 낱말 단위로 묶어서(.word) 좁은 화면에서도 낱말 중간에서 줄이 바뀌지 않게
  Array.from(title.childNodes).forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (part === "") return;
      if (part.trim() === "") {
        fragment.appendChild(document.createTextNode(part));
        return;
      }
      const word = document.createElement("span");
      word.className = "word";
      word.setAttribute("aria-hidden", "true");
      Array.from(part).forEach((letter) => {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = letter;
        word.appendChild(span);
      });
      fragment.appendChild(word);
    });
    node.replaceWith(fragment);
  });

  // 제목 → 서브 타이틀 → 버튼 → 사진 카드 → 벤토 카드 순서로 부드럽게
  const intro = gsap.timeline({ delay: 0.15, defaults: { ease: "power3.out" } });
  const introSteps = [
    { targets: ".hero__sub", vars: { y: 18, duration: 0.7 } },
    { targets: ".hero__cta, .hero__hint", vars: { y: 14, duration: 0.6, stagger: 0.1 } },
    { targets: ".hero__profile", vars: { y: 40, scale: 0.96, duration: 0.9 } },
    { targets: ".bento-card", vars: { y: 24, duration: 0.7, stagger: 0.12 } },
  ];

  intro.set(title, { visibility: "visible" }).from(".hero__title .char", {
    y: 40,
    opacity: 0,
    duration: 0.8,
    stagger: 0.025,
  });

  introSteps.forEach(({ targets, vars }) => {
    if (!document.querySelector(targets)) return; // 없는 요소는 건너뛰기
    intro.from(targets, { autoAlpha: 0, ...vars }, "-=0.45");
  });


  // --- 버튼: 마우스를 올리면 살짝 떠오르기 (그림자는 CSS에서 커짐) ---
  document.querySelectorAll(".btn").forEach((button) => {
    button.addEventListener("mouseenter", () => {
      gsap.to(button, { y: -4, scale: 1, duration: 0.35, ease: "power2.out" });
    });
    button.addEventListener("mouseleave", () => {
      gsap.to(button, { y: 0, scale: 1, duration: 0.4, ease: "power2.out" });
    });
    button.addEventListener("pointerdown", () => {
      gsap.to(button, { scale: 0.97, duration: 0.1 });
    });
    button.addEventListener("pointerup", () => {
      gsap.to(button, { scale: 1, duration: 0.3, ease: "back.out(2)" });
    });
  });

  // --- 만든 것들 카드: 마우스를 올리면 살짝 떠오르며 좌우로 흔들흔들 ---
  document.querySelectorAll(".work-card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      gsap.to(card, { y: -10, duration: 0.3, ease: "power2.out", overwrite: "auto" });
      gsap.to(card, {
        keyframes: { rotation: [0, -1.4, 1.1, -0.6, 0.3, 0] },
        duration: 0.7,
        ease: "none",
        overwrite: "auto",
      });
    });
    card.addEventListener("mouseleave", () => {
      gsap.to(card, { y: 0, rotation: 0, duration: 0.4, ease: "back.out(2)", overwrite: "auto" });
    });
  });

  // --- 스크롤해서 보이면: 카드·만화 칸이 하나씩 통통, 폴라로이드는 위에서 툭 ---
  if (window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    [".work-card", ".comic__panel"].forEach((selector) => {
      const targets = document.querySelectorAll(selector);
      if (!targets.length) return;
      gsap.from(targets, {
        y: 70,
        scale: 0.9,
        autoAlpha: 0,
        duration: 0.7,
        ease: "back.out(2.6)",
        stagger: 0.15,
        clearProps: "transform",
        scrollTrigger: { trigger: targets[0].parentElement, start: "top 80%", once: true },
      });
    });

    // 핵심 강점 카드: 아래에서 부드럽게 떠오르기
    if (document.querySelector(".strengths")) {
      gsap.from(".strengths", {
        y: 60,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        clearProps: "transform",
        scrollTrigger: { trigger: ".strengths", start: "top 85%", once: true },
      });
    }

    // 관심 분야 카드: 한 장씩 빙글 돌며 등장
    gsap.from(".field", {
      rotation: -200,
      scale: 0.3,
      autoAlpha: 0,
      duration: 0.9,
      ease: "back.out(1.6)",
      stagger: 0.18,
      clearProps: "transform",
      scrollTrigger: { trigger: ".fields", start: "top 80%", once: true },
    });

    // 질문 목록: 위에서부터 차례로 미끄러져 들어오기
    gsap.from(".faq__item", {
      x: -90,
      autoAlpha: 0,
      duration: 0.6,
      ease: "power3.out",
      stagger: 0.12,
      clearProps: "transform",
      scrollTrigger: { trigger: ".faq", start: "top 80%", once: true },
    });
  }
}

// ===== 창(모달): 카드를 누르면 열리고, X·바깥 클릭·Esc로 닫힘 =====
let lastFocused = null;

function openModal(dialog) {
  lastFocused = document.activeElement;
  dialog.slider?.go(0);
  dialog.showModal();
  document.documentElement.classList.add("modal-open");
  if (lenis) lenis.stop();

  if (canAnimate) {
    // 통 튀어나오기
    gsap.fromTo(
      dialog.querySelector(".modal__box"),
      { autoAlpha: 0, scale: 0.5, y: 80, rotation: -6 },
      { autoAlpha: 1, scale: 1, y: 0, rotation: 0, duration: 0.75, ease: "elastic.out(1, 0.6)" }
    );
  }
}

function closeModal(dialog) {
  if (!dialog.open || dialog.dataset.closing) return;

  const finish = () => {
    delete dialog.dataset.closing;
    dialog.close();
    document.documentElement.classList.remove("modal-open");
    if (lenis) lenis.start();
    if (lastFocused) lastFocused.focus();
  };

  if (canAnimate) {
    dialog.dataset.closing = "true";
    gsap.to(dialog.querySelector(".modal__box"), {
      autoAlpha: 0,
      scale: 0.85,
      y: 40,
      duration: 0.2,
      ease: "power2.in",
      onComplete: finish,
    });
  } else {
    finish();
  }
}

// 사진 넘겨 보기: 이전/다음 버튼, 키보드 화살표, 점, 손가락으로 밀기
function initSlider(root) {
  const track = root.querySelector(".slider__track");
  const slides = Array.from(root.querySelectorAll(".slider__slide"));
  const caption = root.querySelector(".slider__caption");
  const dotsBox = root.querySelector(".slider__dots");
  let index = 0;

  const dots = slides.map((slide, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "slider__dot";
    dot.setAttribute("aria-label", `${i + 1}번째 사진: ${slide.dataset.title}`);
    dot.addEventListener("click", () => go(i));
    dotsBox.appendChild(dot);
    return dot;
  });

  function go(next) {
    index = (next + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;

    const slide = slides[index];
    const title = document.createElement("strong");
    title.textContent = slide.dataset.title;
    caption.replaceChildren(title, ` — ${slide.dataset.desc}`);

    slides.forEach((s, i) => s.setAttribute("aria-hidden", i !== index));
    dots.forEach((dot, i) => dot.setAttribute("aria-current", i === index));
  }

  root.querySelectorAll(".slider__arrow").forEach((arrow) => {
    arrow.addEventListener("click", () => go(index + Number(arrow.dataset.step)));
  });

  // 휴대폰에서 옆으로 밀어 넘기기
  const screen = root.querySelector(".laptop__screen");
  let startX = null;
  screen.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
  });
  screen.addEventListener("pointerup", (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    startX = null;
  });

  go(0);
  return { go, prev: () => go(index - 1), next: () => go(index + 1) };
}

document.querySelectorAll("dialog.modal").forEach((dialog) => {
  const slider = dialog.querySelector(".slider");
  if (slider) dialog.slider = initSlider(slider);

  dialog.querySelector(".modal__close").addEventListener("click", () => closeModal(dialog));

  // 창 바깥(어두운 배경)을 누르면 닫기
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeModal(dialog);
  });

  // Esc: 바로 닫지 않고 닫히는 애니메이션을 거쳐 닫기
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeModal(dialog);
  });

  dialog.addEventListener("keydown", (event) => {
    if (!dialog.slider) return;
    if (event.key === "ArrowLeft") dialog.slider.prev();
    if (event.key === "ArrowRight") dialog.slider.next();
  });
});

document.querySelectorAll("[data-modal]").forEach((card) => {
  card.addEventListener("click", () => openModal(document.getElementById(card.dataset.modal)));
});

// ===== 첫 화면 3D 오브젝트: 펼친 책(읽고) · 전구(만들고) · 방패(지키는) =====
if (typeof window.THREE !== "undefined") {
  initHeroScene();
}

function initHeroScene() {
  const COLORS = {
    peach: 0xffb59e,
    page: 0xfff7f2,
    line: 0xf5c9bb,
    butter: 0xffeaa6,
    butterDeep: 0xffd98a,
    base: 0xc9d8ff,
    baseDeep: 0xaec4ff,
    blue: 0x9dbcff,
    blueLight: 0xeef3ff,
    mint: 0x6fd3b0,
  };
  const CAMERA_Z = 12;
  const FOV = 35;

  const hero = document.querySelector(".hero");
  const title = document.querySelector(".hero__title");
  const bubble = document.querySelector(".hero__bubble");

  const canvas = document.createElement("canvas");
  canvas.className = "hero__scene";
  canvas.setAttribute("aria-hidden", "true");
  hero.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0); // 투명 배경
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.z = CAMERA_Z;

  // 부드러운 조명: 하늘·바닥 환경광 + 위쪽에서 은은한 빛
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e2ff, 0.75));
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const sun = new THREE.DirectionalLight(0xffffff, 0.65);
  sun.position.set(1.5, 8, 5);
  scene.add(sun);

  // 점토처럼 말랑한 무광 재질
  const clay = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });

  // 도형 하나를 만들어 붙이기
  function part(parent, geometry, color, { position, rotation, scale } = {}) {
    const mesh = new THREE.Mesh(geometry, clay(color));
    if (position) mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    if (scale) mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }

  // 모서리가 둥근 상자 (둥근 사각형을 밀어내고 가장자리를 깎음)
  function roundedBox(width, height, depth, radius) {
    const bevel = Math.min(radius, depth / 2 - 0.001, width / 2 - 0.001, height / 2 - 0.001);
    const w = width - bevel * 2;
    const h = height - bevel * 2;
    const r = Math.max(Math.min(radius, w / 2, h / 2) * 0.6, 0.001);
    const x = -w / 2;
    const y = -h / 2;

    const shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(depth - bevel * 2, 0.0001),
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 5,
      curveSegments: 10,
    });
    geometry.center();
    return geometry;
  }

  // --- 펼친 책 (피치) ---
  function makeBook() {
    const book = new THREE.Group();

    [-1, 1].forEach((side) => {
      // 책등을 축으로 양쪽 페이지가 살짝 V자로 펼쳐짐
      const half = new THREE.Group();
      half.rotation.y = -side * 0.28;
      book.add(half);

      part(half, roundedBox(1.14, 1.44, 0.1, 0.05), COLORS.peach, { position: [side * 0.58, 0, -0.08] });
      part(half, roundedBox(1.04, 1.32, 0.14, 0.07), COLORS.page, { position: [side * 0.55, 0, 0] });

      // 페이지 위 글줄
      for (let i = 0; i < 4; i++) {
        const width = i === 3 ? 0.4 : 0.7;
        part(half, roundedBox(width, 0.07, 0.04, 0.035), COLORS.line, {
          position: [side * (0.55 - (0.7 - width) / 2), 0.38 - i * 0.24, 0.08],
        });
      }
    });

    part(book, roundedBox(0.18, 1.46, 0.18, 0.09), COLORS.peach, { position: [0, 0, -0.1] });

    book.rotation.x = -0.35;
    return book;
  }

  // --- 전구 (연노랑) ---
  function makeBulb() {
    const bulb = new THREE.Group();

    part(bulb, new THREE.SphereGeometry(0.72, 48, 32), COLORS.butter, { position: [0, 0.3, 0] });

    // 유리알에서 꼭지로 부드럽게 좁아지는 목
    const neck = [
      [0.001, -0.56],
      [0.3, -0.56],
      [0.33, -0.42],
      [0.42, -0.22],
      [0.56, -0.06],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    part(bulb, new THREE.LatheGeometry(neck, 40), COLORS.butter);

    // 꼭지: 둥근 고리 세 개 + 동그란 끝
    part(bulb, new THREE.CylinderGeometry(0.29, 0.29, 0.4, 40), COLORS.base, { position: [0, -0.75, 0] });
    [-0.62, -0.75, -0.88].forEach((y) => {
      part(bulb, new THREE.TorusGeometry(0.29, 0.055, 16, 40), COLORS.baseDeep, {
        position: [0, y, 0],
        rotation: [Math.PI / 2, 0, 0],
      });
    });
    part(bulb, new THREE.SphereGeometry(0.17, 24, 16), COLORS.baseDeep, { position: [0, -0.97, 0], scale: [1, 0.7, 1] });

    // 반짝 하이라이트
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(-0.3, 0.62, 0.56);
    shine.scale.set(1, 1.3, 0.6);
    bulb.add(shine);

    // 번뜩이는 빛줄기
    [Math.PI / 2, Math.PI / 4, (Math.PI * 3) / 4].forEach((angle) => {
      part(bulb, roundedBox(0.13, 0.36, 0.13, 0.065), COLORS.butterDeep, {
        position: [Math.cos(angle) * 1.12, 0.3 + Math.sin(angle) * 1.12, 0],
        rotation: [0, 0, angle - Math.PI / 2],
      });
    });

    return bulb;
  }

  // --- 방패 (파스텔 블루) ---
  function shieldGeometry(scale, depth, bevel) {
    const s = scale;
    const shape = new THREE.Shape();
    shape.moveTo(-0.6 * s, 0.55 * s);
    shape.quadraticCurveTo(0, 0.72 * s, 0.6 * s, 0.55 * s);
    shape.quadraticCurveTo(0.64 * s, -0.22 * s, 0, -0.74 * s);
    shape.quadraticCurveTo(-0.64 * s, -0.22 * s, -0.6 * s, 0.55 * s);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel * 0.8,
      bevelSegments: 6,
      curveSegments: 32,
    });
    geometry.center();
    return geometry;
  }

  function makeShield() {
    const shield = new THREE.Group();
    part(shield, shieldGeometry(1, 0.16, 0.1), COLORS.blue);
    part(shield, shieldGeometry(0.62, 0.03, 0.045), COLORS.blueLight, { position: [0, 0.03, 0.2] });

    // 체크 표시 (민트)
    part(shield, roundedBox(0.32, 0.13, 0.1, 0.06), COLORS.mint, {
      position: [-0.15, -0.02, 0.29],
      rotation: [0, 0, -0.8],
    });
    part(shield, roundedBox(0.56, 0.13, 0.1, 0.06), COLORS.mint, {
      position: [0.1, 0.1, 0.29],
      rotation: [0, 0, 0.9],
    });

    return shield;
  }

  // 오브젝트 아래 흐릿한 그림자 (가운데가 진하고 바깥으로 사라지는 동그라미)
  const shadowTexture = (() => {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(90, 70, 160, 0.55)");
    g.addColorStop(0.5, "rgba(90, 70, 160, 0.2)");
    g.addColorStop(1, "rgba(90, 70, 160, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  })();

  function makeShadow(size) {
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })
    );
    shadow.position.y = -size * 0.56;
    shadow.userData.base = { x: size * 0.75, y: size * 0.2 };
    shadow.scale.set(shadow.userData.base.x, shadow.userData.base.y, 1);
    shadow.renderOrder = -1;
    return shadow;
  }

  // 오브젝트마다: 크기, 말풍선 문구, 스크롤 때 흩어지는 방향(속도가 서로 다름), 도는 속도
  const items = [
    {
      model: makeBook(),
      size: 2.5,
      // 책 말풍선: 제목 + 학교 목록, 5초 동안, 누르면 바로 닫힘
      title: "읽고 · 문과와 이과를 모두 읽었어요",
      list: ["대전외국어고등학교 중국어과", "연세대학교 사학과", "서울교육대학교 과학교육과"],
      duration: 5000,
      dismissible: true,
      scatter: { x: -7, y: 3, z: -10, spin: -1.2 },
      spinSpeed: 0.35,
      phase: 0,
    },
    {
      model: makeBulb(),
      size: 2.7,
      message: "교실에 필요한 웹앱을 직접 만들었어요",
      scatter: { x: 6, y: 8, z: -22, spin: 2 },
      spinSpeed: 0.5,
      phase: 2,
    },
    {
      model: makeShield(),
      size: 1.8,
      message: "이제 기술을 권리로 지키려 해요",
      scatter: { x: 9, y: -3, z: -5, spin: 1 },
      spinSpeed: -0.3,
      phase: 4,
    },
  ];

  // 묶음 순서: 자리(anchor) → 스크롤 흩어짐(scatter) → 클릭 통통(pop) → 둥둥·기울기(float) → 회전(spin)
  items.forEach((item) => {
    item.anchor = new THREE.Group();
    item.scatterGroup = new THREE.Group();
    item.pop = new THREE.Group();
    item.float = new THREE.Group();
    item.spin = new THREE.Group();

    item.shadow = makeShadow(item.size);

    item.anchor.add(item.scatterGroup);
    item.scatterGroup.add(item.shadow); // 그림자는 바닥에 남고, 오브젝트만 떠오름
    item.scatterGroup.add(item.pop);
    item.pop.add(item.float);
    item.float.add(item.spin);
    item.spin.add(item.model);
    item.model.userData.item = item;
    scene.add(item.anchor);
  });

  // --- 제목 둘레에 자리 잡기 (화면 크기에 맞춰 다시 계산) ---
  let width = 1;
  let height = 1;
  let objectPx = 150;

  function layout() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const visibleHeight = 2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const pxPerUnit = height / visibleHeight;

    const heroBox = hero.getBoundingClientRect();
    const toHero = (box) => ({
      left: box.left - heroBox.left,
      right: box.right - heroBox.left,
      top: box.top - heroBox.top,
      bottom: box.bottom - heroBox.top,
    });
    const t = toHero(title.getBoundingClientRect());
    // 프로필 카드 둘레에 배치 (카드가 없으면 제목 오른쪽 영역을 대신 사용)
    // (등장 애니메이션 중 카드가 움직여도 흔들리지 않게, 움직이지 않는 부모 칸 기준으로 계산)
    const profileEl = hero.querySelector(".hero__profile");
    let p = { left: t.right, right: t.right + 200, top: t.top, bottom: t.bottom };
    if (profileEl) {
      const side = toHero(profileEl.parentElement.getBoundingClientRect());
      const center = (side.left + side.right) / 2;
      p = {
        left: center - profileEl.offsetWidth / 2,
        right: center + profileEl.offsetWidth / 2,
        top: side.top,
        bottom: side.top + profileEl.offsetHeight,
      };
    }
    const stacked = width <= 860; // 휴대폰: 글 → 사진 → 카드 세로 배치
    objectPx = stacked ? 76 : Math.min(Math.max(width * 0.085, 96), 130);

    // 픽셀 좌표 [x, y]: 글자와 사진을 가리지 않게 프로필 카드 양옆 빈 곳에
    const spots = stacked
      ? [
          [p.left - objectPx * 0.75, p.top + objectPx * 0.5],
          [p.right + objectPx * 0.75, p.top + objectPx * 0.35],
          [p.right + objectPx * 0.7, p.bottom - objectPx * 0.55],
        ]
      : [
          // 책: 카드 왼쪽, 제목 칸과 카드 사이
          [Math.max(p.left - objectPx * 0.85, Math.min(t.right + objectPx * 0.55, p.left - objectPx * 0.45)), p.top + (p.bottom - p.top) * 0.3],
          [p.right + objectPx * 0.7, p.top + objectPx * 0.15],
          [p.right + objectPx * 0.65, p.bottom - objectPx * 0.3],
        ];

    const margin = objectPx * 0.6;
    items.forEach((item, i) => {
      const x = Math.min(Math.max(spots[i][0], margin), width - margin);
      const y = Math.max(spots[i][1], margin);
      item.anchor.position.set((x - width / 2) / pxPerUnit, -(y - height / 2) / pxPerUnit, 0);
      item.anchor.scale.setScalar(objectPx / pxPerUnit / item.size);
    });

    if (!running) renderer.render(scene, camera);
  }

  // --- 마우스 쪽으로 살짝 기울기 ---
  const tilt = { x: 0, z: 0 };
  window.addEventListener("pointermove", (event) => {
    const nx = (event.clientX / window.innerWidth) * 2 - 1;
    const ny = (event.clientY / window.innerHeight) * 2 - 1;
    tilt.x = ny * 0.35;
    tilt.z = -nx * 0.35;
  });

  // --- 화면에 보일 때만 그리기 ---
  const clock = new THREE.Clock();
  let elapsed = 0;
  let running = false;
  let heroVisible = true;
  let frameId = null;

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    items.forEach((item) => {
      item.float.position.y = Math.sin(elapsed * 1.4 + item.phase) * 0.18;
      item.float.rotation.x += (tilt.x - item.float.rotation.x) * 0.06;
      item.float.rotation.z += (tilt.z - item.float.rotation.z) * 0.06;
      item.spin.rotation.y += dt * item.spinSpeed;

      // 높이 뜰수록 그림자는 작고 옅게
      const lift = item.float.position.y + item.pop.position.y * 0.4;
      const shrink = Math.max(1 - lift * 0.6, 0.4);
      const base = item.shadow.userData.base;
      item.shadow.scale.set(base.x * shrink, base.y * shrink, 1);
      item.shadow.material.opacity = Math.max(1 - lift * 0.8, 0.3);
    });

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(tick);
  }

  function updateLoop() {
    const shouldRun = canAnimate && heroVisible && !document.hidden;
    if (shouldRun && !running) {
      running = true;
      clock.getDelta(); // 멈춰 있던 시간은 건너뛰기
      frameId = requestAnimationFrame(tick);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(frameId);
    }
  }

  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    updateLoop();
  }).observe(hero);
  document.addEventListener("visibilitychange", updateLoop);

  new ResizeObserver(layout).observe(hero);
  if (document.fonts) document.fonts.ready.then(layout);
  layout();
  updateLoop();

  // --- 움직임 허용 시: 등장, 스크롤하면 흩어지기 ---
  if (canAnimate) {
    gsap.from(
      items.map((item) => item.pop.scale),
      { x: 0, y: 0, z: 0, duration: 0.9, ease: "back.out(2)", stagger: 0.15, delay: 0.6 }
    );

    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      items.forEach((item) => {
        const { spin, ...offset } = item.scatter;
        const scroll = { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 };
        gsap.to(item.scatterGroup.position, { ...offset, ease: "none", scrollTrigger: scroll });
        gsap.to(item.scatterGroup.rotation, { z: spin, ease: "none", scrollTrigger: { ...scroll } });
      });
      if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
  }

  // --- 클릭: 통 튀며 한 바퀴 + 손글씨 말풍선 2초 ---
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const models = items.map((item) => item.model);

  function pick(event) {
    const box = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - box.left) / box.width) * 2 - 1;
    pointer.y = -((event.clientY - box.top) / box.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(models, true)[0];
    if (!hit) return null;

    let object = hit.object;
    while (object && !object.userData.item) object = object.parent;
    return object ? object.userData.item : null;
  }

  // 캔버스는 글자 뒤에 있으므로, 첫 화면 전체에서 클릭을 받아 3D에 맞았는지 확인
  hero.addEventListener("pointermove", (event) => {
    const onControl = event.target.closest("a, button");
    hero.classList.toggle("is-pointing", !onControl && Boolean(pick(event)));
  });

  hero.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) return;
    if (event.target.closest(".hero__bubble")) return; // 말풍선 클릭은 아래 문서 클릭에서 닫기 처리
    const item = pick(event);
    if (!item) return;

    if (canAnimate) {
      gsap.killTweensOf([item.pop.position, item.pop.rotation]);
      item.pop.rotation.y = 0;
      gsap
        .timeline()
        .to(item.pop.position, { y: 1.4, duration: 0.25, ease: "power2.out" })
        .to(item.pop.position, { y: 0, duration: 0.7, ease: "bounce.out" });
      gsap.to(item.pop.rotation, { y: Math.PI * 2, duration: 0.9, ease: "power2.out" });
    }

    showBubble(item, event);
  });

  let hideTimer = null;
  let openedBy = null; // 말풍선을 연 클릭 (그 클릭으로 바로 닫히지 않게)

  // 닫을 수 있는 말풍선(책)이 열려 있으면, 말풍선이든 다른 곳이든 누르면 바로 닫기
  document.addEventListener("click", (event) => {
    if (event === openedBy || !bubble.classList.contains("is-dismissible")) return;
    hideBubble();
  });

  const CHECK_SVG =
    '<svg class="hero__bubble-check" viewBox="0 0 20 20" aria-hidden="true">' +
    '<path d="M3 10.5 Q 6 12 8.5 15.5 Q 12 7.5 17.5 3.5" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function fillBubble(item) {
    bubble.replaceChildren();
    bubble.classList.toggle("hero__bubble--wide", Boolean(item.list));

    if (!item.list) {
      bubble.textContent = item.message;
      return;
    }

    const title = document.createElement("strong");
    title.className = "hero__bubble-title";
    title.textContent = item.title;

    const list = document.createElement("ul");
    list.className = "hero__bubble-list";
    item.list.forEach((text) => {
      const li = document.createElement("li");
      li.innerHTML = CHECK_SVG;
      li.append(text);
      list.appendChild(li);
    });

    bubble.append(title, list);
  }

  function hideBubble() {
    clearTimeout(hideTimer);
    bubble.classList.remove("is-dismissible");
    if (canAnimate) {
      gsap.to(bubble, { autoAlpha: 0, scale: 0.8, duration: 0.25 });
    } else {
      bubble.style.visibility = "hidden";
      bubble.style.opacity = "0";
    }
  }

  function showBubble(item, event) {
    fillBubble(item);
    openedBy = event;
    bubble.classList.toggle("is-dismissible", Boolean(item.dismissible));

    // 오브젝트가 화면 어디에 있는지 계산
    const spot = new THREE.Vector3();
    item.scatterGroup.getWorldPosition(spot).project(camera);
    const x = ((spot.x + 1) / 2) * width;
    const y = ((1 - spot.y) / 2) * height;

    const edge = 8;
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const gap = objectPx * 0.55;
    let left;
    let top;

    // 화면 가운데 쪽 옆에 자리가 있으면 옆에, 없으면(휴대폰 등) 오브젝트 아래에
    const roomRight = width - (x + gap) - edge;
    const roomLeft = x - gap - edge;
    if (x < width / 2 && roomRight >= bw) {
      left = x + gap;
      top = y - objectPx * 0.45 - bh / 2;
    } else if (x >= width / 2 && roomLeft >= bw) {
      left = x - gap - bw;
      top = y - objectPx * 0.45 - bh / 2;
    } else {
      left = x - bw / 2;
      top = y + objectPx * 0.6;
    }

    // 첫 화면 밖으로 잘리지 않게 가두기
    left = Math.min(Math.max(left, edge), width - bw - edge);
    top = Math.min(Math.max(top, edge), height - bh - edge);

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;

    const duration = item.duration || 2000;
    clearTimeout(hideTimer);
    if (canAnimate) {
      gsap.killTweensOf(bubble);
      gsap.fromTo(
        bubble,
        { autoAlpha: 0, scale: 0.6, rotation: -8 },
        { autoAlpha: 1, scale: 1, rotation: item.list ? -1 : -2, duration: 0.45, ease: "back.out(2.5)" }
      );
      // 학교 이름이 위에서부터 한 줄씩
      if (item.list) {
        gsap.from(bubble.querySelectorAll("li"), {
          y: -10,
          autoAlpha: 0,
          duration: 0.35,
          ease: "power2.out",
          stagger: 0.28,
          delay: 0.3,
        });
      }
    } else {
      bubble.style.visibility = "visible";
      bubble.style.opacity = "1";
    }
    hideTimer = setTimeout(hideBubble, duration);
  }
}
