/**
 * Overflow rail enhancement for whitelisted action/tab rows.
 * DOM-only, no SillyTavern context. Each enhanced element keeps its original
 * parent; a wrapper track provides single-row scrolling, and two arrow buttons
 * appear only while the content actually overflows. Cleanup restores the
 * original class/style and re-parents the element back where it was.
 */

export const RAIL_CLASS = 'sws-rail';
const TRACK_CLASS = 'sws-rail-track';
const ARROW_CLASS = 'sws-rail-arrow';
const ARROW_LEFT_CLASS = 'sws-rail-arrow-left';
const ARROW_RIGHT_CLASS = 'sws-rail-arrow-right';

function overflowAmount(el) {
    return el.scrollWidth - el.clientWidth;
}

function updateArrows(el) {
    if (!el || !el.classList.contains(RAIL_CLASS)) {
        return;
    }
    const max = overflowAmount(el);
    const left = el.parentElement?.querySelector(`.${ARROW_LEFT_CLASS}`);
    const right = el.parentElement?.querySelector(`.${ARROW_RIGHT_CLASS}`);
    if (!left || !right) {
        return;
    }
    const canScroll = max > 2;
    left.classList.toggle('sws-rail-arrow-visible', canScroll && el.scrollLeft > 2);
    right.classList.toggle('sws-rail-arrow-visible', canScroll && el.scrollLeft < max - 2);
}

function makeArrow(dir) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `${ARROW_CLASS} ${dir === 'left' ? ARROW_LEFT_CLASS : ARROW_RIGHT_CLASS}`;
    btn.setAttribute('aria-hidden', 'true');
    btn.tabIndex = -1;
    btn.textContent = dir === 'left' ? '\u2039' : '\u203a';
    return btn;
}

function step(el, dir) {
    const amount = Math.max(el.clientWidth * 0.8, 120);
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
}

function onScroll(e) {
    updateArrows(e.currentTarget);
}

function onResize(e) {
    updateArrows(e.currentTarget);
}

/**
 * Enhance a single whitelisted element into a rail. Returns a dispose function.
 * @param {HTMLElement} el
 * @returns {() => void}
 */
export function enhanceRail(el) {
    if (!el || !el.isConnected || el.classList.contains(RAIL_CLASS)) {
        return () => {};
    }
    const parent = el.parentElement;
    const next = el.nextSibling;

    const savedClass = el.getAttribute('class');
    const savedStyle = el.getAttribute('style');
    const savedTabIndex = el.getAttribute('tabindex');

    el.classList.add(RAIL_CLASS);
    el.setAttribute('tabindex', '0');

    const track = document.createElement('div');
    track.className = TRACK_CLASS;
    const left = makeArrow('left');
    const right = makeArrow('right');

    parent.insertBefore(track, next);
    track.append(left, el, right);

    left.addEventListener('click', () => step(el, 'left'));
    right.addEventListener('click', () => step(el, 'right'));
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('resize', onResize);

    const ro = new ResizeObserver(() => updateArrows(el));
    ro.observe(el);

    // Initial pass after layout settles.
    requestAnimationFrame(() => updateArrows(el));

    let disposed = false;
    return function dispose() {
        if (disposed) {
            return;
        }
        disposed = true;
        ro.disconnect();
        el.removeEventListener('scroll', onScroll);
        el.removeEventListener('resize', onResize);
        // Re-parent back to the original parent and position, then restore attrs.
        parent.insertBefore(el, track);
        track.remove();
        if (savedClass === null) {
            el.removeAttribute('class');
        } else {
            el.setAttribute('class', savedClass);
        }
        if (savedStyle === null) {
            el.removeAttribute('style');
        } else {
            el.setAttribute('style', savedStyle);
        }
        if (savedTabIndex === null) {
            el.removeAttribute('tabindex');
        } else {
            el.setAttribute('tabindex', savedTabIndex);
        }
    };
}

/**
 * Enhance every element matching the selectors currently in the DOM and keep
 * doing so for dynamically added matches. Returns a stop function.
 * @param {string[]} selectors
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function startRailController(selectors, root = document.body) {
    const disposers = new Map();
    const pending = new Set();

    function scan() {
        for (const selector of selectors) {
            root.querySelectorAll(selector).forEach((el) => {
                if (!disposers.has(el)) {
                    pending.add(el);
                }
            });
        }
        // A pending set defers enhancement past a layout frame so sizes settle.
        for (const el of pending) {
            disposers.set(el, enhanceRail(el));
        }
        pending.clear();
    }

    const observer = new MutationObserver(() => {
        scan();
    });
    observer.observe(root, { childList: true, subtree: true });

    scan();

    return function stop() {
        observer.disconnect();
        for (const dispose of disposers.values()) {
            dispose();
        }
        disposers.clear();
        pending.clear();
    };
}
