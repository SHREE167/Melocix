/**
 * Melocix motion — Web Animations API
 * Smooth entrances, heart burst, staggered lists.
 */

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'

function wa(
  el: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Promise<void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const anim = el.animate(keyframes, { ...options, fill: 'both' })
    anim.onfinish = () => {
      try {
        anim.commitStyles()
      } catch {
        /* ignore */
      }
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
    <div class="boot-mark" aria-hidden="true">\u266A</div>
    <div class="boot-name">Melocix</div>
  `
  root.appendChild(splash)

  const mark = splash.querySelector('.boot-mark')!
  const name = splash.querySelector('.boot-name')!

  await wa(
    mark,
    [
      { transform: 'scale(0.35) rotate(-14deg)', opacity: 0 },
      { transform: 'scale(1.1) rotate(0deg)', opacity: 1, offset: 0.72 },
      { transform: 'scale(1) rotate(0deg)', opacity: 1 },
    ],
    { duration: 700, easing: EASE_OUT },
  )

  await wa(
    name,
    [
      { opacity: 0, transform: 'translateY(14px)', letterSpacing: '0.2em' },
      { opacity: 1, transform: 'translateY(0)', letterSpacing: '0.06em' },
    ],
    { duration: 420, easing: 'ease-out' },
  )

  await wa(splash, [{ opacity: 1 }, { opacity: 0 }], {
    duration: 320,
    delay: 120,
    easing: 'ease-in',
  })

  splash.remove()
}

/** Soft entrance for main shell after boot */
export function playShellEnter(shell: HTMLElement) {
  void wa(
    shell,
    [
      { opacity: 0, transform: 'translateY(18px) scale(0.985)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ],
    { duration: 480, easing: EASE_OUT },
  )
}

/** Onboarding card entrance */
export function playOnboardEnter(card: HTMLElement) {
  void wa(
    card,
    [
      { opacity: 0, transform: 'translateY(32px) scale(0.95)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ],
    { duration: 520, easing: EASE_OUT },
  )
}

/**
 * Heart pop when liking a song.
 */
export function playHeartBurst(btn: HTMLElement, liked: boolean) {
  void wa(
    btn,
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.4)' },
      { transform: 'scale(0.92)' },
      { transform: 'scale(1.12)' },
      { transform: 'scale(1)' },
    ],
    { duration: 420, easing: EASE_OUT },
  )

  if (!liked) return

  const rect = btn.getBoundingClientRect()
  const host = document.createElement('div')
  host.className = 'heart-burst-layer'
  host.style.left = `${rect.left + rect.width / 2}px`
  host.style.top = `${rect.top + rect.height / 2}px`
  document.body.appendChild(host)

  const glyphs = ['\u2665', '\u2764', '\u2661', '\u2726', '\u2665', '\u2764']
  for (let i = 0; i < 6; i++) {
    const p = document.createElement('span')
    p.className = 'heart-particle'
    p.textContent = glyphs[i % glyphs.length]
    host.appendChild(p)

    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
    const dist = 30 + Math.random() * 22
    const x = Math.cos(angle) * dist
    const y = Math.sin(angle) * dist - 12

    void wa(
      p,
      [
        { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1.15)`,
          opacity: 0,
        },
      ],
      { duration: 560 + Math.random() * 140, delay: i * 18, easing: 'ease-out' },
    )
  }

  window.setTimeout(() => host.remove(), 760)
}

/** Stagger language chips when language step appears */
export function playLangGridEnter(grid: HTMLElement) {
  const chips = grid.querySelectorAll('.lang-chip')
  chips.forEach((el, i) => {
    void wa(
      el,
      [
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 340, delay: i * 28, easing: EASE_OUT },
    )
  })
}
