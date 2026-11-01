import { createAnimation } from '@ionic/vue';

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isMobile = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(max-width: 767px)').matches;

const getRoot = (baseEl) => baseEl?.shadowRoot || baseEl;

const query = (baseEl, selector) => {
  const root = getRoot(baseEl);
  return root ? root.querySelector(selector) : null;
};

/**
 * Subtle enter animation for Ionic modals: a short fade with a gentle rise
 * and scale. Transform + opacity only, so it stays smooth on mobile.
 *
 * Reduced-motion users still get the same keyframes, just with a zero
 * duration. Returning an empty animation would leave Ionic's `.modal-wrapper`
 * at its base CSS (`opacity: 0.01; translateY(40px)`), which looks like a
 * frozen, invisible modal that still traps focus.
 */
export const modalEnterAnimation = (baseEl) => {
  const reduced = reducedMotion();
  const mobile = isMobile();
  const backdrop = query(baseEl, 'ion-backdrop');
  const wrapper = query(baseEl, '.modal-wrapper');
  const shadow = query(baseEl, '.modal-shadow');

  const backdropAnimation = backdrop
    ? createAnimation()
        .addElement(backdrop)
        .fromTo('opacity', '0', 'var(--backdrop-opacity)')
        .beforeStyles({ 'pointer-events': 'none' })
        .afterClearStyles(['pointer-events'])
        .duration(reduced ? 0 : 200)
        .easing('ease-out')
    : null;

  const wrapperAnimation = wrapper
    ? createAnimation()
        .addElement(wrapper)
        .fromTo('opacity', '0', '1')
        .fromTo(
          'transform',
          mobile ? 'translate3d(0, 16px, 0) scale(0.97)' : 'translate3d(0, 10px, 0) scale(0.975)',
          'translate3d(0, 0, 0) scale(1)'
        )
        .afterStyles({ opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' })
        .duration(reduced ? 0 : mobile ? 300 : 260)
        .easing(EASE_OUT)
    : null;

  const shadowAnimation = shadow
    ? createAnimation()
        .addElement(shadow)
        .fromTo('opacity', '0', '1')
        .duration(reduced ? 0 : mobile ? 300 : 260)
        .easing(EASE_OUT)
    : null;

  const animation = createAnimation()
    .addElement(baseEl)
    .duration(reduced ? 0 : mobile ? 300 : 260)
    .easing(EASE_OUT)
    .addAnimation([backdropAnimation, wrapperAnimation, shadowAnimation].filter(Boolean));

  return animation;
};

/**
 * Subtle exit animation: a quick fade while the card settles slightly down
 * and inward. No zoom-out.
 */
export const modalLeaveAnimation = (baseEl) => {
  const reduced = reducedMotion();
  const mobile = isMobile();
  const backdrop = query(baseEl, 'ion-backdrop');
  const wrapper = query(baseEl, '.modal-wrapper');
  const shadow = query(baseEl, '.modal-shadow');

  const backdropAnimation = backdrop
    ? createAnimation()
        .addElement(backdrop)
        .fromTo('opacity', 'var(--backdrop-opacity)', '0')
        .duration(reduced ? 0 : 180)
        .easing('ease-in')
    : null;

  const wrapperAnimation = wrapper
    ? createAnimation()
        .addElement(wrapper)
        .fromTo('opacity', '1', '0')
        .fromTo(
          'transform',
          'translate3d(0, 0, 0) scale(1)',
          mobile ? 'translate3d(0, 8px, 0) scale(0.985)' : 'translate3d(0, 6px, 0) scale(0.99)'
        )
        .duration(reduced ? 0 : 200)
        .easing(EASE_IN)
    : null;

  const shadowAnimation = shadow
    ? createAnimation()
        .addElement(shadow)
        .fromTo('opacity', '1', '0')
        .duration(reduced ? 0 : 200)
        .easing(EASE_IN)
    : null;

  const animation = createAnimation()
    .addElement(baseEl)
    .duration(reduced ? 0 : 200)
    .easing(EASE_IN)
    .addAnimation([backdropAnimation, wrapperAnimation, shadowAnimation].filter(Boolean));

  return animation;
};
