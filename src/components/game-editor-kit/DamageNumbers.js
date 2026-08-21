/**
 * DamageNumbers — Floating damage text rendering in 3D world space.
 *
 * Creates animated damage indicators that float above hit points, fade out
 * over time. Pure UI layer with no backend dependencies — scene/camera are
 * passed in, no game-state coupling. Compatible with THREE.js.
 *
 * Factory pattern: createDamageNumbers(scene, camera, config) returns {
 *   addNumber(damage, worldPos, options),
 *   update(deltaTime),
 *   getActiveNumbers(),
 *   cleanup()
 * }
 */

/**
 * Create a damage numbers manager.
 *
 * @param {THREE.Scene} scene - The THREE.js scene (for container attachment).
 * @param {THREE.Camera} camera - The THREE.js camera (for projection math).
 * @param {Object} [config={}] - Configuration object.
 * @param {HTMLElement} [config.container] - DOM container for text elements. Defaults to document.body.
 * @param {string} [config.defaultColor='#ff4444'] - Default color for numbers.
 * @param {number} [config.defaultFontSize=32] - Default font size in pixels.
 * @param {number} [config.defaultDuration=1500] - Lifetime in milliseconds.
 * @param {boolean} [config.useLargerFontForBigDamage=true] - Scale font size with damage amount.
 * @returns {Object} Manager with methods: addNumber, update, getActiveNumbers, cleanup.
 */
export function createDamageNumbers(scene, camera, config = {}) {
	const {
		container = typeof document !== 'undefined' ? document.body : null,
		defaultColor = '#ff4444',
		defaultFontSize = 32,
		defaultDuration = 1500,
		useLargerFontForBigDamage = true
	} = config;

	const numbers = [];
	const screenDimensions = { width: 1920, height: 1080 };

	function updateScreenDimensions() {
		if (container && container !== document.body) {
			screenDimensions.width = container.clientWidth || 1920;
			screenDimensions.height = container.clientHeight || 1080;
		} else if (typeof window !== 'undefined') {
			screenDimensions.width = window.innerWidth;
			screenDimensions.height = window.innerHeight;
		}
	}

	function normalizePosition(worldPos) {
		if (!worldPos) return { x: 0, y: 0, z: 0 };
		if (worldPos.x !== undefined) return { x: worldPos.x, y: worldPos.y, z: worldPos.z };
		return worldPos;
	}

	function projectToScreen(worldPos) {
		if (!camera) return null;

		const pos = normalizePosition(worldPos);
		const vector = typeof camera.project === 'function'
			? camera.project({ x: pos.x, y: pos.y, z: pos.z })
			: null;

		if (!vector) return null;

		const screenX = (vector.x + 1) / 2 * screenDimensions.width;
		const screenY = (1 - vector.y) / 2 * screenDimensions.height;

		return { x: screenX, y: screenY, z: vector.z };
	}

	function createElement(damage, screenPos, options) {
		if (!container) return null;

		const el = typeof document !== 'undefined' ? document.createElement('div') : null;
		if (!el) return null;

		const isLargeNumber = damage > 25;
		const fontSize = useLargerFontForBigDamage && isLargeNumber
			? defaultFontSize * (1 + Math.min(damage / 100, 0.5))
			: defaultFontSize;

		const color = options.color || defaultColor;

		el.className = 'ds-damage-number';
		el.textContent = Math.abs(Math.floor(damage));
		el.style.cssText = `
position: fixed;
left: ${screenPos.x}px;
top: ${screenPos.y}px;
transform: translate(-50%, -50%);
font-size: ${fontSize}px;
font-weight: bold;
color: ${color};
pointer-events: none;
white-space: nowrap;
z-index: 10000;
opacity: 1;
line-height: 1;
font-family: system-ui, -apple-system, sans-serif;
text-shadow: 0 1px 3px rgba(0,0,0,0.5);
`;

		container.appendChild(el);
		return el;
	}

	function addNumber(damage, worldPos, options = {}) {
		updateScreenDimensions();

		const screenPos = projectToScreen(worldPos);
		if (!screenPos) return null;

		const el = createElement(damage, screenPos, options);
		if (!el) return null;

		const duration = options.duration !== undefined ? options.duration : defaultDuration;
		const floatDistance = options.floatDistance !== undefined ? options.floatDistance : 60;

		const entry = {
			damage,
			worldPos: normalizePosition(worldPos),
			screenPos,
			element: el,
			startTime: Date.now(),
			duration,
			floatDistance,
			isActive: true,
			destroyPending: false
		};

		numbers.push(entry);
		return entry;
	}

	function update(deltaTime = 16) {
		updateScreenDimensions();

		for (let i = numbers.length - 1; i >= 0; i--) {
			const entry = numbers[i];
			if (!entry.isActive) continue;

			const elapsed = Date.now() - entry.startTime;
			const progress = Math.min(elapsed / entry.duration, 1);
			const alpha = 1 - progress;

			if (!entry.element) {
				numbers.splice(i, 1);
				continue;
			}

			const floatOffset = progress * entry.floatDistance;

			entry.element.style.opacity = String(alpha);
			entry.element.style.transform = `translate(-50%, calc(-50% - ${floatOffset}px))`;

			if (progress >= 1) {
				entry.destroyPending = true;
				if (entry.element && entry.element.parentNode) {
					entry.element.parentNode.removeChild(entry.element);
				}
				entry.element = null;
				entry.isActive = false;
				numbers.splice(i, 1);
			}
		}
	}

	function getActiveNumbers() {
		return numbers.filter(n => n.isActive).map(n => ({
			damage: n.damage,
			worldPos: n.worldPos,
			screenPos: n.screenPos,
			elapsed: Date.now() - n.startTime,
			duration: n.duration,
			progress: Math.min((Date.now() - n.startTime) / n.duration, 1)
		}));
	}

	function cleanup() {
		for (const entry of numbers) {
			if (entry.element && entry.element.parentNode) {
				entry.element.parentNode.removeChild(entry.element);
			}
		}
		numbers.length = 0;
	}

	return {
		addNumber,
		update,
		getActiveNumbers,
		cleanup
	};
}
