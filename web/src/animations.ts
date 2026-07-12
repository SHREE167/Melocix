/**
 * Lightweight motion helpers (Web Animations API).
 * No React required — works with Melocix vanilla UI.
 */

function wa(
  el: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Promise<void> {
  return new Promise((resolve) => {
    const anim = el.animate(keyframes, { ...options, fill: 'both' })
    anim.onfinish = () => {
      anim.commitStyles()
      anim.cancel()
      resolve()
    }
    anim.oncancel = () => resolve()
  })
}

/** App open / first paint entrance */
export async function playBootAnimation(root: HTMLElement) {
  const splash = document.createElement('div')
  splash.className = 'boot-splash'
  splash.innerHTML = `
    <div class="boot-mark" aria-hidden="true">♪</div>
    <div class="boot-name">Melocix</div>
  `
  root.appendChild(splash)

  const mark = splash.querySelector('.boot-mark')!
  const name = splash.querySelector('.boot-name')!

  await wa(
    mark,
    [
      { transform: 'scale(0.4) rotate(-12deg)', opacity: 0 },
      { transform: 'scale(1.08) rotate(0deg)', opacity: 1, offset: 0.7 },
      { transform: 'scale(1) rotate(0deg)', opacity: 1 },
    ],
    { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  )

  await wa(
    name,
    [
      { opacity: 0, transform: 'translateY(12px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 400, easing: 'ease-out' },
  )

  await wa(splash, [{ opacity: 1 }, { opacity: 0 }], {
    duration: 350,
    delay: 150,
    easing: 'ease-in',
  })

  splash.remove()
}

/** Soft entrance for main shell after boot */
export function playShellEnter(shell: HTMLElement) {
  void wa(
    shell,
    [
      { opacity: 0, transform: 'translateY(16px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: 450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  )
}

/** Onboarding card entrance */
export function playOnboardEnter(card: HTMLElement) {
  void wa(
    card,
    [
      { opacity: 0, transform: 'translateY(28px) scale(0.96)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ],
    { duration: 500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  )
}

/**
 * Heart pop when liking a song.
 * @param liked whether the song is liked after the toggle
 */
export function playHeartBurst(btn: HTMLElement, liked: boolean) {
  void wa(
    btn,
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.45)' },
      { transform: 'scale(0.9)' },
      { transform: 'scale(1.1)' },
      { transform: 'scale(1)' },
    ],
    { duration: 450, easing: 'ease-out' },
  )

  if (!liked) return

  const rect = btn.getBoundingClientRect()
  const host = document.createElement('div')
  host.className = 'heart-burst-layer'
  host.style.left = `${rect.left + rect.width / 2}px`
  host.style.top = `${rect.top + rect.height / 2}px`
  document.body.appendChild(host)

  const glyphs = ['♥', '❤', '♡', '✦', '♥', '❤']
  for (let i = 0; i < 6; i++) {
    const p = document.createElement('span')
    p.className = 'heart-particle'
    p.textContent = glyphs[i % glyphs.length]
    host.appendChild(p)

    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
    const dist = 28 + Math.random() * 24
    const x = Math.cos(angle) * dist
    const y = Math.sin(angle) * dist - 10

    void wa(
      p,
      [
        { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1.15)`,
          opacity: 0,
        },
      ],
      { duration: 550 + Math.random() * 150, delay: i * 20, easing: 'ease-out' },
    )
  }

  window.setTimeout(() => host.remove(), 750)
}

/** Stagger language chips when language step appears */
export function playLangGridEnter(grid: HTMLElement) {
  const chips = grid.querySelectorAll('.lang-chip')
  chips.forEach((el, i) => {
    void wa(
      el,
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 350, delay: i * 30, easing: 'ease-out' },
    )
  })
}
